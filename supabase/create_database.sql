-- ==============================================================================
-- SCRIPT DE CRÉATION COMPLÈTE DE LA BASE DE DONNÉES
-- CCL Portail Membre - Supabase
-- Version: 2026-02 (Multi-abonnements avec rôles)
-- ==============================================================================

-- ==============================================================================
-- 1. TYPES & ENUMS
-- ==============================================================================

CREATE TYPE public.user_role AS ENUM ('admin', 'coach', 'athlete', 'parent');
CREATE TYPE public.relation_type AS ENUM ('self', 'parent', 'guardian');
CREATE TYPE public.staff_role AS ENUM ('head_coach', 'assistant', 'sweeper');
CREATE TYPE public.attendance_status AS ENUM ('unknown', 'present', 'absent', 'late', 'excused');
CREATE TYPE public.group_category AS ENUM ('recreational', 'intensive');
CREATE TYPE public.event_schedule_type AS ENUM ('regular', 'special');
CREATE TYPE public.chat_channel_type AS ENUM ('all', 'recreational', 'intensive', 'staff');
CREATE TYPE public.membership_status AS ENUM ('active', 'lapsed', 'pending', 'archived');
CREATE TYPE public.context_type AS ENUM ('participant', 'coach', 'dependent');
CREATE TYPE public.subscription_status AS ENUM ('active', 'pending', 'expired', 'cancelled');

-- ==============================================================================
-- 2. TABLE PROFILES (Identité des membres)
-- ==============================================================================

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Identifiants externes
    odoo_id INTEGER UNIQUE,
    parent_odoo_id INTEGER,
    claim_code TEXT UNIQUE,
    wa_member_id TEXT UNIQUE,
    
    -- Identité
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    
    -- Rôle legacy (gardé pour compatibilité)
    role public.user_role DEFAULT 'athlete',
    member_category public.group_category,
    
    -- Données médicales/urgence
    medical_notes TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relation TEXT,
    
    -- Adresse
    address_line1 TEXT,
    address_city TEXT,
    address_postal_code TEXT,
    
    -- Dates et permissions
    birth_date DATE,
    birthdate DATE,
    photo_permission BOOLEAN DEFAULT TRUE,
    
    -- Statut
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    is_coordinator BOOLEAN DEFAULT FALSE,
    
    -- Calculés (maintenus par trigger)
    is_minor BOOLEAN DEFAULT FALSE,
    is_autonomous BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX idx_profiles_auth_user_id ON public.profiles(auth_user_id);
CREATE INDEX idx_profiles_odoo_id ON public.profiles(odoo_id);
CREATE INDEX idx_profiles_parent_odoo_id ON public.profiles(parent_odoo_id);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 3. TABLE USER_PROFILE_ACCESS (Liaison auth.users -> profiles)
-- ==============================================================================

CREATE TABLE public.user_profile_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    relation public.relation_type NOT NULL,
    permissions JSONB DEFAULT '{"can_chat": true, "can_rsvp": true}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, profile_id)
);

-- Index
CREATE INDEX idx_user_profile_access_user_id ON public.user_profile_access(user_id);
CREATE INDEX idx_user_profile_access_profile_id ON public.user_profile_access(profile_id);

-- RLS
ALTER TABLE public.user_profile_access ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 4. TABLE ROLES (Catalogue des rôles avec permissions)
-- ==============================================================================

CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    requires_subscription BOOLEAN DEFAULT TRUE,
    permissions JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX idx_roles_name ON public.roles(name);

-- RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view roles"
ON public.roles FOR SELECT USING (TRUE);

-- ==============================================================================
-- 5. TABLE SUBSCRIPTION_TYPES (Catalogue des produits Odoo)
-- ==============================================================================

CREATE TABLE public.subscription_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    odoo_product_id INTEGER UNIQUE,
    grants_role_id UUID NOT NULL REFERENCES public.roles(id),
    category TEXT CHECK (category IN ('jeunesse', 'adulte')),
    frequency TEXT CHECK (frequency IN ('1x_semaine', '2x_semaine', 'illimite')),
    price_cents INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX idx_subscription_types_odoo ON public.subscription_types(odoo_product_id);
CREATE INDEX idx_subscription_types_role ON public.subscription_types(grants_role_id);

-- RLS
ALTER TABLE public.subscription_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view subscription types"
ON public.subscription_types FOR SELECT USING (TRUE);

-- ==============================================================================
-- 6. TABLE LOCATIONS (Lieux des événements)
-- ==============================================================================

CREATE TABLE public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    google_maps_url TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view locations"
ON public.locations FOR SELECT USING (TRUE);

