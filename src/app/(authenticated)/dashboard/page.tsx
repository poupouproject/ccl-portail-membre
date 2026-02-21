"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  
  // Références stables pour éviter les race conditions
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchIdRef = useRef(0);

  // Utiliser des IDs stables comme dépendances
  const activeProfileId = activeProfile?.id;
  const activeContextGroupId = activeContext?.group_id;

  useEffect(() => {
    // Ne pas démarrer le fetch si les providers sont encore en chargement
    if (profileLoading || contextLoading) {
      return;
    }
    
    // Annuler la requête précédente si elle existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Créer un nouvel AbortController
    abortControllerRef.current = new AbortController();
    const currentFetchId = ++fetchIdRef.current;
    
    async function fetchDashboardData() {
      if (!activeProfileId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        // Vérifier si cette requête est toujours valide
        if (currentFetchId !== fetchIdRef.current) return;
        
        // Si on a un contexte actif avec un groupe, utiliser ce groupe
        // Sinon, utiliser l'ancienne méthode avec group_members
        let groupIds: string[] = [];
        
        if (activeContextGroupId) {
          // Utiliser le groupe du contexte actif
          groupIds = [activeContextGroupId];
        } else {
          // Fallback: récupérer les groupes via group_members
          const { data: groupMembershipsData, error: groupError } = await supabase
            .from("group_members")
            .select("group_id, groups(*)")
            .eq("profile_id", activeProfileId);

          if (groupError) {
            console.error("Erreur lors de la récupération des groupes:", groupError);
          }

          const groupMemberships = groupMembershipsData as GroupMembership[] | null;
          if (groupMemberships && groupMemberships.length > 0) {
            groupIds = groupMemberships.map((m) => m.group_id);
          }
        }

        // Vérifier si cette requête est toujours valide après l'await
        if (currentFetchId !== fetchIdRef.current) return;

        // Récupérer le prochain événement via event_groups
        let foundEvent: EventWithDetails | null = null;
        
        if (groupIds.length > 0) {
          // Chercher les événements liés à ces groupes via event_groups
          const { data: eventGroupsData, error: eventGroupsError } = await supabase
            .from("event_groups")
            .select("event_id")
            .in("group_id", groupIds);
          
          if (eventGroupsError) {
            console.error("Erreur lors de la récupération des event_groups:", eventGroupsError);
          }
          
          if (eventGroupsData && eventGroupsData.length > 0) {
            const rows = eventGroupsData as EventGroupRow[];
            const eventIds = [...new Set(rows.map((eg) => eg.event_id))];
            
            const { data: eventData, error: eventError } = await supabase
              .from("events")
              .select(`*, locations(*), event_groups(group_id, groups(*))`)
              .in("id", eventIds)
              .eq("is_cancelled", false)
              .gte("start_time", new Date().toISOString())
              .order("start_time", { ascending: true })
              .limit(1)
              .maybeSingle();

            if (eventError) {
              console.error("Erreur lors de la récupération de l'événement:", eventError);
            }

            // Vérifier si cette requête est toujours valide
            if (currentFetchId !== fetchIdRef.current) return;

            if (eventData) {
              foundEvent = eventData as unknown as EventWithDetails;
            }
          }
        } else if (isCoach) {
          // Les coachs voient tous les événements à venir
          const { data: eventData, error: eventError } = await supabase
            .from("events")
            .select(`*, locations(*), event_groups(group_id, groups(*))`)
            .eq("is_cancelled", false)
            .gte("start_time", new Date().toISOString())
            .order("start_time", { ascending: true })
            .limit(1)
            .maybeSingle();

          if (eventError) {
            console.error("Erreur lors de la récupération de l'événement (coach):", eventError);
          }

          // Vérifier si cette requête est toujours valide
          if (currentFetchId !== fetchIdRef.current) return;

          if (eventData) {
            foundEvent = eventData as unknown as EventWithDetails;
          }
        }
        
        // Mettre à jour l'événement seulement si la requête est toujours valide
        if (currentFetchId === fetchIdRef.current) {
          setNextEvent(foundEvent);
        }

        // Vérifier avant les annonces
        if (currentFetchId !== fetchIdRef.current) return;

        // Récupérer les annonces
        const { data: announcementsData, error: announcementsError } = await supabase
          .from("announcements")
          .select("*")
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .order("is_pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(10);

        if (announcementsError) {
          console.error("Erreur lors de la récupération des annonces:", announcementsError);
        }

        if (currentFetchId !== fetchIdRef.current) return;

        if (announcementsData) {
          setAnnouncements(announcementsData);
        }

        // Récupérer les partenaires actifs
        const { data: partnersData, error: partnersError } = await supabase
          .from("partners")
          .select("*")
          .eq("is_active", true)
          .order("tier", { ascending: true });

        if (partnersError) {
          console.error("Erreur lors de la récupération des partenaires:", partnersError);
        }

        if (currentFetchId !== fetchIdRef.current) return;

        if (partnersData) {
          setPartners(partnersData);
        }
      } catch (error) {
        // Ignorer les erreurs si la requête a été annulée
        if (currentFetchId !== fetchIdRef.current) return;
        console.error("Erreur lors du chargement des données:", error);
      } finally {
        // Ne mettre à jour l'état loading que si c'est toujours la requête active
        if (currentFetchId === fetchIdRef.current) {
          setIsLoading(false);
        }
      }
    }

    fetchDashboardData();
    
    // Cleanup: invalider cette requête si les dépendances changent
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [activeProfileId, activeContextGroupId, isCoach, profileLoading, contextLoading]);

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
