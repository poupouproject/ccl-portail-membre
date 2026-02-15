/**
 * Types générés pour la base de données Supabase
 * Ces types correspondent au schéma défini dans les migrations
 * Version mise à jour avec support multi-abonnements, rôles, Odoo
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Enums
export type UserRole = "admin" | "coach" | "athlete" | "parent";
export type RelationType = "self" | "parent" | "guardian";
export type StaffRole = "head_coach" | "assistant" | "sweeper";
export type AttendanceStatus = "unknown" | "present" | "absent" | "late" | "excused";
export type GroupCategory = "recreational" | "intensive";
export type EventScheduleType = "regular" | "special";
export type ChatChannelType = "all" | "recreational" | "intensive" | "staff";
export type MembershipStatus = "active" | "lapsed" | "pending" | "archived";
export type DeviceType = "web" | "ios" | "android";
export type SubscriptionStatus = "active" | "pending" | "expired" | "cancelled";
export type ContextType = "participant" | "coach" | "dependent";
export type RoleSource = "subscription" | "group_staff" | "manual";
export type SubscriptionCategory = "jeunesse" | "adulte";
export type SubscriptionFrequency = "1x_semaine" | "2x_semaine" | "illimite";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          auth_user_id: string | null;
          odoo_id: number | null;
          parent_odoo_id: number | null;
          claim_code: string | null;
          wa_member_id: string | null;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          avatar_url: string | null;
          role: UserRole;
          member_category: GroupCategory | null;
          medical_notes: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          emergency_contact_relation: string | null;
          address_line1: string | null;
          address_city: string | null;
          address_postal_code: string | null;
          birth_date: string | null;
          birthdate: string | null;
          photo_permission: boolean;
          is_active: boolean;
          is_admin: boolean;
          is_coordinator: boolean;
          is_minor: boolean;
          is_autonomous: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          odoo_id?: number | null;
          parent_odoo_id?: number | null;
          claim_code?: string | null;
          wa_member_id?: string | null;
          first_name: string;
          last_name: string;
          email?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          member_category?: GroupCategory | null;
          medical_notes?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          emergency_contact_relation?: string | null;
          address_line1?: string | null;
          address_city?: string | null;
          address_postal_code?: string | null;
          birth_date?: string | null;
          birthdate?: string | null;
          photo_permission?: boolean;
          is_active?: boolean;
          is_admin?: boolean;
          is_coordinator?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string | null;
          odoo_id?: number | null;
          parent_odoo_id?: number | null;
          claim_code?: string | null;
          wa_member_id?: string | null;
          first_name?: string;
          last_name?: string;
          email?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          member_category?: GroupCategory | null;
          medical_notes?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          emergency_contact_relation?: string | null;
          address_line1?: string | null;
          address_city?: string | null;
          address_postal_code?: string | null;
          birth_date?: string | null;
          birthdate?: string | null;
          photo_permission?: boolean;
          is_active?: boolean;
          is_admin?: boolean;
          is_coordinator?: boolean;
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
          category: GroupCategory;
          default_day_of_week: number | null;
          is_active: boolean;
          chat_channel_id: string;
          season: number | null;
          internal_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          level_required?: number;
          color_code?: string;
          category?: GroupCategory;
          default_day_of_week?: number | null;
          is_active?: boolean;
          chat_channel_id?: string;
          season?: number | null;
          internal_notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          level_required?: number;
          color_code?: string;
          category?: GroupCategory;
          default_day_of_week?: number | null;
          is_active?: boolean;
          chat_channel_id?: string;
          season?: number | null;
          internal_notes?: string | null;
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
      locations: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          google_maps_url: string | null;
          is_default: boolean;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          google_maps_url?: string | null;
          is_default?: boolean;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          google_maps_url?: string | null;
          is_default?: boolean;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          group_id: string | null;
          title: string;
          description: string | null;
          location_name: string | null;
          location_url: string | null;
          location_id: string | null;
          start_time: string;
          end_time: string;
          event_type: string;
          schedule_type: EventScheduleType;
          is_for_recreational: boolean;
          is_for_intensive: boolean;
          is_cancelled: boolean;
          cancellation_reason: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id?: string | null;
          title: string;
          description?: string | null;
          location_name?: string | null;
          location_url?: string | null;
          location_id?: string | null;
          start_time: string;
          end_time: string;
          event_type?: string;
          schedule_type?: EventScheduleType;
          is_for_recreational?: boolean;
          is_for_intensive?: boolean;
          is_cancelled?: boolean;
          cancellation_reason?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string | null;
          title?: string;
          description?: string | null;
          location_name?: string | null;
          location_url?: string | null;
          location_id?: string | null;
          start_time?: string;
          end_time?: string;
          event_type?: string;
          schedule_type?: EventScheduleType;
          is_for_recreational?: boolean;
          is_for_intensive?: boolean;
          is_cancelled?: boolean;
          cancellation_reason?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
      event_groups: {
        Row: {
          event_id: string;
          group_id: string;
          created_at: string;
        };
        Insert: {
          event_id: string;
          group_id: string;
          created_at?: string;
        };
        Update: {
          event_id?: string;
          group_id?: string;
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
          subscription_id: string | null;
          status: AttendanceStatus;
          note: string | null;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          profile_id: string;
          subscription_id?: string | null;
          status?: AttendanceStatus;
          note?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          profile_id?: string;
          subscription_id?: string | null;
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
      chat_messages: {
        Row: {
          id: string;
          author_id: string;
          channel: ChatChannelType;
          content: string;
          is_important: boolean;
          is_pinned: boolean;
          reply_to_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          channel?: ChatChannelType;
          content: string;
          is_important?: boolean;
          is_pinned?: boolean;
          reply_to_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          channel?: ChatChannelType;
          content?: string;
          is_important?: boolean;
          is_pinned?: boolean;
          reply_to_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      chat_read_status: {
        Row: {
          user_id: string;
          channel: ChatChannelType;
          last_read_at: string;
        };
        Insert: {
          user_id: string;
          channel?: ChatChannelType;
          last_read_at?: string;
        };
        Update: {
          user_id?: string;
          channel?: ChatChannelType;
          last_read_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          profile_id: string | null;
          title: string;
          body: string | null;
          type: string;
          is_read: boolean;
          data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          profile_id?: string | null;
          title: string;
          body?: string | null;
          type?: string;
          is_read?: boolean;
          data?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          profile_id?: string | null;
          title?: string;
          body?: string | null;
          type?: string;
          is_read?: boolean;
          data?: Json;
          created_at?: string;
        };
      };
      wild_apricot_members: {
        Row: {
          id: string;
          wa_member_id: string;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          mobile: string | null;
          address: string | null;
          city: string | null;
          postal_code: string | null;
          parent_name: string | null;
          birth_year: number | null;
          health_insurance_number: string | null;
          allergies_medical: string | null;
          membership_level: string | null;
          membership_status: MembershipStatus;
          member_since: string | null;
          renewal_due: string | null;
          objective: string | null;
          experience_years: string | null;
          skill_level: string | null;
          wheel_size: string | null;
          interested_in_events: string | null;
          group_with_friends: string | null;
          photo_permission: boolean;
          additional_info: string | null;
          raw_data: Json | null;
          profile_id: string | null;
          synced_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          wa_member_id: string;
          first_name: string;
          last_name: string;
          email?: string | null;
          phone?: string | null;
          mobile?: string | null;
          address?: string | null;
          city?: string | null;
          postal_code?: string | null;
          parent_name?: string | null;
          birth_year?: number | null;
          health_insurance_number?: string | null;
          allergies_medical?: string | null;
          membership_level?: string | null;
          membership_status?: MembershipStatus;
          member_since?: string | null;
          renewal_due?: string | null;
          objective?: string | null;
          experience_years?: string | null;
          skill_level?: string | null;
          wheel_size?: string | null;
          interested_in_events?: string | null;
          group_with_friends?: string | null;
          photo_permission?: boolean;
          additional_info?: string | null;
          raw_data?: Json | null;
          profile_id?: string | null;
          synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          wa_member_id?: string;
          first_name?: string;
          last_name?: string;
          email?: string | null;
          phone?: string | null;
          mobile?: string | null;
          address?: string | null;
          city?: string | null;
          postal_code?: string | null;
          parent_name?: string | null;
          birth_year?: number | null;
          health_insurance_number?: string | null;
          allergies_medical?: string | null;
          membership_level?: string | null;
          membership_status?: MembershipStatus;
          member_since?: string | null;
          renewal_due?: string | null;
          objective?: string | null;
          experience_years?: string | null;
          skill_level?: string | null;
          wheel_size?: string | null;
          interested_in_events?: string | null;
          group_with_friends?: string | null;
          photo_permission?: boolean;
          additional_info?: string | null;
          raw_data?: Json | null;
          profile_id?: string | null;
          synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      wild_apricot_webhooks: {
        Row: {
          id: string;
          event_type: string;
          payload: Json;
          processed: boolean;
          processed_at: string | null;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_type: string;
          payload: Json;
          processed?: boolean;
          processed_at?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_type?: string;
          payload?: Json;
          processed?: boolean;
          processed_at?: string | null;
          error_message?: string | null;
          created_at?: string;
        };
      };
      user_devices: {
        Row: {
          id: string;
          user_id: string;
          profile_id: string | null;
          device_type: string;
          device_name: string | null;
          push_endpoint: string | null;
          push_p256dh: string | null;
          push_auth: string | null;
          push_token: string | null;
          push_enabled: boolean;
          last_active_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          profile_id?: string | null;
          device_type?: string;
          device_name?: string | null;
          push_endpoint?: string | null;
          push_p256dh?: string | null;
          push_auth?: string | null;
          push_token?: string | null;
          push_enabled?: boolean;
          last_active_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          profile_id?: string | null;
          device_type?: string;
          device_name?: string | null;
          push_endpoint?: string | null;
          push_p256dh?: string | null;
          push_auth?: string | null;
          push_token?: string | null;
          push_enabled?: boolean;
          last_active_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          profile_id: string;
          group_id: string;
          subscription_type: string;
          subscription_type_id: string | null;
          status: SubscriptionStatus;
          start_date: string;
          end_date: string | null;
          odoo_sale_order_line_id: number | null;
          synced_at: string | null;
          source: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          group_id: string;
          subscription_type: string;
          subscription_type_id?: string | null;
          status?: SubscriptionStatus;
          start_date?: string;
          end_date?: string | null;
          odoo_sale_order_line_id?: number | null;
          synced_at?: string | null;
          source?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          group_id?: string;
          subscription_type?: string;
          subscription_type_id?: string | null;
          status?: SubscriptionStatus;
          start_date?: string;
          end_date?: string | null;
          odoo_sale_order_line_id?: number | null;
          synced_at?: string | null;
          source?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      roles: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          description: string | null;
          requires_subscription: boolean;
          permissions: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          display_name: string;
          description?: string | null;
          requires_subscription?: boolean;
          permissions?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          display_name?: string;
          description?: string | null;
          requires_subscription?: boolean;
          permissions?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      subscription_types: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          description: string | null;
          odoo_product_id: number | null;
          grants_role_id: string;
          category: SubscriptionCategory | null;
          frequency: SubscriptionFrequency | null;
          price_cents: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          display_name: string;
          description?: string | null;
          odoo_product_id?: number | null;
          grants_role_id: string;
          category?: SubscriptionCategory | null;
          frequency?: SubscriptionFrequency | null;
          price_cents?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          display_name?: string;
          description?: string | null;
          odoo_product_id?: number | null;
          grants_role_id?: string;
          category?: SubscriptionCategory | null;
          frequency?: SubscriptionFrequency | null;
          price_cents?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      profile_roles: {
        Row: {
          id: string;
          profile_id: string;
          role_id: string;
          source: RoleSource;
          source_id: string | null;
          assigned_at: string;
          expires_at: string | null;
          assigned_by: string | null;
        };
        Insert: {
          id?: string;
          profile_id: string;
          role_id: string;
          source: RoleSource;
          source_id?: string | null;
          assigned_at?: string;
          expires_at?: string | null;
          assigned_by?: string | null;
        };
        Update: {
          id?: string;
          profile_id?: string;
          role_id?: string;
          source?: RoleSource;
          source_id?: string | null;
          assigned_at?: string;
          expires_at?: string | null;
          assigned_by?: string | null;
        };
      };
      lesson_plan_templates: {
        Row: {
          id: string;
          author_id: string;
          title: string;
          content: string;
          duration_minutes: number | null;
          objectives: string | null;
          materials: string | null;
          category: GroupCategory | null;
          level_min: number;
          level_max: number;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          title: string;
          content: string;
          duration_minutes?: number | null;
          objectives?: string | null;
          materials?: string | null;
          category?: GroupCategory | null;
          level_min?: number;
          level_max?: number;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          title?: string;
          content?: string;
          duration_minutes?: number | null;
          objectives?: string | null;
          materials?: string | null;
          category?: GroupCategory | null;
          level_min?: number;
          level_max?: number;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      group_lesson_plans: {
        Row: {
          id: string;
          group_id: string;
          template_id: string | null;
          applied_by: string;
          session_date: string | null;
          title_override: string | null;
          content_override: string | null;
          duration_override: number | null;
          objectives_override: string | null;
          materials_override: string | null;
          is_cancelled: boolean;
          cancellation_reason: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          template_id?: string | null;
          applied_by: string;
          session_date?: string | null;
          title_override?: string | null;
          content_override?: string | null;
          duration_override?: number | null;
          objectives_override?: string | null;
          materials_override?: string | null;
          is_cancelled?: boolean;
          cancellation_reason?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          template_id?: string | null;
          applied_by?: string;
          session_date?: string | null;
          title_override?: string | null;
          content_override?: string | null;
          duration_override?: number | null;
          objectives_override?: string | null;
          materials_override?: string | null;
          is_cancelled?: boolean;
          cancellation_reason?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
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
      v_events_with_groups: {
        Row: {
          id: string;
          group_id: string | null;
          title: string;
          description: string | null;
          location_name: string | null;
          location_url: string | null;
          location_id: string | null;
          start_time: string;
          end_time: string;
          event_type: string;
          schedule_type: EventScheduleType;
          is_for_recreational: boolean;
          is_for_intensive: boolean;
          is_cancelled: boolean;
          cancellation_reason: string | null;
          created_at: string;
          location_display_name: string | null;
          location_address: string | null;
          location_maps_url: string | null;
          group_ids: string[] | null;
          group_names: string[] | null;
          group_categories: GroupCategory[] | null;
        };
      };
      v_group_emergency_contacts: {
        Row: {
          group_id: string;
          group_name: string;
          profile_id: string;
          first_name: string;
          last_name: string;
          phone: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          emergency_contact_relation: string | null;
          medical_notes: string | null;
        };
      };
      v_family_relations: {
        Row: {
          parent_profile_id: string;
          parent_user_id: string | null;
          parent_name: string;
          child_profile_id: string;
          child_name: string;
          relation_type: string;
          source: string;
        };
      };
      v_profile_all_roles: {
        Row: {
          profile_id: string;
          first_name: string;
          last_name: string;
          email: string | null;
          is_minor: boolean;
          is_autonomous: boolean;
          is_admin: boolean;
          is_coordinator: boolean;
          roles: Json;
        };
      };
    };
    Functions: {
      create_event_with_groups: {
        Args: {
          p_title: string;
          p_description: string;
          p_location_id: string;
          p_start_time: string;
          p_end_time: string;
          p_event_type: string;
          p_schedule_type: EventScheduleType;
          p_is_for_recreational: boolean;
          p_is_for_intensive: boolean;
        };
        Returns: string;
      };
      get_user_contexts: {
        Args: {
          user_uuid: string;
        };
        Returns: {
          context_type: string;
          profile_id: string;
          profile_name: string;
          subscription_id: string | null;
          subscription_type: string | null;
          group_id: string;
          group_name: string;
          relation: string;
          staff_role: string | null;
          roles: Json;
        }[];
      };
    };
    Enums: {
      user_role: UserRole;
      relation_type: RelationType;
      staff_role: StaffRole;
      attendance_status: AttendanceStatus;
      group_category: GroupCategory;
      event_schedule_type: EventScheduleType;
      chat_channel_type: ChatChannelType;
      membership_status: MembershipStatus;
      role_source: RoleSource;
      subscription_category: SubscriptionCategory;
      subscription_frequency: SubscriptionFrequency;
    };
  };
}

// Types utilitaires pour les composants
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Group = Database["public"]["Tables"]["groups"]["Row"];
export type Event = Database["public"]["Tables"]["events"]["Row"];
export type EventGroup = Database["public"]["Tables"]["event_groups"]["Row"];
export type Location = Database["public"]["Tables"]["locations"]["Row"];
export type Attendance = Database["public"]["Tables"]["attendance"]["Row"];
export type Evaluation = Database["public"]["Tables"]["evaluations"]["Row"];
export type Announcement = Database["public"]["Tables"]["announcements"]["Row"];
export type Partner = Database["public"]["Tables"]["partners"]["Row"];
export type AcademyVideo = Database["public"]["Tables"]["academy_videos"]["Row"];
export type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type WildApricotMember = Database["public"]["Tables"]["wild_apricot_members"]["Row"];
export type UserDevice = Database["public"]["Tables"]["user_devices"]["Row"];
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];
export type Role = Database["public"]["Tables"]["roles"]["Row"];
export type SubscriptionType = Database["public"]["Tables"]["subscription_types"]["Row"];
export type ProfileRole = Database["public"]["Tables"]["profile_roles"]["Row"];
export type LessonPlanTemplate = Database["public"]["Tables"]["lesson_plan_templates"]["Row"];
export type GroupLessonPlan = Database["public"]["Tables"]["group_lesson_plans"]["Row"];

// Types pour les vues
export type EventStaffing = Database["public"]["Views"]["v_event_staffing"]["Row"];
export type EventWithGroups = Database["public"]["Views"]["v_events_with_groups"]["Row"];
export type GroupEmergencyContact = Database["public"]["Views"]["v_group_emergency_contacts"]["Row"];
export type FamilyRelation = Database["public"]["Views"]["v_family_relations"]["Row"];
export type ProfileAllRoles = Database["public"]["Views"]["v_profile_all_roles"]["Row"];

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

export type ChatMessageWithAuthor = ChatMessage & {
  author: Profile;
};

export type GroupWithDetails = Group & {
  memberCount?: number;
  staffCount?: number;
  members?: Profile[];
  staff?: Profile[];
};

// Type pour le contexte utilisateur multi-abonnements
export interface UserContext {
  context_type: ContextType;
  profile_id: string;
  profile_name: string;
  subscription_id: string | null;
  subscription_type: string | null;
  group_id: string;
  group_name: string;
  relation: RelationType;
  staff_role: string | null;
  roles: RoleInfo[];
}

// Type pour les permissions de rôle
export interface RolePermissions {
  can_view_calendar?: boolean;
  can_take_attendance?: boolean;
  can_chat_in_group?: boolean;
  can_manage_members?: boolean;
  can_manage_groups?: boolean;
  can_manage_events?: boolean;
  can_view_evaluations?: boolean;
  can_create_evaluations?: boolean;
  can_view_all_members?: boolean;
  calendar_scope?: "own_groups" | "all_groups" | "assigned_groups";
}

// Type pour les infos de rôle retournées par get_user_contexts
export interface RoleInfo {
  role_name: string;
  display_name: string;
  permissions: RolePermissions;
}
