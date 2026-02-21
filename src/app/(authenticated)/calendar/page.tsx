"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { useActiveContext } from "@/hooks/use-active-context";
import { EventListItem } from "@/components/calendar/event-list-item";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { Event, Group, Location } from "@/types/database";

interface EventWithDetails extends Event {
  groups?: Group | null;
  locations?: Location | null;
  event_groups?: { group_id: string; groups: Group }[];
}

interface GroupMembership {
  group_id: string;
}

interface EventGroupRow {
  event_id: string;
}

export default function CalendarPage() {
  const { activeProfile, isLoading: profileLoading, isCoach } = useProfile();
  const { activeContext, isLoading: contextLoading, activeGroup } = useActiveContext();
  const [upcomingEvents, setUpcomingEvents] = useState<EventWithDetails[]>([]);
  const [pastEvents, setPastEvents] = useState<EventWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Counter to force re-fetch when context changes
  const [contextChangeCounter, setContextChangeCounter] = useState(0);
  
  // Références stables pour éviter les race conditions
  const fetchIdRef = useRef(0);
  
  // Utiliser des IDs stables comme dépendances
  const activeProfileId = activeProfile?.id;
  const activeContextGroupId = activeContext?.group_id;

  // Listen for context changes to refresh data
  useEffect(() => {
    function handleContextChange() {
      setContextChangeCounter((c) => c + 1);
    }
    window.addEventListener("context-changed", handleContextChange);
    return () => window.removeEventListener("context-changed", handleContextChange);
  }, []);

  useEffect(() => {
    // Ne pas démarrer le fetch si les providers sont encore en chargement
    if (profileLoading || contextLoading) {
      // Ne pas garder isLoading à true quand on attend les providers
      setIsLoading(false);
      return;
    }
    
    const currentFetchId = ++fetchIdRef.current;
    
    async function fetchEvents() {
      if (!activeProfileId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        // Vérifier si cette requête est toujours valide
        if (currentFetchId !== fetchIdRef.current) return;
        
        const now = new Date().toISOString();
        let groupIds: string[] = [];

        // Si on a un contexte actif avec un groupe, utiliser ce groupe
        if (activeContextGroupId) {
          groupIds = [activeContextGroupId];
        } else {
          // Fallback: récupérer les groupes via group_members
          const { data: groupMembershipsData, error: groupError } = await supabase
            .from("group_members")
            .select("group_id")
            .eq("profile_id", activeProfileId);

          if (groupError) {
            console.error("Erreur lors de la récupération des groupes:", groupError);
          }

          const groupMemberships = groupMembershipsData as GroupMembership[] | null;
          if (groupMemberships && groupMemberships.length > 0) {
            groupIds = groupMemberships.map((m) => m.group_id);
          }
        }

        // Vérifier si cette requête est toujours valide
        if (currentFetchId !== fetchIdRef.current) return;

        // Si l'utilisateur n'a pas de groupe mais est coach, montrer tous les événements
        if (groupIds.length === 0 && !isCoach) {
          if (currentFetchId === fetchIdRef.current) {
            setUpcomingEvents([]);
            setPastEvents([]);
            setIsLoading(false);
          }
          return;
        }

        let eventIds: string[] = [];
        
        if (groupIds.length > 0) {
          // Chercher les événements liés à ces groupes via event_groups
          const { data: eventGroupsData, error: eventGroupsError } = await supabase
            .from("event_groups")
            .select("event_id")
            .in("group_id", groupIds);
          
          if (eventGroupsError) {
            console.error("Erreur lors de la récupération des event_groups:", eventGroupsError);
          }
          
          if (eventGroupsData) {
            const rows = eventGroupsData as EventGroupRow[];
            eventIds = [...new Set(rows.map((eg) => eg.event_id))];
          }
        }

        // Vérifier si cette requête est toujours valide
        if (currentFetchId !== fetchIdRef.current) return;

        // Événements à venir
        let upcomingQuery = supabase
          .from("events")
          .select(`*, locations(*), event_groups(group_id, groups(*))`)
          .eq("is_cancelled", false)
          .gte("start_time", now)
          .order("start_time", { ascending: true })
          .limit(20);

        // Si pas coach, filtrer par les event_ids
        if (!isCoach && eventIds.length > 0) {
          upcomingQuery = upcomingQuery.in("id", eventIds);
        } else if (!isCoach && eventIds.length === 0) {
          if (currentFetchId === fetchIdRef.current) {
            setUpcomingEvents([]);
            setPastEvents([]);
            setIsLoading(false);
          }
          return;
        }

        const { data: upcoming, error: upcomingError } = await upcomingQuery;

        if (upcomingError) {
          console.error("Erreur lors de la récupération des événements à venir:", upcomingError);
        }

        // Vérifier si cette requête est toujours valide
        if (currentFetchId !== fetchIdRef.current) return;

        if (upcoming) {
          setUpcomingEvents(upcoming as unknown as EventWithDetails[]);
        }

        // Événements passés
        let pastQuery = supabase
          .from("events")
          .select(`*, locations(*), event_groups(group_id, groups(*))`)
          .lt("start_time", now)
          .order("start_time", { ascending: false })
          .limit(10);

        if (!isCoach && eventIds.length > 0) {
          pastQuery = pastQuery.in("id", eventIds);
        } else if (!isCoach && eventIds.length === 0) {
          if (currentFetchId === fetchIdRef.current) {
            setPastEvents([]);
            setIsLoading(false);
          }
          return;
        }

        const { data: past, error: pastError } = await pastQuery;

        if (pastError) {
          console.error("Erreur lors de la récupération des événements passés:", pastError);
        }

        // Vérifier si cette requête est toujours valide
        if (currentFetchId !== fetchIdRef.current) return;

        if (past) {
          setPastEvents(past as unknown as EventWithDetails[]);
        }
      } catch (error) {
        if (currentFetchId !== fetchIdRef.current) return;
        console.error("Erreur lors du chargement des événements:", error);
      } finally {
        if (currentFetchId === fetchIdRef.current) {
          setIsLoading(false);
        }
      }
    }

    fetchEvents();
  }, [activeProfileId, activeContextGroupId, isCoach, profileLoading, contextLoading, contextChangeCounter]);

  if (profileLoading || contextLoading || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Calendrier</h1>
        {activeGroup && (
          <Badge variant="outline" className="text-sm">
            {activeGroup.name}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming">À venir ({upcomingEvents.length})</TabsTrigger>
          <TabsTrigger value="past">Passés ({pastEvents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-3 mt-4">
          {upcomingEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun événement à venir
            </div>
          ) : (
            upcomingEvents.map((event) => (
              <EventListItem
                key={event.id}
                event={event}
                profileId={activeProfile?.id}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-3 mt-4">
          {pastEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun événement passé
            </div>
          ) : (
            pastEvents.map((event) => (
              <EventListItem
                key={event.id}
                event={event}
                profileId={activeProfile?.id}
                isPast
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