-- ==============================================================================
-- 7. TABLE GROUPS (Groupes d'entraînement)
-- ==============================================================================

CREATE TABLE public.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    level_required INTEGER DEFAULT 1,
    color_code TEXT DEFAULT '#FF6600',
    category public.group_category DEFAULT 'recreational',
    default_day_of_week INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    chat_channel_id UUID DEFAULT gen_random_uuid(),
    season INTEGER,
    internal_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 8. TABLE GROUP_MEMBERS (Membres des groupes)
-- ==============================================================================

CREATE TABLE public.group_members (
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (group_id, profile_id)
);

-- Index
CREATE INDEX idx_group_members_profile_id ON public.group_members(profile_id);

-- RLS
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 9. TABLE GROUP_STAFF (Encadrants des groupes)
-- ==============================================================================

CREATE TABLE public.group_staff (
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    default_role public.staff_role DEFAULT 'assistant',
    PRIMARY KEY (group_id, profile_id)
);

-- Index
CREATE INDEX idx_group_staff_profile_id ON public.group_staff(profile_id);
CREATE INDEX idx_group_staff_group_id ON public.group_staff(group_id);

-- RLS
ALTER TABLE public.group_staff ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 10. TABLE SUBSCRIPTIONS (Abonnements des membres)
-- ==============================================================================

CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    subscription_type TEXT NOT NULL,
    subscription_type_id UUID REFERENCES public.subscription_types(id),
    status public.subscription_status DEFAULT 'active',
    start_date TIMESTAMPTZ DEFAULT now(),
    end_date TIMESTAMPTZ,
    odoo_sale_order_line_id INTEGER UNIQUE,
    synced_at TIMESTAMPTZ,
    source TEXT DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(profile_id, group_id, status)
);

-- Index
CREATE INDEX idx_subscriptions_profile_id ON public.subscriptions(profile_id);
CREATE INDEX idx_subscriptions_group_id ON public.subscriptions(group_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_type ON public.subscriptions(subscription_type_id);

-- RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 11. TABLE PROFILE_ROLES (Assignation des rôles aux profils)
-- ==============================================================================

CREATE TABLE public.profile_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    source TEXT NOT NULL CHECK (source IN ('subscription', 'group_staff', 'manual')),
    source_id UUID,
    assigned_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    assigned_by UUID REFERENCES public.profiles(id),
    UNIQUE(profile_id, role_id, source_id)
);

-- Index
CREATE INDEX idx_profile_roles_profile ON public.profile_roles(profile_id);
CREATE INDEX idx_profile_roles_role ON public.profile_roles(role_id);
CREATE INDEX idx_profile_roles_source ON public.profile_roles(source, source_id);
CREATE INDEX idx_profile_roles_expires ON public.profile_roles(expires_at) WHERE expires_at IS NOT NULL;

-- RLS
ALTER TABLE public.profile_roles ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 12. TABLE EVENTS (Événements/Sorties)
-- ==============================================================================

CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    location_name TEXT,
    location_url TEXT,
    location_id UUID REFERENCES public.locations(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    event_type TEXT DEFAULT 'training',
    schedule_type public.event_schedule_type DEFAULT 'regular',
    is_for_recreational BOOLEAN DEFAULT FALSE,
    is_for_intensive BOOLEAN DEFAULT FALSE,
    is_cancelled BOOLEAN DEFAULT FALSE,
    cancellation_reason TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX idx_events_group_id ON public.events(group_id);
CREATE INDEX idx_events_start_time ON public.events(start_time);
CREATE INDEX idx_events_location_id ON public.events(location_id);

-- RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 13. TABLE EVENT_GROUPS (Liaison événements-groupes)
-- ==============================================================================

CREATE TABLE public.event_groups (
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (event_id, group_id)
);

-- RLS
ALTER TABLE public.event_groups ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 14. TABLE EVENT_STAFF (Staff par événement)
-- ==============================================================================

CREATE TABLE public.event_staff (
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_on_site public.staff_role DEFAULT 'assistant',
    is_confirmed BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (event_id, profile_id)
);

-- RLS
ALTER TABLE public.event_staff ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 15. TABLE ATTENDANCE (Présences)
-- ==============================================================================

CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id),
    status public.attendance_status DEFAULT 'unknown',
    note TEXT,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, profile_id)
);

-- Index
CREATE INDEX idx_attendance_event_id ON public.attendance(event_id);
CREATE INDEX idx_attendance_profile_id ON public.attendance(profile_id);
CREATE INDEX idx_attendance_subscription_id ON public.attendance(subscription_id);

-- RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 16. TABLE EVALUATIONS
-- ==============================================================================

CREATE TABLE public.evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES public.profiles(id),
    evaluation_date TIMESTAMPTZ DEFAULT now(),
    details JSONB,
    recommended_level INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX idx_evaluations_profile_id ON public.evaluations(profile_id);

