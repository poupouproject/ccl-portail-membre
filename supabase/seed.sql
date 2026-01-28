-- Supabase Seed File
-- This file is executed after migrations when running supabase db reset
-- It imports Wild Apricot members and sets up test accounts

-- ============================================
-- SECTION 1: WILD APRICOT MEMBERS IMPORT
-- Sample members from CSV files (Montagne 1x and 2x)
-- ============================================

-- Clear existing wild_apricot_members for clean import
TRUNCATE public.wild_apricot_members CASCADE;

-- Insert members from 1x/week CSV
INSERT INTO public.wild_apricot_members (
  wa_member_id, first_name, last_name, email, phone, mobile,
  address, city, postal_code, parent_name, birth_year,
  health_insurance_number, allergies_medical, membership_level,
  membership_status, objective, experience_years, skill_level,
  wheel_size, photo_permission
) VALUES
-- Montagne 1x/sem members
('74155980', 'Hubert', 'Audet', 'fredaudetqc@gmail.com', '4188321253', '4186094515', '7321 Des grebes', 'Lévis', 'G6x2b7', 'Frederic audet', 2012, 'AUDH12090416', NULL, 'Jeunesse Montagne 1x/sem', 'active', 'Rouler pour le plaisir et rencontrer des amis', '5 ans et plus', 'Intermédiaire', '29 pouces', true),
('96050265', 'Loïc', 'Baril', 'vm.doyon@yahoo.ca', '581-980-6233', NULL, '680, rue Labbé', 'Lévis', 'G6K 0C1', 'Valérie Morissette-Doyon', 2017, 'BARL 17070211', NULL, 'Jeunesse Montagne 1x/sem', 'active', 'Améliorer ma technique', '1 à 2 ans', 'Débutant', '24 pouces', true),
('96134334', 'Loïc', 'Baril', 'M4rie_christine@hotmail.com', '4186550780', '418-655-0780', '1726 rue Puccini', 'Lévis', 'G6Y0H2', 'Kéven Baril', 2016, 'BARL18121111', 'Aucune', 'Jeunesse Montagne 1x/sem', 'active', 'Rouler pour le plaisir', '1 à 2 ans', 'Débutant', '24 pouces', true),
('96133738', 'William', 'Baril', 'kev_b60@hotmail.com', '4186550780', '418-655-0780', '1726 rue Puccini', 'Lévis', 'G6Y0H2', 'Kéven Baril', 2018, 'BARW16080513', 'Aucune', 'Jeunesse Montagne 1x/sem', 'active', 'Rouler pour le plaisir', '1 à 2 ans', 'Intermédiaire', '26 pouces', true),
('59068520', 'Antoine', 'Barris', 'nico.barris@gmail.com', '4182551400', NULL, '1075 avenue marguerite-bourgeoys', 'quebec', 'G1S3Y1', 'Nicolas Barris', 2018, 'BARA18011711', NULL, 'Jeunesse Montagne 1x/sem', 'active', 'Rouler pour le plaisir', 'Ce sera ma première année', 'Débutant', '20 pouces', false),

