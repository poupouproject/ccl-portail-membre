-- ==============================================================================
-- MIGRATION: Ajout table group_staff pour assignation des coachs
-- Date: 2026-01-28
-- Description: Permet d'assigner des coachs (lead, assistant, sweeper) aux groupes
-- ==============================================================================

-- ==============================================================================
-- TABLE: GROUP_STAFF (Assignation des coachs aux groupes)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.group_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'assistant', -- 'head_coach', 'assistant', 'sweeper'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(group_id, profile_id) -- Un coach ne peut être assigné qu'une fois par groupe
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_group_staff_group_id ON public.group_staff(group_id);
CREATE INDEX IF NOT EXISTS idx_group_staff_profile_id ON public.group_staff(profile_id);

-- Activer RLS
ALTER TABLE public.group_staff ENABLE ROW LEVEL SECURITY;

-- Politique: tout le monde peut lire
DROP POLICY IF EXISTS "Public read group staff" ON public.group_staff;
CREATE POLICY "Public read group staff" ON public.group_staff FOR SELECT USING (true);

-- Politique: seuls les admins peuvent gérer
DROP POLICY IF EXISTS "Admin manage group staff" ON public.group_staff;
CREATE POLICY "Admin manage group staff" ON public.group_staff 
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.user_profile_access upa ON upa.profile_id = p.id
        WHERE upa.user_id = auth.uid() AND p.role = 'admin'
    )
);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_group_staff_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_group_staff_updated_at_trigger
    BEFORE UPDATE ON public.group_staff
    FOR EACH ROW
    EXECUTE FUNCTION update_group_staff_updated_at();

-- ==============================================================================
-- FIN DE LA MIGRATION
-- ==============================================================================
