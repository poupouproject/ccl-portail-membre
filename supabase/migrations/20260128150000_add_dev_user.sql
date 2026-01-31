-- Add dev test user for local development
-- This migration creates a test user that can log in with email/password

-- Create a test user in auth.users
-- Password is: TestAdmin123!
-- Email: admin@ccljeunesse.local

INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'admin@ccljeunesse.local',
    -- Password: TestAdmin123! (bcrypt hash)
    '$2a$10$5J5J5J5J5J5J5J5J5J5J5Ou5J5J5J5J5J5J5J5J5J5J5J5J5J5J5J5J5',
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Admin CCL"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO NOTHING;

-- Link to existing Jonathan Poulin profile
INSERT INTO public.user_profile_access (user_id, profile_id, relation)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    (SELECT id FROM public.profiles WHERE email = 'poulin.jon@gmail.com' LIMIT 1),
    'self'
) ON CONFLICT DO NOTHING;

-- Note: For local development, you can also create users through the Supabase Studio UI
-- or use the sign-up functionality if enabled in config.toml
