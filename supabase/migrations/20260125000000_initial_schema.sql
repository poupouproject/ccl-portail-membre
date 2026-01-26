-- ==============================================================================
-- MIGRATION: Schema complet Club Cycliste de Lévis (App Jeunesse)
-- Version: 1.0
-- ==============================================================================

-- ==============================================================================
-- 1. EXTENSIONS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. TYPES & ENUMS
-- ==============================================================================

CREATE TYPE user_role AS ENUM ('admin', 'coach', 'athlete');
CREATE TYPE relation_type AS ENUM ('self', 'parent', 'guardian');
CREATE TYPE staff_role AS ENUM ('head_coach', 'assistant', 'sweeper');
CREATE TYPE attendance_status AS ENUM ('unknown', 'present', 'absent', 'late', 'excused');


-- ==============================================================================
-- 3. IDENTITÉ & FAMILLE (Core)
-- ==============================================================================

-- TABLE: PROFILES
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    odoo_id INT UNIQUE,
    claim_code TEXT UNIQUE,
    
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    
    role user_role DEFAULT 'athlete',
    
    medical_notes TEXT, 
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    
    birth_date DATE,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE: USER_PROFILE_ACCESS
CREATE TABLE public.user_profile_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    relation relation_type NOT NULL, 
    permissions JSONB DEFAULT '{"can_chat": true, "can_rsvp": true}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, profile_id)
);

CREATE INDEX idx_user_profile_access_user_id ON public.user_profile_access(user_id);
CREATE INDEX idx_user_profile_access_profile_id ON public.user_profile_access(profile_id);


-- ==============================================================================
-- 4. LOGISTIQUE & GROUPES
-- ==============================================================================

-- TABLE: GROUPS
CREATE TABLE public.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    level_required INT DEFAULT 1,
    color_code TEXT DEFAULT '#FF6600',
    chat_channel_id UUID DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE: GROUP_MEMBERS
CREATE TABLE public.group_members (
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (group_id, profile_id)
);

CREATE INDEX idx_group_members_profile_id ON public.group_members(profile_id);

-- TABLE: GROUP_STAFF
CREATE TABLE public.group_staff (
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    default_role staff_role DEFAULT 'assistant',
    PRIMARY KEY (group_id, profile_id)
);


-- ==============================================================================
-- 5. ÉVÉNEMENTS & ROTATION STAFF
-- ==============================================================================

-- TABLE: EVENTS
CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    location_name TEXT,
    location_url TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    event_type TEXT DEFAULT 'training',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_events_group_id ON public.events(group_id);
CREATE INDEX idx_events_start_time ON public.events(start_time);

-- TABLE: EVENT_STAFF
CREATE TABLE public.event_staff (
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_on_site staff_role DEFAULT 'assistant',
    is_confirmed BOOLEAN DEFAULT false,
    PRIMARY KEY (event_id, profile_id)
);

-- VIEW: V_EVENT_STAFFING
CREATE OR REPLACE VIEW public.v_event_staffing AS
SELECT 
    e.id AS event_id,
    e.title,
    e.start_time,
    e.group_id,
    p.id AS profile_id,
    p.first_name,
    p.last_name,
    p.avatar_url,
    COALESCE(es.role_on_site, gs.default_role) AS active_role,
    CASE WHEN es.profile_id IS NOT NULL THEN true ELSE false END AS is_override
FROM public.events e
JOIN public.group_staff gs ON e.group_id = gs.group_id
LEFT JOIN public.event_staff es ON e.id = es.event_id AND gs.profile_id = es.profile_id
JOIN public.profiles p ON gs.profile_id = p.id;


-- ==============================================================================
-- 6. OPÉRATIONS TERRAIN & PÉDAGOGIE
-- ==============================================================================

-- TABLE: ATTENDANCE
CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status attendance_status DEFAULT 'unknown',
    note TEXT,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, profile_id)
);

CREATE INDEX idx_attendance_event_id ON public.attendance(event_id);
CREATE INDEX idx_attendance_profile_id ON public.attendance(profile_id);

-- TABLE: EVALUATIONS
CREATE TABLE public.evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES public.profiles(id),
    evaluation_date TIMESTAMPTZ DEFAULT now(),
    details JSONB, 
    recommended_level INT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_evaluations_profile_id ON public.evaluations(profile_id);


-- ==============================================================================
-- 7. ACADÉMIE (LMS)
-- ==============================================================================

