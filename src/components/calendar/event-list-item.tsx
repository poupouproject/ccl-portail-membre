"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Check, X } from "lucide-react";
import { formatTime, cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { Event, Group, Location } from "@/types/database";

interface EventWithDetails extends Event {
  groups?: Group | null;
  locations?: Location | null;
  event_groups?: { group_id: string; groups: Group }[];
}

interface AttendanceRecord {
  status: string;
}

interface EventListItemProps {
  event: EventWithDetails;
  profileId?: string;
  isPast?: boolean;
}

// Helper to get all groups from event
function getEventGroups(event: EventWithDetails): Group[] {
  if (event.event_groups && event.event_groups.length > 0) {
    return event.event_groups.map(eg => eg.groups).filter(Boolean);
  }
  if (event.groups) return [event.groups];
  return [];
}

// Helper to get the first group from event (handles both old and new structure)
function getEventGroup(event: EventWithDetails): Group | null {
  const groups = getEventGroups(event);
  return groups.length > 0 ? groups[0] : null;
}

// Helper to get location info
function getLocationName(event: EventWithDetails): string | null {
  if (event.locations) return event.locations.name;
  return event.location_name;
}

export function EventListItem({ event, profileId, isPast = false }: EventListItemProps) {
  const [attendanceStatus, setAttendanceStatus] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    async function fetchAttendance() {
      if (!profileId) return;

      const { data: attendanceData, error } = await supabase
        .from("attendance")
        .select("status")
        .eq("event_id", event.id)
        .eq("profile_id", profileId)
        .maybeSingle();

      // Ignore errors (RLS ou pas de données)
      if (!error && attendanceData) {
        setAttendanceStatus((attendanceData as AttendanceRecord).status);
      }
    }

    fetchAttendance();
  }, [event.id, profileId]);

  const handleRSVP = async (status: "present" | "absent") => {
    if (!profileId || isPast) return;

    setIsUpdating(true);

    const { error } = await (supabase as any).from("attendance").upsert({
      event_id: event.id,
      profile_id: profileId,
      status,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour votre présence",
        variant: "destructive",
      });
    } else {
      setAttendanceStatus(status);
    }

    setIsUpdating(false);
  };

  const group = getEventGroup(event);
  const allGroups = getEventGroups(event);
  const locationName = getLocationName(event);

  return (
    <Card className={cn("overflow-hidden", isPast && "opacity-60")}>
      <div
        className="h-1"
        style={{ backgroundColor: group?.color_code || "#FF6600" }}
      />
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Date Column */}
          <div className="text-center min-w-[50px]">
            <div className="text-2xl font-bold">
              {new Date(event.start_time).getDate()}
            </div>
            <div className="text-xs text-muted-foreground uppercase">
              {new Date(event.start_time).toLocaleDateString("fr-CA", {
                month: "short",
              })}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{event.title}</h3>
                {allGroups.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {allGroups.map((g) => (
                      <Badge
                        key={g.id}
                        variant="outline"
                        className="text-xs"
                        style={{ borderColor: g.color_code, color: g.color_code }}
                      >
                        {g.name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-club-orange font-medium">
                    {event.is_for_recreational ? "Récréatif" : event.is_for_intensive ? "Intensif" : "Tous"}
                  </p>
                )}
              </div>
              {attendanceStatus && (
                <Badge
                  variant={attendanceStatus === "present" ? "success" : "secondary"}
                  className="shrink-0"
                >
                  {attendanceStatus === "present" ? "✓" : "✗"}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(event.start_time)}
              </div>
              {locationName && (
                <div className="flex items-center gap-1 truncate">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{locationName}</span>
                </div>
              )}
            </div>

            {/* RSVP Buttons (only for upcoming events) */}
            {!isPast && (
              <div className="flex gap-2 mt-3">
                <Button
                  variant={attendanceStatus === "present" ? "default" : "outline"}
                  size="sm"
                  className="flex-1 h-8"
                  onClick={() => handleRSVP("present")}
                  disabled={isUpdating}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Présent
                </Button>
                <Button
                  variant={attendanceStatus === "absent" ? "secondary" : "outline"}
                  size="sm"
                  className="flex-1 h-8"
                  onClick={() => handleRSVP("absent")}
                  disabled={isUpdating}
                >
                  <X className="h-3 w-3 mr-1" />
                  Absent
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
