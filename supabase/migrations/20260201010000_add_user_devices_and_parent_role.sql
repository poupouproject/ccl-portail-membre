-- Migration: Ajout de la table user_devices et du rôle parent
-- Date: 2026-02-01

-- 1. Ajouter le rôle "parent" à l'enum user_role
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'parent';

-- 2. Créer la table user_devices pour les tokens push
CREATE TABLE IF NOT EXISTS public.user_devices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  profile_id uuid,
  device_type text NOT NULL DEFAULT 'web',
  device_name text,
  push_endpoint text,
  push_p256dh text,
  push_auth text,
  push_token text,
  push_enabled boolean DEFAULT true,
  last_active_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_devices_pkey PRIMARY KEY (id),
  CONSTRAINT user_devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT user_devices_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON public.user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_profile_id ON public.user_devices(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_push_enabled ON public.user_devices(push_enabled) WHERE push_enabled = true;

-- RLS pour user_devices
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

-- Politique: les utilisateurs peuvent voir et gérer leurs propres appareils
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

-- 3. Ajouter des commentaires
COMMENT ON TABLE public.user_devices IS 'Stocke les informations des appareils pour les notifications push';
COMMENT ON COLUMN public.user_devices.push_endpoint IS 'URL endpoint pour Web Push API';
COMMENT ON COLUMN public.user_devices.push_p256dh IS 'Clé publique P-256 pour chiffrement';
COMMENT ON COLUMN public.user_devices.push_auth IS 'Clé auth pour Web Push';
COMMENT ON COLUMN public.user_devices.push_token IS 'Token JSON sérialisé complet de la subscription';
COMMENT ON COLUMN public.user_devices.device_type IS 'Type: web, ios, android';

-- 4. Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_user_devices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_devices_updated_at
  BEFORE UPDATE ON public.user_devices
  FOR EACH ROW
  EXECUTE FUNCTION update_user_devices_updated_at();

-- 5. Vue pour récupérer les devices avec push activé par groupe
-- Utile pour envoyer des notifications aux membres d'un groupe
CREATE OR REPLACE VIEW public.v_group_push_devices AS
SELECT DISTINCT
  gm.group_id,
  g.name as group_name,
  ud.id as device_id,
  ud.user_id,
  ud.push_endpoint,
  ud.push_p256dh,
  ud.push_auth,
  ud.device_type,
  p.first_name,
  p.last_name
FROM public.user_devices ud
JOIN public.user_profile_access upa ON upa.user_id = ud.user_id
JOIN public.profiles p ON p.id = upa.profile_id
JOIN public.group_members gm ON gm.profile_id = p.id
JOIN public.groups g ON g.id = gm.group_id
WHERE ud.push_enabled = true
  AND ud.push_endpoint IS NOT NULL;

-- 6. Vue pour les contacts d'urgence par groupe (utile pour le mode offline)
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