-- RLS
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 17. TABLE ACADEMY_VIDEOS (Vidéos pédagogiques)
-- ==============================================================================

CREATE TABLE public.academy_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    video_provider TEXT DEFAULT 'youtube',
    video_id TEXT NOT NULL,
    category TEXT,
    level_min INTEGER DEFAULT 1,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX idx_academy_videos_category ON public.academy_videos(category);
CREATE INDEX idx_academy_videos_level ON public.academy_videos(level_min);

-- RLS
ALTER TABLE public.academy_videos ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 18. TABLE PROFILE_PROGRESSION (Progression des vidéos)
-- ==============================================================================

CREATE TABLE public.profile_progression (
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES public.academy_videos(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    PRIMARY KEY (profile_id, video_id)
);

-- Index
CREATE INDEX idx_profile_progression_profile ON public.profile_progression(profile_id);

-- RLS
ALTER TABLE public.profile_progression ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 19. TABLE USER_DEVICES (Notifications push)
-- ==============================================================================

CREATE TABLE public.user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    device_type TEXT DEFAULT 'web',
    device_name TEXT,
    push_endpoint TEXT,
    push_p256dh TEXT,
    push_auth TEXT,
    push_token TEXT,
    push_enabled BOOLEAN DEFAULT TRUE,
    last_active_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX idx_user_devices_user_id ON public.user_devices(user_id);

-- RLS
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 20. TABLE NOTIFICATIONS
-- ==============================================================================

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    data JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 21. TABLE CHAT_MESSAGES
-- ==============================================================================

CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    channel public.chat_channel_type DEFAULT 'all',
    content TEXT NOT NULL,
    is_important BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    reply_to_id UUID REFERENCES public.chat_messages(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 22. TABLE CHAT_READ_STATUS
-- ==============================================================================

CREATE TABLE public.chat_read_status (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    channel public.chat_channel_type NOT NULL DEFAULT 'all',
    last_read_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, channel)
);

-- RLS
ALTER TABLE public.chat_read_status ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 23. FONCTIONS UTILITAIRES
-- ==============================================================================

-- Fonction handle_updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction compute_profile_minor_autonomous
CREATE OR REPLACE FUNCTION public.compute_profile_minor_autonomous()
RETURNS TRIGGER AS $$
DECLARE
    v_is_minor BOOLEAN;
    v_is_autonomous BOOLEAN;
BEGIN
    -- Calculer is_minor (TRUE si < 18 ans)
    IF NEW.birthdate IS NULL THEN
        v_is_minor := FALSE;
    ELSIF age(NEW.birthdate) < interval '18 years' THEN
        v_is_minor := TRUE;
    ELSE
        v_is_minor := FALSE;
    END IF;
    
    -- Calculer is_autonomous
    IF NOT v_is_minor THEN
        v_is_autonomous := TRUE;
    ELSIF NEW.parent_odoo_id IS NULL THEN
        v_is_autonomous := TRUE;
    ELSIF NEW.email IS NOT NULL AND NEW.email != '' THEN
        v_is_autonomous := TRUE;
    ELSE
        v_is_autonomous := FALSE;
    END IF;
    
    NEW.is_minor := v_is_minor;
    NEW.is_autonomous := v_is_autonomous;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction grant_role_from_subscription
CREATE OR REPLACE FUNCTION public.grant_role_from_subscription()
RETURNS TRIGGER AS $$
DECLARE
    v_role_id UUID;
BEGIN
    IF NEW.subscription_type_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT grants_role_id INTO v_role_id
    FROM public.subscription_types
    WHERE id = NEW.subscription_type_id;
    
    IF v_role_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.status = 'active' THEN
        INSERT INTO public.profile_roles (profile_id, role_id, source, source_id, expires_at)
        VALUES (NEW.profile_id, v_role_id, 'subscription', NEW.id, NEW.end_date)
        ON CONFLICT (profile_id, role_id, source_id) 
        DO UPDATE SET expires_at = EXCLUDED.expires_at;
    ELSE
        DELETE FROM public.profile_roles
        WHERE source = 'subscription' AND source_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction grant_coach_role_from_group_staff
CREATE OR REPLACE FUNCTION public.grant_coach_role_from_group_staff()
RETURNS TRIGGER AS $$
DECLARE
    v_coach_role_id UUID;
BEGIN
    SELECT id INTO v_coach_role_id
    FROM public.roles WHERE name = 'coach';
    
    IF v_coach_role_id IS NULL THEN
        RETURN NEW;
    END IF;

    INSERT INTO public.profile_roles (profile_id, role_id, source, source_id)
    VALUES (NEW.profile_id, v_coach_role_id, 'group_staff', NEW.group_id)
    ON CONFLICT (profile_id, role_id, source_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction revoke_coach_role_from_group_staff
CREATE OR REPLACE FUNCTION public.revoke_coach_role_from_group_staff()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.profile_roles
    WHERE profile_id = OLD.profile_id
      AND source = 'group_staff' 
      AND source_id = OLD.group_id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 24. FONCTION get_user_contexts
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_user_contexts(user_uuid UUID)
RETURNS TABLE (
    context_type TEXT,
    profile_id UUID,
    profile_name TEXT,
    subscription_id UUID,
    subscription_type TEXT,
    group_id UUID,
    group_name TEXT,
    relation TEXT,
    staff_role TEXT,
    roles JSONB
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    -- Contextes des abonnements (participant ou dépendant)
    SELECT 
        CASE 
            WHEN upa.relation = 'self' THEN 'participant'::TEXT
            ELSE 'dependent'::TEXT
        END as context_type,
        p.id as profile_id,
        (p.first_name || ' ' || p.last_name)::TEXT as profile_name,
        s.id as subscription_id,
        st.name::TEXT as subscription_type,
        g.id as group_id,
        g.name::TEXT as group_name,
        upa.relation::TEXT as relation,
        NULL::TEXT as staff_role,
        COALESCE(
          (SELECT jsonb_agg(jsonb_build_object(
            'role_name', r.name,
            'display_name', r.display_name,
            'permissions', r.permissions
          ))
          FROM profile_roles pr
          JOIN roles r ON r.id = pr.role_id
          WHERE pr.profile_id = p.id
            AND (pr.expires_at IS NULL OR pr.expires_at > now())
          ),
          '[]'::JSONB
        ) as roles
    FROM user_profile_access upa
    INNER JOIN profiles p ON upa.profile_id = p.id
    INNER JOIN subscriptions s ON s.profile_id = p.id AND s.status = 'active'
    INNER JOIN groups g ON s.group_id = g.id
    LEFT JOIN subscription_types st ON st.id = s.subscription_type_id
    WHERE upa.user_id = user_uuid
      AND p.is_active = TRUE
      AND g.is_active = TRUE
    
    UNION ALL
    
    -- Contextes via relations familiales Odoo (enfants)
    SELECT 
        'dependent'::TEXT as context_type,
        child.id as profile_id,
        (child.first_name || ' ' || child.last_name)::TEXT as profile_name,
        s.id as subscription_id,
        st.name::TEXT as subscription_type,
        g.id as group_id,
        g.name::TEXT as group_name,
        'parent'::TEXT as relation,
        NULL::TEXT as staff_role,
        COALESCE(
          (SELECT jsonb_agg(jsonb_build_object(
            'role_name', r.name,
            'display_name', r.display_name,
            'permissions', r.permissions
          ))
          FROM profile_roles pr
          JOIN roles r ON r.id = pr.role_id
          WHERE pr.profile_id = child.id
            AND (pr.expires_at IS NULL OR pr.expires_at > now())
          ),
          '[]'::JSONB
        ) as roles
    FROM profiles parent
    INNER JOIN user_profile_access upa ON upa.profile_id = parent.id AND upa.relation = 'self'
    INNER JOIN profiles child ON child.parent_odoo_id = parent.odoo_id
    INNER JOIN subscriptions s ON s.profile_id = child.id AND s.status = 'active'
    INNER JOIN groups g ON s.group_id = g.id
    LEFT JOIN subscription_types st ON st.id = s.subscription_type_id
    WHERE upa.user_id = user_uuid
      AND parent.odoo_id IS NOT NULL
      AND child.is_active = TRUE
      AND g.is_active = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM user_profile_access upa2 
        WHERE upa2.user_id = user_uuid AND upa2.profile_id = child.id
      )
    
    UNION ALL
    
    -- Contextes coach (pour le staff)
    SELECT 
        'coach'::TEXT as context_type,
        p.id as profile_id,
        (p.first_name || ' ' || p.last_name)::TEXT as profile_name,
        NULL::UUID as subscription_id,
        NULL::TEXT as subscription_type,
        g.id as group_id,
        g.name::TEXT as group_name,
        upa.relation::TEXT as relation,
        gs.default_role::TEXT as staff_role,
        COALESCE(
          (SELECT jsonb_agg(jsonb_build_object(
            'role_name', r.name,
            'display_name', r.display_name,
            'permissions', r.permissions
          ))
          FROM profile_roles pr
          JOIN roles r ON r.id = pr.role_id
          WHERE pr.profile_id = p.id
            AND (pr.expires_at IS NULL OR pr.expires_at > now())
          ),
          '[]'::JSONB
        ) as roles
    FROM user_profile_access upa
    INNER JOIN profiles p ON upa.profile_id = p.id
    INNER JOIN group_staff gs ON gs.profile_id = p.id
    INNER JOIN groups g ON gs.group_id = g.id
    WHERE upa.user_id = user_uuid
      AND upa.relation = 'self'
      AND p.is_active = TRUE
      AND g.is_active = TRUE
    
    ORDER BY 
        CASE WHEN staff_role IS NOT NULL THEN 0 ELSE 1 END,
        relation, 
        profile_name,
        group_name;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.get_user_contexts(UUID) TO authenticated;

-- ==============================================================================
-- 25. FONCTION create_event_with_groups
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.create_event_with_groups(
    p_title TEXT, 
    p_description TEXT, 
    p_location_id UUID, 
    p_start_time TIMESTAMPTZ, 
    p_end_time TIMESTAMPTZ, 
    p_event_type TEXT, 
    p_schedule_type public.event_schedule_type, 
    p_is_for_recreational BOOLEAN, 
    p_is_for_intensive BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event_id UUID;
    v_group RECORD;
BEGIN
    INSERT INTO public.events (
        title, description, location_id, start_time, end_time, 
        event_type, schedule_type, is_for_recreational, is_for_intensive,
        created_by
    ) VALUES (
        p_title, p_description, p_location_id, p_start_time, p_end_time,
        p_event_type, p_schedule_type, p_is_for_recreational, p_is_for_intensive,
        auth.uid()
    ) RETURNING id INTO v_event_id;
    
    IF p_is_for_recreational THEN
        FOR v_group IN SELECT id FROM public.groups WHERE category = 'recreational' AND is_active = true
        LOOP
            INSERT INTO public.event_groups (event_id, group_id) 
            VALUES (v_event_id, v_group.id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
    
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
$$;

-- ==============================================================================
-- 26. VUES
-- ==============================================================================

-- Vue v_family_relations
CREATE OR REPLACE VIEW public.v_family_relations AS
SELECT 
    parent.id as parent_profile_id,
    upa.user_id as parent_user_id,
    parent.first_name || ' ' || parent.last_name as parent_name,
    child.id as child_profile_id,
    child.first_name || ' ' || child.last_name as child_name,
    'parent'::TEXT as relation_type,
    'odoo'::TEXT as source
FROM public.profiles child
JOIN public.profiles parent ON parent.odoo_id = child.parent_odoo_id
LEFT JOIN public.user_profile_access upa ON upa.profile_id = parent.id AND upa.relation = 'self'
WHERE child.parent_odoo_id IS NOT NULL;

GRANT SELECT ON public.v_family_relations TO authenticated;

-- Vue v_profile_all_roles
CREATE OR REPLACE VIEW public.v_profile_all_roles AS
SELECT 
    p.id as profile_id,
    p.first_name,
    p.last_name,
    p.email,
    p.is_minor,
    p.is_autonomous,
    p.is_admin,
    p.is_coordinator,
    COALESCE(
        jsonb_agg(
            DISTINCT jsonb_build_object(
                'role_id', r.id,
                'role_name', r.name,
                'display_name', r.display_name,
                'permissions', r.permissions,
                'source', pr.source,
                'expires_at', pr.expires_at
            )
        ) FILTER (WHERE r.id IS NOT NULL AND (pr.expires_at IS NULL OR pr.expires_at > now())),
        '[]'::JSONB
    ) as roles
FROM public.profiles p
LEFT JOIN public.profile_roles pr ON pr.profile_id = p.id
LEFT JOIN public.roles r ON r.id = pr.role_id
GROUP BY p.id, p.first_name, p.last_name, p.email, p.is_minor, p.is_autonomous, p.is_admin, p.is_coordinator;

GRANT SELECT ON public.v_profile_all_roles TO authenticated;

-- Vue v_events_with_groups
CREATE OR REPLACE VIEW public.v_events_with_groups AS
SELECT 
    e.*,
    l.name as location_display_name,
    l.address as location_address,
    l.google_maps_url as location_maps_url,
    array_agg(DISTINCT eg.group_id) FILTER (WHERE eg.group_id IS NOT NULL) as group_ids,
    array_agg(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL) as group_names
FROM public.events e
LEFT JOIN public.locations l ON e.location_id = l.id
LEFT JOIN public.event_groups eg ON e.id = eg.event_id
LEFT JOIN public.groups g ON eg.group_id = g.id
GROUP BY e.id, l.name, l.address, l.google_maps_url;

GRANT SELECT ON public.v_events_with_groups TO authenticated;

-- ==============================================================================
-- 27. TRIGGERS
-- ==============================================================================

-- Trigger updated_at pour profiles
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger compute_profile_minor_autonomous
CREATE TRIGGER compute_profile_minor_autonomous_trigger
    BEFORE INSERT OR UPDATE OF birthdate, parent_odoo_id, email ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.compute_profile_minor_autonomous();

-- Trigger updated_at pour roles
CREATE TRIGGER set_roles_updated_at
    BEFORE UPDATE ON public.roles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger updated_at pour subscription_types
CREATE TRIGGER set_subscription_types_updated_at
    BEFORE UPDATE ON public.subscription_types
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger updated_at pour subscriptions
CREATE TRIGGER set_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger subscription_grants_role
CREATE TRIGGER subscription_grants_role
    AFTER INSERT OR UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.grant_role_from_subscription();

-- Trigger group_staff_grants_coach_role
CREATE TRIGGER group_staff_grants_coach_role
    AFTER INSERT ON public.group_staff
    FOR EACH ROW
    EXECUTE FUNCTION public.grant_coach_role_from_group_staff();

-- Trigger group_staff_revokes_coach_role
CREATE TRIGGER group_staff_revokes_coach_role
    AFTER DELETE ON public.group_staff
    FOR EACH ROW
    EXECUTE FUNCTION public.revoke_coach_role_from_group_staff();

-- ==============================================================================
-- 28. POLITIQUES RLS
-- ==============================================================================

-- Profiles: Les utilisateurs peuvent voir les profils qu'ils ont accès
CREATE POLICY "Users can view their accessible profiles"
ON public.profiles FOR SELECT
USING (
    id IN (SELECT profile_id FROM public.user_profile_access WHERE user_id = auth.uid())
    OR is_admin = TRUE 
    OR is_coordinator = TRUE
);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (
    id IN (SELECT profile_id FROM public.user_profile_access WHERE user_id = auth.uid() AND relation = 'self')
);

-- User Profile Access
CREATE POLICY "Users can view their own access"
ON public.user_profile_access FOR SELECT
USING (user_id = auth.uid());

-- Groups: Tous les utilisateurs authentifiés peuvent voir les groupes actifs
CREATE POLICY "Authenticated users can view active groups"
ON public.groups FOR SELECT TO authenticated
USING (is_active = TRUE);

-- Group Members
CREATE POLICY "Users can view group members of their groups"
ON public.group_members FOR SELECT
USING (
    group_id IN (
        SELECT g.id FROM groups g
        INNER JOIN subscriptions s ON s.group_id = g.id
        INNER JOIN user_profile_access upa ON upa.profile_id = s.profile_id
        WHERE upa.user_id = auth.uid() AND s.status = 'active'
    )
    OR EXISTS (
        SELECT 1 FROM profiles p
        JOIN user_profile_access upa ON upa.profile_id = p.id
        WHERE upa.user_id = auth.uid() AND (p.is_admin OR p.is_coordinator)
    )
);

-- Group Staff
CREATE POLICY "Staff can view group staff"
ON public.group_staff FOR SELECT TO authenticated
USING (TRUE);

CREATE POLICY "Coordinators can manage group staff"
ON public.group_staff FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        JOIN user_profile_access upa ON upa.profile_id = p.id
        WHERE upa.user_id = auth.uid() AND (p.is_admin OR p.is_coordinator)
    )
);

-- Subscriptions
CREATE POLICY "Users can view their subscriptions"
ON public.subscriptions FOR SELECT
USING (
    profile_id IN (SELECT profile_id FROM public.user_profile_access WHERE user_id = auth.uid())
    OR EXISTS (
        SELECT 1 FROM profiles p
        JOIN user_profile_access upa ON upa.profile_id = p.id
        WHERE upa.user_id = auth.uid() AND (p.is_admin OR p.is_coordinator)
    )
);

-- Profile Roles
CREATE POLICY "Users can view their profile roles"
ON public.profile_roles FOR SELECT
USING (
    profile_id IN (SELECT profile_id FROM public.user_profile_access WHERE user_id = auth.uid())
    OR EXISTS (
        SELECT 1 FROM profiles p
        JOIN user_profile_access upa ON upa.profile_id = p.id
        WHERE upa.user_id = auth.uid() AND (p.is_admin OR p.is_coordinator)
    )
);

CREATE POLICY "Admins can manage profile roles"
ON public.profile_roles FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        JOIN user_profile_access upa ON upa.profile_id = p.id
        WHERE upa.user_id = auth.uid() AND (p.is_admin OR p.is_coordinator)
    )
);

