drop extension if exists "pg_net";

create type "public"."attendance_status" as enum ('unknown', 'present', 'absent', 'late', 'excused');

create type "public"."chat_channel_type" as enum ('all', 'recreational', 'intensive', 'staff');

create type "public"."event_schedule_type" as enum ('regular', 'special');

create type "public"."group_category" as enum ('recreational', 'intensive');

create type "public"."membership_status" as enum ('active', 'lapsed', 'pending', 'archived');

create type "public"."relation_type" as enum ('self', 'parent', 'guardian');

create type "public"."staff_role" as enum ('head_coach', 'assistant', 'sweeper');

create type "public"."user_role" as enum ('admin', 'coach', 'athlete');


  create table "public"."academy_videos" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "description" text,
    "video_provider" text default 'youtube'::text,
    "video_id" text not null,
    "category" text,
    "level_min" integer default 1,
    "is_published" boolean default true,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."academy_videos" enable row level security;


  create table "public"."announcements" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "content" text,
    "image_url" text,
    "is_pinned" boolean default false,
    "created_at" timestamp with time zone default now(),
    "expires_at" timestamp with time zone
      );


alter table "public"."announcements" enable row level security;


  create table "public"."attendance" (
    "id" uuid not null default gen_random_uuid(),
    "event_id" uuid,
    "profile_id" uuid,
    "status" public.attendance_status default 'unknown'::public.attendance_status,
    "note" text,
    "updated_by" uuid,
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."attendance" enable row level security;


  create table "public"."broadcast_messages" (
    "id" uuid not null default gen_random_uuid(),
    "sender_profile_id" uuid,
    "title" text not null,
    "content" text not null,
    "target_groups" uuid[] default '{}'::uuid[],
    "priority" text default 'normal'::text,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."broadcast_messages" enable row level security;


  create table "public"."chat_messages" (
    "id" uuid not null default gen_random_uuid(),
    "author_id" uuid not null,
    "channel" public.chat_channel_type default 'all'::public.chat_channel_type,
    "content" text not null,
    "is_important" boolean default false,
    "is_pinned" boolean default false,
    "reply_to_id" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."chat_messages" enable row level security;


  create table "public"."chat_read_status" (
    "user_id" uuid not null,
    "last_read_at" timestamp with time zone default now(),
    "channel" public.chat_channel_type not null default 'all'::public.chat_channel_type
      );


alter table "public"."chat_read_status" enable row level security;


  create table "public"."evaluations" (
    "id" uuid not null default gen_random_uuid(),
    "profile_id" uuid,
    "coach_id" uuid,
    "evaluation_date" timestamp with time zone default now(),
    "details" jsonb,
    "recommended_level" integer,
    "notes" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."evaluations" enable row level security;


  create table "public"."event_groups" (
    "event_id" uuid not null,
    "group_id" uuid not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."event_groups" enable row level security;


  create table "public"."event_staff" (
    "event_id" uuid not null,
    "profile_id" uuid not null,
    "role_on_site" public.staff_role default 'assistant'::public.staff_role,
    "is_confirmed" boolean default false
      );


alter table "public"."event_staff" enable row level security;


  create table "public"."events" (
    "id" uuid not null default gen_random_uuid(),
    "group_id" uuid,
    "title" text not null,
    "description" text,
    "location_name" text,
    "location_url" text,
    "start_time" timestamp with time zone not null,
    "end_time" timestamp with time zone not null,
    "event_type" text default 'training'::text,
    "created_at" timestamp with time zone default now(),
    "location_id" uuid,
    "schedule_type" public.event_schedule_type default 'regular'::public.event_schedule_type,
    "is_for_recreational" boolean default false,
    "is_for_intensive" boolean default false,
    "is_cancelled" boolean default false,
    "cancellation_reason" text,
    "created_by" uuid
      );


alter table "public"."events" enable row level security;


  create table "public"."group_members" (
    "group_id" uuid not null,
    "profile_id" uuid not null,
    "joined_at" timestamp with time zone default now()
      );


alter table "public"."group_members" enable row level security;


  create table "public"."group_messages" (
    "id" uuid not null default gen_random_uuid(),
    "group_id" uuid,
    "sender_profile_id" uuid,
    "content" text not null,
    "message_type" text default 'message'::text,
    "is_pinned" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."group_messages" enable row level security;


  create table "public"."group_staff" (
    "group_id" uuid not null,
    "profile_id" uuid not null,
    "default_role" public.staff_role default 'assistant'::public.staff_role
      );


alter table "public"."group_staff" enable row level security;


  create table "public"."groups" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "level_required" integer default 1,
    "color_code" text default '#FF6600'::text,
    "chat_channel_id" uuid default gen_random_uuid(),
    "created_at" timestamp with time zone default now(),
    "category" public.group_category default 'recreational'::public.group_category,
    "default_day_of_week" integer,
    "is_active" boolean default true
      );


alter table "public"."groups" enable row level security;


  create table "public"."locations" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "address" text,
    "google_maps_url" text,
    "is_default" boolean default false,
    "sort_order" integer default 0,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."locations" enable row level security;


  create table "public"."message_reads" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "message_type" text not null,
    "message_id" uuid not null,
    "read_at" timestamp with time zone default now()
      );


alter table "public"."message_reads" enable row level security;


  create table "public"."notifications" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "profile_id" uuid,
    "title" text not null,
    "body" text,
    "type" text default 'info'::text,
    "is_read" boolean default false,
    "data" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."notifications" enable row level security;


  create table "public"."partners" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "logo_url" text,
    "website_url" text,
    "promo_code" text,
    "promo_description" text,
    "tier" integer default 1,
    "is_active" boolean default true
      );


alter table "public"."partners" enable row level security;


  create table "public"."profile_progression" (
    "profile_id" uuid not null,
    "video_id" uuid not null,
    "is_completed" boolean default false,
    "completed_at" timestamp with time zone
      );


alter table "public"."profile_progression" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null default gen_random_uuid(),
    "odoo_id" integer,
    "claim_code" text,
    "first_name" text not null,
    "last_name" text not null,
    "email" text,
    "phone" text,
    "avatar_url" text,
    "role" public.user_role default 'athlete'::public.user_role,
    "medical_notes" text,
    "emergency_contact_name" text,
    "emergency_contact_phone" text,
    "birth_date" date,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "subscription_status" text default 'inactive'::text,
    "subscription_start_date" timestamp with time zone,
    "subscription_end_date" timestamp with time zone,
    "subscription_last_payment_date" timestamp with time zone,
    "emergency_contact_relation" text,
    "address_line1" text,
    "address_city" text,
    "address_postal_code" text,
    "photo_permission" boolean default true,
    "wa_member_id" text
      );


alter table "public"."profiles" enable row level security;


  create table "public"."staff_messages" (
    "id" uuid not null default gen_random_uuid(),
    "sender_profile_id" uuid,
    "content" text not null,
    "message_type" text default 'message'::text,
    "is_pinned" boolean default false,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."staff_messages" enable row level security;


  create table "public"."user_devices" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "push_subscription" jsonb not null,
    "device_name" text,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "last_used_at" timestamp with time zone default now()
      );


alter table "public"."user_devices" enable row level security;


  create table "public"."user_profile_access" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "profile_id" uuid,
    "relation" public.relation_type not null,
    "permissions" jsonb default '{"can_chat": true, "can_rsvp": true}'::jsonb,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."user_profile_access" enable row level security;


  create table "public"."users" (
    "id" uuid not null,
    "email" text not null,
    "subscription_status" text default 'inactive'::text,
    "subscription_start_date" timestamp with time zone,
    "subscription_end_date" timestamp with time zone,
    "subscription_last_payment_date" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."users" enable row level security;


  create table "public"."wild_apricot_members" (
    "id" uuid not null default gen_random_uuid(),
    "wa_member_id" text not null,
    "first_name" text not null,
    "last_name" text not null,
    "email" text,
    "phone" text,
    "mobile" text,
    "address" text,
    "city" text,
    "postal_code" text,
    "parent_name" text,
    "birth_year" integer,
    "health_insurance_number" text,
    "allergies_medical" text,
    "membership_level" text,
    "membership_status" public.membership_status default 'pending'::public.membership_status,
    "member_since" timestamp with time zone,
    "renewal_due" timestamp with time zone,
    "objective" text,
    "experience_years" text,
    "skill_level" text,
    "wheel_size" text,
    "interested_in_events" text,
    "group_with_friends" text,
    "photo_permission" boolean default true,
    "additional_info" text,
    "raw_data" jsonb,
    "profile_id" uuid,
    "synced_at" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."wild_apricot_members" enable row level security;


  create table "public"."wild_apricot_webhooks" (
    "id" uuid not null default gen_random_uuid(),
    "event_type" text not null,
    "payload" jsonb not null,
    "processed" boolean default false,
    "processed_at" timestamp with time zone,
    "error_message" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."wild_apricot_webhooks" enable row level security;

CREATE UNIQUE INDEX academy_videos_pkey ON public.academy_videos USING btree (id);

CREATE UNIQUE INDEX announcements_pkey ON public.announcements USING btree (id);

CREATE UNIQUE INDEX attendance_event_id_profile_id_key ON public.attendance USING btree (event_id, profile_id);

CREATE UNIQUE INDEX attendance_pkey ON public.attendance USING btree (id);

CREATE UNIQUE INDEX broadcast_messages_pkey ON public.broadcast_messages USING btree (id);

CREATE UNIQUE INDEX chat_messages_pkey ON public.chat_messages USING btree (id);

CREATE UNIQUE INDEX chat_read_status_pkey ON public.chat_read_status USING btree (user_id, channel);

CREATE UNIQUE INDEX evaluations_pkey ON public.evaluations USING btree (id);

CREATE UNIQUE INDEX event_groups_pkey ON public.event_groups USING btree (event_id, group_id);

CREATE UNIQUE INDEX event_staff_pkey ON public.event_staff USING btree (event_id, profile_id);

CREATE UNIQUE INDEX events_pkey ON public.events USING btree (id);

CREATE UNIQUE INDEX group_members_pkey ON public.group_members USING btree (group_id, profile_id);

CREATE UNIQUE INDEX group_messages_pkey ON public.group_messages USING btree (id);

CREATE UNIQUE INDEX group_staff_pkey ON public.group_staff USING btree (group_id, profile_id);

CREATE UNIQUE INDEX groups_pkey ON public.groups USING btree (id);

CREATE INDEX idx_attendance_event_id ON public.attendance USING btree (event_id);

CREATE INDEX idx_attendance_profile_id ON public.attendance USING btree (profile_id);

CREATE INDEX idx_broadcast_messages_created_at ON public.broadcast_messages USING btree (created_at DESC);

CREATE INDEX idx_evaluations_profile_id ON public.evaluations USING btree (profile_id);

CREATE INDEX idx_events_group_id ON public.events USING btree (group_id);

CREATE INDEX idx_events_start_time ON public.events USING btree (start_time);

CREATE INDEX idx_group_members_profile_id ON public.group_members USING btree (profile_id);

CREATE INDEX idx_group_messages_created_at ON public.group_messages USING btree (created_at DESC);

CREATE INDEX idx_group_messages_group_id ON public.group_messages USING btree (group_id);

CREATE INDEX idx_group_staff_group_id ON public.group_staff USING btree (group_id);

CREATE INDEX idx_group_staff_profile_id ON public.group_staff USING btree (profile_id);

CREATE INDEX idx_message_reads_user_id ON public.message_reads USING btree (user_id);

CREATE INDEX idx_profiles_subscription_status ON public.profiles USING btree (subscription_status);

CREATE INDEX idx_staff_messages_created_at ON public.staff_messages USING btree (created_at DESC);

CREATE INDEX idx_user_devices_user_id ON public.user_devices USING btree (user_id);

CREATE INDEX idx_user_profile_access_profile_id ON public.user_profile_access USING btree (profile_id);

CREATE INDEX idx_user_profile_access_user_id ON public.user_profile_access USING btree (user_id);

CREATE INDEX idx_users_email ON public.users USING btree (email);

CREATE INDEX idx_users_subscription_status ON public.users USING btree (subscription_status);

CREATE INDEX idx_wa_members_email ON public.wild_apricot_members USING btree (email);

CREATE INDEX idx_wa_members_status ON public.wild_apricot_members USING btree (membership_status);

CREATE UNIQUE INDEX locations_pkey ON public.locations USING btree (id);

CREATE UNIQUE INDEX message_reads_pkey ON public.message_reads USING btree (id);

CREATE UNIQUE INDEX message_reads_user_id_message_type_message_id_key ON public.message_reads USING btree (user_id, message_type, message_id);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE UNIQUE INDEX partners_pkey ON public.partners USING btree (id);

CREATE UNIQUE INDEX profile_progression_pkey ON public.profile_progression USING btree (profile_id, video_id);

CREATE UNIQUE INDEX profiles_claim_code_key ON public.profiles USING btree (claim_code);

CREATE UNIQUE INDEX profiles_odoo_id_key ON public.profiles USING btree (odoo_id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX profiles_wa_member_id_key ON public.profiles USING btree (wa_member_id);

CREATE UNIQUE INDEX staff_messages_pkey ON public.staff_messages USING btree (id);

CREATE UNIQUE INDEX user_devices_pkey ON public.user_devices USING btree (id);

CREATE UNIQUE INDEX user_profile_access_pkey ON public.user_profile_access USING btree (id);

CREATE UNIQUE INDEX user_profile_access_user_id_profile_id_key ON public.user_profile_access USING btree (user_id, profile_id);

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

CREATE UNIQUE INDEX wild_apricot_members_pkey ON public.wild_apricot_members USING btree (id);

CREATE UNIQUE INDEX wild_apricot_members_wa_member_id_key ON public.wild_apricot_members USING btree (wa_member_id);

CREATE UNIQUE INDEX wild_apricot_webhooks_pkey ON public.wild_apricot_webhooks USING btree (id);

alter table "public"."academy_videos" add constraint "academy_videos_pkey" PRIMARY KEY using index "academy_videos_pkey";

alter table "public"."announcements" add constraint "announcements_pkey" PRIMARY KEY using index "announcements_pkey";

alter table "public"."attendance" add constraint "attendance_pkey" PRIMARY KEY using index "attendance_pkey";

alter table "public"."broadcast_messages" add constraint "broadcast_messages_pkey" PRIMARY KEY using index "broadcast_messages_pkey";

alter table "public"."chat_messages" add constraint "chat_messages_pkey" PRIMARY KEY using index "chat_messages_pkey";

alter table "public"."chat_read_status" add constraint "chat_read_status_pkey" PRIMARY KEY using index "chat_read_status_pkey";

alter table "public"."evaluations" add constraint "evaluations_pkey" PRIMARY KEY using index "evaluations_pkey";

alter table "public"."event_groups" add constraint "event_groups_pkey" PRIMARY KEY using index "event_groups_pkey";

alter table "public"."event_staff" add constraint "event_staff_pkey" PRIMARY KEY using index "event_staff_pkey";

alter table "public"."events" add constraint "events_pkey" PRIMARY KEY using index "events_pkey";

alter table "public"."group_members" add constraint "group_members_pkey" PRIMARY KEY using index "group_members_pkey";

alter table "public"."group_messages" add constraint "group_messages_pkey" PRIMARY KEY using index "group_messages_pkey";

alter table "public"."group_staff" add constraint "group_staff_pkey" PRIMARY KEY using index "group_staff_pkey";

alter table "public"."groups" add constraint "groups_pkey" PRIMARY KEY using index "groups_pkey";

alter table "public"."locations" add constraint "locations_pkey" PRIMARY KEY using index "locations_pkey";

alter table "public"."message_reads" add constraint "message_reads_pkey" PRIMARY KEY using index "message_reads_pkey";

alter table "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "public"."partners" add constraint "partners_pkey" PRIMARY KEY using index "partners_pkey";

alter table "public"."profile_progression" add constraint "profile_progression_pkey" PRIMARY KEY using index "profile_progression_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."staff_messages" add constraint "staff_messages_pkey" PRIMARY KEY using index "staff_messages_pkey";

alter table "public"."user_devices" add constraint "user_devices_pkey" PRIMARY KEY using index "user_devices_pkey";

alter table "public"."user_profile_access" add constraint "user_profile_access_pkey" PRIMARY KEY using index "user_profile_access_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."wild_apricot_members" add constraint "wild_apricot_members_pkey" PRIMARY KEY using index "wild_apricot_members_pkey";

alter table "public"."wild_apricot_webhooks" add constraint "wild_apricot_webhooks_pkey" PRIMARY KEY using index "wild_apricot_webhooks_pkey";

alter table "public"."attendance" add constraint "attendance_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE not valid;

alter table "public"."attendance" validate constraint "attendance_event_id_fkey";

alter table "public"."attendance" add constraint "attendance_event_id_profile_id_key" UNIQUE using index "attendance_event_id_profile_id_key";

alter table "public"."attendance" add constraint "attendance_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."attendance" validate constraint "attendance_profile_id_fkey";

alter table "public"."attendance" add constraint "attendance_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) not valid;

alter table "public"."attendance" validate constraint "attendance_updated_by_fkey";

alter table "public"."broadcast_messages" add constraint "broadcast_messages_sender_profile_id_fkey" FOREIGN KEY (sender_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."broadcast_messages" validate constraint "broadcast_messages_sender_profile_id_fkey";

alter table "public"."chat_messages" add constraint "chat_messages_author_id_fkey" FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."chat_messages" validate constraint "chat_messages_author_id_fkey";

alter table "public"."chat_messages" add constraint "chat_messages_reply_to_id_fkey" FOREIGN KEY (reply_to_id) REFERENCES public.chat_messages(id) not valid;

alter table "public"."chat_messages" validate constraint "chat_messages_reply_to_id_fkey";

alter table "public"."chat_read_status" add constraint "chat_read_status_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."chat_read_status" validate constraint "chat_read_status_user_id_fkey";

alter table "public"."evaluations" add constraint "evaluations_coach_id_fkey" FOREIGN KEY (coach_id) REFERENCES public.profiles(id) not valid;

alter table "public"."evaluations" validate constraint "evaluations_coach_id_fkey";

alter table "public"."evaluations" add constraint "evaluations_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."evaluations" validate constraint "evaluations_profile_id_fkey";

alter table "public"."event_groups" add constraint "event_groups_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE not valid;

alter table "public"."event_groups" validate constraint "event_groups_event_id_fkey";

alter table "public"."event_groups" add constraint "event_groups_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE not valid;

alter table "public"."event_groups" validate constraint "event_groups_group_id_fkey";

alter table "public"."event_staff" add constraint "event_staff_event_id_fkey" FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE not valid;

alter table "public"."event_staff" validate constraint "event_staff_event_id_fkey";

alter table "public"."event_staff" add constraint "event_staff_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."event_staff" validate constraint "event_staff_profile_id_fkey";

alter table "public"."events" add constraint "events_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."events" validate constraint "events_created_by_fkey";

alter table "public"."events" add constraint "events_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE not valid;

alter table "public"."events" validate constraint "events_group_id_fkey";

alter table "public"."events" add constraint "events_location_id_fkey" FOREIGN KEY (location_id) REFERENCES public.locations(id) not valid;

alter table "public"."events" validate constraint "events_location_id_fkey";

alter table "public"."group_members" add constraint "group_members_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE not valid;

alter table "public"."group_members" validate constraint "group_members_group_id_fkey";

alter table "public"."group_members" add constraint "group_members_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."group_members" validate constraint "group_members_profile_id_fkey";

alter table "public"."group_messages" add constraint "group_messages_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE not valid;

alter table "public"."group_messages" validate constraint "group_messages_group_id_fkey";

alter table "public"."group_messages" add constraint "group_messages_sender_profile_id_fkey" FOREIGN KEY (sender_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."group_messages" validate constraint "group_messages_sender_profile_id_fkey";

alter table "public"."group_staff" add constraint "group_staff_group_id_fkey" FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE not valid;

alter table "public"."group_staff" validate constraint "group_staff_group_id_fkey";

alter table "public"."group_staff" add constraint "group_staff_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."group_staff" validate constraint "group_staff_profile_id_fkey";

alter table "public"."message_reads" add constraint "message_reads_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."message_reads" validate constraint "message_reads_user_id_fkey";

alter table "public"."message_reads" add constraint "message_reads_user_id_message_type_message_id_key" UNIQUE using index "message_reads_user_id_message_type_message_id_key";

alter table "public"."notifications" add constraint "notifications_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_profile_id_fkey";

alter table "public"."notifications" add constraint "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_user_id_fkey";

alter table "public"."profile_progression" add constraint "profile_progression_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."profile_progression" validate constraint "profile_progression_profile_id_fkey";

alter table "public"."profile_progression" add constraint "profile_progression_video_id_fkey" FOREIGN KEY (video_id) REFERENCES public.academy_videos(id) ON DELETE CASCADE not valid;

alter table "public"."profile_progression" validate constraint "profile_progression_video_id_fkey";

alter table "public"."profiles" add constraint "profiles_claim_code_key" UNIQUE using index "profiles_claim_code_key";

alter table "public"."profiles" add constraint "profiles_odoo_id_key" UNIQUE using index "profiles_odoo_id_key";

alter table "public"."profiles" add constraint "profiles_wa_member_id_key" UNIQUE using index "profiles_wa_member_id_key";

alter table "public"."profiles" add constraint "subscription_status_check" CHECK ((subscription_status = ANY (ARRAY['active'::text, 'inactive'::text, 'expired'::text, 'suspended'::text]))) not valid;

alter table "public"."profiles" validate constraint "subscription_status_check";

alter table "public"."staff_messages" add constraint "staff_messages_sender_profile_id_fkey" FOREIGN KEY (sender_profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."staff_messages" validate constraint "staff_messages_sender_profile_id_fkey";

alter table "public"."user_devices" add constraint "user_devices_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_devices" validate constraint "user_devices_user_id_fkey";

alter table "public"."user_profile_access" add constraint "user_profile_access_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."user_profile_access" validate constraint "user_profile_access_profile_id_fkey";

alter table "public"."user_profile_access" add constraint "user_profile_access_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_profile_access" validate constraint "user_profile_access_user_id_fkey";

alter table "public"."user_profile_access" add constraint "user_profile_access_user_id_profile_id_key" UNIQUE using index "user_profile_access_user_id_profile_id_key";

alter table "public"."users" add constraint "subscription_status_check" CHECK ((subscription_status = ANY (ARRAY['active'::text, 'inactive'::text, 'expired'::text, 'suspended'::text]))) not valid;

alter table "public"."users" validate constraint "subscription_status_check";

alter table "public"."users" add constraint "users_email_key" UNIQUE using index "users_email_key";

alter table "public"."users" add constraint "users_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."users" validate constraint "users_id_fkey";

alter table "public"."wild_apricot_members" add constraint "wild_apricot_members_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) not valid;

alter table "public"."wild_apricot_members" validate constraint "wild_apricot_members_profile_id_fkey";

alter table "public"."wild_apricot_members" add constraint "wild_apricot_members_wa_member_id_key" UNIQUE using index "wild_apricot_members_wa_member_id_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_event_with_groups(p_title text, p_description text, p_location_id uuid, p_start_time timestamp with time zone, p_end_time timestamp with time zone, p_event_type text, p_schedule_type public.event_schedule_type, p_is_for_recreational boolean, p_is_for_intensive boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_event_id UUID;
    v_group RECORD;
BEGIN
    -- Créer l'événement
    INSERT INTO public.events (
        title, description, location_id, start_time, end_time, 
        event_type, schedule_type, is_for_recreational, is_for_intensive,
        created_by
    ) VALUES (
        p_title, p_description, p_location_id, p_start_time, p_end_time,
        p_event_type, p_schedule_type, p_is_for_recreational, p_is_for_intensive,
        auth.uid()
    ) RETURNING id INTO v_event_id;
    
    -- Associer les groupes récréatifs si demandé
    IF p_is_for_recreational THEN
        FOR v_group IN SELECT id FROM public.groups WHERE category = 'recreational' AND is_active = true
        LOOP
            INSERT INTO public.event_groups (event_id, group_id) 
            VALUES (v_event_id, v_group.id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
    
    -- Associer les groupes intensifs si demandé
    IF p_is_for_intensive THEN
        FOR v_group IN SELECT id FROM public.groups WHERE category = 'intensive' AND is_active = true
        LOOP
            INSERT INTO public.event_groups (event_id, group_id) 
            VALUES (v_event_id, v_group.id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
    
    RETURN v_event_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_unread_count(p_user_id uuid, p_group_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  last_read TIMESTAMPTZ;
  unread_count INT;
BEGIN
  SELECT MAX(read_at) INTO last_read
  FROM public.message_reads
  WHERE user_id = p_user_id 
  AND message_type = 'group' 
  AND message_id IN (SELECT id FROM public.group_messages WHERE group_id = p_group_id);
  
  SELECT COUNT(*) INTO unread_count
  FROM public.group_messages
  WHERE group_id = p_group_id
  AND created_at > COALESCE(last_read, '1970-01-01'::TIMESTAMPTZ);
  
  RETURN unread_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles p
    JOIN public.user_profile_access upa ON p.id = upa.profile_id
    WHERE upa.user_id = auth.uid() 
    AND p.role = 'admin'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin_unguarded()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM auth.users u
    JOIN public.profiles p ON u.id = p.user_id
    WHERE u.id = auth.uid() 
    AND p.role = 'admin'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_staff()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles p
    JOIN public.user_profile_access upa ON p.id = upa.profile_id
    WHERE upa.user_id = auth.uid() 
    AND p.role IN ('coach', 'admin')
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_group_staff_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_profiles_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_users_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

create or replace view "public"."v_event_staffing" as  SELECT e.id AS event_id,
    e.title,
    e.start_time,
    e.group_id,
    p.id AS profile_id,
    p.first_name,
    p.last_name,
    p.avatar_url,
    COALESCE(es.role_on_site, gs.default_role) AS active_role,
        CASE
            WHEN (es.profile_id IS NOT NULL) THEN true
            ELSE false
        END AS is_override
   FROM (((public.events e
     JOIN public.group_staff gs ON ((e.group_id = gs.group_id)))
     LEFT JOIN public.event_staff es ON (((e.id = es.event_id) AND (gs.profile_id = es.profile_id))))
     JOIN public.profiles p ON ((gs.profile_id = p.id)));


create or replace view "public"."v_events_with_groups" as  SELECT e.id,
    e.group_id,
    e.title,
    e.description,
    e.location_name,
    e.location_url,
    e.start_time,
    e.end_time,
    e.event_type,
    e.created_at,
    e.location_id,
    e.schedule_type,
    e.is_for_recreational,
    e.is_for_intensive,
    e.is_cancelled,
    e.cancellation_reason,
    e.created_by,
    l.name AS location_display_name,
    l.address AS location_address,
    l.google_maps_url AS location_maps_url,
    array_agg(DISTINCT g.id) FILTER (WHERE (g.id IS NOT NULL)) AS group_ids,
    array_agg(DISTINCT g.name) FILTER (WHERE (g.name IS NOT NULL)) AS group_names,
    array_agg(DISTINCT g.category) FILTER (WHERE (g.category IS NOT NULL)) AS group_categories
   FROM (((public.events e
     LEFT JOIN public.locations l ON ((e.location_id = l.id)))
     LEFT JOIN public.event_groups eg ON ((e.id = eg.event_id)))
     LEFT JOIN public.groups g ON ((eg.group_id = g.id)))
  GROUP BY e.id, l.name, l.address, l.google_maps_url;


grant delete on table "public"."academy_videos" to "anon";

grant insert on table "public"."academy_videos" to "anon";

grant references on table "public"."academy_videos" to "anon";

grant select on table "public"."academy_videos" to "anon";

grant trigger on table "public"."academy_videos" to "anon";

grant truncate on table "public"."academy_videos" to "anon";

grant update on table "public"."academy_videos" to "anon";

grant delete on table "public"."academy_videos" to "authenticated";

grant insert on table "public"."academy_videos" to "authenticated";

grant references on table "public"."academy_videos" to "authenticated";

grant select on table "public"."academy_videos" to "authenticated";

grant trigger on table "public"."academy_videos" to "authenticated";

grant truncate on table "public"."academy_videos" to "authenticated";

grant update on table "public"."academy_videos" to "authenticated";

grant delete on table "public"."academy_videos" to "service_role";

grant insert on table "public"."academy_videos" to "service_role";

grant references on table "public"."academy_videos" to "service_role";

grant select on table "public"."academy_videos" to "service_role";

grant trigger on table "public"."academy_videos" to "service_role";

grant truncate on table "public"."academy_videos" to "service_role";

grant update on table "public"."academy_videos" to "service_role";

grant delete on table "public"."announcements" to "anon";

grant insert on table "public"."announcements" to "anon";

grant references on table "public"."announcements" to "anon";

grant select on table "public"."announcements" to "anon";

grant trigger on table "public"."announcements" to "anon";

grant truncate on table "public"."announcements" to "anon";

grant update on table "public"."announcements" to "anon";

grant delete on table "public"."announcements" to "authenticated";

grant insert on table "public"."announcements" to "authenticated";

grant references on table "public"."announcements" to "authenticated";

grant select on table "public"."announcements" to "authenticated";

grant trigger on table "public"."announcements" to "authenticated";

grant truncate on table "public"."announcements" to "authenticated";

grant update on table "public"."announcements" to "authenticated";

grant delete on table "public"."announcements" to "service_role";

grant insert on table "public"."announcements" to "service_role";

grant references on table "public"."announcements" to "service_role";

grant select on table "public"."announcements" to "service_role";

grant trigger on table "public"."announcements" to "service_role";

grant truncate on table "public"."announcements" to "service_role";

grant update on table "public"."announcements" to "service_role";

grant delete on table "public"."attendance" to "anon";

grant insert on table "public"."attendance" to "anon";

grant references on table "public"."attendance" to "anon";

grant select on table "public"."attendance" to "anon";

grant trigger on table "public"."attendance" to "anon";

grant truncate on table "public"."attendance" to "anon";

grant update on table "public"."attendance" to "anon";

grant delete on table "public"."attendance" to "authenticated";

grant insert on table "public"."attendance" to "authenticated";

grant references on table "public"."attendance" to "authenticated";

grant select on table "public"."attendance" to "authenticated";

grant trigger on table "public"."attendance" to "authenticated";

grant truncate on table "public"."attendance" to "authenticated";

grant update on table "public"."attendance" to "authenticated";

grant delete on table "public"."attendance" to "service_role";

grant insert on table "public"."attendance" to "service_role";

grant references on table "public"."attendance" to "service_role";

grant select on table "public"."attendance" to "service_role";

grant trigger on table "public"."attendance" to "service_role";

grant truncate on table "public"."attendance" to "service_role";

grant update on table "public"."attendance" to "service_role";

grant delete on table "public"."broadcast_messages" to "anon";

grant insert on table "public"."broadcast_messages" to "anon";

grant references on table "public"."broadcast_messages" to "anon";

grant select on table "public"."broadcast_messages" to "anon";

grant trigger on table "public"."broadcast_messages" to "anon";

grant truncate on table "public"."broadcast_messages" to "anon";

grant update on table "public"."broadcast_messages" to "anon";

grant delete on table "public"."broadcast_messages" to "authenticated";

grant insert on table "public"."broadcast_messages" to "authenticated";

grant references on table "public"."broadcast_messages" to "authenticated";

grant select on table "public"."broadcast_messages" to "authenticated";

grant trigger on table "public"."broadcast_messages" to "authenticated";

grant truncate on table "public"."broadcast_messages" to "authenticated";

grant update on table "public"."broadcast_messages" to "authenticated";

grant delete on table "public"."broadcast_messages" to "service_role";

grant insert on table "public"."broadcast_messages" to "service_role";

grant references on table "public"."broadcast_messages" to "service_role";

grant select on table "public"."broadcast_messages" to "service_role";

grant trigger on table "public"."broadcast_messages" to "service_role";

grant truncate on table "public"."broadcast_messages" to "service_role";

grant update on table "public"."broadcast_messages" to "service_role";

grant delete on table "public"."chat_messages" to "anon";

grant insert on table "public"."chat_messages" to "anon";

grant references on table "public"."chat_messages" to "anon";

grant select on table "public"."chat_messages" to "anon";

grant trigger on table "public"."chat_messages" to "anon";

grant truncate on table "public"."chat_messages" to "anon";

grant update on table "public"."chat_messages" to "anon";

grant delete on table "public"."chat_messages" to "authenticated";

grant insert on table "public"."chat_messages" to "authenticated";

grant references on table "public"."chat_messages" to "authenticated";

grant select on table "public"."chat_messages" to "authenticated";

grant trigger on table "public"."chat_messages" to "authenticated";

grant truncate on table "public"."chat_messages" to "authenticated";

grant update on table "public"."chat_messages" to "authenticated";

grant delete on table "public"."chat_messages" to "service_role";

grant insert on table "public"."chat_messages" to "service_role";

grant references on table "public"."chat_messages" to "service_role";

grant select on table "public"."chat_messages" to "service_role";

grant trigger on table "public"."chat_messages" to "service_role";

grant truncate on table "public"."chat_messages" to "service_role";

grant update on table "public"."chat_messages" to "service_role";

grant delete on table "public"."chat_read_status" to "anon";

grant insert on table "public"."chat_read_status" to "anon";

grant references on table "public"."chat_read_status" to "anon";

grant select on table "public"."chat_read_status" to "anon";

grant trigger on table "public"."chat_read_status" to "anon";

grant truncate on table "public"."chat_read_status" to "anon";

grant update on table "public"."chat_read_status" to "anon";

grant delete on table "public"."chat_read_status" to "authenticated";

grant insert on table "public"."chat_read_status" to "authenticated";

grant references on table "public"."chat_read_status" to "authenticated";

grant select on table "public"."chat_read_status" to "authenticated";

grant trigger on table "public"."chat_read_status" to "authenticated";

grant truncate on table "public"."chat_read_status" to "authenticated";

grant update on table "public"."chat_read_status" to "authenticated";

grant delete on table "public"."chat_read_status" to "service_role";

grant insert on table "public"."chat_read_status" to "service_role";

grant references on table "public"."chat_read_status" to "service_role";

grant select on table "public"."chat_read_status" to "service_role";

grant trigger on table "public"."chat_read_status" to "service_role";

grant truncate on table "public"."chat_read_status" to "service_role";

grant update on table "public"."chat_read_status" to "service_role";

grant delete on table "public"."evaluations" to "anon";

grant insert on table "public"."evaluations" to "anon";

grant references on table "public"."evaluations" to "anon";

grant select on table "public"."evaluations" to "anon";

grant trigger on table "public"."evaluations" to "anon";

grant truncate on table "public"."evaluations" to "anon";

grant update on table "public"."evaluations" to "anon";

grant delete on table "public"."evaluations" to "authenticated";

grant insert on table "public"."evaluations" to "authenticated";

grant references on table "public"."evaluations" to "authenticated";

grant select on table "public"."evaluations" to "authenticated";

grant trigger on table "public"."evaluations" to "authenticated";

grant truncate on table "public"."evaluations" to "authenticated";

grant update on table "public"."evaluations" to "authenticated";

grant delete on table "public"."evaluations" to "service_role";

grant insert on table "public"."evaluations" to "service_role";

grant references on table "public"."evaluations" to "service_role";

grant select on table "public"."evaluations" to "service_role";

grant trigger on table "public"."evaluations" to "service_role";

grant truncate on table "public"."evaluations" to "service_role";

grant update on table "public"."evaluations" to "service_role";

grant delete on table "public"."event_groups" to "anon";

grant insert on table "public"."event_groups" to "anon";

grant references on table "public"."event_groups" to "anon";

grant select on table "public"."event_groups" to "anon";

grant trigger on table "public"."event_groups" to "anon";

grant truncate on table "public"."event_groups" to "anon";

grant update on table "public"."event_groups" to "anon";

grant delete on table "public"."event_groups" to "authenticated";

grant insert on table "public"."event_groups" to "authenticated";

grant references on table "public"."event_groups" to "authenticated";

grant select on table "public"."event_groups" to "authenticated";

grant trigger on table "public"."event_groups" to "authenticated";

grant truncate on table "public"."event_groups" to "authenticated";

grant update on table "public"."event_groups" to "authenticated";

grant delete on table "public"."event_groups" to "service_role";

grant insert on table "public"."event_groups" to "service_role";

grant references on table "public"."event_groups" to "service_role";

grant select on table "public"."event_groups" to "service_role";

grant trigger on table "public"."event_groups" to "service_role";

grant truncate on table "public"."event_groups" to "service_role";

grant update on table "public"."event_groups" to "service_role";

grant delete on table "public"."event_staff" to "anon";

grant insert on table "public"."event_staff" to "anon";

grant references on table "public"."event_staff" to "anon";

grant select on table "public"."event_staff" to "anon";

grant trigger on table "public"."event_staff" to "anon";

grant truncate on table "public"."event_staff" to "anon";

grant update on table "public"."event_staff" to "anon";

grant delete on table "public"."event_staff" to "authenticated";

grant insert on table "public"."event_staff" to "authenticated";

grant references on table "public"."event_staff" to "authenticated";

grant select on table "public"."event_staff" to "authenticated";

grant trigger on table "public"."event_staff" to "authenticated";

grant truncate on table "public"."event_staff" to "authenticated";

grant update on table "public"."event_staff" to "authenticated";

grant delete on table "public"."event_staff" to "service_role";

grant insert on table "public"."event_staff" to "service_role";

grant references on table "public"."event_staff" to "service_role";

grant select on table "public"."event_staff" to "service_role";

grant trigger on table "public"."event_staff" to "service_role";

grant truncate on table "public"."event_staff" to "service_role";

grant update on table "public"."event_staff" to "service_role";

grant delete on table "public"."events" to "anon";

grant insert on table "public"."events" to "anon";

grant references on table "public"."events" to "anon";

grant select on table "public"."events" to "anon";

grant trigger on table "public"."events" to "anon";

grant truncate on table "public"."events" to "anon";

grant update on table "public"."events" to "anon";

grant delete on table "public"."events" to "authenticated";

grant insert on table "public"."events" to "authenticated";

grant references on table "public"."events" to "authenticated";

grant select on table "public"."events" to "authenticated";

grant trigger on table "public"."events" to "authenticated";

grant truncate on table "public"."events" to "authenticated";

grant update on table "public"."events" to "authenticated";

grant delete on table "public"."events" to "service_role";

grant insert on table "public"."events" to "service_role";

grant references on table "public"."events" to "service_role";

grant select on table "public"."events" to "service_role";

grant trigger on table "public"."events" to "service_role";

grant truncate on table "public"."events" to "service_role";

grant update on table "public"."events" to "service_role";

grant delete on table "public"."group_members" to "anon";

grant insert on table "public"."group_members" to "anon";

grant references on table "public"."group_members" to "anon";

grant select on table "public"."group_members" to "anon";

grant trigger on table "public"."group_members" to "anon";

grant truncate on table "public"."group_members" to "anon";

grant update on table "public"."group_members" to "anon";

grant delete on table "public"."group_members" to "authenticated";

grant insert on table "public"."group_members" to "authenticated";

grant references on table "public"."group_members" to "authenticated";

grant select on table "public"."group_members" to "authenticated";

grant trigger on table "public"."group_members" to "authenticated";

grant truncate on table "public"."group_members" to "authenticated";

grant update on table "public"."group_members" to "authenticated";

grant delete on table "public"."group_members" to "service_role";

grant insert on table "public"."group_members" to "service_role";

grant references on table "public"."group_members" to "service_role";

grant select on table "public"."group_members" to "service_role";

grant trigger on table "public"."group_members" to "service_role";

grant truncate on table "public"."group_members" to "service_role";

grant update on table "public"."group_members" to "service_role";

grant delete on table "public"."group_messages" to "anon";

grant insert on table "public"."group_messages" to "anon";

grant references on table "public"."group_messages" to "anon";

grant select on table "public"."group_messages" to "anon";

grant trigger on table "public"."group_messages" to "anon";

grant truncate on table "public"."group_messages" to "anon";

grant update on table "public"."group_messages" to "anon";

grant delete on table "public"."group_messages" to "authenticated";

grant insert on table "public"."group_messages" to "authenticated";

grant references on table "public"."group_messages" to "authenticated";

grant select on table "public"."group_messages" to "authenticated";

grant trigger on table "public"."group_messages" to "authenticated";

grant truncate on table "public"."group_messages" to "authenticated";

grant update on table "public"."group_messages" to "authenticated";

grant delete on table "public"."group_messages" to "service_role";

grant insert on table "public"."group_messages" to "service_role";

grant references on table "public"."group_messages" to "service_role";

grant select on table "public"."group_messages" to "service_role";

grant trigger on table "public"."group_messages" to "service_role";

grant truncate on table "public"."group_messages" to "service_role";

grant update on table "public"."group_messages" to "service_role";

grant delete on table "public"."group_staff" to "anon";

grant insert on table "public"."group_staff" to "anon";

grant references on table "public"."group_staff" to "anon";

grant select on table "public"."group_staff" to "anon";

grant trigger on table "public"."group_staff" to "anon";

grant truncate on table "public"."group_staff" to "anon";

grant update on table "public"."group_staff" to "anon";

grant delete on table "public"."group_staff" to "authenticated";

grant insert on table "public"."group_staff" to "authenticated";

grant references on table "public"."group_staff" to "authenticated";

grant select on table "public"."group_staff" to "authenticated";

grant trigger on table "public"."group_staff" to "authenticated";

grant truncate on table "public"."group_staff" to "authenticated";

grant update on table "public"."group_staff" to "authenticated";

grant delete on table "public"."group_staff" to "service_role";

grant insert on table "public"."group_staff" to "service_role";

grant references on table "public"."group_staff" to "service_role";

grant select on table "public"."group_staff" to "service_role";

grant trigger on table "public"."group_staff" to "service_role";

grant truncate on table "public"."group_staff" to "service_role";

grant update on table "public"."group_staff" to "service_role";

grant delete on table "public"."groups" to "anon";

grant insert on table "public"."groups" to "anon";

grant references on table "public"."groups" to "anon";

grant select on table "public"."groups" to "anon";

grant trigger on table "public"."groups" to "anon";

grant truncate on table "public"."groups" to "anon";

grant update on table "public"."groups" to "anon";

grant delete on table "public"."groups" to "authenticated";

grant insert on table "public"."groups" to "authenticated";

grant references on table "public"."groups" to "authenticated";

grant select on table "public"."groups" to "authenticated";

grant trigger on table "public"."groups" to "authenticated";

grant truncate on table "public"."groups" to "authenticated";

grant update on table "public"."groups" to "authenticated";

grant delete on table "public"."groups" to "service_role";

grant insert on table "public"."groups" to "service_role";

grant references on table "public"."groups" to "service_role";

grant select on table "public"."groups" to "service_role";

grant trigger on table "public"."groups" to "service_role";

grant truncate on table "public"."groups" to "service_role";

grant update on table "public"."groups" to "service_role";

grant delete on table "public"."locations" to "anon";

grant insert on table "public"."locations" to "anon";

grant references on table "public"."locations" to "anon";

grant select on table "public"."locations" to "anon";

grant trigger on table "public"."locations" to "anon";

grant truncate on table "public"."locations" to "anon";

grant update on table "public"."locations" to "anon";

grant delete on table "public"."locations" to "authenticated";

grant insert on table "public"."locations" to "authenticated";

grant references on table "public"."locations" to "authenticated";

grant select on table "public"."locations" to "authenticated";

grant trigger on table "public"."locations" to "authenticated";

grant truncate on table "public"."locations" to "authenticated";

grant update on table "public"."locations" to "authenticated";

grant delete on table "public"."locations" to "service_role";

grant insert on table "public"."locations" to "service_role";

grant references on table "public"."locations" to "service_role";

grant select on table "public"."locations" to "service_role";

grant trigger on table "public"."locations" to "service_role";

grant truncate on table "public"."locations" to "service_role";

grant update on table "public"."locations" to "service_role";

grant delete on table "public"."message_reads" to "anon";

grant insert on table "public"."message_reads" to "anon";

grant references on table "public"."message_reads" to "anon";

grant select on table "public"."message_reads" to "anon";

grant trigger on table "public"."message_reads" to "anon";

grant truncate on table "public"."message_reads" to "anon";

grant update on table "public"."message_reads" to "anon";

grant delete on table "public"."message_reads" to "authenticated";

grant insert on table "public"."message_reads" to "authenticated";

grant references on table "public"."message_reads" to "authenticated";

grant select on table "public"."message_reads" to "authenticated";

grant trigger on table "public"."message_reads" to "authenticated";

grant truncate on table "public"."message_reads" to "authenticated";

grant update on table "public"."message_reads" to "authenticated";

grant delete on table "public"."message_reads" to "service_role";

grant insert on table "public"."message_reads" to "service_role";

grant references on table "public"."message_reads" to "service_role";

grant select on table "public"."message_reads" to "service_role";

grant trigger on table "public"."message_reads" to "service_role";

grant truncate on table "public"."message_reads" to "service_role";

grant update on table "public"."message_reads" to "service_role";

grant delete on table "public"."notifications" to "anon";

grant insert on table "public"."notifications" to "anon";

grant references on table "public"."notifications" to "anon";

grant select on table "public"."notifications" to "anon";

grant trigger on table "public"."notifications" to "anon";

grant truncate on table "public"."notifications" to "anon";

grant update on table "public"."notifications" to "anon";

grant delete on table "public"."notifications" to "authenticated";

grant insert on table "public"."notifications" to "authenticated";

grant references on table "public"."notifications" to "authenticated";

grant select on table "public"."notifications" to "authenticated";

grant trigger on table "public"."notifications" to "authenticated";

grant truncate on table "public"."notifications" to "authenticated";

grant update on table "public"."notifications" to "authenticated";

grant delete on table "public"."notifications" to "service_role";

grant insert on table "public"."notifications" to "service_role";

grant references on table "public"."notifications" to "service_role";

grant select on table "public"."notifications" to "service_role";

grant trigger on table "public"."notifications" to "service_role";

grant truncate on table "public"."notifications" to "service_role";

grant update on table "public"."notifications" to "service_role";

grant delete on table "public"."partners" to "anon";

grant insert on table "public"."partners" to "anon";

grant references on table "public"."partners" to "anon";

grant select on table "public"."partners" to "anon";

grant trigger on table "public"."partners" to "anon";

grant truncate on table "public"."partners" to "anon";

grant update on table "public"."partners" to "anon";

grant delete on table "public"."partners" to "authenticated";

grant insert on table "public"."partners" to "authenticated";

grant references on table "public"."partners" to "authenticated";

grant select on table "public"."partners" to "authenticated";

grant trigger on table "public"."partners" to "authenticated";

grant truncate on table "public"."partners" to "authenticated";

grant update on table "public"."partners" to "authenticated";

grant delete on table "public"."partners" to "service_role";

grant insert on table "public"."partners" to "service_role";

grant references on table "public"."partners" to "service_role";

grant select on table "public"."partners" to "service_role";

grant trigger on table "public"."partners" to "service_role";

grant truncate on table "public"."partners" to "service_role";

grant update on table "public"."partners" to "service_role";

grant delete on table "public"."profile_progression" to "anon";

grant insert on table "public"."profile_progression" to "anon";

grant references on table "public"."profile_progression" to "anon";

grant select on table "public"."profile_progression" to "anon";

grant trigger on table "public"."profile_progression" to "anon";

grant truncate on table "public"."profile_progression" to "anon";

grant update on table "public"."profile_progression" to "anon";

grant delete on table "public"."profile_progression" to "authenticated";

grant insert on table "public"."profile_progression" to "authenticated";

grant references on table "public"."profile_progression" to "authenticated";

grant select on table "public"."profile_progression" to "authenticated";

grant trigger on table "public"."profile_progression" to "authenticated";

grant truncate on table "public"."profile_progression" to "authenticated";

grant update on table "public"."profile_progression" to "authenticated";

grant delete on table "public"."profile_progression" to "service_role";

grant insert on table "public"."profile_progression" to "service_role";

grant references on table "public"."profile_progression" to "service_role";

grant select on table "public"."profile_progression" to "service_role";

grant trigger on table "public"."profile_progression" to "service_role";

grant truncate on table "public"."profile_progression" to "service_role";

grant update on table "public"."profile_progression" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."staff_messages" to "anon";

grant insert on table "public"."staff_messages" to "anon";

grant references on table "public"."staff_messages" to "anon";

grant select on table "public"."staff_messages" to "anon";

grant trigger on table "public"."staff_messages" to "anon";

grant truncate on table "public"."staff_messages" to "anon";

grant update on table "public"."staff_messages" to "anon";

grant delete on table "public"."staff_messages" to "authenticated";

grant insert on table "public"."staff_messages" to "authenticated";

grant references on table "public"."staff_messages" to "authenticated";

grant select on table "public"."staff_messages" to "authenticated";

grant trigger on table "public"."staff_messages" to "authenticated";

grant truncate on table "public"."staff_messages" to "authenticated";

grant update on table "public"."staff_messages" to "authenticated";

grant delete on table "public"."staff_messages" to "service_role";

grant insert on table "public"."staff_messages" to "service_role";

grant references on table "public"."staff_messages" to "service_role";

grant select on table "public"."staff_messages" to "service_role";

grant trigger on table "public"."staff_messages" to "service_role";

grant truncate on table "public"."staff_messages" to "service_role";

grant update on table "public"."staff_messages" to "service_role";

grant delete on table "public"."user_devices" to "anon";

grant insert on table "public"."user_devices" to "anon";

grant references on table "public"."user_devices" to "anon";

grant select on table "public"."user_devices" to "anon";

grant trigger on table "public"."user_devices" to "anon";

grant truncate on table "public"."user_devices" to "anon";

grant update on table "public"."user_devices" to "anon";

grant delete on table "public"."user_devices" to "authenticated";

grant insert on table "public"."user_devices" to "authenticated";

grant references on table "public"."user_devices" to "authenticated";

grant select on table "public"."user_devices" to "authenticated";

grant trigger on table "public"."user_devices" to "authenticated";

grant truncate on table "public"."user_devices" to "authenticated";

grant update on table "public"."user_devices" to "authenticated";

grant delete on table "public"."user_devices" to "service_role";

grant insert on table "public"."user_devices" to "service_role";

grant references on table "public"."user_devices" to "service_role";

grant select on table "public"."user_devices" to "service_role";

grant trigger on table "public"."user_devices" to "service_role";

grant truncate on table "public"."user_devices" to "service_role";

grant update on table "public"."user_devices" to "service_role";

grant delete on table "public"."user_profile_access" to "anon";

grant insert on table "public"."user_profile_access" to "anon";

grant references on table "public"."user_profile_access" to "anon";

grant select on table "public"."user_profile_access" to "anon";

grant trigger on table "public"."user_profile_access" to "anon";

grant truncate on table "public"."user_profile_access" to "anon";

grant update on table "public"."user_profile_access" to "anon";

grant delete on table "public"."user_profile_access" to "authenticated";

grant insert on table "public"."user_profile_access" to "authenticated";

grant references on table "public"."user_profile_access" to "authenticated";

grant select on table "public"."user_profile_access" to "authenticated";

grant trigger on table "public"."user_profile_access" to "authenticated";

grant truncate on table "public"."user_profile_access" to "authenticated";

grant update on table "public"."user_profile_access" to "authenticated";

grant delete on table "public"."user_profile_access" to "service_role";

grant insert on table "public"."user_profile_access" to "service_role";

grant references on table "public"."user_profile_access" to "service_role";

grant select on table "public"."user_profile_access" to "service_role";

grant trigger on table "public"."user_profile_access" to "service_role";

grant truncate on table "public"."user_profile_access" to "service_role";

grant update on table "public"."user_profile_access" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";

grant delete on table "public"."wild_apricot_members" to "anon";

grant insert on table "public"."wild_apricot_members" to "anon";

grant references on table "public"."wild_apricot_members" to "anon";

grant select on table "public"."wild_apricot_members" to "anon";

grant trigger on table "public"."wild_apricot_members" to "anon";

grant truncate on table "public"."wild_apricot_members" to "anon";

grant update on table "public"."wild_apricot_members" to "anon";

grant delete on table "public"."wild_apricot_members" to "authenticated";

grant insert on table "public"."wild_apricot_members" to "authenticated";

grant references on table "public"."wild_apricot_members" to "authenticated";

grant select on table "public"."wild_apricot_members" to "authenticated";

grant trigger on table "public"."wild_apricot_members" to "authenticated";

grant truncate on table "public"."wild_apricot_members" to "authenticated";

grant update on table "public"."wild_apricot_members" to "authenticated";

grant delete on table "public"."wild_apricot_members" to "service_role";

grant insert on table "public"."wild_apricot_members" to "service_role";

grant references on table "public"."wild_apricot_members" to "service_role";

grant select on table "public"."wild_apricot_members" to "service_role";

grant trigger on table "public"."wild_apricot_members" to "service_role";

grant truncate on table "public"."wild_apricot_members" to "service_role";

grant update on table "public"."wild_apricot_members" to "service_role";

grant delete on table "public"."wild_apricot_webhooks" to "anon";

grant insert on table "public"."wild_apricot_webhooks" to "anon";

grant references on table "public"."wild_apricot_webhooks" to "anon";

grant select on table "public"."wild_apricot_webhooks" to "anon";

grant trigger on table "public"."wild_apricot_webhooks" to "anon";

grant truncate on table "public"."wild_apricot_webhooks" to "anon";

grant update on table "public"."wild_apricot_webhooks" to "anon";

grant delete on table "public"."wild_apricot_webhooks" to "authenticated";

grant insert on table "public"."wild_apricot_webhooks" to "authenticated";

grant references on table "public"."wild_apricot_webhooks" to "authenticated";

grant select on table "public"."wild_apricot_webhooks" to "authenticated";

grant trigger on table "public"."wild_apricot_webhooks" to "authenticated";

grant truncate on table "public"."wild_apricot_webhooks" to "authenticated";

grant update on table "public"."wild_apricot_webhooks" to "authenticated";

grant delete on table "public"."wild_apricot_webhooks" to "service_role";

grant insert on table "public"."wild_apricot_webhooks" to "service_role";

grant references on table "public"."wild_apricot_webhooks" to "service_role";

grant select on table "public"."wild_apricot_webhooks" to "service_role";

grant trigger on table "public"."wild_apricot_webhooks" to "service_role";

grant truncate on table "public"."wild_apricot_webhooks" to "service_role";

grant update on table "public"."wild_apricot_webhooks" to "service_role";


  create policy "Public read academy_videos"
  on "public"."academy_videos"
  as permissive
  for select
  to public
using ((is_published = true));



  create policy "Staff manage academy videos"
  on "public"."academy_videos"
  as permissive
  for all
  to public
using (public.is_staff());



  create policy "Public read announcements"
  on "public"."announcements"
  as permissive
  for select
  to public
using (true);



  create policy "Staff manage announcements"
  on "public"."announcements"
  as permissive
  for all
  to public
using (public.is_staff());



  create policy "Access own attendance"
  on "public"."attendance"
  as permissive
  for select
  to public
using ((profile_id IN ( SELECT user_profile_access.profile_id
   FROM public.user_profile_access
  WHERE (user_profile_access.user_id = auth.uid()))));



  create policy "Staff manage attendance"
  on "public"."attendance"
  as permissive
  for all
  to public
using (public.is_staff());



  create policy "Update own attendance"
  on "public"."attendance"
  as permissive
  for update
  to public
using ((profile_id IN ( SELECT user_profile_access.profile_id
   FROM public.user_profile_access
  WHERE (user_profile_access.user_id = auth.uid()))));



  create policy "Upsert own attendance"
  on "public"."attendance"
  as permissive
  for insert
  to public
with check ((profile_id IN ( SELECT user_profile_access.profile_id
   FROM public.user_profile_access
  WHERE (user_profile_access.user_id = auth.uid()))));



  create policy "Admin write broadcasts"
  on "public"."broadcast_messages"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM (public.profiles p
     JOIN public.user_profile_access upa ON ((p.id = upa.profile_id)))
  WHERE ((upa.user_id = auth.uid()) AND (p.role = 'admin'::public.user_role)))));



  create policy "Read broadcasts"
  on "public"."broadcast_messages"
  as permissive
  for select
  to public
using (true);



  create policy "Read chat messages"
  on "public"."chat_messages"
  as permissive
  for select
  to public
using (((channel = 'all'::public.chat_channel_type) OR ((channel = 'staff'::public.chat_channel_type) AND (EXISTS ( SELECT 1
   FROM (public.profiles p
     JOIN public.user_profile_access upa ON ((upa.profile_id = p.id)))
  WHERE ((upa.user_id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::public.user_role, 'coach'::public.user_role])))))) OR ((channel = 'recreational'::public.chat_channel_type) AND (EXISTS ( SELECT 1
   FROM ((public.group_members gm
     JOIN public.groups g ON ((g.id = gm.group_id)))
     JOIN public.user_profile_access upa ON ((upa.profile_id = gm.profile_id)))
  WHERE ((upa.user_id = auth.uid()) AND (g.category = 'recreational'::public.group_category))))) OR ((channel = 'intensive'::public.chat_channel_type) AND (EXISTS ( SELECT 1
   FROM ((public.group_members gm
     JOIN public.groups g ON ((g.id = gm.group_id)))
     JOIN public.user_profile_access upa ON ((upa.profile_id = gm.profile_id)))
  WHERE ((upa.user_id = auth.uid()) AND (g.category = 'intensive'::public.group_category)))))));



  create policy "Write chat messages"
  on "public"."chat_messages"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM (public.profiles p
     JOIN public.user_profile_access upa ON ((upa.profile_id = p.id)))
  WHERE ((upa.user_id = auth.uid()) AND (p.role = ANY (ARRAY['admin'::public.user_role, 'coach'::public.user_role]))))));



  create policy "Manage own read status"
  on "public"."chat_read_status"
  as permissive
  for all
  to public
using ((user_id = auth.uid()));



  create policy "Access own evaluations"
  on "public"."evaluations"
  as permissive
  for select
  to public
using ((profile_id IN ( SELECT user_profile_access.profile_id
   FROM public.user_profile_access
  WHERE (user_profile_access.user_id = auth.uid()))));



  create policy "Staff manage evaluations"
  on "public"."evaluations"
  as permissive
  for all
  to public
using (public.is_staff());



  create policy "Public read event_groups"
  on "public"."event_groups"
  as permissive
  for select
  to public
using (true);



  create policy "Access event staff"
  on "public"."event_staff"
  as permissive
  for select
  to public
using (true);



  create policy "Staff manage event staff"
  on "public"."event_staff"
  as permissive
  for all
  to public
using (public.is_staff());



  create policy "Access group events"
  on "public"."events"
  as permissive
  for select
  to public
using (((group_id IN ( SELECT group_members.group_id
   FROM public.group_members
  WHERE (group_members.profile_id IN ( SELECT user_profile_access.profile_id
           FROM public.user_profile_access
          WHERE (user_profile_access.user_id = auth.uid()))))) OR public.is_staff()));



  create policy "Staff manage events"
  on "public"."events"
  as permissive
  for all
  to public
using (public.is_staff());



  create policy "Access group members"
  on "public"."group_members"
  as permissive
  for select
  to public
using (((profile_id IN ( SELECT user_profile_access.profile_id
   FROM public.user_profile_access
  WHERE (user_profile_access.user_id = auth.uid()))) OR public.is_staff()));



  create policy "Admin manage group members"
  on "public"."group_members"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM (public.profiles p
     JOIN public.user_profile_access upa ON ((p.id = upa.profile_id)))
  WHERE ((upa.user_id = auth.uid()) AND (p.role = 'admin'::public.user_role)))));



  create policy "Read group messages"
  on "public"."group_messages"
  as permissive
  for select
  to public
using (((group_id IN ( SELECT group_members.group_id
   FROM public.group_members
  WHERE (group_members.profile_id IN ( SELECT user_profile_access.profile_id
           FROM public.user_profile_access
          WHERE (user_profile_access.user_id = auth.uid()))))) OR public.is_staff()));



  create policy "Update own group messages"
  on "public"."group_messages"
  as permissive
  for update
  to public
using ((sender_profile_id IN ( SELECT user_profile_access.profile_id
   FROM public.user_profile_access
  WHERE (user_profile_access.user_id = auth.uid()))));



  create policy "Write group messages"
  on "public"."group_messages"
  as permissive
  for insert
  to public
with check (public.is_staff());



  create policy "Access group staff"
  on "public"."group_staff"
  as permissive
  for select
  to public
using (true);



  create policy "group_staff_admin_delete"
  on "public"."group_staff"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::public.user_role)))));



  create policy "group_staff_admin_update"
  on "public"."group_staff"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::public.user_role)))));



  create policy "group_staff_admin_write"
  on "public"."group_staff"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::public.user_role)))));



  create policy "group_staff_public_read"
  on "public"."group_staff"
  as permissive
  for select
  to public
