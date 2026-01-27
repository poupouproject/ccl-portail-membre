/**
 * Types générés pour la base de données Supabase
 * Ces types correspondent au schéma défini dans db-draft-shema.sql
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Enums
export type UserRole = "admin" | "coach" | "athlete";
export type RelationType = "self" | "parent" | "guardian";
export type StaffRole = "head_coach" | "assistant" | "sweeper";
export type AttendanceStatus = "unknown" | "present" | "absent" | "late" | "excused";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          odoo_id: number | null;
          claim_code: string | null;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          avatar_url: string | null;
          role: UserRole;
          medical_notes: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          emergency_contact_relation: string | null;
          address_line1: string | null;
          address_city: string | null;
          address_postal_code: string | null;
          birth_date: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          odoo_id?: number | null;
          claim_code?: string | null;
          first_name: string;
          last_name: string;
          email?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          medical_notes?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          emergency_contact_relation?: string | null;
          address_line1?: string | null;
          address_city?: string | null;
          address_postal_code?: string | null;
          birth_date?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          odoo_id?: number | null;
          claim_code?: string | null;
          first_name?: string;
          last_name?: string;
          email?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          medical_notes?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          emergency_contact_relation?: string | null;
          address_line1?: string | null;
          address_city?: string | null;
          address_postal_code?: string | null;
          birth_date?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_profile_access: {
        Row: {
          id: string;
          user_id: string;
          profile_id: string;
          relation: RelationType;
          permissions: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          profile_id: string;
          relation: RelationType;
          permissions?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          profile_id?: string;
          relation?: RelationType;
          permissions?: Json;
          created_at?: string;
        };
      };
      groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          level_required: number;
          color_code: string;
          chat_channel_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          level_required?: number;
          color_code?: string;
          chat_channel_id?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          level_required?: number;
          color_code?: string;
          chat_channel_id?: string;
          created_at?: string;
        };
      };
      group_members: {
        Row: {
          group_id: string;
          profile_id: string;
          joined_at: string;
        };
        Insert: {
          group_id: string;
          profile_id: string;
          joined_at?: string;
        };
        Update: {
          group_id?: string;
          profile_id?: string;
          joined_at?: string;
        };
      };
      group_staff: {
        Row: {
          group_id: string;
          profile_id: string;
          default_role: StaffRole;
        };
        Insert: {
          group_id: string;
          profile_id: string;
          default_role?: StaffRole;
        };
        Update: {
          group_id?: string;
          profile_id?: string;
          default_role?: StaffRole;
        };
      };
      events: {
        Row: {
          id: string;
          group_id: string;
          title: string;
          description: string | null;
          location_name: string | null;
          location_url: string | null;
          start_time: string;
          end_time: string;
          event_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          title: string;
          description?: string | null;
          location_name?: string | null;
          location_url?: string | null;
          start_time: string;
          end_time: string;
          event_type?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          title?: string;
          description?: string | null;
          location_name?: string | null;
          location_url?: string | null;
          start_time?: string;
          end_time?: string;
          event_type?: string;
          created_at?: string;
        };
      };
      event_staff: {
        Row: {
          event_id: string;
          profile_id: string;
          role_on_site: StaffRole;
          is_confirmed: boolean;
        };
        Insert: {
          event_id: string;
          profile_id: string;
          role_on_site?: StaffRole;
          is_confirmed?: boolean;
        };
        Update: {
          event_id?: string;
          profile_id?: string;
          role_on_site?: StaffRole;
          is_confirmed?: boolean;
        };
      };
      attendance: {
        Row: {
          id: string;
          event_id: string;
          profile_id: string;
          status: AttendanceStatus;
          note: string | null;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          profile_id: string;
          status?: AttendanceStatus;
          note?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          profile_id?: string;
          status?: AttendanceStatus;
          note?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
      };
      evaluations: {
        Row: {
          id: string;
          profile_id: string;
          coach_id: string | null;
          evaluation_date: string;
          details: Json | null;
          recommended_level: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          coach_id?: string | null;
          evaluation_date?: string;
          details?: Json | null;
          recommended_level?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          coach_id?: string | null;
          evaluation_date?: string;
          details?: Json | null;
          recommended_level?: number | null;
          notes?: string | null;
          created_at?: string;
        };
      };
      academy_videos: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          video_provider: string;
          video_id: string;
          category: string | null;
          level_min: number;
          is_published: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          video_provider?: string;
          video_id: string;
          category?: string | null;
          level_min?: number;
          is_published?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          video_provider?: string;
          video_id?: string;
          category?: string | null;
          level_min?: number;
          is_published?: boolean;
          created_at?: string;
        };
      };
      profile_progression: {
        Row: {
          profile_id: string;
          video_id: string;
          is_completed: boolean;
          completed_at: string | null;
        };
        Insert: {
          profile_id: string;
          video_id: string;
          is_completed?: boolean;
          completed_at?: string | null;
        };
        Update: {
          profile_id?: string;
          video_id?: string;
          is_completed?: boolean;
          completed_at?: string | null;
        };
      };
      announcements: {
        Row: {
          id: string;
          title: string;
          content: string | null;
          image_url: string | null;
          is_pinned: boolean;
          created_at: string;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          content?: string | null;
          image_url?: string | null;
          is_pinned?: boolean;
          created_at?: string;
          expires_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string | null;
          image_url?: string | null;
          is_pinned?: boolean;
          created_at?: string;
          expires_at?: string | null;
        };
      };
      partners: {
        Row: {
          id: string;
          name: string;
          logo_url: string;
          website_url: string | null;
          promo_code: string | null;
          promo_description: string | null;
          tier: number;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          logo_url: string;
          website_url?: string | null;
          promo_code?: string | null;
          promo_description?: string | null;
          tier?: number;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          logo_url?: string;
          website_url?: string | null;
          promo_code?: string | null;
          promo_description?: string | null;
          tier?: number;
          is_active?: boolean;
        };
      };
    };
    Views: {
      v_event_staffing: {
        Row: {
          event_id: string;
          title: string;
          start_time: string;
          group_id: string;
          profile_id: string;
          first_name: string;
          last_name: string;
          avatar_url: string | null;
          active_role: StaffRole;
          is_override: boolean;
        };
      };
    };
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      relation_type: RelationType;
      staff_role: StaffRole;
      attendance_status: AttendanceStatus;
    };
  };
}

// Types utilitaires pour les composants
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Group = Database["public"]["Tables"]["groups"]["Row"];
export type Event = Database["public"]["Tables"]["events"]["Row"];
export type Attendance = Database["public"]["Tables"]["attendance"]["Row"];
export type Evaluation = Database["public"]["Tables"]["evaluations"]["Row"];
export type Announcement = Database["public"]["Tables"]["announcements"]["Row"];
export type Partner = Database["public"]["Tables"]["partners"]["Row"];
export type AcademyVideo = Database["public"]["Tables"]["academy_videos"]["Row"];

// Types pour les vues
export type EventStaffing = Database["public"]["Views"]["v_event_staffing"]["Row"];

// Types composés pour les requêtes avec relations
export type EventWithGroup = Event & {
  group: Group;
};

export type EventWithStaffing = Event & {
  group: Group;
  staffing: EventStaffing[];
};

export type ProfileWithAccess = Profile & {
  relation: RelationType;
  permissions: Json;
};
