# Document de Design Fonctionnel & Technique : App Club Cycliste de Lévis

## 1. Vision & Architecture

* **Objectif Principal :** Application PWA pour la gestion globale du volet jeunesse du Club Cycliste de Lévis (environ 75 jeunes, 20 coachs). Elle centralise la logistique terrain, la communication et la progression pédagogique.
* **Philosophie "Plaisir avant Performance" :**
    * L'accent est mis sur l'**inclusivité** et la pédagogie.
    * L'application **ne gère pas** la performance athlétique (pas de chronos, pas de watts).
    * Le système d'évaluation sert strictement à placer le jeune dans le groupe adapté à son niveau technique pour maximiser son plaisir et sa sécurité.
* **Approche :** Architecture "Headless" et conception "Mobile-First" pour une expérience utilisateur fluide sur le terrain.
* **Synchronisation :** Connexion API bidirectionnelle avec l'ERP Odoo pour une synchronisation automatique des membres et de la facturation.
* **Stack Technique :**
    * **Frontend :** Next.js 14 (App Router) + Tailwind CSS + Shadcn/UI.
    * **Backend Opérationnel :** Supabase (Auth, DB PostgreSQL, Realtime, Storage).
    * **Backend Administratif :** Odoo (Source de vérité financière et membres).
    * **Hébergement :** Vercel.



---

## 2. Les Rôles & Permissions (ACL)

Le système repose sur une table `relationships` dans Supabase pour gérer de manière flexible les structures familiales et les accès.

| Rôle | Description & Droits |
| --- | --- |
| **Coordinateur (Admin)** | **Accès Total.** Crée et gère les groupes, valide les évaluations de re-classement, gère les exceptions au calendrier (absences coachs), publie les annonces officielles et gère les partenaires. |
| **Coach** | **Vue "Staff".** Voit ses groupes assignés, prend les présences aux événements, remplit les évaluations techniques des athlètes. *Note : Le rôle actif ("Lead" ou "Assistant") est déterminé dynamiquement selon l'événement.* |
| **Parent (Tuteur)** | **Vue "Superviseur".** Voit le calendrier unifié de tous ses enfants, gère les statuts de présence (RSVP), accède au portefeuille de codes promos partenaires. A un droit de lecture sur le Chat de groupe de ses enfants. |
| **Athlète (Autonome)** | **Vue "Participant".** (Généralement 14 ans+). Voit son propre calendrier, participe au Chat de son groupe, consulte sa progression dans l'Académie. |

---

## 3. Structure de Navigation (Sitemap)

L'application utilise une barre de navigation inférieure (Bottom Nav) persistante à 5 onglets pour un accès rapide sur mobile.

### Onglet 1 : Accueil (Dashboard)

* **Profile Switcher :** Menu déroulant situé en haut à gauche permettant de basculer instantanément entre les vues "Moi" (Parent) et celles de chaque "Enfant" lié au compte.
* **Carte "Prochaine Sortie" :** Affiche l'événement le plus proche pour le profil actif. Inclut le statut du staff pour la séance (ex: "Lead : Coach Steve"). Boutons d'action rapide [Présent] / [Absent].
* **Fil d'Actualité :**
* Annonces importantes du club (épinglées en haut. EX: Corvé de sentié, sortie Extra fin de semaine, compétition MTB EVO...).
* **Insertion Partenaires :** Des cartes promotionnelles "Commanditaire" sont insérées nativement dans le flux d'actualité (ex: offre spéciale, mise en avant d'un partenaire).



### Onglet 2 : Calendrier (Agenda)

* **Vue Liste Chronologique :** Affichage clair des événements à venir.
* **Logique Staff Dynamique :** Pour chaque événement, l'application interroge une vue SQL (`v_event_staffing`) pour afficher les coachs spécifiquement assignés à cette séance (incluant les remplaçants éventuels).

### Onglet 3 : Académie & Progression