using (true);



  create policy "Admin manage groups"
  on "public"."groups"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM (public.profiles p
     JOIN public.user_profile_access upa ON ((p.id = upa.profile_id)))
  WHERE ((upa.user_id = auth.uid()) AND (p.role = 'admin'::public.user_role)))));



  create policy "Public read groups"
  on "public"."groups"
  as permissive
  for select
  to public
using (true);



  create policy "Admin manage locations"
  on "public"."locations"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM (public.profiles p
     JOIN public.user_profile_access upa ON ((upa.profile_id = p.id)))
  WHERE ((upa.user_id = auth.uid()) AND (p.role = 'admin'::public.user_role)))));



  create policy "Public read locations"
  on "public"."locations"
  as permissive
  for select
  to public
using (true);



  create policy "Own message reads"
  on "public"."message_reads"
  as permissive
  for all
  to public
using ((user_id = auth.uid()));



  create policy "Read own notifications"
  on "public"."notifications"
  as permissive
  for select
  to public
using ((user_id = auth.uid()));



  create policy "Update own notifications"
  on "public"."notifications"
  as permissive
  for update
  to public
using ((user_id = auth.uid()));



  create policy "Public read partners"
  on "public"."partners"
  as permissive
  for select
  to public
using (true);



  create policy "Access own progression"
  on "public"."profile_progression"
  as permissive
  for all
  to public
