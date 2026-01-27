-- ==============================================================================
-- MIGRATION: Allow NULL logo_url for partners
-- Version: 1.2
-- Permet aux partenaires d'avoir un logo_url nullable
-- ==============================================================================

ALTER TABLE public.partners
ALTER COLUMN logo_url DROP NOT NULL;
