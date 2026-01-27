-- ==============================================================================
-- MIGRATION: Chat System + Admin Features
-- Version: 2.0
-- Ajoute le système de chat, les notifications et les fonctionnalités admin
-- ==============================================================================

-- ==============================================================================
-- 1. TABLES CHAT
-- ==============================================================================

-- Messages de groupe
CREATE TABLE public.group_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    sender_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'message', -- 'message', 'announcement', 'system'
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_group_messages_group_id ON public.group_messages(group_id);
CREATE INDEX idx_group_messages_created_at ON public.group_messages(created_at DESC);

-- Canal staff (coordinateurs)
CREATE TABLE public.staff_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'message',
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_staff_messages_created_at ON public.staff_messages(created_at DESC);

-- Annonces broadcast (dernière minute à tous)
CREATE TABLE public.broadcast_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    target_groups UUID[] DEFAULT '{}', -- Si vide = tous les groupes
    priority TEXT DEFAULT 'normal', -- 'normal', 'urgent'
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_broadcast_messages_created_at ON public.broadcast_messages(created_at DESC);

-- Lecture des messages (pour marquer lu/non-lu)
CREATE TABLE public.message_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message_type TEXT NOT NULL, -- 'group', 'staff', 'broadcast'
    message_id UUID NOT NULL,
    read_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, message_type, message_id)
);

CREATE INDEX idx_message_reads_user_id ON public.message_reads(user_id);

-- ==============================================================================
-- 2. NOTIFICATIONS & DEVICES
-- ==============================================================================

CREATE TABLE public.user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    push_subscription JSONB NOT NULL, -- Subscription object from browser
    device_name TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    last_used_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_devices_user_id ON public.user_devices(user_id);

-- ==============================================================================
-- 3. RLS POLICIES
-- ==============================================================================

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

-- Group messages: membres du groupe peuvent lire, staff peut écrire
CREATE POLICY "Read group messages" ON public.group_messages
    FOR SELECT USING (
        group_id IN (
            SELECT group_id FROM public.group_members 
            WHERE profile_id IN (
                SELECT profile_id FROM public.user_profile_access WHERE user_id = auth.uid()
            )
        )
        OR public.is_staff()
    );

CREATE POLICY "Write group messages" ON public.group_messages
    FOR INSERT WITH CHECK (public.is_staff());

CREATE POLICY "Update own group messages" ON public.group_messages
    FOR UPDATE USING (
        sender_profile_id IN (
            SELECT profile_id FROM public.user_profile_access WHERE user_id = auth.uid()
        )
    );

-- Staff messages: seulement staff
CREATE POLICY "Staff read staff messages" ON public.staff_messages
    FOR SELECT USING (public.is_staff());

CREATE POLICY "Staff write staff messages" ON public.staff_messages
    FOR INSERT WITH CHECK (public.is_staff());

-- Broadcast: tous peuvent lire, admin peut écrire
CREATE POLICY "Read broadcasts" ON public.broadcast_messages
    FOR SELECT USING (true);

CREATE POLICY "Admin write broadcasts" ON public.broadcast_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.user_profile_access upa ON p.id = upa.profile_id
            WHERE upa.user_id = auth.uid() AND p.role = 'admin'
        )
    );

-- Message reads
CREATE POLICY "Own message reads" ON public.message_reads
    FOR ALL USING (user_id = auth.uid());

-- User devices
CREATE POLICY "Own devices" ON public.user_devices
    FOR ALL USING (user_id = auth.uid());

-- ==============================================================================
-- 4. ADMIN POLICIES (CREATE/UPDATE/DELETE)
-- ==============================================================================

-- Admins peuvent gérer les groupes
CREATE POLICY "Admin manage groups" ON public.groups
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.user_profile_access upa ON p.id = upa.profile_id
            WHERE upa.user_id = auth.uid() AND p.role = 'admin'
        )
    );

-- Admins peuvent gérer les membres de groupe
CREATE POLICY "Admin manage group members" ON public.group_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.user_profile_access upa ON p.id = upa.profile_id
            WHERE upa.user_id = auth.uid() AND p.role = 'admin'
        )
    );

-- Admins peuvent gérer le staff de groupe
CREATE POLICY "Admin manage group staff" ON public.group_staff
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.user_profile_access upa ON p.id = upa.profile_id
            WHERE upa.user_id = auth.uid() AND p.role = 'admin'
        )
    );

-- Staff peuvent gérer les événements
CREATE POLICY "Staff manage events" ON public.events
    FOR ALL USING (public.is_staff());

-- Staff peuvent gérer le staff des événements
CREATE POLICY "Staff manage event staff" ON public.event_staff
    FOR ALL USING (public.is_staff());

-- Admins peuvent gérer les profils
CREATE POLICY "Admin manage profiles" ON public.profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            JOIN public.user_profile_access upa ON p.id = upa.profile_id
            WHERE upa.user_id = auth.uid() AND p.role = 'admin'
        )
    );

-- Users peuvent modifier leur propre profil
CREATE POLICY "Update own profile" ON public.profiles
    FOR UPDATE USING (
        id IN (
            SELECT profile_id FROM public.user_profile_access WHERE user_id = auth.uid()
        )
    );

-- Staff peuvent gérer les annonces
CREATE POLICY "Staff manage announcements" ON public.announcements
    FOR ALL USING (public.is_staff());

-- Staff peuvent gérer les vidéos académie
CREATE POLICY "Staff manage academy videos" ON public.academy_videos
    FOR ALL USING (public.is_staff());

-- ==============================================================================
-- 5. FONCTIONS UTILITAIRES
-- ==============================================================================

-- Fonction pour vérifier si l'utilisateur est admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles p
    JOIN public.user_profile_access upa ON p.id = upa.profile_id
    WHERE upa.user_id = auth.uid() 
    AND p.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fonction pour obtenir le nombre de messages non lus
CREATE OR REPLACE FUNCTION public.get_unread_count(p_user_id UUID, p_group_id UUID)
RETURNS INT AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==============================================================================
-- FIN DE LA MIGRATION
-- ==============================================================================
