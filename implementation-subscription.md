# Guide d'implémentation : Multi-abonnements

## Contexte

Ce guide explique comment implémenter le système de multi-abonnements pour résoudre le problème actuel où :
- Un utilisateur ne peut avoir qu'un seul abonnement à la fois
- Les parents qui veulent aussi participer comme adultes doivent créer un autre compte
- Les adultes ne peuvent pas être inscrits à la fois en route ET en montagnes

## Le nouveau modèle

### Avant (problématique)
```
Compte → Profil → Groupe (1 seul)
                  └── subscription_status (sur le profil)
```

### Après (solution)
```
Compte → Profils multiples → Chaque profil peut avoir N abonnements
                              └── subscription (table séparée)
                                   ├── route
                                   ├── montagnes
                                   └── vélo enfant
```

## Cas d'usage couverts

### Cas 1 : Vous (admin + parent + participant)
```javascript
// Résultat de get_user_contexts(votre_user_id)
[
  {
    context_type: 'participant',
    profile_name: 'Votre Nom',
    subscription_type: 'route_adulte',
    group_name: 'Route Adulte',
    relation: 'self',
    staff_role: null
  },
  {
    context_type: 'participant',
    profile_name: 'Votre Nom',
    subscription_type: 'montagnes_adulte',
    group_name: 'Montagnes Adulte',
    relation: 'self',
    staff_role: null
  },
  {
    context_type: 'dependent',
    profile_name: 'Enfant 1',
    subscription_type: 'velo_enfant_2x',
    group_name: 'Vélo Enfant Récréatif',
    relation: 'parent',
    staff_role: null
  },
  {
    context_type: 'dependent',
    profile_name: 'Enfant 2',
    subscription_type: 'velo_enfant_2x',
    group_name: 'Vélo Enfant Intensif',
    relation: 'parent',
    staff_role: null
  }
]
```

### Cas 2 : Adulte route + montagnes
```javascript
[
  {
    context_type: 'participant',
    profile_name: 'Jean Dupont',
    subscription_type: 'route_adulte',
    group_name: 'Route Adulte',
    relation: 'self',
    staff_role: null
  },
  {
    context_type: 'participant',
    profile_name: 'Jean Dupont',
    subscription_type: 'montagnes_adulte',
    group_name: 'Montagnes Adulte',
    relation: 'self',
    staff_role: null
  }
]
```

### Cas 3 : Parent simple
```javascript
[
  {
    context_type: 'dependent',
    profile_name: 'Marie Tremblay',
    subscription_type: 'velo_enfant_2x',
    group_name: 'Vélo Enfant',
    relation: 'parent',
    staff_role: null
  }
]
```

### Cas 4 : Coach multi-groupes
```javascript
[
  {
    context_type: 'coach',
    profile_name: 'Pierre Gagnon',
    subscription_type: null,
    group_name: 'Vélo Enfant 2x',
    relation: 'self',
    staff_role: 'head_coach'
  },
  {
    context_type: 'coach',
    profile_name: 'Pierre Gagnon',
    subscription_type: null,
    group_name: 'Vélo Enfant Intensif',
    relation: 'self',
    staff_role: 'assistant'
  }
]
```

### Cas 5 : Coach qui participe aussi comme athlète
```javascript
[
  {
    context_type: 'coach',
    profile_name: 'Marie Côté',
    subscription_type: null,
    group_name: 'Vélo Enfant 2x',
    relation: 'self',
    staff_role: 'head_coach'
  },
  {
    context_type: 'participant',
    profile_name: 'Marie Côté',
    subscription_type: 'montagnes_adulte',
    group_name: 'Montagnes Adulte',
    relation: 'self',
    staff_role: null
  }
]
```

## Implémentation Frontend

### 1. Composant de sélection de contexte

Créer un composant `ContextSelector` dans le header :