-- Events
CREATE POLICY "Authenticated users can view events"
ON public.events FOR SELECT TO authenticated
USING (TRUE);

CREATE POLICY "Staff can manage events"
ON public.events FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        JOIN user_profile_access upa ON upa.profile_id = p.id
        WHERE upa.user_id = auth.uid() AND (p.is_admin OR p.is_coordinator)
    )
    OR EXISTS (
        SELECT 1 FROM group_staff gs
        JOIN user_profile_access upa ON upa.profile_id = gs.profile_id
        WHERE upa.user_id = auth.uid() AND upa.relation = 'self'
    )
);

-- Event Groups
CREATE POLICY "Authenticated users can view event groups"
ON public.event_groups FOR SELECT TO authenticated
USING (TRUE);

-- Event Staff
CREATE POLICY "Authenticated users can view event staff"
ON public.event_staff FOR SELECT TO authenticated
USING (TRUE);

-- Attendance
CREATE POLICY "Users can view attendance for their events"
ON public.attendance FOR SELECT
USING (
    profile_id IN (SELECT profile_id FROM public.user_profile_access WHERE user_id = auth.uid())
    OR EXISTS (
        SELECT 1 FROM group_staff gs
        JOIN user_profile_access upa ON upa.profile_id = gs.profile_id
        WHERE upa.user_id = auth.uid() AND upa.relation = 'self'
    )
    OR EXISTS (
        SELECT 1 FROM profiles p
        JOIN user_profile_access upa ON upa.profile_id = p.id
        WHERE upa.user_id = auth.uid() AND (p.is_admin OR p.is_coordinator)
    )
);

