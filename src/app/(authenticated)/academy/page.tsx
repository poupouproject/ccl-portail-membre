"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { VideoCard } from "@/components/academy/video-card";
import { EvaluationCard } from "@/components/academy/evaluation-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AcademyVideo, Evaluation, Profile } from "@/types/database";

interface EvaluationWithCoach extends Evaluation {
  coach: Profile | null;
}

interface GroupMembershipWithLevel {
  group_id: string;
  groups: { level_required: number } | null;
}

interface ProgressionRecord {
  video_id: string;
}

export default function AcademyPage() {
  const { activeProfile, isLoading: profileLoading } = useProfile();
  const [videos, setVideos] = useState<AcademyVideo[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationWithCoach[]>([]);
  const [completedVideos, setCompletedVideos] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAcademyData() {
      if (!activeProfile) return;

      setIsLoading(true);

      try {
        // Récupérer le niveau du groupe de l'athlète
        const { data: groupMembershipData } = await supabase
          .from("group_members")
          .select("group_id, groups(level_required)")
          .eq("profile_id", activeProfile.id)
          .single();

        const groupMembership = groupMembershipData as unknown as GroupMembershipWithLevel | null;
        const userLevel = groupMembership?.groups?.level_required || 1;

        // Récupérer les vidéos filtrées par niveau
        const { data: videosData } = await supabase
          .from("academy_videos")
          .select("*")
          .eq("is_published", true)
          .lte("level_min", userLevel)
          .order("category")
          .order("title");

        if (videosData) {
          setVideos(videosData as AcademyVideo[]);
        }

        // Récupérer la progression
        const { data: progressionDataRaw } = await supabase
          .from("profile_progression")
          .select("video_id")
          .eq("profile_id", activeProfile.id)
          .eq("is_completed", true);

        const progressionData = progressionDataRaw as ProgressionRecord[] | null;
        if (progressionData) {
          setCompletedVideos(new Set(progressionData.map((p) => p.video_id)));
        }

        // Récupérer les évaluations
        const { data: evaluationsData } = await supabase
          .from("evaluations")
          .select(`*, coach:profiles!evaluations_coach_id_fkey(*)`)
          .eq("profile_id", activeProfile.id)
          .order("evaluation_date", { ascending: false });

        if (evaluationsData) {
          setEvaluations(evaluationsData as unknown as EvaluationWithCoach[]);
        }
      } catch (error) {
        console.error("Erreur lors du chargement de l'académie:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAcademyData();
  }, [activeProfile]);

  const handleVideoComplete = async (videoId: string, completed: boolean) => {
    if (!activeProfile) return;

    if (completed) {
      await (supabase as any).from("profile_progression").upsert({
        profile_id: activeProfile.id,
        video_id: videoId,
        is_completed: true,
        completed_at: new Date().toISOString(),
      });
      setCompletedVideos((prev) => new Set([...prev, videoId]));
    } else {
      await (supabase as any)
        .from("profile_progression")
        .delete()
        .eq("profile_id", activeProfile.id)
        .eq("video_id", videoId);
      setCompletedVideos((prev) => {
        const next = new Set(prev);
        next.delete(videoId);
        return next;
      });
    }
  };
  if (profileLoading || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  // Grouper les vidéos par catégorie
  const videosByCategory = videos.reduce((acc, video) => {
    const category = video.category || "Général";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(video);
    return acc;
  }, {} as Record<string, AcademyVideo[]>);

  const completionPercentage = videos.length > 0
    ? Math.round((completedVideos.size / videos.length) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Académie</h1>
        <div className="text-sm text-muted-foreground">
          {completedVideos.size}/{videos.length} complétées
        </div>
      </div>

      {/* Barre de progression */}
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-club-orange h-2 rounded-full transition-all"
          style={{ width: `${completionPercentage}%` }}
        />
      </div>

      <Tabs defaultValue="videos" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="videos">Capsules ({videos.length})</TabsTrigger>
          <TabsTrigger value="evaluations">Évaluations ({evaluations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="space-y-6 mt-4">
          {Object.entries(videosByCategory).map(([category, categoryVideos]) => (
            <div key={category}>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase">
                {category}
              </h2>
              <div className="space-y-3">
                {categoryVideos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    isCompleted={completedVideos.has(video.id)}
                    onToggleComplete={(completed) => handleVideoComplete(video.id, completed)}
                  />
                ))}
              </div>
            </div>
          ))}

          {videos.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Aucune capsule disponible pour votre niveau
            </div>
          )}
        </TabsContent>

        <TabsContent value="evaluations" className="space-y-3 mt-4">
          {evaluations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune évaluation disponible
            </div>
          ) : (
            evaluations.map((evaluation) => (
              <EvaluationCard key={evaluation.id} evaluation={evaluation} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