```typescript
// components/layout/ContextSelector.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UserContext {
  context_type: string;
  profile_id: string;
  profile_name: string;
  subscription_id: string | null;
  subscription_type: string | null;
  group_id: string;
  group_name: string;
  relation: string;
  staff_role: string | null;
}

export function ContextSelector() {
  const [contexts, setContexts] = useState<UserContext[]>([]);
  const [activeContext, setActiveContext] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadContexts();
  }, []);

  async function loadContexts() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase.rpc('get_user_contexts', {
      user_uuid: user.id
    });

    if (data) {
      setContexts(data);
      // Par défaut, sélectionner le premier contexte 'self' si disponible
      const defaultContext = data.find((c: UserContext) => c.relation === 'self') || data[0];
      if (defaultContext) {
        setActiveContext(defaultContext.subscription_id);
        localStorage.setItem('active_context', defaultContext.subscription_id);
      }
    }
  }

  const handleContextChange = (subscriptionId: string) => {
    setActiveContext(subscriptionId);
    localStorage.setItem('active_context', subscriptionId);
    // Déclencher un refresh de la page ou un event global
    window.dispatchEvent(new CustomEvent('context-changed', { detail: subscriptionId }));
  };

  const getContextIcon = (type: string, relation: string, staffRole: string | null) => {
    if (type === 'coach') return '👨‍🏫';
    if (relation === 'self') return '🏅';
    if (relation === 'parent' || relation === 'guardian') return '👶';
    return '👤';
  };

  return (
    <Select value={activeContext || undefined} onValueChange={handleContextChange}>
      <SelectTrigger className="w-[280px]">
        <SelectValue placeholder="Sélectionner un contexte" />
      </SelectTrigger>
      <SelectContent>
        {contexts.map((ctx) => (
          <SelectItem key={ctx.subscription_id || `coach-${ctx.group_id}`} value={ctx.subscription_id || `coach-${ctx.group_id}`}>
            {getContextIcon(ctx.context_type, ctx.relation, ctx.staff_role)} {ctx.profile_name} — {ctx.group_name}
            {ctx.staff_role && <span className="text-xs text-muted-foreground ml-1">({ctx.staff_role})</span>}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### 2. Hook personnalisé pour accéder au contexte actif

```typescript
// hooks/useActiveContext.ts
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface ActiveContext {
  context_type: string;
  subscription_id: string | null;
  profile_id: string;
  group_id: string;
  profile_name: string;
  group_name: string;
  relation: string;
  staff_role: string | null;
}

export function useActiveContext() {
  const [context, setContext] = useState<ActiveContext | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    loadActiveContext();

    // Écouter les changements de contexte
    const handleContextChange = (e: CustomEvent) => {
      loadActiveContext();
    };

    window.addEventListener('context-changed', handleContextChange as EventListener);
    return () => {
      window.removeEventListener('context-changed', handleContextChange as EventListener);
    };
  }, []);

  async function loadActiveContext() {
    const activeContextId = localStorage.getItem('active_context');
    if (!activeContextId) {
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase.rpc('get_user_contexts', {
      user_uuid: user.id
    });

    if (data) {
      // Trouver le contexte actif (peut être une subscription ou un contexte coach)
      const active = data.find((c: any) => {
        if (c.subscription_id) {
          return c.subscription_id === activeContextId;
        } else {
          // Pour les contextes coach, on utilise 'coach-{group_id}'
          return `coach-${c.group_id}` === activeContextId;
        }
      });
      setContext(active || data[0]);
    }
    
    setLoading(false);
  }

  return { context, loading };
}
```

### 3. Modifier les requêtes du calendrier

```typescript
// app/(authenticated)/calendar/page.tsx
'use client';

import { useActiveContext } from '@/hooks/useActiveContext';

export default function CalendarPage() {
  const { context, loading } = useActiveContext();

  useEffect(() => {
    if (!context) return;

    // Charger les événements du groupe actif
    loadEvents(context.group_id);
  }, [context]);

  // ... reste du code
}
```

### 4. Adapter les vues selon le type de contexte

Les coachs et les participants ne voient pas la même chose. Voici comment adapter les composants :

```typescript
// app/(authenticated)/dashboard/page.tsx
'use client';

import { useActiveContext } from '@/hooks/useActiveContext';
import CoachDashboard from '@/components/dashboard/CoachDashboard';
import ParticipantDashboard from '@/components/dashboard/ParticipantDashboard';
import ParentDashboard from '@/components/dashboard/ParentDashboard';

export default function DashboardPage() {
  const { context, loading } = useActiveContext();

  if (loading) return <LoadingSpinner />;
  if (!context) return <NoContextSelected />;

  // Afficher la vue appropriée selon le type de contexte
  switch (context.context_type) {
    case 'coach':
      return <CoachDashboard context={context} />;
    case 'participant':
      return <ParticipantDashboard context={context} />;
    case 'dependent':
      return <ParentDashboard context={context} />;
    default:
      return <div>Type de contexte non reconnu</div>;
  }
}
```

**Vue Coach** : Prise de présences, évaluations, vue de tous les membres du groupe
**Vue Participant** : RSVP pour soi-même, progression académie, chat actif
**Vue Parent/Dépendant** : RSVP pour l'enfant, suivi académie, chat en lecture seule

### 5. Modifier les requêtes de présences

```typescript
// Pour les participants : présences liées à leur subscription
if (context.context_type === 'participant' || context.context_type === 'dependent') {
  const { data: attendance } = await supabase
    .from('attendance')
    .select('*')
    .eq('subscription_id', context.subscription_id);
}