CREATE POLICY "Staff can manage attendance"
ON public.attendance FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM group_staff gs
        JOIN user_profile_access upa ON upa.profile_id = gs.profile_id
        WHERE upa.user_id = auth.uid() AND upa.relation = 'self'
    )
    OR EXISTS (
        SELECT 1 FROM profiles p
        JOIN user_profile_access upa ON upa.profile_id = p.id
        WHERE upa.user_id = auth.uid() AND (p.is_admin OR p.is_coordinator)
    )
);

-- Evaluations
CREATE POLICY "Users can view their evaluations"
ON public.evaluations FOR SELECT
USING (
    profile_id IN (SELECT profile_id FROM public.user_profile_access WHERE user_id = auth.uid())
    OR EXISTS (
        SELECT 1 FROM group_staff gs
        JOIN user_profile_access upa ON upa.profile_id = gs.profile_id
        WHERE upa.user_id = auth.uid() AND upa.relation = 'self'
    )
    OR EXISTS (
        SELECT 1 FROM profiles p
        JOIN user_profile_access upa ON upa.profile_id = p.id
        WHERE upa.user_id = auth.uid() AND (p.is_admin OR p.is_coordinator)
    )
);

-- Academy Videos: Tous peuvent voir les vidéos publiées
CREATE POLICY "Authenticated users can view published videos"
ON public.academy_videos FOR SELECT TO authenticated
USING (is_published = TRUE);