using ((profile_id IN ( SELECT user_profile_access.profile_id
   FROM public.user_profile_access
  WHERE (user_profile_access.user_id = auth.uid()))));



  create policy "Profiles admin"
  on "public"."profiles"
  as permissive
  for all
  to public
using (public.is_admin());



  create policy "Profiles update"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((public.is_staff() OR (id IN ( SELECT user_profile_access.profile_id
   FROM public.user_profile_access
  WHERE (user_profile_access.user_id = auth.uid())))));



  create policy "Profiles visibility"
  on "public"."profiles"
  as permissive
  for select
  to public
using (true);



  create policy "Public read profiles"
  on "public"."profiles"
  as permissive
  for select
  to public
using (true);



  create policy "Staff read staff messages"
  on "public"."staff_messages"
  as permissive
  for select
  to public
using (public.is_staff());



  create policy "Staff write staff messages"
  on "public"."staff_messages"
  as permissive
  for insert
  to public
with check (public.is_staff());



  create policy "Own devices"
  on "public"."user_devices"
  as permissive
  for all
  to public
using ((user_id = auth.uid()));



  create policy "Access own mapping"
  on "public"."user_profile_access"
  as permissive
  for select
  to public
using ((user_id = auth.uid()));



  create policy "Access own profile access"
  on "public"."user_profile_access"
  as permissive
  for select
  to public
