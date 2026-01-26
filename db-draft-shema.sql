-- ==============================================================================
-- SCHEMA COMPLET: CLUB CYCLISTE DE LÉVIS (APP JEUNESSE)
-- Version: 2.0 (Finale)
-- Philosophie: Inclusivité, Plaisir, Logistique terrain.
-- Stack: Supabase (PostgreSQL)
-- ==============================================================================


-- ==============================================================================
-- 2. TYPES & ENUMS (Le vocabulaire du système)
-- ==============================================================================

CREATE TYPE user_role AS ENUM ('admin', 'coach', 'athlete');
CREATE TYPE relation_type AS ENUM ('self', 'parent', 'guardian');
CREATE TYPE staff_role AS ENUM ('head_coach', 'assistant', 'sweeper'); -- Sweeper = Serre-file
CREATE TYPE attendance_status AS ENUM ('unknown', 'present', 'absent', 'late', 'excused');


-- ==============================================================================
-- 3. IDENTITÉ & FAMILLE (Core)
-- ==============================================================================

-- TABLE: PROFILES
-- Miroir des données Odoo. Contient l'identité de l'humain (Athlète ou Coach).
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    odoo_id INT UNIQUE, -- Lien futur vers ERP
    claim_code TEXT UNIQUE, -- Pour l'activation Phase 1 (ex: "VELO-8832")
    
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT, -- Courriel de contact (informatif)
    phone TEXT,
    avatar_url TEXT,
    
    role user_role DEFAULT 'athlete',
    
    -- Données Santé / Urgence (Protégées par RLS)
    medical_notes TEXT, 
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    
    birth_date DATE,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE: USER_PROFILE_ACCESS
-- La table de liaison qui gère "Qui a le droit de voir/gérer qui".
-- Permet à 2 parents séparés de voir le même enfant (profile).
CREATE TABLE public.user_profile_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Le compte de connexion (Supabase Auth)
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- La fiche membre
    relation relation_type NOT NULL, 
    
    -- Permissions granulaires (ex: Un tuteur peut voir le calendrier mais pas le chat)
    permissions JSONB DEFAULT '{"can_chat": true, "can_rsvp": true}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, profile_id)
);


-- ==============================================================================
-- 4. LOGISTIQUE & GROUPES
-- ==============================================================================

-- TABLE: GROUPS
-- Les équipes (ex: "Atome B - Récréatif").
CREATE TABLE public.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    level_required INT DEFAULT 1,
    color_code TEXT DEFAULT '#FF6600', -- Orange Club par défaut
    chat_channel_id UUID DEFAULT gen_random_uuid(), -- ID unique pour le Realtime Chat
    created_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE: GROUP_MEMBERS
-- Qui est dans quel groupe (Historique possible via logs, ici état actuel).
CREATE TABLE public.group_members (
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (group_id, profile_id)
);

-- TABLE: GROUP_STAFF (LA RÈGLE)
-- Le staff assigné par défaut au groupe (ex: Coach Steve est le coach principal de l'année).
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
    location_url TEXT, -- Lien Google Maps
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    event_type TEXT DEFAULT 'training',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- TABLE: EVENT_STAFF (L'EXCEPTION)
-- Surcharge le staff pour une soirée spécifique (Remplacement, Ajout).
CREATE TABLE public.event_staff (
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_on_site staff_role DEFAULT 'assistant',
    is_confirmed BOOLEAN DEFAULT false,
    PRIMARY KEY (event_id, profile_id)
);

-- VIEW: V_EVENT_STAFFING (INTELLIGENCE)
-- Combine la Règle (Group Staff) et l'Exception (Event Staff) pour dire à l'App qui afficher.
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
    -- Priorité à l'exception (event_staff), sinon le défaut (group_staff)
    COALESCE(es.role_on_site, gs.default_role) AS active_role,
    CASE WHEN es.profile_id IS NOT NULL THEN true ELSE false END AS is_override
FROM public.events e
JOIN public.group_staff gs ON e.group_id = gs.group_id
LEFT JOIN public.event_staff es ON e.id = es.event_id AND gs.profile_id = es.profile_id
JOIN public.profiles p ON (es.profile_id IS NOT NULL OR gs.profile_id = p.id)
WHERE true; -- Possibilité d'ajouter des filtres d'exclusion ici


-- ==============================================================================
-- 6. OPÉRATIONS TERRAIN & PÉDAGOGIE
-- ==============================================================================

-- TABLE: ATTENDANCE (Présences)
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

-- TABLE: EVALUATIONS (Classement & Plaisir)
-- Sert à placer le jeune dans le bon groupe, PAS à la performance compétitive.
CREATE TABLE public.evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES public.profiles(id),
    evaluation_date TIMESTAMPTZ DEFAULT now(),
    
    -- Le détail est flexible (JSONB) car les critères peuvent changer chaque saison.
    -- Ex: {"confiance": 5, "freinage": 3, "attitude_groupe": 5}
    details JSONB, 
    
    recommended_level INT, -- Niveau suggéré pour le re-classement
    notes TEXT, -- Commentaires qualitatifs
    created_at TIMESTAMPTZ DEFAULT now()
);


-- ==============================================================================
-- 7. ACADÉMIE (LMS)
-- ==============================================================================

CREATE TABLE public.academy_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    video_provider TEXT DEFAULT 'youtube',
    video_id TEXT NOT NULL, -- ID de la vidéo externe
    category TEXT,
    level_min INT DEFAULT 1,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Suivi (Optionnel - Pour voir si le jeune a regardé les capsules de sécurité)
CREATE TABLE public.profile_progression (
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    video_id UUID REFERENCES public.academy_videos(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    PRIMARY KEY (profile_id, video_id)
);


-- ==============================================================================
-- 8. MARKETING & PARTENAIRES (Centre de profits)
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
    promo_code TEXT, -- Ex: "CLUBLEVIS2026"
    promo_description TEXT, -- Ex: "15% sur les mises au point"
    tier INT DEFAULT 1, -- 1=Gold, 2=Silver, etc.
    is_active BOOLEAN DEFAULT true
);


-- ==============================================================================
-- 9. SÉCURITÉ (RLS - Row Level Security)
-- ==============================================================================
-- Activation de la sécurité sur toutes les tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profile_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- POLITIQUE DE BASE (Lecture Publique pour Marketing)
CREATE POLICY "Public read announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Public read partners" ON public.partners FOR SELECT USING (true);

-- POLITIQUE D'ACCÈS MEMBRE (Simplifiée pour démarrage)
-- "Je peux voir mon profil et ceux de mes enfants"
CREATE POLICY "Access own family profiles" ON public.profiles
FOR SELECT USING (
    id IN (
        SELECT profile_id FROM public.user_profile_access WHERE user_id = auth.uid()
    )
    OR role IN ('coach', 'admin') -- Les coachs voient tout le monde (pour l'instant)
);

-- "Je peux voir les événements de mes groupes"
CREATE POLICY "Access group events" ON public.events
FOR SELECT USING (
    group_id IN (
        SELECT group_id FROM public.group_members 
        WHERE profile_id IN (
            SELECT profile_id FROM public.user_profile_access WHERE user_id = auth.uid()
        )
    )
    OR EXISTS ( -- Les coachs voient tout
        SELECT 1 FROM public.profiles 
        WHERE id IN (SELECT profile_id FROM public.user_profile_access WHERE user_id = auth.uid())
        AND role IN ('coach', 'admin')
    )
);

-- ==============================================================================
-- FIN DU SCRIPT
-- ==============================================================================