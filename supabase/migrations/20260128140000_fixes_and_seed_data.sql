-- Migration: Fixes and Seed Data for Alpha Testing
-- Date: 2026-01-28
-- Description: 
--   1. Fix events RLS policy to support event_groups junction table
--   2. Add seed data (groups, locations, sample events)
--   3. Import Wild Apricot members
--   4. Configure admin user

-- ============================================
-- SECTION 1: FIX RLS POLICIES
-- ============================================

-- Drop existing events RLS policy and recreate with proper logic
DROP POLICY IF EXISTS "Access group events" ON public.events;

-- New policy: Allow access if user is staff OR if user belongs to a group linked via event_groups
CREATE POLICY "Access group events" ON public.events
  AS PERMISSIVE FOR SELECT TO public
  USING (
    -- Staff can see all events
    public.is_staff() 
    OR 
    -- User belongs to a group linked to this event via event_groups
    EXISTS (
      SELECT 1 FROM public.event_groups eg
      JOIN public.group_members gm ON eg.group_id = gm.group_id
      JOIN public.user_profile_access upa ON gm.profile_id = upa.profile_id
      WHERE eg.event_id = events.id AND upa.user_id = auth.uid()
    )
    OR
    -- Legacy: User belongs to the group via direct group_id (backward compatibility)
    (
      group_id IS NOT NULL 
      AND group_id IN (
        SELECT gm.group_id 
        FROM public.group_members gm
        JOIN public.user_profile_access upa ON gm.profile_id = upa.profile_id
        WHERE upa.user_id = auth.uid()
      )
    )
  );

-- ============================================
-- SECTION 2: SEED LOCATIONS
-- ============================================

