-- ==============================================================================
-- MIGRATION: Refactorisation multi-abonnements avec rôles et subscription_types
-- ==============================================================================
-- Date: 2026-02-04
-- Objectif: 
--   1. Créer une table roles pour les permissions
--   2. Créer une table subscription_types (catalogue des services Odoo)
--   3. Modifier subscriptions pour lier aux subscription_types
--   4. Ajouter profile_roles pour les assignations de rôles
--   5. Ajouter is_minor et is_autonomous à profiles
--   6. Dériver les relations parent depuis profiles.parent_odoo_id
-- ==============================================================================

-- ==============================================================================
-- ÉTAPE 1 : MODIFIER LA TABLE PROFILES
-- ==============================================================================

-- Ajouter les champs Odoo et autonomie
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS odoo_id INTEGER UNIQUE,
ADD COLUMN IF NOT EXISTS parent_odoo_id INTEGER,
ADD COLUMN IF NOT EXISTS birthdate DATE,
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_coordinator BOOLEAN DEFAULT FALSE;

-- Créer la colonne is_minor (calculée)
-- Note: is_minor = TRUE si < 18 ans
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_minor BOOLEAN GENERATED ALWAYS AS (
  CASE 
    WHEN birthdate IS NULL THEN FALSE
    WHEN age(birthdate) < interval '18 years' THEN TRUE
    ELSE FALSE
  END
) STORED;

-- Créer la colonne is_autonomous
-- TRUE si: parent_odoo_id IS NULL (le payeur lui-même) OU a un email
-- FALSE par défaut si mineur
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_autonomous BOOLEAN GENERATED ALWAYS AS (
  CASE
    -- Si pas mineur, toujours autonome
    WHEN birthdate IS NULL OR age(birthdate) >= interval '18 years' THEN TRUE
    -- Si mineur mais est le payeur (parent_odoo_id IS NULL), autonome
    WHEN parent_odoo_id IS NULL THEN TRUE
    -- Si mineur mais a un email valide, autonome
    WHEN email IS NOT NULL AND email != '' THEN TRUE
    -- Sinon, pas autonome
    ELSE FALSE
  END
) STORED;

-- Index pour parent_odoo_id (pour les jointures relations familiales)
CREATE INDEX IF NOT EXISTS idx_profiles_parent_odoo_id ON public.profiles(parent_odoo_id);
CREATE INDEX IF NOT EXISTS idx_profiles_odoo_id ON public.profiles(odoo_id);

-- ==============================================================================
-- ÉTAPE 2 : TABLE ROLES (Catalogue des rôles avec permissions)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  
  -- Ce rôle nécessite-t-il un abonnement?
  requires_subscription BOOLEAN DEFAULT TRUE,
  
  -- Permissions (pour RLS et UI)
  permissions JSONB DEFAULT '{}'::JSONB,
  /*
  Exemple de permissions:
  {
    "can_view_calendar": true,
    "can_take_attendance": false,
    "can_chat_in_group": true,
    "can_manage_members": false,
    "can_view_evaluations": false,
    "calendar_scope": "own_groups"  -- 'own_groups', 'all_groups', 'assigned_groups'
  }
  */
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_roles_name ON public.roles(name);

-- Activer RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Politique: tout le monde peut lire les rôles
CREATE POLICY "Anyone can view roles"
ON public.roles FOR SELECT
USING (TRUE);

-- Insérer les rôles de base
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

-- ==============================================================================
-- ÉTAPE 3 : TABLE SUBSCRIPTION_TYPES (Catalogue des produits Odoo)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.subscription_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  
  -- Mapping Odoo
  odoo_product_id INTEGER UNIQUE,
  
  -- Quel rôle ce service donne-t-il?
  grants_role_id UUID NOT NULL REFERENCES public.roles(id),
  
  -- Catégorie et fréquence
  category TEXT CHECK (category IN ('jeunesse', 'adulte')),
  frequency TEXT CHECK (frequency IN ('1x_semaine', '2x_semaine', 'illimite')),
  
  -- Prix (optionnel, pour affichage)
  price_cents INTEGER,
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_subscription_types_odoo ON public.subscription_types(odoo_product_id);
CREATE INDEX IF NOT EXISTS idx_subscription_types_role ON public.subscription_types(grants_role_id);

-- Activer RLS
ALTER TABLE public.subscription_types ENABLE ROW LEVEL SECURITY;

-- Politique: tout le monde peut lire les types d'abonnements
CREATE POLICY "Anyone can view subscription types"
ON public.subscription_types FOR SELECT
USING (TRUE);