-- Staff peut voir toutes les vidéos (même non publiées)
CREATE POLICY "Staff can view all videos"
ON public.academy_videos FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM group_staff gs
        JOIN user_profile_access upa ON upa.profile_id = gs.profile_id
        WHERE upa.user_id = auth.uid() AND upa.relation = 'self'
    )
    OR EXISTS (
        SELECT 1 FROM profiles p
        JOIN user_profile_access upa ON upa.profile_id = p.id
        WHERE upa.user_id = auth.uid() AND (p.is_admin OR p.is_coordinator)
    )
);

-- Staff peut gérer les vidéos (head_coach, assistant, admin, coordinator)
CREATE POLICY "Staff can manage videos"
ON public.academy_videos FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM group_staff gs
        JOIN user_profile_access upa ON upa.profile_id = gs.profile_id
        WHERE upa.user_id = auth.uid() AND upa.relation = 'self'
    )
    OR EXISTS (
        SELECT 1 FROM profiles p
        JOIN user_profile_access upa ON upa.profile_id = p.id
        WHERE upa.user_id = auth.uid() AND (p.is_admin OR p.is_coordinator)
    )
);

-- Profile Progression: Utilisateurs peuvent voir leur progression
CREATE POLICY "Users can view their progression"
ON public.profile_progression FOR SELECT
USING (
    profile_id IN (SELECT profile_id FROM public.user_profile_access WHERE user_id = auth.uid())
);