CREATE TABLE public.academy_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    video_provider TEXT DEFAULT 'youtube',
    video_id TEXT NOT NULL,
    category TEXT,
    level_min INT DEFAULT 1,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.profile_progression (
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_id UUID REFERENCES public.academy_videos(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    PRIMARY KEY (profile_id, video_id)
);


-- ==============================================================================
-- 8. MARKETING & PARTENAIRES
-- ==============================================================================

CREATE TABLE public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    image_url TEXT,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ
);

CREATE TABLE public.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT NOT NULL,
    website_url TEXT,
    promo_code TEXT,
    promo_description TEXT,
    tier INT DEFAULT 1,
    is_active BOOLEAN DEFAULT true
);


-- ==============================================================================
-- 9. SÉCURITÉ (RLS)
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profile_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_progression ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Politiques publiques (lecture)
CREATE POLICY "Public read announcements" ON public.announcements 
    FOR SELECT USING (true);

CREATE POLICY "Public read partners" ON public.partners 
    FOR SELECT USING (true);

CREATE POLICY "Public read academy_videos" ON public.academy_videos 
    FOR SELECT USING (is_published = true);

CREATE POLICY "Public read groups" ON public.groups 
    FOR SELECT USING (true);

-- Politiques d'accès membre
CREATE POLICY "Access own profile access" ON public.user_profile_access
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Insert own profile access" ON public.user_profile_access
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Access family profiles" ON public.profiles
    FOR SELECT USING (
        id IN (
            SELECT profile_id FROM public.user_profile_access WHERE user_id = auth.uid()
        )
        OR role IN ('coach', 'admin')
    );

-- Coaches peuvent voir tous les profils
CREATE POLICY "Coaches view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.user_profile_access upa ON p.id = upa.profile_id
            WHERE upa.user_id = auth.uid() AND p.role IN ('coach', 'admin')
        )
    );

-- Accès aux événements
CREATE POLICY "Access group events" ON public.events
    FOR SELECT USING (
        group_id IN (
            SELECT group_id FROM public.group_members 
            WHERE profile_id IN (
                SELECT profile_id FROM public.user_profile_access WHERE user_id = auth.uid()
            )
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.user_profile_access upa ON p.id = upa.profile_id
            WHERE upa.user_id = auth.uid() AND p.role IN ('coach', 'admin')
        )
    );

-- Accès aux présences
CREATE POLICY "Access own attendance" ON public.attendance
    FOR SELECT USING (
        profile_id IN (
            SELECT profile_id FROM public.user_profile_access WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Upsert own attendance" ON public.attendance
    FOR INSERT WITH CHECK (
        profile_id IN (
            SELECT profile_id FROM public.user_profile_access WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Update own attendance" ON public.attendance
    FOR UPDATE USING (
        profile_id IN (
            SELECT profile_id FROM public.user_profile_access WHERE user_id = auth.uid()
        )
    );

-- Coaches peuvent gérer les présences
CREATE POLICY "Coaches manage attendance" ON public.attendance
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.user_profile_access upa ON p.id = upa.profile_id
            WHERE upa.user_id = auth.uid() AND p.role IN ('coach', 'admin')
        )
    );

-- Accès aux évaluations
CREATE POLICY "Access own evaluations" ON public.evaluations
    FOR SELECT USING (
        profile_id IN (
            SELECT profile_id FROM public.user_profile_access WHERE user_id = auth.uid()
        )
    );

-- Coaches peuvent gérer les évaluations
CREATE POLICY "Coaches manage evaluations" ON public.evaluations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.user_profile_access upa ON p.id = upa.profile_id
            WHERE upa.user_id = auth.uid() AND p.role IN ('coach', 'admin')
        )
    );

-- Accès à la progression
CREATE POLICY "Access own progression" ON public.profile_progression
    FOR ALL USING (
        profile_id IN (
            SELECT profile_id FROM public.user_profile_access WHERE user_id = auth.uid()
        )
    );

-- Accès aux membres du groupe
CREATE POLICY "Access group members" ON public.group_members
    FOR SELECT USING (
        profile_id IN (
            SELECT profile_id FROM public.user_profile_access WHERE user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.user_profile_access upa ON p.id = upa.profile_id
            WHERE upa.user_id = auth.uid() AND p.role IN ('coach', 'admin')
        )
    );

-- Accès au staff du groupe
CREATE POLICY "Access group staff" ON public.group_staff
    FOR SELECT USING (true);

-- Accès au staff des événements
CREATE POLICY "Access event staff" ON public.event_staff
    FOR SELECT USING (true);


-- ==============================================================================
-- 10. FONCTIONS UTILITAIRES
-- ==============================================================================

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour attendance
CREATE TRIGGER update_attendance_updated_at
    BEFORE UPDATE ON public.attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ==============================================================================
-- FIN DE LA MIGRATION
-- ==============================================================================
