---
"ccl-portail-membre": minor
---

## Système Multi-abonnements

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
