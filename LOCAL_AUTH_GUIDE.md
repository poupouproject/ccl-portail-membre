# Guide de connexion en développement local

## ✅ Méthode recommandée: Via Supabase Studio UI

### Étape 1: Ouvrir Supabase Studio
Ouvrir dans le navigateur: **http://127.0.0.1:54323**

### Étape 2: Créer un utilisateur
1. Dans le menu latéral, cliquer sur **"Authentication"**
2. Cliquer sur **"Users"** dans le sous-menu
3. Cliquer sur le bouton **"Add User"** (en haut à droite)
4. Sélectionner **"Create new user"**
5. Remplir le formulaire:
   - **Email**: `admin@ccljeunesse.local`
   - **Password**: `TestAdmin123!`
   - **Auto Confirm User**: ✅ **ACTIVER** (important!)
6. Cliquer sur **"Create user"**

### Étape 3: Se connecter
1. Aller sur **http://localhost:3001/login**
2. Cliquer sur le lien **"Connexion par email (dev local)"** en bas
3. Entrer:
   - Email: `admin@ccljeunesse.local`
   - Mot de passe: `TestAdmin123!`
4. Cliquer sur **"Se connecter"**

Vous serez redirigé vers le dashboard! 🎉

---

## Alternative: Via SQL Editor

Si vous préférez utiliser SQL:

1. Ouvrir Supabase Studio: **http://127.0.0.1:54323**
2. Aller dans **"SQL Editor"**
3. Copier-coller ce code:

```sql
-- Créer l'utilisateur
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
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@ccljeunesse.local',
    crypt('TestAdmin123!', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Admin CCL"}',
    NOW(),
    NOW(),
    '',
    ''
) 
ON CONFLICT (email) DO UPDATE 
SET email_confirmed_at = NOW()
RETURNING id, email;
```

4. Cliquer sur **"Run"** ou appuyer sur **F5**

---

## Lier l'utilisateur au profil Jonathan Poulin (optionnel)

Pour que l'utilisateur de test ait accès aux données:

```sql
INSERT INTO public.user_profile_access (user_id, profile_id, relation)
SELECT 
    (SELECT id FROM auth.users WHERE email = 'admin@ccljeunesse.local'),
    (SELECT id FROM public.profiles WHERE email = 'poulin.jon@gmail.com'),
    'self'
WHERE EXISTS (SELECT 1 FROM public.profiles WHERE email = 'poulin.jon@gmail.com')
ON CONFLICT DO NOTHING;
```

---

## ⚠️ Note importante

- Le mode **email/password** est uniquement pour le **développement local**
- En production, l'authentification se fait via **OAuth** (Google/GitHub/Microsoft)
- Ne jamais commiter de mots de passe en dur dans le code

---

## Dépannage

### Erreur "Invalid login credentials"
- Vérifier que **"Auto Confirm User"** était activé lors de la création
- OU exécuter: 
  ```sql
  UPDATE auth.users 
  SET email_confirmed_at = NOW() 
  WHERE email = 'admin@ccljeunesse.local';
  ```

### Pas d'accès au dashboard
- Vérifier que l'utilisateur est lié à un profil (voir section ci-dessus)
- Vérifier les RLS policies sur la table `profiles`

