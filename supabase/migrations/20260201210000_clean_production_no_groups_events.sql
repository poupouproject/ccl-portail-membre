-- Migration: Clean Production - Remove Demo Events and Group Assignments
-- Date: 2026-02-01
-- Description: 
--   1. Remove all demo events
--   2. Remove all group member assignments (coach will assign manually)
--   3. Remove event_groups links
--   4. Keep groups structure for coach to use
--   5. Keep admin accounts (Jonathan Poulin, Sébastien Rousseau)

-- ============================================
-- SECTION 1: REMOVE ALL EVENTS
-- ============================================

-- Remove event_groups links first (foreign key constraint)
DELETE FROM public.event_groups;

-- Remove event_staff
DELETE FROM public.event_staff;

-- Remove attendance records
DELETE FROM public.attendance;

-- Remove all events
DELETE FROM public.events;

-- ============================================
-- SECTION 2: REMOVE GROUP MEMBER ASSIGNMENTS
-- Coach will assign members manually
-- ============================================

DELETE FROM public.group_members;

-- ============================================
-- SECTION 3: KEEP GROUPS BUT MAKE THEM EMPTY
-- The coach will use these groups or create new ones
-- ============================================

-- Groups are kept: Débutants Lundi, Débutants Mercredi, 
-- Intermédiaires Lundi, Intermédiaires Mercredi,
-- Performance A, Performance B

-- ============================================
-- SECTION 4: CLEAN DEMO ANNOUNCEMENTS
-- ============================================

DELETE FROM public.announcements 
WHERE id IN (
  'c0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000002'
);

-- ============================================
-- SECTION 5: SUMMARY LOG
-- ============================================

DO $$
DECLARE
  total_profiles INT;
  admin_count INT;
  group_count INT;
  event_count INT;
  group_member_count INT;
BEGIN
  SELECT COUNT(*) INTO total_profiles FROM public.profiles WHERE role = 'athlete';
  SELECT COUNT(*) INTO admin_count FROM public.profiles WHERE role = 'admin';
  SELECT COUNT(*) INTO group_count FROM public.groups;
  SELECT COUNT(*) INTO event_count FROM public.events;
  SELECT COUNT(*) INTO group_member_count FROM public.group_members;
  
  RAISE NOTICE '=== PRODUCTION CLEANUP COMPLETE ===';
  RAISE NOTICE 'Athlete Profiles: %', total_profiles;
  RAISE NOTICE 'Admin Accounts: %', admin_count;
  RAISE NOTICE 'Groups (empty, ready for coach): %', group_count;
  RAISE NOTICE 'Events (should be 0): %', event_count;
  RAISE NOTICE 'Group Memberships (should be 0): %', group_member_count;
  RAISE NOTICE '====================================';
END $$;
