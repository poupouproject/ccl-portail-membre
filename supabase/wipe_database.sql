-- ==============================================================================
-- SCRIPT DE NETTOYAGE COMPLET DE LA BASE DE DONNÉES
-- CCL Portail Membre - Supabase
-- ==============================================================================
-- ATTENTION: Ce script supprime TOUTES les données et structures du schéma public
-- Exécuter uniquement en cas de reset complet de la base de données
-- ==============================================================================

-- Désactiver temporairement les triggers pour accélérer la suppression
SET session_replication_role = 'replica';

-- ==============================================================================
-- 1. SUPPRIMER LES VUES
-- ==============================================================================
DROP VIEW IF EXISTS public.v_family_relations CASCADE;
DROP VIEW IF EXISTS public.v_profile_all_roles CASCADE;
DROP VIEW IF EXISTS public.v_event_staffing CASCADE;
DROP VIEW IF EXISTS public.v_events_with_groups CASCADE;
DROP VIEW IF EXISTS public.v_events_with_location CASCADE;

-- ==============================================================================
-- 2. SUPPRIMER LES FONCTIONS
-- ==============================================================================
DROP FUNCTION IF EXISTS public.get_user_contexts(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.create_event_with_groups CASCADE;
DROP FUNCTION IF EXISTS public.get_unread_count CASCADE;
DROP FUNCTION IF EXISTS public.grant_role_from_subscription CASCADE;
DROP FUNCTION IF EXISTS public.grant_coach_role_from_group_staff CASCADE;
DROP FUNCTION IF EXISTS public.revoke_coach_role_from_group_staff CASCADE;
DROP FUNCTION IF EXISTS public.compute_profile_minor_autonomous CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user CASCADE;

-- ==============================================================================
-- 3. SUPPRIMER LES TABLES (ordre important pour respecter les FK)
-- ==============================================================================

-- Tables de jonction et dépendantes d'abord
DROP TABLE IF EXISTS public.profile_roles CASCADE;
DROP TABLE IF EXISTS public.profile_progression CASCADE;
DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.event_staff CASCADE;
DROP TABLE IF EXISTS public.event_groups CASCADE;
DROP TABLE IF EXISTS public.group_members CASCADE;
DROP TABLE IF EXISTS public.group_staff CASCADE;
DROP TABLE IF EXISTS public.group_messages CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.chat_read_status CASCADE;
DROP TABLE IF EXISTS public.staff_messages CASCADE;
DROP TABLE IF EXISTS public.broadcast_messages CASCADE;
DROP TABLE IF EXISTS public.message_reads CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.evaluations CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.user_profile_access CASCADE;
DROP TABLE IF EXISTS public.user_devices CASCADE;

-- Tables de référence
DROP TABLE IF EXISTS public.academy_videos CASCADE;
DROP TABLE IF EXISTS public.subscription_types CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;
DROP TABLE IF EXISTS public.locations CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Tables legacy / non utilisées  
DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.partners CASCADE;
DROP TABLE IF EXISTS public.wild_apricot_members CASCADE;
DROP TABLE IF EXISTS public.wild_apricot_webhooks CASCADE;

-- ==============================================================================
-- 4. SUPPRIMER LES TYPES/ENUMS
-- ==============================================================================
DROP TYPE IF EXISTS public.attendance_status CASCADE;
DROP TYPE IF EXISTS public.chat_channel_type CASCADE;
DROP TYPE IF EXISTS public.event_schedule_type CASCADE;
DROP TYPE IF EXISTS public.group_category CASCADE;
DROP TYPE IF EXISTS public.membership_status CASCADE;
DROP TYPE IF EXISTS public.relation_type CASCADE;
DROP TYPE IF EXISTS public.staff_role CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.context_type CASCADE;
DROP TYPE IF EXISTS public.subscription_status CASCADE;

-- Réactiver les triggers
SET session_replication_role = 'origin';

-- ==============================================================================
-- NETTOYAGE TERMINÉ
-- ==============================================================================
-- La base de données est maintenant vide et prête pour une nouvelle migration
-- Exécuter ensuite: create_database.sql
-- ==============================================================================
