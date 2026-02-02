# Import des membres Wild Apricot en Production

## Prérequis

1. Obtenir la **Service Role Key** de votre projet Supabase en production:
   - Aller sur https://supabase.com/dashboard
   - Sélectionner le projet "Portail Membre"
   - Aller dans **Settings** > **API**
   - Copier la clé `service_role` (⚠️ Ne JAMAIS partager publiquement!)

2. L'URL du projet est: `https://crpldwwjvgireqzkfwkc.supabase.co`

## Exécution

### Étape 1: Définir les variables d'environnement

```powershell
$env:SUPABASE_URL="https://crpldwwjvgireqzkfwkc.supabase.co"
$env:SUPABASE_SERVICE_KEY="YOUR_SERVICE_ROLE_KEY_HERE"
```

### Étape 2: Exécuter le script d'import

```powershell
cd "c:\Users\pouli\.vscode\repo\ccl-portail-membre"
npx ts-node --esm scripts/import-production-members.ts
```

## Ce que fait le script

1. Lit les fichiers CSV depuis:
   - `c:\Users\pouli\OneDrive\Documents\CCL\CCL - Finances\2026\2026-01-26 Members CCL Montagne 1x.csv`
   - `c:\Users\pouli\OneDrive\Documents\CCL\CCL - Finances\2026\2026-01-26 Members CCL Montagne 2x.csv`

2. Pour chaque membre:
   - Crée/met à jour l'entrée dans `wild_apricot_members`
   - Crée/met à jour le profil dans `profiles`
   - Assigne automatiquement au bon groupe selon:
     - **1x/semaine (Récréatif)**:
       - Débutants → Débutants Lundi
       - Intermédiaires/Avancés → Intermédiaires Lundi
     - **2x/semaine (Intensif)**:
       - Avancés → Performance A
       - Débutants/Intermédiaires → Performance B

## Vérification

Attendez-vous à voir environ:
- **52 membres** avec abonnement 1x/semaine
- **27 membres** avec abonnement 2x/semaine
- **Total: 79 membres**

## Sécurité

⚠️ **IMPORTANT**: 
- Ne commitez JAMAIS la Service Role Key dans Git
- Effacez les variables d'environnement après utilisation:
  ```powershell
  Remove-Item Env:SUPABASE_SERVICE_KEY
  ```