INSERT INTO public.locations (id, name, address, google_maps_url, is_default, sort_order, is_active)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'Parc de la Chute-Montmorency', 'Côte de la Chute, Boischatel, QC', 'https://maps.google.com/?q=Parc+Chute+Montmorency', false, 1, true),
  ('a0000000-0000-0000-0000-000000000002', 'Sentiers du Moulin', '99 Chemin du Moulin, Lac-Beauport, QC', 'https://maps.google.com/?q=Sentiers+du+Moulin', true, 0, true),
  ('a0000000-0000-0000-0000-000000000003', 'Empire 47', '895 Rue de la Concorde, Lévis, QC G6W 0M5', 'https://maps.google.com/?q=Empire+47+Levis', false, 2, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  is_default = EXCLUDED.is_default;

-- ============================================
-- SECTION 3: SEED GROUPS
-- ============================================

INSERT INTO public.groups (id, name, description, level_required, color_code, category, default_day_of_week, is_active)
VALUES 
  -- Recreational groups (1x per week)
  ('b0000000-0000-0000-0000-000000000001', 'Débutants Lundi', 'Groupe pour débutants - séances le lundi', 1, '#22c55e', 'recreational', 1, true),
  ('b0000000-0000-0000-0000-000000000002', 'Débutants Mercredi', 'Groupe pour débutants - séances le mercredi', 1, '#22c55e', 'recreational', 3, true),
  ('b0000000-0000-0000-0000-000000000003', 'Intermédiaires Lundi', 'Groupe intermédiaire - séances le lundi', 2, '#3b82f6', 'recreational', 1, true),
  ('b0000000-0000-0000-0000-000000000004', 'Intermédiaires Mercredi', 'Groupe intermédiaire - séances le mercredi', 2, '#3b82f6', 'recreational', 3, true),
  -- Intensive groups (2x per week)
  ('b0000000-0000-0000-0000-000000000005', 'Performance A', 'Groupe intensif avancé - 2x/semaine', 3, '#f97316', 'intensive', null, true),
  ('b0000000-0000-0000-0000-000000000006', 'Performance B', 'Groupe intensif intermédiaire-avancé - 2x/semaine', 2, '#f97316', 'intensive', null, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- ============================================
-- SECTION 4: SEED SAMPLE EVENTS (Next 4 weeks)
-- ============================================

-- Clear existing future events for clean slate
DELETE FROM public.events WHERE start_time > NOW();

-- Create events for recreational groups
INSERT INTO public.events (id, title, description, location_id, start_time, end_time, event_type, schedule_type, is_for_recreational, is_for_intensive, is_cancelled)
VALUES
  -- Week 1
  ('e0000000-0000-0000-0000-000000000001', 'Sortie Récréatif - Lundi', 'Entraînement régulier pour groupes récréatifs', 'a0000000-0000-0000-0000-000000000002', 
   (CURRENT_DATE + INTERVAL '1 day' + ((1 - EXTRACT(DOW FROM CURRENT_DATE)::int + 7) % 7) * INTERVAL '1 day' + INTERVAL '18 hours')::timestamptz,
   (CURRENT_DATE + INTERVAL '1 day' + ((1 - EXTRACT(DOW FROM CURRENT_DATE)::int + 7) % 7) * INTERVAL '1 day' + INTERVAL '20 hours')::timestamptz,
   'training', 'regular', true, false, false),
  
  ('e0000000-0000-0000-0000-000000000002', 'Sortie Récréatif - Mercredi', 'Entraînement régulier pour groupes récréatifs', 'a0000000-0000-0000-0000-000000000002',
   (CURRENT_DATE + INTERVAL '1 day' + ((3 - EXTRACT(DOW FROM CURRENT_DATE)::int + 7) % 7) * INTERVAL '1 day' + INTERVAL '18 hours')::timestamptz,
   (CURRENT_DATE + INTERVAL '1 day' + ((3 - EXTRACT(DOW FROM CURRENT_DATE)::int + 7) % 7) * INTERVAL '1 day' + INTERVAL '20 hours')::timestamptz,
   'training', 'regular', true, false, false),
  
  ('e0000000-0000-0000-0000-000000000003', 'Sortie Intensif - Mardi', 'Entraînement pour groupes intensifs', 'a0000000-0000-0000-0000-000000000002',
   (CURRENT_DATE + INTERVAL '1 day' + ((2 - EXTRACT(DOW FROM CURRENT_DATE)::int + 7) % 7) * INTERVAL '1 day' + INTERVAL '18 hours')::timestamptz,
   (CURRENT_DATE + INTERVAL '1 day' + ((2 - EXTRACT(DOW FROM CURRENT_DATE)::int + 7) % 7) * INTERVAL '1 day' + INTERVAL '20 hours')::timestamptz,
   'training', 'regular', false, true, false),
  
  ('e0000000-0000-0000-0000-000000000004', 'Sortie Intensif - Jeudi', 'Entraînement pour groupes intensifs', 'a0000000-0000-0000-0000-000000000002',
   (CURRENT_DATE + INTERVAL '1 day' + ((4 - EXTRACT(DOW FROM CURRENT_DATE)::int + 7) % 7) * INTERVAL '1 day' + INTERVAL '18 hours')::timestamptz,
   (CURRENT_DATE + INTERVAL '1 day' + ((4 - EXTRACT(DOW FROM CURRENT_DATE)::int + 7) % 7) * INTERVAL '1 day' + INTERVAL '20 hours')::timestamptz,
   'training', 'regular', false, true, false),

  -- Week 2
  ('e0000000-0000-0000-0000-000000000011', 'Sortie Récréatif - Lundi', 'Entraînement régulier pour groupes récréatifs', 'a0000000-0000-0000-0000-000000000002',
   (CURRENT_DATE + INTERVAL '8 days' + ((1 - EXTRACT(DOW FROM CURRENT_DATE)::int + 7) % 7) * INTERVAL '1 day' + INTERVAL '18 hours')::timestamptz,
   (CURRENT_DATE + INTERVAL '8 days' + ((1 - EXTRACT(DOW FROM CURRENT_DATE)::int + 7) % 7) * INTERVAL '1 day' + INTERVAL '20 hours')::timestamptz,
   'training', 'regular', true, false, false),
  
  ('e0000000-0000-0000-0000-000000000012', 'Sortie Récréatif - Mercredi', 'Entraînement régulier pour groupes récréatifs', 'a0000000-0000-0000-0000-000000000002',
   (CURRENT_DATE + INTERVAL '8 days' + ((3 - EXTRACT(DOW FROM CURRENT_DATE)::int + 7) % 7) * INTERVAL '1 day' + INTERVAL '18 hours')::timestamptz,
   (CURRENT_DATE + INTERVAL '8 days' + ((3 - EXTRACT(DOW FROM CURRENT_DATE)::int + 7) % 7) * INTERVAL '1 day' + INTERVAL '20 hours')::timestamptz,
   'training', 'regular', true, false, false),
  
  ('e0000000-0000-0000-0000-000000000013', 'Sortie Intensif - Mardi', 'Entraînement pour groupes intensifs', 'a0000000-0000-0000-0000-000000000002',
   (CURRENT_DATE + INTERVAL '8 days' + ((2 - EXTRACT(DOW FROM CURRENT_DATE)::int + 7) % 7) * INTERVAL '1 day' + INTERVAL '18 hours')::timestamptz,
   (CURRENT_DATE + INTERVAL '8 days' + ((2 - EXTRACT(DOW FROM CURRENT_DATE)::int + 7) % 7) * INTERVAL '1 day' + INTERVAL '20 hours')::timestamptz,
   'training', 'regular', false, true, false),
  
  ('e0000000-0000-0000-0000-000000000014', 'Sortie Intensif - Jeudi', 'Entraînement pour groupes intensifs', 'a0000000-0000-0000-0000-000000000002',
   (CURRENT_DATE + INTERVAL '8 days' + ((4 - EXTRACT(DOW FROM CURRENT_DATE)::int + 7) % 7) * INTERVAL '1 day' + INTERVAL '18 hours')::timestamptz,
   (CURRENT_DATE + INTERVAL '8 days' + ((4 - EXTRACT(DOW FROM CURRENT_DATE)::int + 7) % 7) * INTERVAL '1 day' + INTERVAL '20 hours')::timestamptz,
   'training', 'regular', false, true, false);

-- Link events to groups via event_groups
INSERT INTO public.event_groups (event_id, group_id)
SELECT e.id, g.id 
FROM public.events e
CROSS JOIN public.groups g
WHERE e.is_for_recreational = true AND g.category = 'recreational'
   AND e.start_time > NOW()
ON CONFLICT (event_id, group_id) DO NOTHING;

INSERT INTO public.event_groups (event_id, group_id)
SELECT e.id, g.id 
FROM public.events e
CROSS JOIN public.groups g
WHERE e.is_for_intensive = true AND g.category = 'intensive'
   AND e.start_time > NOW()
ON CONFLICT (event_id, group_id) DO NOTHING;

-- ============================================
-- SECTION 5: SEED ANNOUNCEMENTS
-- ============================================

INSERT INTO public.announcements (id, title, content, is_pinned, created_at, expires_at)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 
   'Bienvenue à la saison 2026!', 
   'Nous sommes ravis de vous accueillir pour cette nouvelle saison. Les inscriptions sont ouvertes et les premières sorties débuteront bientôt. Consultez le calendrier pour les dates!', 
   true, NOW(), NULL),
  ('c0000000-0000-0000-0000-000000000002', 
   'Rappel: Équipement obligatoire', 
   'N''oubliez pas: casque homologué, gants et lunettes sont obligatoires pour toutes les sorties. Un vélo en bon état mécanique est essentiel pour votre sécurité.', 
   false, NOW(), NULL)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content;

-- ============================================
-- SECTION 6: SEED PARTNERS
-- ============================================

INSERT INTO public.partners (id, name, logo_url, website_url, promo_code, promo_description, tier, is_active)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'Vélo Cartel', NULL, 'https://velocartel.com', 'CCL2026', '10% de rabais sur les accessoires', 1, true),
  ('d0000000-0000-0000-0000-000000000002', 'Empire 47', NULL, 'https://empire47.com', 'CCLMEMBRE', '15% de rabais sur location de vélo', 1, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  promo_code = EXCLUDED.promo_code;

-- ============================================
-- SECTION 7: CREATE ADMIN PROFILE (Jonathan Poulin)
-- This creates the profile that will be linked when the user signs up
-- ============================================

-- Insert admin profile for Jonathan Poulin
INSERT INTO public.profiles (
  id, 
  first_name, 
  last_name, 
  email, 
  role, 
  is_active,
  claim_code
)
VALUES (
  'f0000000-0000-0000-0000-000000000001',
  'Jonathan',
  'Poulin',
  'poulin.jon@gmail.com',
  'admin',
  true,
  'ADMIN-JPOULIN-2026'
)
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role;

-- Also create profile for Arnaud Poulin (your son) - as athlete
INSERT INTO public.profiles (
  id,
  first_name,
  last_name,
  email,
  role,
  is_active,
  claim_code
)
VALUES (
  'f0000000-0000-0000-0000-000000000002',
  'Arnaud',
  'Poulin',
  'poulin.jon@gmail.com', -- Same email, parent relationship
  'athlete',
  true,
  'ARNAUD-POULIN-2026'
)
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role;

-- Add Arnaud to a recreational group for testing
INSERT INTO public.group_members (group_id, profile_id)
VALUES ('b0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002')
ON CONFLICT (group_id, profile_id) DO NOTHING;
