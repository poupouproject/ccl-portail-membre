-- Migration: Amélioration de la table user_devices et ajout du rôle parent
-- Date: 2026-02-01
-- NOTE: La table user_devices existe déjà avec une structure simplifiée.
--       Cette migration ajoute les colonnes manquantes et migre les données.

-- 1. Ajouter le rôle "parent" à l'enum user_role
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'parent';

-- 2. Ajouter les colonnes manquantes à la table user_devices existante
-- Structure existante: id, user_id, push_subscription (jsonb), device_name, is_active, created_at, last_used_at

-- Ajouter profile_id pour lier un device à un profil spécifique
ALTER TABLE public.user_devices ADD COLUMN IF NOT EXISTS profile_id uuid;

-- Ajouter device_type pour distinguer web/ios/android
ALTER TABLE public.user_devices ADD COLUMN IF NOT EXISTS device_type text DEFAULT 'web';

-- Ajouter les colonnes pour Web Push API (extraites du jsonb)
ALTER TABLE public.user_devices ADD COLUMN IF NOT EXISTS push_endpoint text;
ALTER TABLE public.user_devices ADD COLUMN IF NOT EXISTS push_p256dh text;
ALTER TABLE public.user_devices ADD COLUMN IF NOT EXISTS push_auth text;

-- Ajouter push_enabled comme alias de is_active (garder is_active pour compatibilité)
ALTER TABLE public.user_devices ADD COLUMN IF NOT EXISTS push_enabled boolean DEFAULT true;

-- Ajouter updated_at pour le tracking des modifications
ALTER TABLE public.user_devices ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- 3. Migrer les données de push_subscription (jsonb) vers les nouvelles colonnes
UPDATE public.user_devices
SET 
  push_endpoint = push_subscription->>'endpoint',
  push_p256dh = push_subscription->'keys'->>'p256dh',
  push_auth = push_subscription->'keys'->>'auth',
  push_enabled = COALESCE(is_active, true)
WHERE push_subscription IS NOT NULL 
  AND push_endpoint IS NULL;

-- 4. Ajouter les contraintes de clé étrangère
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_devices_profile_id_fkey'
  ) THEN
    ALTER TABLE public.user_devices 
      ADD CONSTRAINT user_devices_profile_id_fkey 
      FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 5. Créer les index manquants
CREATE INDEX IF NOT EXISTS idx_user_devices_profile_id ON public.user_devices(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_push_enabled ON public.user_devices(push_enabled) WHERE push_enabled = true;

-- 6. RLS pour user_devices (déjà activé, ajouter les policies manquantes)
-- Supprimer l'ancienne policy si elle existe
DROP POLICY IF EXISTS "Own devices" ON public.user_devices;

-- Créer les nouvelles policies
CREATE POLICY "Users can view own devices" ON public.user_devices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own devices" ON public.user_devices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devices" ON public.user_devices
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own devices" ON public.user_devices
  FOR DELETE USING (auth.uid() = user_id);

-- Les admins peuvent voir tous les appareils (pour les notifications globales)
CREATE POLICY "Admins can view all devices" ON public.user_devices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.user_profile_access upa ON upa.profile_id = p.id
      WHERE upa.user_id = auth.uid() 
      AND upa.relation = 'self'
      AND p.role = 'admin'
    )
  );

-- 7. Ajouter des commentaires
COMMENT ON TABLE public.user_devices IS 'Stocke les informations des appareils pour les notifications push';
COMMENT ON COLUMN public.user_devices.push_subscription IS 'Token JSON sérialisé complet de la subscription (legacy)';
COMMENT ON COLUMN public.user_devices.push_endpoint IS 'URL endpoint pour Web Push API';
COMMENT ON COLUMN public.user_devices.push_p256dh IS 'Clé publique P-256 pour chiffrement';
COMMENT ON COLUMN public.user_devices.push_auth IS 'Clé auth pour Web Push';
COMMENT ON COLUMN public.user_devices.device_type IS 'Type: web, ios, android';
COMMENT ON COLUMN public.user_devices.profile_id IS 'Profil lié au device (optionnel, pour parents avec plusieurs enfants)';

-- 8. Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_user_devices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS trigger_user_devices_updated_at ON public.user_devices;

CREATE TRIGGER trigger_user_devices_updated_at
  BEFORE UPDATE ON public.user_devices
  FOR EACH ROW
  EXECUTE FUNCTION update_user_devices_updated_at();

-- 9. Vue pour récupérer les devices avec push activé par groupe
-- Utile pour envoyer des notifications aux membres d'un groupe
CREATE OR REPLACE VIEW public.v_group_push_devices AS
SELECT DISTINCT
  gm.group_id,
  g.name as group_name,
  ud.id as device_id,
  ud.user_id,
  COALESCE(ud.push_endpoint, ud.push_subscription->>'endpoint') as push_endpoint,
  COALESCE(ud.push_p256dh, ud.push_subscription->'keys'->>'p256dh') as push_p256dh,
  COALESCE(ud.push_auth, ud.push_subscription->'keys'->>'auth') as push_auth,
  COALESCE(ud.device_type, 'web') as device_type,
  p.first_name,
  p.last_name
FROM public.user_devices ud
JOIN public.user_profile_access upa ON upa.user_id = ud.user_id
JOIN public.profiles p ON p.id = upa.profile_id
JOIN public.group_members gm ON gm.profile_id = p.id
JOIN public.groups g ON g.id = gm.group_id
WHERE COALESCE(ud.push_enabled, ud.is_active, true) = true
  AND (ud.push_endpoint IS NOT NULL OR ud.push_subscription->>'endpoint' IS NOT NULL);

-- 10. Vue pour les contacts d'urgence par groupe (utile pour le mode offline)
CREATE OR REPLACE VIEW public.v_group_emergency_contacts AS
SELECT 
  gm.group_id,
  g.name as group_name,
  p.id as profile_id,
  p.first_name,
  p.last_name,
  p.phone,
  p.emergency_contact_name,
  p.emergency_contact_phone,
  p.emergency_contact_relation,
  p.medical_notes
FROM public.group_members gm
JOIN public.groups g ON g.id = gm.group_id
JOIN public.profiles p ON p.id = gm.profile_id
WHERE p.is_active = true;

-- Politique RLS pour la vue (via la politique de group_members)
COMMENT ON VIEW public.v_group_emergency_contacts IS 'Vue des contacts d''urgence par groupe pour les coachs';
