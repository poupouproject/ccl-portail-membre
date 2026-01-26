"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Check, X } from "lucide-react";
import { formatTime, cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { Event, Group } from "@/types/database";

interface EventWithGroup extends Event {
  groups: Group;
}

interface AttendanceRecord {
  status: string;
}

interface EventListItemProps {
  event: EventWithGroup;
  profileId?: string;
  isPast?: boolean;
}

export function EventListItem({ event, profileId, isPast = false }: EventListItemProps) {
  const [attendanceStatus, setAttendanceStatus] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    async function fetchAttendance() {
      if (!profileId) return;

      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("status")
        .eq("event_id", event.id)
        .eq("profile_id", profileId)
        .single();

      const attendance = attendanceData as AttendanceRecord | null;
      if (attendance) {
        setAttendanceStatus(attendance.status);
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

  return (
    <Card className={cn("overflow-hidden", isPast && "opacity-60")}>
      <div
        className="h-1"
        style={{ backgroundColor: event.groups?.color_code || "#FF6600" }}
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
              <div>
                <h3 className="font-semibold text-sm truncate">{event.title}</h3>
                <p className="text-xs text-club-orange font-medium">
                  {event.groups?.name}
                </p>
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
              {event.location_name && (
                <div className="flex items-center gap-1 truncate">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{event.location_name}</span>
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
