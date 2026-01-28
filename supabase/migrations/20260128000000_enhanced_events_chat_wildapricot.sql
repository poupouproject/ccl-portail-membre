-- ==============================================================================
-- MIGRATION: Amélioration des événements, chat, emplacements et Wild Apricot
-- Date: 2026-01-28
-- Description: 
--   - Ajout du support récréatif/intensif pour les groupes
--   - Gestion des emplacements par défaut
--   - Support multi-canal pour le chat
--   - Intégration Wild Apricot webhooks
-- ==============================================================================

-- ==============================================================================
-- 1. TYPES SUPPLÉMENTAIRES
-- ==============================================================================

-- Type de groupe (récréatif ou intensif)
CREATE TYPE group_category AS ENUM ('recreational', 'intensive');

-- Type d'événement régulier ou spécial
CREATE TYPE event_schedule_type AS ENUM ('regular', 'special');

-- Canal de chat
CREATE TYPE chat_channel_type AS ENUM ('all', 'recreational', 'intensive', 'staff');

-- Statut de membre Wild Apricot
CREATE TYPE membership_status AS ENUM ('active', 'lapsed', 'pending', 'archived');


-- ==============================================================================
-- 2. TABLE: LOCATIONS (Emplacements par défaut)
-- ==============================================================================

CREATE TABLE public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    google_maps_url TEXT,
    is_default BOOLEAN DEFAULT false,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Politique: tout le monde peut lire les emplacements
CREATE POLICY "Public read locations" ON public.locations FOR SELECT USING (true);

-- Politique: seuls les admins peuvent modifier
CREATE POLICY "Admin manage locations" ON public.locations 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.user_profile_access upa ON upa.profile_id = p.id
        WHERE upa.user_id = auth.uid() AND p.role = 'admin'
    )
);


-- ==============================================================================
-- 3. MISE À JOUR TABLE: GROUPS (Ajout catégorie récréatif/intensif)
-- ==============================================================================

ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS category group_category DEFAULT 'recreational';
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS default_day_of_week INT; -- 0=Dimanche, 1=Lundi, etc.
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;


-- ==============================================================================
-- 4. MISE À JOUR TABLE: EVENTS (Support multi-groupes et emplacements)
-- ==============================================================================

-- Rendre group_id nullable pour supporter les événements multi-groupes
ALTER TABLE public.events ALTER COLUMN group_id DROP NOT NULL;

-- Ajouter nouveaux champs
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id);
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS schedule_type event_schedule_type DEFAULT 'regular';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_for_recreational BOOLEAN DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_for_intensive BOOLEAN DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);


-- ==============================================================================
-- 5. TABLE: EVENT_GROUPS (Liaison événement <-> groupes)
-- ==============================================================================

CREATE TABLE public.event_groups (
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (event_id, group_id)
);

-- RLS
ALTER TABLE public.event_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read event_groups" ON public.event_groups FOR SELECT USING (true);


-- ==============================================================================
-- 6. TABLE: CHAT_MESSAGES (Messages unifiés avec canaux)
-- ==============================================================================

CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    channel chat_channel_type DEFAULT 'all',
    content TEXT NOT NULL,
    is_important BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,
    reply_to_id UUID REFERENCES public.chat_messages(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Les membres peuvent lire les messages de leur canal
CREATE POLICY "Read chat messages" ON public.chat_messages FOR SELECT USING (
    channel = 'all' 
    OR channel = 'staff' AND EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.user_profile_access upa ON upa.profile_id = p.id
        WHERE upa.user_id = auth.uid() AND p.role IN ('admin', 'coach')
    )
    OR channel = 'recreational' AND EXISTS (
        SELECT 1 FROM public.group_members gm
        JOIN public.groups g ON g.id = gm.group_id
        JOIN public.user_profile_access upa ON upa.profile_id = gm.profile_id
        WHERE upa.user_id = auth.uid() AND g.category = 'recreational'
    )
    OR channel = 'intensive' AND EXISTS (
        SELECT 1 FROM public.group_members gm
        JOIN public.groups g ON g.id = gm.group_id
        JOIN public.user_profile_access upa ON upa.profile_id = gm.profile_id
        WHERE upa.user_id = auth.uid() AND g.category = 'intensive'
    )
);

-- Les coachs et admins peuvent écrire dans tous les canaux
CREATE POLICY "Write chat messages" ON public.chat_messages FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.user_profile_access upa ON upa.profile_id = p.id
        WHERE upa.user_id = auth.uid() AND p.role IN ('admin', 'coach')
    )
);


-- ==============================================================================
-- 7. TABLE: CHAT_READ_STATUS (Suivi des messages lus)
-- ==============================================================================

CREATE TABLE public.chat_read_status (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ DEFAULT now(),
    channel chat_channel_type DEFAULT 'all',
    PRIMARY KEY (user_id, channel)
);

ALTER TABLE public.chat_read_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manage own read status" ON public.chat_read_status 
FOR ALL USING (user_id = auth.uid());


