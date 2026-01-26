/**
 * Types pour les queries Supabase avec jointures
 * Ces types sont utilisés pour typer correctement les résultats des queries relationnelles
 */

import type { Profile, Group, Event, Announcement, Partner, AcademyVideo, Evaluation, RelationType } from "./database";

// Type pour user_profile_access avec jointure sur profiles
export interface ProfileAccessWithProfile {
  id: string;
  user_id: string;
  profile_id: string;
  relation: RelationType;
  profile: Profile | null;
}

// Type pour group_members avec jointure sur groups
export interface GroupMembershipWithGroup {
  id: string;
  profile_id: string;
  group_id: string;
  enrolled_at: string;
  groups: Group | null;
}

// Type pour event_staff avec jointure sur events
export interface EventStaffWithEvent {
  id: string;
  event_id: string;
  profile_id: string;
  role: string;
  events: Event | null;
}

// Type pour attendance
export interface AttendanceRecord {
  id: string;
  event_id: string;
  profile_id: string;
  status: "unknown" | "present" | "absent" | "late" | "excused";
  marked_by: string | null;
  marked_at: string | null;
  created_at: string;
  updated_at: string;
}

// Type pour profile_progression
export interface ProfileProgressionRecord {
  id: string;
  profile_id: string;
  video_id: string;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
}

// Re-export des types de base pour faciliter les imports
export type { Profile, Group, Event, Announcement, Partner, AcademyVideo, Evaluation, RelationType };
