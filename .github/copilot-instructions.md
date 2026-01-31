# CCL Portail Membre - Instructions Copilot

## Contexte du projet

Ce projet est un portail membre pour le **CCL Montagne** (Club de Cyclisme), une PWA Next.js avec Supabase.

## Stack technique

- **Framework**: Next.js 15 (App Router)
- **Base de données**: Supabase (PostgreSQL avec RLS)
- **Auth**: Supabase Auth
- **UI**: Tailwind CSS + shadcn/ui
- **Gestion des versions**: Changesets

## Structure du projet

```
src/
├── app/                    # Routes Next.js App Router
│   ├── (authenticated)/    # Routes protégées par auth
│   │   ├── dashboard/      # Tableau de bord principal
│   │   ├── calendar/       # Calendrier des événements
│   │   ├── groups/         # Liste des groupes
│   │   ├── profile/        # Profil utilisateur
│   │   └── admin/          # Administration (staff only)
│   ├── api/                # API routes
│   ├── auth/               # Callback auth Supabase
│   └── login/              # Page de connexion
├── components/
│   ├── ui/                 # Composants shadcn/ui
│   ├── layout/             # Header, Sidebar, BottomNav
│   ├── dashboard/          # Composants du dashboard
│   └── calendar/           # Composants calendrier
├── hooks/                  # Custom React hooks
├── lib/                    # Utilitaires et clients Supabase
└── types/                  # Types TypeScript
```

## Conventions de code

### Nommage
- **Fichiers composants**: kebab-case (`group-card.tsx`)
- **Composants**: PascalCase (`GroupCard`)
- **Fonctions/variables**: camelCase
- **Types/Interfaces**: PascalCase avec préfixe si nécessaire

### Composants
- Utiliser `"use client"` uniquement quand nécessaire
- Préférer les Server Components quand possible
- Utiliser les composants shadcn/ui pour l'UI

### Base de données
- Toujours utiliser les types générés depuis `types/database.ts`
- Respecter les politiques RLS existantes
- Créer des migrations dans `supabase/migrations/`

### Styles
- Couleur principale: `club-orange` (définie dans tailwind.config.ts)
- Utiliser les classes Tailwind, pas de CSS inline
- Respecter le design mobile-first

## Schéma de base de données principal

### Tables principales
- `members`: Profils des membres
- `groups`: Groupes d'entraînement (avec `member_category`, `season`, `internal_notes`)
- `group_members`: Liaison membres-groupes
- `group_staff`: Encadrants par groupe (avec `default_role`)
- `events`: Événements (sorties, entraînements)
- `event_groups`: Liaison événements-groupes
- `notifications`: Notifications push

### Rôles
- `member`: Membre standard
- `coach`: Encadrant/Éducateur
- `admin`: Administrateur

## Gestion des versions

Le projet utilise **Changesets** pour la gestion des versions :

```bash
# Créer un changeset pour une modification
npm run changeset

# Mettre à jour les versions
npm run version
```

Le workflow GitHub Actions crée automatiquement :
- Une PR de release quand des changesets existent
- Un tag Git et une GitHub Release après merge

## Bonnes pratiques

1. **Toujours tester localement** avec Supabase local (`supabase start`)
2. **Créer des migrations** pour tout changement de schéma
3. **Ajouter des changesets** pour les modifications significatives
4. **Respecter les types** - éviter `any`
5. **Gérer les erreurs** avec try/catch et feedback utilisateur