* **Bibliothèque Vidéo (LMS) :** Accès à des capsules techniques pédagogiques, filtrées automatiquement selon le niveau du groupe de l'athlète.
* **Évaluations :** Section permettant aux parents et athlètes de consulter les bulletins d'évaluation technique remplis par les coachs, ainsi que les recommandations de re-classement.

### Onglet 4 : Équipe (Chat)

* **Canaux de Groupe :** Un canal de discussion unique et persistant par groupe d'entraînement (ex: "Atome B").
* **Accès Permanent :** Les coachs conservent l'accès au canal de leur groupe principal même lorsqu'ils ne sont pas assignés à une séance spécifique, assurant une continuité dans le suivi.

### Onglet 5 : Profil (Réglages)

* **Gestion Familiale :** Outil pour lier un nouveau profil d'enfant via un **"Code de Réclamation"** unique, ou pour inviter un enfant à devenir autonome.
* **Portefeuille Membre :** Carte de membre virtuelle et accès centralisé aux codes rabais et offres exclusives des partenaires du club.
* **Lien Admin :** Redirection sécurisée vers Odoo pour le paiement de la saison ou la mise à jour des informations administratives.

---

## 4. Modèle de Données (Supabase - PostgreSQL)

Le schéma relationnel est conçu pour offrir une flexibilité maximale dans la gestion des membres et des opérations terrain.

### A. Identité & Famille

* **`profiles`** : Table miroir des membres Odoo, contenant l'identité unique et un `claim_code` pour l'activation initiale.
* **`user_profile_access`** : Table de liaison gérant les relations complexes entre comptes utilisateurs (Auth) et profils membres (Multi-parents, tuteurs).

### B. Groupes & Staff (Logique de Rotation)

* **`groups`** : Définit les groupes d'entraînement, incluant un `chat_channel_id` unique pour le canal de discussion.
* **`group_staff` (Règle)** : Définit l'équipe d'encadrement par défaut d'un groupe.
* **`event_staff` (Exception)** : Permet de surcharger le staff pour un événement spécifique (remplacement, ajout d'assistant).
* **`v_event_staffing` (Vue SQL)** : Vue combinant la règle et l'exception pour déterminer dynamiquement le staff actif pour chaque événement.

### C. Opérations Terrain

* **`events`** : Détails des séances (Titre, Date, Heure, Lieu).
* **`attendance`** : Suivi des présences individuelles par événement.
* **`evaluations`** : Historique des évaluations techniques.
* `details` (JSONB) : Stockage flexible des réponses au questionnaire d'évaluation.
* `recommended_level` : Niveau suggéré par le coach pour un re-classement.



### D. Communication & Marketing

* **`announcements`** : Gestion des nouvelles et messages officiels du club.
* **`partners`** : Base de données des commanditaires (Logos, liens, codes promos, niveau de visibilité).

---

## 5. UX/UI : Design System

* **Identité Visuelle :**
* **Couleur Primaire :** Orange Club (ex: `#FF6600` ou équivalent, basé sur le logo). Utilisé pour les boutons d'action, les éléments actifs et les accents.
* **Fond & Neutres :** Blanc et Gris pâle (`slate-50`) pour une interface épurée et lisible. Noir pour le texte principal.
* **Typographie :** Police moderne et sans-serif (ex: Inter) pour une lisibilité optimale sur mobile.


* **Composants Clés (Basés sur Shadcn/UI) :**
* **Profile Switcher Intuitif :** Composant dropdown facile d'accès dans le header.
* **Badges de Rôle :**Indication visuelle claire (ex: badge orange pour "LEAD", gris pour "ASSISTANT") sur les cartes d'événements.
* **Cartes Partenaires :** Design distinct pour les insertions publicitaires dans le flux, respectant l'esthétique globale tout en étant reconnaissables.
* **Skeleton Loading :** Utilisation de squelettes de chargement pour améliorer la perception de performance.