// Pour les coachs : présences de tous les membres du groupe
if (context.context_type === 'coach') {
  const { data: attendance } = await supabase
    .from('attendance')
    .select(`
      *,
      profile:profiles(*),
      subscription:subscriptions(*)
    `)
    .eq('event.group_id', context.group_id);
}
```

## Migration des données existantes

### Étape 1 : Backup
```bash
# Dans Supabase SQL Editor
-- Créer une sauvegarde
CREATE TABLE profiles_backup AS SELECT * FROM profiles;
CREATE TABLE group_members_backup AS SELECT * FROM group_members;
```

### Étape 2 : Appliquer la migration
```bash
# Copier le contenu de migration_multi_subscriptions.sql
# Le coller dans Supabase SQL Editor
# Exécuter
```

### Étape 3 : Vérifier les données
```sql
-- Vérifier que tous les profiles ont au moins un abonnement
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  COUNT(s.id) as subscription_count
FROM profiles p
LEFT JOIN subscriptions s ON p.id = s.profile_id
WHERE p.is_active = true
GROUP BY p.id, p.first_name, p.last_name
HAVING COUNT(s.id) = 0;

-- Si des profils n'ont pas d'abonnement, il faut en créer manuellement
```

### Étape 4 : Tester avec votre compte
```sql
-- Créer vos abonnements personnels (exemple)
INSERT INTO subscriptions (profile_id, group_id, subscription_type, status, start_date)
VALUES 
  -- Vous en route
  ((SELECT id FROM profiles WHERE email = 'votre@email.com'), 
   (SELECT id FROM groups WHERE name = 'Route Adulte'),
   'route_adulte',
   'active',
   now()),
  -- Vous en montagnes
  ((SELECT id FROM profiles WHERE email = 'votre@email.com'),
   (SELECT id FROM groups WHERE name = 'Montagnes Adulte'),
   'montagnes_adulte',
   'active',
   now());
```

## Ajustements nécessaires au schéma existant

### 1. Ajouter subscription_id dans attendance
```sql
ALTER TABLE public.attendance 
ADD COLUMN subscription_id uuid REFERENCES public.subscriptions(id);

-- Migrer les données existantes (associer à la première subscription du profile)
UPDATE public.attendance a
SET subscription_id = (
  SELECT s.id 
  FROM subscriptions s 
  WHERE s.profile_id = a.profile_id 
  LIMIT 1
);
```

### 2. Modifier group_members (optionnel)
La table `group_members` peut devenir redondante. On peut soit :
- La garder pour compatibilité (recommandé au début)
- La remplacer par une vue basée sur subscriptions actifs

```sql
-- Vue pour remplacer group_members
CREATE OR REPLACE VIEW group_members_view AS
SELECT 
  s.group_id,
  s.profile_id,
  s.start_date as joined_at
FROM subscriptions s
WHERE s.status = 'active'
  AND (s.end_date IS NULL OR s.end_date > now());
```

## Checklist d'implémentation

- [ ] Appliquer la migration SQL
- [ ] Vérifier que les données existantes sont bien migrées
- [ ] Créer le composant ContextSelector
- [ ] Créer le hook useActiveContext
- [ ] Modifier les pages du dashboard pour utiliser le contexte
- [ ] Créer les vues spécifiques (CoachDashboard, ParticipantDashboard, ParentDashboard)
- [ ] Modifier les requêtes du calendrier
- [ ] Modifier les requêtes de présences (gérer coach vs participant)
- [ ] Modifier le chat (filtrer par groupe actif, permissions selon contexte)
- [ ] Ajouter subscription_id dans la table attendance
- [ ] Tester avec votre compte personnel (admin + parent + participant)
- [ ] Tester avec un compte parent simple
- [ ] Tester avec un compte adulte route + montagnes
- [ ] Tester avec un compte coach simple
- [ ] Tester avec un compte coach qui est aussi participant
- [ ] Déployer en production

## Notes importantes

1. **Compatibilité descendante** : Les anciens champs `subscription_status` etc. sur `profiles` sont gardés pour l'instant. On peut les déprécier progressivement.

2. **Performance** : La fonction `get_user_contexts` utilise des JOINs mais est optimisée avec des index. Pour de très gros clubs (1000+ membres), considérer du caching.

3. **WildApricot** : L'intégration WildApricot devra être modifiée pour créer des `subscriptions` au lieu de simplement assigner un groupe.

4. **Rôle Admin** : Le rôle Admin reste sur le `profile`, pas sur la subscription. Un admin voit tout, peu importe son contexte actif.

5. **Permissions Coach vs Participant** : 
   - En contexte **coach**, l'utilisateur peut : prendre les présences de tous, évaluer les athlètes, voir les notes médicales
   - En contexte **participant**, le même utilisateur ne peut que : gérer ses propres présences, voir sa progression
   - Les permissions sont déterminées par `context.context_type`, pas par `profile.role`

6. **Chat selon le contexte** :
   - Coach : peut écrire dans le chat du groupe (messages importants, annonces)
   - Participant : peut écrire dans le chat du groupe (discussion)
   - Parent : lecture seule du chat du groupe de l'enfant
   - Admin : accès complet peu importe le contexte