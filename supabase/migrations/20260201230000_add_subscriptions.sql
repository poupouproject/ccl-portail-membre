-- ==============================================================================
-- MIGRATION: Multi-abonnements (subscriptions)
-- Cette migration ajoute le support pour plusieurs abonnements par profil
-- ==============================================================================

-- ==============================================================================
-- 1. NOUVEAUX TYPES
-- ==============================================================================

-- Type de contexte utilisateur
CREATE TYPE public.context_type AS ENUM ('participant', 'coach', 'dependent');

-- Status d'abonnement
CREATE TYPE public.subscription_status AS ENUM ('active', 'pending', 'expired', 'cancelled');

-- ==============================================================================
-- 2. TABLE SUBSCRIPTIONS
-- ==============================================================================

CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    
    -- Type d'abonnement (ex: route_adulte, montagnes_adulte, velo_enfant_2x)
    subscription_type TEXT NOT NULL,
    
    -- Statut et dates
    status public.subscription_status DEFAULT 'active',
    start_date TIMESTAMPTZ DEFAULT now(),
    end_date TIMESTAMPTZ,
    
    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Un profil ne peut avoir qu'un seul abonnement actif par groupe
    UNIQUE(profile_id, group_id, status)
);

-- Index pour la performance
CREATE INDEX idx_subscriptions_profile_id ON public.subscriptions(profile_id);
CREATE INDEX idx_subscriptions_group_id ON public.subscriptions(group_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

-- Activer RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 3. MODIFIER ATTENDANCE POUR RÉFÉRENCER SUBSCRIPTION
-- ==============================================================================

-- Ajouter subscription_id à la table attendance
ALTER TABLE public.attendance 
ADD COLUMN subscription_id UUID REFERENCES public.subscriptions(id);

-- Index pour la performance
CREATE INDEX idx_attendance_subscription_id ON public.attendance(subscription_id);

-- ==============================================================================
-- 4. FONCTION get_user_contexts
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
    staff_role TEXT
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
        s.subscription_type::TEXT as subscription_type,
        g.id as group_id,
        g.name::TEXT as group_name,
        upa.relation::TEXT as relation,
        NULL::TEXT as staff_role
    FROM user_profile_access upa
    INNER JOIN profiles p ON upa.profile_id = p.id
    INNER JOIN subscriptions s ON s.profile_id = p.id AND s.status = 'active'
    INNER JOIN groups g ON s.group_id = g.id
    WHERE upa.user_id = user_uuid
      AND p.is_active = true
      AND g.is_active = true
    
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
        gs.default_role::TEXT as staff_role
    FROM user_profile_access upa
    INNER JOIN profiles p ON upa.profile_id = p.id
    INNER JOIN group_staff gs ON gs.profile_id = p.id
    INNER JOIN groups g ON gs.group_id = g.id
    WHERE upa.user_id = user_uuid
      AND upa.relation = 'self'
      AND p.is_active = true
      AND g.is_active = true
    
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
-- 5. MIGRER LES DONNÉES EXISTANTES
-- ==============================================================================

-- Créer des abonnements pour tous les membres de groupes existants
INSERT INTO public.subscriptions (profile_id, group_id, subscription_type, status, start_date)
SELECT 
    gm.profile_id,
    gm.group_id,
    CASE 
        WHEN g.category = 'intensive' THEN 'velo_enfant_intensif'
        ELSE 'velo_enfant_recreatif'
    END as subscription_type,
    'active' as status,
    COALESCE(gm.joined_at, now()) as start_date
FROM group_members gm
INNER JOIN groups g ON gm.group_id = g.id
INNER JOIN profiles p ON gm.profile_id = p.id
WHERE p.is_active = true
ON CONFLICT DO NOTHING;

-- Mettre à jour les attendances existantes avec le subscription_id
UPDATE public.attendance a
SET subscription_id = (
    SELECT s.id 
    FROM subscriptions s 
    INNER JOIN events e ON e.id = a.event_id
    INNER JOIN event_groups eg ON eg.event_id = e.id AND eg.group_id = s.group_id
    WHERE s.profile_id = a.profile_id 
    AND s.status = 'active'
    LIMIT 1
)
WHERE a.subscription_id IS NULL;

-- ==============================================================================
-- 6. POLITIQUES RLS POUR SUBSCRIPTIONS
-- ==============================================================================

-- Lecture: voir ses propres abonnements et ceux des profils qu'on gère
CREATE POLICY "Users can view their related subscriptions"
ON public.subscriptions FOR SELECT
USING (
    profile_id IN (
        SELECT profile_id FROM user_profile_access WHERE user_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM profiles p
        INNER JOIN user_profile_access upa ON upa.profile_id = p.id
        WHERE upa.user_id = auth.uid()
        AND p.role IN ('admin', 'coach')
    )
);

-- Les admins peuvent tout modifier
CREATE POLICY "Admins can manage subscriptions"
ON public.subscriptions FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        INNER JOIN user_profile_access upa ON upa.profile_id = p.id
        WHERE upa.user_id = auth.uid()
        AND p.role = 'admin'
    )
);

-- ==============================================================================
-- 7. VUE group_members_view (optionnel, pour compatibilité)
-- ==============================================================================

CREATE OR REPLACE VIEW public.group_members_view AS
SELECT 
    s.group_id,
    s.profile_id,
    s.start_date as joined_at,
    s.subscription_type,
    s.status
FROM subscriptions s
WHERE s.status = 'active'
  AND (s.end_date IS NULL OR s.end_date > now());

-- Permissions sur la vue
GRANT SELECT ON public.group_members_view TO authenticated;

-- ==============================================================================
-- 8. TRIGGER POUR updated_at
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_subscription_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_subscription_updated_at();

-- ==============================================================================
-- FIN DE LA MIGRATION
-- ==============================================================================
