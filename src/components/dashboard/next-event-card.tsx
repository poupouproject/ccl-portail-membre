"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Clock, Check, X } from "lucide-react";
import { formatDate, formatTime, getInitials, getStaffRoleLabel, getStaffRoleBadgeColor } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { Event, Group, EventStaffing } from "@/types/database";

interface EventWithGroup extends Event {
  groups: Group;
}

interface AttendanceRecord {
  status: string;
}

interface NextEventCardProps {
  event: EventWithGroup | null;
  profileId?: string;
}

export function NextEventCard({ event, profileId }: NextEventCardProps) {
  const [staffing, setStaffing] = useState<EventStaffing[]>([]);
  const [attendanceStatus, setAttendanceStatus] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    async function fetchStaffing() {
      if (!event) return;

      const { data } = await supabase
        .from("v_event_staffing")
        .select("*")
        .eq("event_id", event.id);

      if (data) {
        setStaffing(data as EventStaffing[]);
      }
    }

    async function fetchAttendance() {
      if (!event || !profileId) return;

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

    fetchStaffing();
    fetchAttendance();
  }, [event, profileId]);

  const handleRSVP = async (status: "present" | "absent") => {
    if (!event || !profileId) return;

    setIsUpdating(true);

    const { error } = await (supabase as any)
      .from("attendance")
      .upsert({
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
      toast({
        title: status === "present" ? "Présence confirmée ✓" : "Absence enregistrée",
        description: `Vous avez indiqué votre ${status === "present" ? "présence" : "absence"} pour cette sortie.`,
      });
    }

    setIsUpdating(false);
  };

  if (!event) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          Aucune sortie prévue pour le moment
        </CardContent>
      </Card>
    );
  }

  const leadCoach = staffing.find((s) => s.active_role === "head_coach");

  return (
    <Card className="overflow-hidden">
      <div
        className="h-2"
        style={{ backgroundColor: event.groups?.color_code || "#FF6600" }}
      />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardDescription className="text-club-orange font-medium">
              {event.groups?.name}
            </CardDescription>
            <CardTitle className="text-lg">{event.title}</CardTitle>
          </div>
          {attendanceStatus && (
            <Badge
              variant={attendanceStatus === "present" ? "success" : "secondary"}
            >
              {attendanceStatus === "present" ? "Présent" : "Absent"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date et heure */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{formatDate(event.start_time, { weekday: "short", month: "short", day: "numeric" })}</span>
            <span>•</span>
            <span>{formatTime(event.start_time)}</span>
          </div>
        </div>

        {/* Lieu */}
        {event.location_name && (
          <div className="flex items-center gap-1.5 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            {event.location_url ? (
              <a
                href={event.location_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-club-orange hover:underline"
              >
                {event.location_name}
              </a>
            ) : (
              <span>{event.location_name}</span>
            )}
          </div>
        )}

        {/* Staff */}
        {leadCoach && (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={leadCoach.avatar_url || undefined} />
              <AvatarFallback className="text-xs">
                {getInitials(leadCoach.first_name, leadCoach.last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {leadCoach.first_name} {leadCoach.last_name}
              </span>
              <Badge className={getStaffRoleBadgeColor(leadCoach.active_role)}>
                {getStaffRoleLabel(leadCoach.active_role)}
              </Badge>
            </div>
          </div>
        )}

        {/* Boutons RSVP */}
        <div className="flex gap-2 pt-2">
          <Button
            variant={attendanceStatus === "present" ? "default" : "outline"}
            className="flex-1"
            onClick={() => handleRSVP("present")}
            disabled={isUpdating}
          >
            <Check className="h-4 w-4 mr-1" />
            Présent
          </Button>
          <Button
            variant={attendanceStatus === "absent" ? "secondary" : "outline"}
            className="flex-1"
            onClick={() => handleRSVP("absent")}
            disabled={isUpdating}
          >
            <X className="h-4 w-4 mr-1" />
            Absent
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
