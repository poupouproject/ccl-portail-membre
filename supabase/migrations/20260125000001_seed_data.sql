-- ==============================================================================
-- MIGRATION: Données de démonstration
-- Version: 1.0
-- ==============================================================================

-- Groupes de démonstration
INSERT INTO public.groups (id, name, description, level_required, color_code) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Mini-Vélo', 'Initiation pour les 4-6 ans', 1, '#4CAF50'),
    ('22222222-2222-2222-2222-222222222222', 'Atome A - Compétition', 'Groupe compétition 7-9 ans', 3, '#2196F3'),
    ('33333333-3333-3333-3333-333333333333', 'Atome B - Récréatif', 'Groupe récréatif 7-9 ans', 1, '#FF6600'),
    ('44444444-4444-4444-4444-444444444444', 'Peewee - Compétition', 'Groupe compétition 10-12 ans', 4, '#9C27B0'),
    ('55555555-5555-5555-5555-555555555555', 'Cadet - Développement', 'Groupe développement 13-15 ans', 3, '#F44336');

-- Profils de démonstration (Coachs)
INSERT INTO public.profiles (id, first_name, last_name, email, role, claim_code) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Steve', 'Tremblay', 'steve@demo.com', 'coach', NULL),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Marie', 'Lavoie', 'marie@demo.com', 'coach', NULL),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Jean', 'Gagnon', 'jean@demo.com', 'admin', NULL);

-- Profils de démonstration (Athlètes)
INSERT INTO public.profiles (id, first_name, last_name, role, claim_code, birth_date, emergency_contact_name, emergency_contact_phone) VALUES
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Thomas', 'Bouchard', 'athlete', 'VELO-1001', '2017-05-15', 'Marc Bouchard', '418-555-0101'),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Emma', 'Côté', 'athlete', 'VELO-1002', '2016-08-22', 'Sophie Côté', '418-555-0102'),
    ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Lucas', 'Roy', 'athlete', 'VELO-1003', '2015-03-10', 'Julie Roy', '418-555-0103'),
    ('00000000-0000-0000-0000-000000000001', 'Léa', 'Pelletier', 'athlete', 'VELO-1004', '2014-11-30', 'Patrick Pelletier', '418-555-0104');

-- Assignation aux groupes
INSERT INTO public.group_members (group_id, profile_id) VALUES
    ('33333333-3333-3333-3333-333333333333', 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
    ('33333333-3333-3333-3333-333333333333', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'),
    ('22222222-2222-2222-2222-222222222222', 'ffffffff-ffff-ffff-ffff-ffffffffffff'),
    ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000001');

-- Staff par défaut des groupes
INSERT INTO public.group_staff (group_id, profile_id, default_role) VALUES
    ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'head_coach'),
    ('33333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'assistant'),
    ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'head_coach'),
    ('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'head_coach');

-- Événements de démonstration (prochains jours)
INSERT INTO public.events (id, group_id, title, description, location_name, location_url, start_time, end_time, event_type) VALUES
    ('e1111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 
     'Entraînement - Sentiers du Parc', 'Pratique technique en sentier', 
     'Parc des Chutes-de-la-Chaudière', 'https://maps.google.com/?q=Parc+des+Chutes-de-la-Chaudière',
     NOW() + INTERVAL '2 days' + TIME '18:00', NOW() + INTERVAL '2 days' + TIME '19:30', 'training'),
    
    ('e2222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333',
     'Sortie familiale - Véloroute', 'Sortie détente sur piste cyclable',
     'Véloroute de Bellechasse', 'https://maps.google.com/?q=Véloroute+Bellechasse',
     NOW() + INTERVAL '7 days' + TIME '09:00', NOW() + INTERVAL '7 days' + TIME '12:00', 'social'),
    
    ('e3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222',
     'Entraînement compétition', 'Préparation pour la course MTB EVO',
     'Mont-Orignal', 'https://maps.google.com/?q=Mont-Orignal',
     NOW() + INTERVAL '3 days' + TIME '17:00', NOW() + INTERVAL '3 days' + TIME '19:00', 'training');

-- Annonces de démonstration
INSERT INTO public.announcements (title, content, is_pinned, expires_at) VALUES
    ('Corvée de sentiers - Samedi 8 février', 
     'Nous avons besoin de bénévoles pour l''entretien des sentiers du Parc. Apportez vos outils et votre bonne humeur! Lunch fourni par le club.',
     true, NOW() + INTERVAL '30 days'),
    
    ('Course MTB EVO - Inscriptions ouvertes',
     'Les inscriptions pour la prochaine course MTB EVO sont maintenant ouvertes. Contactez votre coach pour plus d''informations.',
     true, NOW() + INTERVAL '60 days'),
    
    ('Nouveau commanditaire: Cycles Performance',
     'Bienvenue à Cycles Performance qui se joint à nos partenaires! Profitez de 15% de rabais sur toutes les mises au point avec le code membre.',
     false, NULL);

-- Partenaires de démonstration
INSERT INTO public.partners (name, logo_url, website_url, promo_code, promo_description, tier, is_active) VALUES
    ('Cycles Performance', NULL, 'https://cyclesperformance.ca', 'CCL2026', '15% sur les mises au point', 1, true),
    ('Vélo Plus', NULL, 'https://veloplus.ca', 'CLUBLEVIS', '10% sur les accessoires', 2, true),
    ('Nutrition Sport', NULL, 'https://nutrisport.ca', 'CCL10', '10% sur les suppléments', 3, true);

-- Vidéos académie de démonstration
INSERT INTO public.academy_videos (title, description, video_provider, video_id, category, level_min, is_published) VALUES
    ('Position de base sur le vélo', 'Apprenez la bonne posture pour rouler en toute sécurité', 'youtube', 'dQw4w9WgXcQ', 'Fondamentaux', 1, true),
    ('Freinage d''urgence', 'Technique de freinage pour éviter les accidents', 'youtube', 'dQw4w9WgXcQ', 'Sécurité', 1, true),
    ('Négocier les virages serrés', 'Technique avancée pour les sentiers techniques', 'youtube', 'dQw4w9WgXcQ', 'Technique', 2, true),
    ('Rouler en groupe', 'Les règles et signaux pour rouler en peloton', 'youtube', 'dQw4w9WgXcQ', 'Groupe', 1, true),
    ('Franchir les obstacles', 'Comment passer par-dessus les roches et racines', 'youtube', 'dQw4w9WgXcQ', 'Technique', 3, true);

-- ==============================================================================
-- FIN DES DONNÉES DE DÉMONSTRATION
-- ==============================================================================