using ((user_id = auth.uid()));



  create policy "Admin manage mapping"
  on "public"."user_profile_access"
  as permissive
  for all
  to public
using (public.is_admin());



  create policy "Insert own profile access"
  on "public"."user_profile_access"
  as permissive
  for insert
  to public
with check ((user_id = auth.uid()));



  create policy "Admins can manage all users"
  on "public"."users"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id IN ( SELECT user_profile_access.profile_id
           FROM public.user_profile_access
          WHERE (user_profile_access.user_id = auth.uid()))) AND (profiles.role = 'admin'::public.user_role)))));



  create policy "Users can read their own data"
  on "public"."users"
  as permissive
  for select
  to public
using ((auth.uid() = id));



  create policy "Users can update their own data"
  on "public"."users"
  as permissive
  for update
  to public
using ((auth.uid() = id));



  create policy "Admin read wa_members"
  on "public"."wild_apricot_members"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.profiles p
     JOIN public.user_profile_access upa ON ((upa.profile_id = p.id)))
  WHERE ((upa.user_id = auth.uid()) AND (p.role = 'admin'::public.user_role)))));


CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_group_staff_updated_at_trigger BEFORE UPDATE ON public.group_staff FOR EACH ROW EXECUTE FUNCTION public.update_group_staff_updated_at();

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_profiles_timestamp();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_users_timestamp();


