# CCL Portail Membre - Changelog

## 1.1.0

### Minor Changes

- [#5](https://github.com/poupouproject/ccl-portail-membre/pull/5) [`4e3403d`](https://github.com/poupouproject/ccl-portail-membre/commit/4e3403d9848713f58779f68d86a07668a9d566f2) Thanks [@poupouproject](https://github.com/poupouproject)! - ## Système Multi-abonnements

  Cette mise à jour majeure introduit le système de multi-abonnements qui permet :

  ### Nouvelles fonctionnalités

  - **Multi-abonnements par profil** : Un membre peut maintenant avoir plusieurs abonnements actifs (ex: Route + Montagnes)
  - **Gestion des contextes** : Nouveau sélecteur de contexte dans le header pour basculer entre les différents rôles/groupes
  - **Vue Parent améliorée** : Les parents voient maintenant facilement leurs enfants sur le dashboard avec des actions rapides
  - **Calendrier contextuel** : Le calendrier affiche maintenant les événements du groupe actif sélectionné

  ### Changements techniques

  - Nouvelle table `subscriptions` pour gérer les abonnements multiples
  - Nouvelle fonction PostgreSQL `get_user_contexts()` pour récupérer tous les contextes d'un utilisateur
  - Nouveau hook `useActiveContext` pour gérer le contexte actif dans l'application
  - Nouveau composant `ContextSelector` pour le changement de profil/groupe
  - Composant `ParentDashboardSection` pour l'affichage des enfants

  ### Migration de données

  - Les membres existants dans `group_members` sont automatiquement migrés vers la nouvelle table `subscriptions`
  - Compatibilité descendante maintenue avec l'ancien système

  ### Types de contextes supportés

  - **Participant** : Membre inscrit à un groupe (relation: self)
  - **Coach** : Encadrant d'un groupe (staff)
  - **Dépendant** : Enfant géré par un parent (relation: parent/guardian)

## 1.0.0

### 🎉 Première version - Janvier 2026

**Fonctionnalités principales :**

- 🚴 **Portail membre complet** : Accès personnalisé pour chaque membre du CCL Montagne
- 👨‍👩‍👧‍👦 **Gestion multi-profils** : Support des familles avec enfants rattachés
- 📅 **Calendrier des événements** : Visualisation des sorties, entraînements et événements du club
- 👥 **Groupes** : Affichage des groupes avec leurs encadrants et membres
- 💬 **Chat de groupe** : Discussion en temps réel par groupe
- 🔔 **Notifications** : Alertes en temps réel pour les événements et messages
- 📱 **PWA** : Application installable sur mobile avec support offline

**Administration :**

- 📊 **Dashboard admin** : Vue d'ensemble des membres, groupes et statistiques
- ✏️ **Gestion des membres** : Ajout, modification, catégories et saisons
- 👔 **Gestion du staff** : Attribution des encadrants par groupe avec rôles personnalisés
- 📝 **Notes internes** : Suivi privé pour les administrateurs
- 🔄 **Demandes de changement** : Workflow pour les demandes de changement de groupe
- 🚨 **Contacts d'urgence** : Gestion des contacts pour les enfants

**Technique :**

- ⚡ **Next.js 15** avec App Router
- 🗄️ **Supabase** pour la base de données et l'authentification
- 🔒 **RLS** (Row Level Security) pour la sécurité des données
- 🎨 **Tailwind CSS** avec composants shadcn/ui
