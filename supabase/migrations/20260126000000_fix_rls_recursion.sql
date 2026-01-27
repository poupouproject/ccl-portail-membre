-- ==============================================================================
-- MIGRATION: Fix RLS Recursion
-- Version: 1.1
-- Correction de l'erreur "infinite recursion detected" dans les politiques RLS
-- ==============================================================================

-- 1. Création d'une fonction SECURITY DEFINER pour vérifier le rôle
-- Cela permet de vérifier le rôle sans déclencher récursivement les politiques RLS
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles p
    JOIN public.user_profile_access upa ON p.id = upa.profile_id
    WHERE upa.user_id = auth.uid() 
    AND p.role IN ('coach', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Mise à jour des politiques de la table PROFILES
DROP POLICY IF EXISTS "Coaches view all profiles" ON public.profiles;
CREATE POLICY "Staff view all profiles" ON public.profiles
    FOR SELECT USING (public.is_staff());

-- 3. Mise à jour des politiques de la table EVENTS
DROP POLICY IF EXISTS "Access group events" ON public.events;
CREATE POLICY "Access group events" ON public.events
    FOR SELECT USING (
        group_id IN (
            SELECT group_id FROM public.group_members 
            WHERE profile_id IN (
                SELECT profile_id FROM public.user_profile_access WHERE user_id = auth.uid()
            )
        )
        OR public.is_staff()
    );

-- 4. Mise à jour des politiques de la table ATTENDANCE
DROP POLICY IF EXISTS "Coaches manage attendance" ON public.attendance;
CREATE POLICY "Staff manage attendance" ON public.attendance
    FOR ALL USING (public.is_staff());

-- 5. Mise à jour des politiques de la table EVALUATIONS
DROP POLICY IF EXISTS "Coaches manage evaluations" ON public.evaluations;
CREATE POLICY "Staff manage evaluations" ON public.evaluations
    FOR ALL USING (public.is_staff());

-- 6. Mise à jour des politiques de la table GROUP_MEMBERS
DROP POLICY IF EXISTS "Access group members" ON public.group_members;
CREATE POLICY "Access group members" ON public.group_members
    FOR SELECT USING (
        profile_id IN (
            SELECT profile_id FROM public.user_profile_access WHERE user_id = auth.uid()
        )
        OR public.is_staff()
    );
