-- Supprimer l'ancienne politique d'insertion (admin seulement)
DROP POLICY IF EXISTS "group_staff_admin_write" ON "public"."group_staff";

-- Créer une nouvelle politique qui permet aux admins ET aux coachs d'insérer
CREATE POLICY "group_staff_admin_coach_write"
ON "public"."group_staff"
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'coach')
  )
);

-- Mettre à jour la politique de suppression pour inclure les coachs
DROP POLICY IF EXISTS "group_staff_admin_delete" ON "public"."group_staff";

CREATE POLICY "group_staff_admin_coach_delete"
ON "public"."group_staff"
AS PERMISSIVE
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'coach')
  )
);

-- Mettre à jour la politique de modification pour inclure les coachs
DROP POLICY IF EXISTS "group_staff_admin_update" ON "public"."group_staff";

CREATE POLICY "group_staff_admin_coach_update"
ON "public"."group_staff"
AS PERMISSIVE
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'coach')
  )
);

-- Aussi corriger les politiques pour group_members pour permettre aux coachs de gérer
-- Mais seulement pour les groupes où ils sont assignés

-- Créer une politique pour que les coachs puissent ajouter des membres aux groupes qu'ils gèrent
CREATE POLICY "group_members_coach_insert"
ON "public"."group_members"
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1
    FROM public.group_staff gs
    INNER JOIN public.profiles p ON p.id = gs.profile_id
    WHERE gs.group_id = group_members.group_id
    AND p.id = auth.uid()
    AND p.role = 'coach'
  )
);

-- Créer une politique pour que les coachs puissent retirer des membres des groupes qu'ils gèrent
CREATE POLICY "group_members_coach_delete"
ON "public"."group_members"
AS PERMISSIVE
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1
    FROM public.group_staff gs
    INNER JOIN public.profiles p ON p.id = gs.profile_id
    WHERE gs.group_id = group_members.group_id
    AND p.id = auth.uid()
    AND p.role = 'coach'
  )
);