-- ==============================================================================
-- 8. TABLE: NOTIFICATIONS (Notifications utilisateur)
-- ==============================================================================

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT,
    type TEXT DEFAULT 'info', -- info, warning, event, chat
    is_read BOOLEAN DEFAULT false,
    data JSONB DEFAULT '{}'::jsonb, -- Métadonnées (event_id, chat_message_id, etc.)
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own notifications" ON public.notifications 
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Update own notifications" ON public.notifications 
FOR UPDATE USING (user_id = auth.uid());


-- ==============================================================================
-- 9. TABLES WILD APRICOT INTEGRATION
-- ==============================================================================

-- Table pour stocker les données brutes Wild Apricot
CREATE TABLE public.wild_apricot_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wa_member_id TEXT UNIQUE NOT NULL, -- Member ID de Wild Apricot
    
    -- Données du membre
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    mobile TEXT,
    address TEXT,
    city TEXT,
    postal_code TEXT,
    
    -- Données parent/tuteur
    parent_name TEXT,
    birth_year INT,
    
    -- Données santé
    health_insurance_number TEXT,
    allergies_medical TEXT,
    
    -- Données adhésion
    membership_level TEXT,
    membership_status membership_status DEFAULT 'pending',
    member_since TIMESTAMPTZ,
    renewal_due TIMESTAMPTZ,
    
    -- Données vélo
    objective TEXT, -- Objectif principal
    experience_years TEXT,
    skill_level TEXT,
    wheel_size TEXT,
    interested_in_events TEXT,
    
    -- Préférences
    group_with_friends TEXT,
    photo_permission BOOLEAN DEFAULT true,
    additional_info TEXT,
    
    -- Données Wild Apricot brutes (pour référence)
    raw_data JSONB,
    
    -- Lien avec notre système
    profile_id UUID REFERENCES public.profiles(id),
    synced_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX idx_wa_members_email ON public.wild_apricot_members(email);
CREATE INDEX idx_wa_members_status ON public.wild_apricot_members(membership_status);

-- RLS
ALTER TABLE public.wild_apricot_members ENABLE ROW LEVEL SECURITY;

-- Seuls les admins peuvent voir les données WA
CREATE POLICY "Admin read wa_members" ON public.wild_apricot_members 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.user_profile_access upa ON upa.profile_id = p.id
        WHERE upa.user_id = auth.uid() AND p.role = 'admin'
    )
);


-- Table pour les webhooks Wild Apricot
CREATE TABLE public.wild_apricot_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- MembershipPaid, MemberAdded, etc.
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.wild_apricot_webhooks ENABLE ROW LEVEL SECURITY;


-- ==============================================================================
-- 10. MISE À JOUR PROFILES (Ajout champs complémentaires)
-- ==============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS emergency_contact_relation TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_postal_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS photo_permission BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wa_member_id TEXT UNIQUE; -- Lien Wild Apricot


-- ==============================================================================
-- 11. VUE: Événements avec tous les groupes associés
-- ==============================================================================

CREATE OR REPLACE VIEW public.v_events_with_groups AS
SELECT 
    e.*,
    l.name as location_display_name,
    l.address as location_address,
    l.google_maps_url as location_maps_url,
    ARRAY_AGG(DISTINCT g.id) FILTER (WHERE g.id IS NOT NULL) as group_ids,
    ARRAY_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL) as group_names,
    ARRAY_AGG(DISTINCT g.category) FILTER (WHERE g.category IS NOT NULL) as group_categories
FROM public.events e
LEFT JOIN public.locations l ON e.location_id = l.id
LEFT JOIN public.event_groups eg ON e.id = eg.event_id
LEFT JOIN public.groups g ON eg.group_id = g.id
GROUP BY e.id, l.name, l.address, l.google_maps_url;


-- ==============================================================================
-- 12. FONCTION: Créer un événement et associer automatiquement les groupes
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.create_event_with_groups(
    p_title TEXT,
    p_description TEXT,
    p_location_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_event_type TEXT,
    p_schedule_type event_schedule_type,
    p_is_for_recreational BOOLEAN,
    p_is_for_intensive BOOLEAN
) RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================================================================
-- 13. DONNÉES PAR DÉFAUT
-- ==============================================================================

-- Emplacements par défaut CCL
INSERT INTO public.locations (name, address, google_maps_url, is_default, sort_order) VALUES
('Parc de la Pointe-de-la-Martinière', 'Chemin de la Pointe-Martinière, Lévis, QC', 'https://maps.google.com/?q=Parc+de+la+Pointe-de+la+Martinière+Lévis', true, 1),
('Sentiers du Parc des Chutes-de-la-Chaudière', 'Avenue des Chutes, Lévis, QC', 'https://maps.google.com/?q=Parc+des+Chutes+de+la+Chaudière+Lévis', false, 2),
('École 47', '47 Rue des Loisirs, Lévis, QC', 'https://maps.google.com/?q=E47+Lévis', false, 3),
('Centre Plein Air de Lévis', 'Lévis, QC', 'https://maps.google.com/?q=Centre+Plein+Air+Lévis', false, 4)
ON CONFLICT DO NOTHING;


-- ==============================================================================
-- FIN DE LA MIGRATION
-- ==============================================================================