-- Montagne 2x/sem members
('58638829', 'Jeremy', 'Beaumont', 'christianbeaumont114@gmail.com', '4184541761', NULL, '870 Rue du Rocher', 'Saint-Nicolas', 'G7A3X8', 'Christian Beaumont', 2010, 'BEAUJ10120612', NULL, 'Jeunesse Montagne 2x/sem', 'active', 'Améliorer ma technique', '5 ans et plus', 'Avancé', '27,5 pouces', true),
('68449179', 'Allan', 'Belizaire', 'ndiplo@yahoo.fr', '4188024308', NULL, '2241 rue des godets', 'Lévis', 'G6J 0K7', 'Nancy Diplo', 2014, 'BELA14100315', 'TDAH et TSA leger', 'Jeunesse Montagne 2x/sem', 'active', 'Rouler pour le plaisir', '1 à 2 ans', 'Débutant', '24 pouces', true),
('79913143', 'Antoine', 'Belletête', 'caroline.nolet@lecapsp.com', '4189305463', '4189305463', '312 rue Judith-Jasmin', 'Lévis', 'G7A 3K6', 'Caroline Nolet', 2012, 'BELA12011114', 'Aucune', 'Jeunesse Montagne 2x/sem', 'active', 'Améliorer ma technique', '1 à 2 ans', 'Intermédiaire', '27,5 pouces', true),
('96053644', 'Émilien', 'Blais-Bernier', 'jeanphilippe.bernier1991@gmail.com', '5819837983', NULL, '2638 rue Gravel', 'Lévis', 'G6V 4X5', 'Jean-Philippe Bernier', 2018, 'BLAE 1808 1316', NULL, 'Jeunesse Montagne 2x/sem', 'active', 'Améliorer ma technique', '3 à 4 ans', 'Intermédiaire', '24 pouces', true)
ON CONFLICT (wa_member_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  membership_status = EXCLUDED.membership_status,
  updated_at = NOW();

-- ============================================
-- SECTION 2: CREATE PROFILES FROM WA MEMBERS
-- ============================================

-- Create profiles for each WA member that doesn't already exist
INSERT INTO public.profiles (
  wa_member_id, first_name, last_name, email, phone, role,
  address_line1, address_city, address_postal_code,
  birth_date, medical_notes, photo_permission, is_active,
  claim_code
)
SELECT 
  wam.wa_member_id,
  wam.first_name,
  wam.last_name,
  wam.email,
  COALESCE(wam.mobile, wam.phone),
  'athlete'::public.user_role,
  wam.address,
  wam.city,
  wam.postal_code,
  CASE 
    WHEN wam.birth_year IS NOT NULL 
    THEN make_date(wam.birth_year, 6, 15) -- Default to June 15
    ELSE NULL 
  END,
  wam.allergies_medical,
  COALESCE(wam.photo_permission, true),
  true,
  'CCL-' || wam.wa_member_id -- Claim code based on WA member ID
FROM public.wild_apricot_members wam
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.wa_member_id = wam.wa_member_id
)
ON CONFLICT (wa_member_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  email = EXCLUDED.email,
  updated_at = NOW();

-- Link WA members to their profiles
UPDATE public.wild_apricot_members wam
SET profile_id = p.id
FROM public.profiles p
WHERE p.wa_member_id = wam.wa_member_id AND wam.profile_id IS NULL;

-- ============================================
-- SECTION 3: ASSIGN MEMBERS TO GROUPS
-- Based on membership level and skill
-- ============================================

-- Assign 1x/week members to recreational groups (debutant = Monday, Intermediate = Wednesday)
INSERT INTO public.group_members (group_id, profile_id)
SELECT 
  CASE 
    WHEN wam.skill_level ILIKE '%débutant%' THEN 'b0000000-0000-0000-0000-000000000001'::uuid -- Débutants Lundi
    WHEN wam.skill_level ILIKE '%intermédiaire%' THEN 'b0000000-0000-0000-0000-000000000003'::uuid -- Intermédiaires Lundi
    ELSE 'b0000000-0000-0000-0000-000000000001'::uuid -- Default to Débutants
  END,
  wam.profile_id
FROM public.wild_apricot_members wam
WHERE wam.membership_level ILIKE '%1x%' 
  AND wam.profile_id IS NOT NULL
  AND wam.membership_status = 'active'
ON CONFLICT (group_id, profile_id) DO NOTHING;

-- Assign 2x/week members to intensive groups
INSERT INTO public.group_members (group_id, profile_id)
SELECT 
  CASE 
    WHEN wam.skill_level ILIKE '%avancé%' THEN 'b0000000-0000-0000-0000-000000000005'::uuid -- Performance A
    ELSE 'b0000000-0000-0000-0000-000000000006'::uuid -- Performance B
  END,
  wam.profile_id
FROM public.wild_apricot_members wam
WHERE wam.membership_level ILIKE '%2x%' 
  AND wam.profile_id IS NOT NULL
  AND wam.membership_status = 'active'
ON CONFLICT (group_id, profile_id) DO NOTHING;

-- ============================================
-- SECTION 4: TEST ACCOUNTS SETUP
-- Note: Auth users must be created through Supabase Auth API
-- This section documents the expected setup
-- ============================================

-- Admin account (Jonathan Poulin): poulin.jon@gmail.com
-- When this user signs up, they need to be linked to the admin profile

-- The user_profile_access table links auth.users to profiles
-- This will be done via a trigger or manually after signup

-- Create a function to auto-link users on signup based on email
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid;
  v_admin_email text := 'poulin.jon@gmail.com';
BEGIN
  -- Check if there's an existing profile with this email
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE email = NEW.email
  LIMIT 1;
  
  -- If profile exists, link it
  IF v_profile_id IS NOT NULL THEN
    INSERT INTO public.user_profile_access (user_id, profile_id, relation, permissions)
    VALUES (
      NEW.id, 
      v_profile_id, 
      'self'::public.relation_type,
      '{"can_chat": true, "can_rsvp": true}'::jsonb
    )
    ON CONFLICT (user_id, profile_id) DO NOTHING;
    
    -- Also check for child profiles (parent relationship) for this email
    -- For Jonathan Poulin, also link to Arnaud Poulin's profile
    IF NEW.email = v_admin_email THEN
      INSERT INTO public.user_profile_access (user_id, profile_id, relation, permissions)
      SELECT NEW.id, p.id, 'parent'::public.relation_type, '{"can_chat": true, "can_rsvp": true}'::jsonb
      FROM public.profiles p
      WHERE p.first_name = 'Arnaud' AND p.last_name = 'Poulin'
      ON CONFLICT (user_id, profile_id) DO NOTHING;
    END IF;
  ELSE
    -- Create a new profile for the user
    INSERT INTO public.profiles (first_name, last_name, email, role, is_active)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      NEW.email,
      'athlete'::public.user_role,
      true
    )
    RETURNING id INTO v_profile_id;
    
    -- Link the new profile
    INSERT INTO public.user_profile_access (user_id, profile_id, relation, permissions)
    VALUES (NEW.id, v_profile_id, 'self'::public.relation_type, '{"can_chat": true, "can_rsvp": true}'::jsonb);
  END IF;
  
  -- Also create entry in users table
  INSERT INTO public.users (id, email, subscription_status)
  VALUES (NEW.id, NEW.email, 'inactive')
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signups (if not exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();

-- ============================================
-- SECTION 5: VERIFICATION QUERIES
-- ============================================

-- Count members by group
-- SELECT g.name, COUNT(gm.profile_id) as member_count
-- FROM public.groups g
-- LEFT JOIN public.group_members gm ON g.id = gm.group_id
-- GROUP BY g.id, g.name
-- ORDER BY g.name;

-- Count upcoming events
-- SELECT COUNT(*) FROM public.events WHERE start_time > NOW();
