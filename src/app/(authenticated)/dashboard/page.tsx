"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { NextEventCard } from "@/components/dashboard/next-event-card";
import { AnnouncementsFeed } from "@/components/dashboard/announcements-feed";
import { Skeleton } from "@/components/ui/skeleton";
import type { Event, Group, Announcement, Partner } from "@/types/database";

interface EventWithGroup extends Event {
  groups: Group;
}

interface GroupMembership {
  group_id: string;
}

export default function DashboardPage() {
  const { activeProfile, isLoading: profileLoading } = useProfile();
  const [nextEvent, setNextEvent] = useState<EventWithGroup | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!activeProfile) return;

      setIsLoading(true);

      try {
        // Récupérer le groupe de l'athlète
        const { data: groupMembershipData } = await supabase
          .from("group_members")
          .select("group_id")
          .eq("profile_id", activeProfile.id)
          .single();

        const groupMembership = groupMembershipData as GroupMembership | null;

        // Récupérer le prochain événement
        if (groupMembership) {
          const { data: eventData } = await supabase
            .from("events")
            .select(`*, groups(*)`)
            .eq("group_id", groupMembership.group_id)
            .gte("start_time", new Date().toISOString())
            .order("start_time", { ascending: true })
            .limit(1)
            .single();

          if (eventData) {
            setNextEvent(eventData as unknown as EventWithGroup);
          }
        }

        // Récupérer les annonces
        const { data: announcementsData } = await supabase
          .from("announcements")
          .select("*")
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(10);

        if (announcementsData) {
          setAnnouncements(announcementsData);
        }

        // Récupérer les partenaires actifs
        const { data: partnersData } = await supabase
          .from("partners")
          .select("*")
          .eq("is_active", true)
          .order("tier", { ascending: true });

        if (partnersData) {
          setPartners(partnersData);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, [activeProfile]);

  if (profileLoading || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Carte Prochaine Sortie */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">
          PROCHAINE SORTIE
        </h2>
        <NextEventCard event={nextEvent} profileId={activeProfile?.id} />
      </section>

      {/* Fil d'Actualité */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">
          ACTUALITÉS
        </h2>
        <AnnouncementsFeed announcements={announcements} partners={partners} />
      </section>
    </div>
  );
}