-- Insérer les types d'abonnements
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
-- ÉTAPE 4 : TABLE PROFILE_ROLES (Assignation des rôles aux profils)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.profile_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  
  -- Source du rôle
  source TEXT NOT NULL CHECK (source IN ('subscription', 'group_staff', 'manual')),
  source_id UUID,  -- ID de la subscription ou group_staff si applicable
  
  -- Dates
  assigned_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  
  -- Assigné par qui (pour les assignations manuelles)
  assigned_by UUID REFERENCES public.profiles(id),
  
  -- Contrainte: un profil ne peut pas avoir le même rôle depuis la même source
  UNIQUE(profile_id, role_id, source_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_profile_roles_profile ON public.profile_roles(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_roles_role ON public.profile_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_profile_roles_source ON public.profile_roles(source, source_id);
CREATE INDEX IF NOT EXISTS idx_profile_roles_expires ON public.profile_roles(expires_at) WHERE expires_at IS NOT NULL;

-- Activer RLS
ALTER TABLE public.profile_roles ENABLE ROW LEVEL SECURITY;

-- Politique: voir ses propres rôles et ceux des enfants
CREATE POLICY "Users can view their profile roles"
ON public.profile_roles FOR SELECT
USING (
  profile_id IN (
    SELECT upa.profile_id FROM public.user_profile_access upa WHERE upa.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_profile_access upa ON upa.profile_id = p.id
    WHERE upa.user_id = auth.uid()
    AND (p.is_admin = TRUE OR p.is_coordinator = TRUE)
  )
);

-- Politique: admins peuvent gérer
CREATE POLICY "Admins can manage profile roles"
ON public.profile_roles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_profile_access upa ON upa.profile_id = p.id
    WHERE upa.user_id = auth.uid()
    AND (p.is_admin = TRUE OR p.is_coordinator = TRUE)
  )
);

-- ==============================================================================
-- ÉTAPE 5 : MODIFIER TABLE SUBSCRIPTIONS
-- ==============================================================================

