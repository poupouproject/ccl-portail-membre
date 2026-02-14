-- Migration: Clean and reimport members properly
-- Date: 2026-02-01
-- Description: Remove all athlete profiles and WA members to start fresh

-- ============================================
-- SECTION 1: REMOVE ALL ATHLETE DATA
-- Keep only admin accounts
-- ============================================

-- Remove group memberships first
DELETE FROM public.group_members;

-- Remove event related data
DELETE FROM public.event_groups;
DELETE FROM public.event_staff;
DELETE FROM public.attendance;
DELETE FROM public.events;

-- Remove all wild apricot members (BEFORE deleting profiles)
DELETE FROM public.wild_apricot_members;

-- Remove user profile access for athletes (keep it for admins)
DELETE FROM public.user_profile_access WHERE relation IN ('self', 'parent') AND profile_id IN (
  SELECT id FROM public.profiles WHERE role = 'athlete'
);

-- Remove athlete profiles (keep admins)
DELETE FROM public.profiles WHERE role = 'athlete';

-- ============================================
-- SECTION 2: VERIFY CLEAN STATE
-- ============================================

DO $$
DECLARE
  admin_count INT;
  athlete_count INT;
  wa_count INT;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM public.profiles WHERE role = 'admin';
  SELECT COUNT(*) INTO athlete_count FROM public.profiles WHERE role = 'athlete';
  SELECT COUNT(*) INTO wa_count FROM public.wild_apricot_members;
  
  RAISE NOTICE '=== CLEANUP COMPLETE ===';
  RAISE NOTICE 'Admin Accounts (should be 3): %', admin_count;
  RAISE NOTICE 'Athlete Profiles (should be 0): %', athlete_count;
  RAISE NOTICE 'WA Members (should be 0): %', wa_count;
  RAISE NOTICE '=======================';
END $$;
