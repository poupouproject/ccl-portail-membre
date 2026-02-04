"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { useActiveContext } from "@/hooks/use-active-context";
import { NextEventCard } from "@/components/dashboard/next-event-card";
import { AnnouncementsFeed } from "@/components/dashboard/announcements-feed";
import { ParentDashboardSection } from "@/components/dashboard/parent-dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import type { Event, Group, Announcement, Partner, Location } from "@/types/database";

interface EventWithDetails extends Event {
  groups?: Group | null;
  locations?: Location | null;
  event_groups?: { group_id: string; groups: Group }[];
}

interface GroupMembership {
  group_id: string;
  groups: Group;
}

interface EventGroupRow {
  event_id: string;
}

export default function DashboardPage() {
  const { activeProfile, isLoading: profileLoading, isCoach } = useProfile();
  const { activeContext, isLoading: contextLoading, isParent } = useActiveContext();
  const [nextEvent, setNextEvent] = useState<EventWithDetails | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!activeProfile) return;

      setIsLoading(true);

      try {
        // Si on a un contexte actif avec un groupe, utiliser ce groupe
        // Sinon, utiliser l'ancienne méthode avec group_members
        let groupIds: string[] = [];
        
        if (activeContext?.group_id) {
          // Utiliser le groupe du contexte actif
          groupIds = [activeContext.group_id];
        } else {
          // Fallback: récupérer les groupes via group_members
          const { data: groupMembershipsData } = await supabase
            .from("group_members")
            .select("group_id, groups(*)")
            .eq("profile_id", activeProfile.id);

          const groupMemberships = groupMembershipsData as GroupMembership[] | null;
          if (groupMemberships && groupMemberships.length > 0) {
            groupIds = groupMemberships.map((m) => m.group_id);
          }
        }

        // Récupérer le prochain événement via event_groups
        if (groupIds.length > 0) {
          // Chercher les événements liés à ces groupes via event_groups
          const { data: eventGroupsData } = await supabase
            .from("event_groups")
            .select("event_id")
            .in("group_id", groupIds);
          
          if (eventGroupsData && eventGroupsData.length > 0) {
            const rows = eventGroupsData as EventGroupRow[];
            const eventIds = [...new Set(rows.map((eg) => eg.event_id))];
            
            const { data: eventData } = await supabase
              .from("events")
              .select(`*, locations(*), event_groups(group_id, groups(*))`)
              .in("id", eventIds)
              .eq("is_cancelled", false)
              .gte("start_time", new Date().toISOString())
              .order("start_time", { ascending: true })
              .limit(1)
              .maybeSingle();

            if (eventData) {
              setNextEvent(eventData as unknown as EventWithDetails);
            }
          }
        } else if (isCoach) {
          // Les coachs voient tous les événements à venir
          const { data: eventData } = await supabase
            .from("events")
            .select(`*, locations(*), event_groups(group_id, groups(*))`)
            .eq("is_cancelled", false)
            .gte("start_time", new Date().toISOString())
            .order("start_time", { ascending: true })
            .limit(1)
            .maybeSingle();

          if (eventData) {
            setNextEvent(eventData as unknown as EventWithDetails);
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
  }, [activeProfile, activeContext]);

  if (profileLoading || contextLoading || isLoading) {
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
      {/* Section Parent - Vue des enfants */}
      {isParent && <ParentDashboardSection />}

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
