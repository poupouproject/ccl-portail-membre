"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { EventListItem } from "@/components/calendar/event-list-item";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Event, Group } from "@/types/database";

interface EventWithGroup extends Event {
  groups: Group;
}

export default function CalendarPage() {
  const { activeProfile, isLoading: profileLoading } = useProfile();
  const [upcomingEvents, setUpcomingEvents] = useState<EventWithGroup[]>([]);
  const [pastEvents, setPastEvents] = useState<EventWithGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      if (!activeProfile) return;

      setIsLoading(true);

      try {
        // Récupérer les groupes de l'athlète
        const { data: groupMemberships } = await supabase
          .from("group_members")
          .select("group_id")
          .eq("profile_id", activeProfile.id);

        if (!groupMemberships || groupMemberships.length === 0) {
          setIsLoading(false);
          return;
        }

        const groupIds = groupMemberships.map((m) => m.group_id);
        const now = new Date().toISOString();

        // Événements à venir
        const { data: upcoming } = await supabase
          .from("events")
          .select(`*, groups(*)`)
          .in("group_id", groupIds)
          .gte("start_time", now)
          .order("start_time", { ascending: true })
          .limit(20);

        if (upcoming) {
          setUpcomingEvents(upcoming as unknown as EventWithGroup[]);
        }

        // Événements passés
        const { data: past } = await supabase
          .from("events")
          .select(`*, groups(*)`)
          .in("group_id", groupIds)
          .lt("start_time", now)
          .order("start_time", { ascending: false })
          .limit(10);

        if (past) {
          setPastEvents(past as unknown as EventWithGroup[]);
        }
      } catch (error) {
        console.error("Erreur lors du chargement des événements:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchEvents();
  }, [activeProfile]);

  if (profileLoading || isLoading) {
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
      <h1 className="text-2xl font-bold">Calendrier</h1>

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
