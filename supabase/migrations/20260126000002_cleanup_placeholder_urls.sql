-- ==============================================================================
-- MIGRATION: Clean up placeholder URLs
-- Version: 1.3
-- Supprime tous les URLs placehold.co et les remplace par NULL
-- ==============================================================================

-- Nettoyer les partenaires
UPDATE public.partners
SET logo_url = NULL
WHERE logo_url LIKE '%placehold.co%';

-- Nettoyer les annonces
UPDATE public.announcements
SET image_url = NULL
WHERE image_url LIKE '%placehold.co%';