-- Ajouter la colonne subscription_type_id
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS subscription_type_id UUID REFERENCES public.subscription_types(id),
ADD COLUMN IF NOT EXISTS odoo_sale_order_line_id INTEGER UNIQUE,
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Index
CREATE INDEX IF NOT EXISTS idx_subscriptions_type ON public.subscriptions(subscription_type_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_odoo_line ON public.subscriptions(odoo_sale_order_line_id);

-- ==============================================================================
-- ÉTAPE 6 : VUE RELATIONS FAMILIALES (depuis Odoo)
-- ==============================================================================

-- Vue qui dérive les relations parent/enfant depuis profiles.parent_odoo_id
CREATE OR REPLACE VIEW public.v_family_relations AS
SELECT 
  parent.id as parent_profile_id,
  parent.auth_user_id as parent_user_id,
  parent.first_name || ' ' || parent.last_name as parent_name,
  child.id as child_profile_id,
  child.first_name || ' ' || child.last_name as child_name,
  'parent' as relation_type,
  'odoo' as source
FROM public.profiles child
JOIN public.profiles parent ON parent.odoo_id = child.parent_odoo_id
WHERE child.parent_odoo_id IS NOT NULL;

-- Permissions
GRANT SELECT ON public.v_family_relations TO authenticated;

-- ==============================================================================
-- ÉTAPE 7 : TRIGGER - Subscription crée automatiquement le rôle
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.grant_role_from_subscription()
RETURNS TRIGGER AS $$
DECLARE
  v_role_id UUID;
BEGIN
  -- Si la subscription n'a pas de subscription_type_id, ignorer
  IF NEW.subscription_type_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Récupérer le rôle associé au type de subscription
  SELECT grants_role_id INTO v_role_id
  FROM public.subscription_types
  WHERE id = NEW.subscription_type_id;
  
  IF v_role_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Si subscription active, créer ou mettre à jour le rôle
  IF NEW.status = 'active' THEN
    INSERT INTO public.profile_roles (profile_id, role_id, source, source_id, expires_at)
    VALUES (NEW.profile_id, v_role_id, 'subscription', NEW.id, NEW.end_date)
    ON CONFLICT (profile_id, role_id, source_id) 
    DO UPDATE SET 
      expires_at = EXCLUDED.expires_at;
  ELSE
    -- Si subscription inactive/expired, retirer le rôle
    DELETE FROM public.profile_roles
    WHERE source = 'subscription' 
      AND source_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subscription_grants_role ON public.subscriptions;
CREATE TRIGGER subscription_grants_role
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_role_from_subscription();

-- ==============================================================================
-- ÉTAPE 8 : TRIGGER - Group Staff crée automatiquement le rôle coach
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.grant_coach_role_from_group_staff()
RETURNS TRIGGER AS $$
DECLARE
  v_coach_role_id UUID;
BEGIN
  -- Récupérer l'ID du rôle coach
  SELECT id INTO v_coach_role_id
  FROM public.roles
  WHERE name = 'coach';
  
  IF v_coach_role_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Créer le rôle coach pour ce profil
  INSERT INTO public.profile_roles (profile_id, role_id, source, source_id)
  VALUES (NEW.profile_id, v_coach_role_id, 'group_staff', NEW.group_id)
  ON CONFLICT (profile_id, role_id, source_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS group_staff_grants_coach_role ON public.group_staff;
CREATE TRIGGER group_staff_grants_coach_role
  AFTER INSERT ON public.group_staff
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_coach_role_from_group_staff();

-- Trigger pour retirer le rôle quand on enlève du staff
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

DROP TRIGGER IF EXISTS group_staff_revokes_coach_role ON public.group_staff;
CREATE TRIGGER group_staff_revokes_coach_role
  AFTER DELETE ON public.group_staff
  FOR EACH ROW
  EXECUTE FUNCTION public.revoke_coach_role_from_group_staff();

-- ==============================================================================
-- ÉTAPE 9 : FONCTION get_user_contexts MISE À JOUR
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
      -- Éviter les doublons avec user_profile_access
      AND NOT EXISTS (
        SELECT 1 FROM user_profile_access upa2 
        WHERE upa2.user_id = user_uuid 
          AND upa2.profile_id = child.id
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
-- ÉTAPE 10 : VUE POUR TOUS LES RÔLES D'UN PROFIL
-- ==============================================================================

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

-- Permissions
GRANT SELECT ON public.v_profile_all_roles TO authenticated;

-- ==============================================================================
-- ÉTAPE 11 : MIGRER LES DONNÉES EXISTANTES
-- ==============================================================================

-- Migrer les rôles admin/coordinator depuis profiles.role vers le nouveau système
UPDATE public.profiles SET is_admin = TRUE WHERE role = 'admin';
UPDATE public.profiles SET is_coordinator = TRUE WHERE role = 'coach' OR role = 'admin';

-- Créer les subscription_types pour les subscriptions existantes sans subscription_type_id
-- D'abord, mapper les anciennes subscription_type textuelles
UPDATE public.subscriptions s
SET subscription_type_id = st.id
FROM public.subscription_types st
WHERE s.subscription_type_id IS NULL
  AND (
    (s.subscription_type = 'velo_enfant_recreatif' AND st.name = 'montagnes_jeunesse_recreatif')
    OR (s.subscription_type = 'velo_enfant_intensif' AND st.name = 'montagnes_jeunesse_intensif')
    OR (s.subscription_type LIKE '%recreatif%' AND st.name = 'montagnes_jeunesse_recreatif')
    OR (s.subscription_type LIKE '%intensif%' AND st.name = 'montagnes_jeunesse_intensif')
  );

-- Créer les profile_roles pour les subscriptions existantes
INSERT INTO public.profile_roles (profile_id, role_id, source, source_id, expires_at)
SELECT 
  s.profile_id,
  st.grants_role_id,
  'subscription',
  s.id,
  s.end_date
FROM public.subscriptions s
JOIN public.subscription_types st ON st.id = s.subscription_type_id
WHERE s.status = 'active'
  AND st.grants_role_id IS NOT NULL
ON CONFLICT (profile_id, role_id, source_id) DO NOTHING;

-- Créer les profile_roles pour les coachs existants
INSERT INTO public.profile_roles (profile_id, role_id, source, source_id)
SELECT 
  gs.profile_id,
  (SELECT id FROM public.roles WHERE name = 'coach'),
  'group_staff',
  gs.group_id
FROM public.group_staff gs
ON CONFLICT (profile_id, role_id, source_id) DO NOTHING;

-- ==============================================================================
-- ÉTAPE 12 : TRIGGER updated_at
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Pour roles
DROP TRIGGER IF EXISTS set_roles_updated_at ON public.roles;
CREATE TRIGGER set_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Pour subscription_types
DROP TRIGGER IF EXISTS set_subscription_types_updated_at ON public.subscription_types;
CREATE TRIGGER set_subscription_types_updated_at
  BEFORE UPDATE ON public.subscription_types
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- ÉTAPE 13 : COMMENTAIRES DOCUMENTATION
-- ==============================================================================

COMMENT ON TABLE public.roles IS 'Catalogue des rôles avec leurs permissions. Les rôles peuvent être assignés via subscription, group_staff, ou manuellement.';

COMMENT ON TABLE public.subscription_types IS 'Catalogue des types d''abonnements (produits Odoo). Chaque type accorde automatiquement un rôle spécifique.';

COMMENT ON TABLE public.profile_roles IS 'Assignation effective des rôles aux profils. Permet de traquer d''où vient chaque rôle (subscription, group_staff, manuel).';

COMMENT ON COLUMN public.profiles.is_minor IS 'TRUE si l''âge calculé depuis birthdate est < 18 ans. Calculé automatiquement.';

COMMENT ON COLUMN public.profiles.is_autonomous IS 'TRUE si: majeur OU parent_odoo_id IS NULL (payeur) OU a un email. Peut être modifié par le parent pour forcer l''autonomie.';

COMMENT ON COLUMN public.profiles.parent_odoo_id IS 'Référence au res.partner.parent_id Odoo (le payeur). Permet de dériver automatiquement les relations familiales.';

COMMENT ON VIEW public.v_family_relations IS 'Vue dérivée des relations parent/enfant depuis profiles.parent_odoo_id. Remplace partiellement user_profile_access pour les cas Odoo.';

COMMENT ON FUNCTION public.grant_role_from_subscription IS 'Trigger qui assigne automatiquement le rôle correspondant quand une subscription est créée/modifiée.';

-- ==============================================================================
-- FIN DE LA MIGRATION
-- ==============================================================================