-- Utilisateurs peuvent modifier leur propre progression
CREATE POLICY "Users can manage their progression"
ON public.profile_progression FOR ALL
USING (
    profile_id IN (SELECT profile_id FROM public.user_profile_access WHERE user_id = auth.uid())
);

-- Staff peut voir la progression de tous (pour suivi pédagogique)
CREATE POLICY "Staff can view all progression"
ON public.profile_progression FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM group_staff gs
        JOIN user_profile_access upa ON upa.profile_id = gs.profile_id
        WHERE upa.user_id = auth.uid() AND upa.relation = 'self'
    )
    OR EXISTS (
        SELECT 1 FROM profiles p
        JOIN user_profile_access upa ON upa.profile_id = p.id
        WHERE upa.user_id = auth.uid() AND (p.is_admin OR p.is_coordinator)
    )
);

-- User Devices
CREATE POLICY "Users can manage their devices"
ON public.user_devices FOR ALL
USING (user_id = auth.uid());

-- Notifications
CREATE POLICY "Users can view their notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

-- Chat Messages
CREATE POLICY "Authenticated users can view chat messages"
ON public.chat_messages FOR SELECT TO authenticated
USING (TRUE);

CREATE POLICY "Users can insert chat messages"
ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (author_id IN (SELECT profile_id FROM public.user_profile_access WHERE user_id = auth.uid()));

