-- Migration: Add new features for profiles and groups
-- Date: 2026-01-28
-- Description:
--   1. Add member_category preference to profiles (intensif/récréatif)
--   2. Add season to groups for yearly filtering
--   3. Add internal_notes to groups (for coaches only)

-- ============================================
-- SECTION 1: PROFILE - Add member category preference
-- ============================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS member_category public.group_category DEFAULT NULL;

COMMENT ON COLUMN public.profiles.member_category IS 'Member preference: recreational or intensive (from Wild Apricot subscription)';

-- ============================================
-- SECTION 2: GROUPS - Add season for yearly filtering
-- ============================================
ALTER TABLE public.groups
ADD COLUMN IF NOT EXISTS season INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE);

ALTER TABLE public.groups
ADD COLUMN IF NOT EXISTS internal_notes TEXT DEFAULT NULL;

COMMENT ON COLUMN public.groups.season IS 'Season year (e.g., 2026) for filtering groups by year';
COMMENT ON COLUMN public.groups.internal_notes IS 'Internal notes visible to coaches and admins only';

-- ============================================
-- SECTION 3: Update existing groups with current year
-- ============================================
UPDATE public.groups SET season = 2026 WHERE season IS NULL;
