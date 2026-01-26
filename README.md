# CCL Portail Membre - Club Cycliste de Lévis

Application PWA pour la gestion du volet jeunesse du Club Cycliste de Lévis.

## 🚴 Philosophie

**"Plaisir avant Performance"** - Cette application met l'accent sur l'inclusivité et la pédagogie, pas sur la performance athlétique.

## 🛠️ Stack Technique

- **Frontend:** Next.js 15 (App Router) + React 19
- **Styling:** Tailwind CSS + Shadcn/UI
- **Backend:** Supabase (Auth, PostgreSQL, Realtime, Storage)
- **Authentification:** SSO avec Google, GitHub, Microsoft (Azure)
- **Hébergement:** Vercel

## 📱 Fonctionnalités

### Pour les Parents/Tuteurs
- 📅 **Calendrier unifié** de tous leurs enfants
- ✅ **RSVP rapide** (Présent/Absent) pour chaque sortie
- 💬 **Accès lecture** au chat de groupe
- 🎓 **Suivi pédagogique** avec capsules vidéo et évaluations
- 🎁 **Portefeuille membre** avec codes rabais partenaires

### Pour les Athlètes (14+)
- 📅 Vue personnelle du calendrier
- 💬 Participation au chat de groupe
- 🎓 Progression dans l'académie

### Pour les Coachs
- 👥 Vue de tous les groupes assignés
- ✅ Prise de présence sur le terrain
- 📝 Évaluations techniques des athlètes

### Pour les Coordinateurs (Admin)
- 🔧 Gestion complète des groupes
- 📢 Publication des annonces
- 🤝 Gestion des partenaires

## 🚀 Installation

### Prérequis
- Node.js 18+
- npm ou pnpm
- Compte Supabase

### 1. Cloner et installer

```bash
cd ccl-portail-membre
npm install
```

### 2. Configuration Supabase

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Copier `.env.example` vers `.env.local`
3. Remplir les variables d'environnement:

```env
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Configurer l'authentification SSO

Dans le dashboard Supabase > Authentication > Providers:

#### Google
1. Activer Google Provider
2. Créer des credentials OAuth dans [Google Cloud Console](https://console.cloud.google.com)
3. Ajouter le callback URL: `https://votre-projet.supabase.co/auth/v1/callback`

#### GitHub
1. Activer GitHub Provider
2. Créer une OAuth App dans [GitHub Developer Settings](https://github.com/settings/developers)
3. Ajouter le callback URL: `https://votre-projet.supabase.co/auth/v1/callback`

#### Microsoft (Azure)
1. Activer Azure Provider
2. Créer une app dans [Azure Portal](https://portal.azure.com)
3. Configurer les redirect URIs

### 4. Appliquer les migrations

```bash
# Avec Supabase CLI
npx supabase db push
```

Ou manuellement dans le SQL Editor de Supabase en exécutant les fichiers dans `supabase/migrations/`.

### 5. Lancer le développement

```bash
npm run dev
```

L'application sera disponible sur [http://localhost:3000](http://localhost:3000)

## 📁 Structure du Projet

```
src/
├── app/
│   ├── (authenticated)/     # Routes protégées
│   │   ├── dashboard/       # Accueil
│   │   ├── calendar/        # Calendrier
│   │   ├── academy/         # Académie & Progression
│   │   ├── team/            # Chat d'équipe
│   │   └── profile/         # Profil & Réglages
│   ├── auth/callback/       # Callback OAuth
│   ├── login/               # Page de connexion
│   └── page.tsx             # Landing page
├── components/
│   ├── ui/                  # Composants Shadcn/UI
│   ├── layout/              # Header, Navigation
│   ├── dashboard/           # Composants dashboard
│   ├── calendar/            # Composants calendrier
│   └── academy/             # Composants académie
├── hooks/                   # Hooks React personnalisés
├── lib/                     # Utilitaires et clients
└── types/                   # Types TypeScript
```

## 🔐 Modèle de Sécurité

L'application utilise Row Level Security (RLS) de Supabase:

- Les **parents** ne voient que les données de leurs enfants
- Les **coachs** voient tous les membres mais ne modifient que leurs groupes
- Les **admins** ont accès complet

## 📦 Déploiement

### Vercel (Recommandé)

1. Connecter le repo GitHub à Vercel
2. Configurer les variables d'environnement
3. Déployer

```bash
npm run build
```

### Variables d'environnement requises

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de votre projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase |
| `NEXT_PUBLIC_APP_URL` | URL de l'application déployée |

## 🤝 Contribution

Les contributions sont les bienvenues! Merci de suivre les conventions de code et de tester vos modifications.

## 📄 Licence

Propriétaire - Club Cycliste de Lévis © 2026