-- Chat Read Status
CREATE POLICY "Users can manage their read status"
ON public.chat_read_status FOR ALL
USING (user_id = auth.uid());

-- ==============================================================================
-- 29. DONNÉES DE SEED (Rôles et Types d'abonnements)
-- ==============================================================================

-- Rôles de base
INSERT INTO public.roles (name, display_name, description, requires_subscription, permissions) VALUES
    ('athlete_montagne_recreatif', 'Athlète Montagne Récréatif', 'Membre du programme montagne récréatif (1x/semaine)', TRUE, 
     '{"can_view_calendar": true, "can_chat_in_group": true, "can_view_evaluations": true, "calendar_scope": "own_groups"}'::JSONB),
    
    ('athlete_montagne_intensif', 'Athlète Montagne Intensif', 'Membre du programme montagne intensif (2x/semaine)', TRUE,
     '{"can_view_calendar": true, "can_chat_in_group": true, "can_view_evaluations": true, "calendar_scope": "own_groups"}'::JSONB),
    
    ('athlete_route', 'Athlète Route', 'Membre du programme route adulte', TRUE,
     '{"can_view_calendar": true, "can_chat_in_group": true, "can_view_evaluations": true, "calendar_scope": "own_groups"}'::JSONB),
    
    ('coach', 'Encadrant', 'Encadrant/éducateur du club', FALSE,
     '{"can_view_calendar": true, "can_take_attendance": true, "can_chat_in_group": true, "can_view_evaluations": true, "can_create_evaluations": true, "calendar_scope": "assigned_groups"}'::JSONB),
    
    ('admin', 'Administrateur', 'Accès lecture complète sans actions terrain', FALSE,
     '{"can_view_calendar": true, "can_view_all_members": true, "can_view_evaluations": true, "calendar_scope": "all_groups"}'::JSONB),
    
    ('coordinator', 'Coordinateur', 'Gestion complète du portail', FALSE,
     '{"can_view_calendar": true, "can_take_attendance": true, "can_manage_members": true, "can_manage_groups": true, "can_manage_events": true, "can_chat_in_group": true, "can_view_evaluations": true, "can_create_evaluations": true, "calendar_scope": "all_groups"}'::JSONB)
ON CONFLICT (name) DO NOTHING;

-- Types d'abonnements
INSERT INTO public.subscription_types (name, display_name, odoo_product_id, grants_role_id, category, frequency) VALUES
    ('montagnes_jeunesse_recreatif', 'Vélo de Montagne Jeunesse Récréatif', 1003, 
     (SELECT id FROM public.roles WHERE name = 'athlete_montagne_recreatif'), 'jeunesse', '1x_semaine'),
    
    ('montagnes_jeunesse_intensif', 'Vélo de Montagne Jeunesse Intensif', 1004,
     (SELECT id FROM public.roles WHERE name = 'athlete_montagne_intensif'), 'jeunesse', '2x_semaine'),
    
    ('route_adulte', 'Route Adulte', 2001,
     (SELECT id FROM public.roles WHERE name = 'athlete_route'), 'adulte', '2x_semaine'),
     
    ('montagnes_adulte_recreatif', 'Vélo de Montagne Adulte Récréatif', 2002,
     (SELECT id FROM public.roles WHERE name = 'athlete_montagne_recreatif'), 'adulte', '1x_semaine'),
     
    ('montagnes_adulte_intensif', 'Vélo de Montagne Adulte Intensif', 2003,
     (SELECT id FROM public.roles WHERE name = 'athlete_montagne_intensif'), 'adulte', '2x_semaine')
ON CONFLICT (name) DO NOTHING;

-- ==============================================================================
-- FIN DU SCRIPT DE CRÉATION
-- ==============================================================================
