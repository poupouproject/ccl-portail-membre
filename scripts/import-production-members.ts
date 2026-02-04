/**
 * Script d'import des membres Wild Apricot EN PRODUCTION
 * 
 * Usage: 
 *   Set env vars first:
 *   $env:SUPABASE_URL="https://crpldwwjvgireqzkfwkc.supabase.co"
 *   $env:SUPABASE_SERVICE_KEY="your-service-role-key"
 *   
 *   Then run:
 *   npx ts-node --esm scripts/import-production-members.ts
 * 
 * Ce script lit les fichiers CSV des membres Wild Apricot et les importe
 * dans la base de données Supabase de PRODUCTION.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Configuration Supabase Production
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ ERREUR: Variables d\'environnement manquantes');
  console.error('   SUPABASE_URL et SUPABASE_SERVICE_KEY doivent être définies');
  console.error('\nExemple:');
  console.error('  $env:SUPABASE_URL="https://xxxxx.supabase.co"');
  console.error('  $env:SUPABASE_SERVICE_KEY="eyJhbG..."');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Mapping des niveaux de compétence
const SKILL_LEVEL_MAP: Record<string, string> = {
  'Débutant : je roule à l\'occasion en sentiers avec mes amis et ma famille': 'Débutant',
  'Intermédiaire : je roule chaque semaine et je cherche à progresser et comprendre mes erreurs': 'Intermédiaire',
  'Avancé : je souhaite être plus rapide et améliorer mes trajectoires dans des sentiers techniques': 'Avancé',
};

// Group IDs (from production)
const GROUP_IDS = {
  DEBUTANT_LUNDI: 'b0000000-0000-0000-0000-000000000001',
  DEBUTANT_MERCREDI: 'b0000000-0000-0000-0000-000000000002',
  INTERMEDIAIRE_LUNDI: 'b0000000-0000-0000-0000-000000000003',
  INTERMEDIAIRE_MERCREDI: 'b0000000-0000-0000-0000-000000000004',
  PERFORMANCE_A: 'b0000000-0000-0000-0000-000000000005',
  PERFORMANCE_B: 'b0000000-0000-0000-0000-000000000006',
};

interface CSVMember {
  'Member ID': string;
  'Prénom': string;
  'Nom': string;
  'Courriel': string;
  'Téléphone': string;
  'Cellulaire': string;
  'Address': string;
  'Ville': string;
  'Code Postal': string;
  'Nom du parent': string;
  'Année de naissance (enfant)': string;
  'No. Assurance Maladie': string;
  'Allergie et condition médicale particulière': string;
  'Membership level': string;
  'Membership status': string;
  'Quel est votre objectif principal pour la saison 2026?': string;
  'Depuis combien d\'années pratiquez-vous le vélo de montagne (sur sentiers)?': string;
  'Quel est votre niveau actuel en vélo de montagne?': string;
  'Quel sera le diamètre des roues de votre vélo?': string;
  'Permettez-vous que des photos de votre enfant apparaissent dans nos médias sociaux du club ?': string;
  'Informations complémentaires :': string;
}

function parseCSV(content: string): CSVMember[] {
  const lines = content.split('\n');
  const headers = parseCSVLine(lines[0]);
  const members: CSVMember[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Sauter les lignes vides
    if (!lines[i] || !lines[i].trim()) continue;
    
    // Extraire la première colonne (Member ID)
    const firstCommaIndex = lines[i].indexOf(',');
    const memberId = firstCommaIndex > 0 ? lines[i].substring(0, firstCommaIndex).trim() : '';
    
    // Valider que c'est un ID numérique (vrai membre)
    if (!memberId || !/^\d+$/.test(memberId)) {
      continue; // Sauter les lignes de données/notes qui ne sont pas des membres
    }
    
    const values = parseCSVLine(lines[i]);
    const member: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      member[header] = values[index] || '';
    });
    
    members.push(member as unknown as CSVMember);
  }

  return members;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function getSkillLevel(rawSkillLevel: string): string {
  return SKILL_LEVEL_MAP[rawSkillLevel] || rawSkillLevel || 'Débutant';
}

function getMembershipStatus(status: string): 'active' | 'lapsed' | 'pending' | 'archived' {
  const normalized = status.toLowerCase();
  if (normalized === 'active') return 'active';
  if (normalized === 'lapsed') return 'lapsed';
  if (normalized === 'pending') return 'pending';
  return 'archived';
}

function getPhotoPermission(value: string): boolean {
  return value.toLowerCase().includes('oui') || value.toLowerCase() === 'yes';
}

function assignToGroup(membershipLevel: string, skillLevel: string): string {
  const is2x = membershipLevel.toLowerCase().includes('2x');
  const normalizedSkill = skillLevel.toLowerCase();
  
  if (is2x) {
    // Groupes intensifs
    if (normalizedSkill.includes('avancé')) {
      return GROUP_IDS.PERFORMANCE_A;
    }
    return GROUP_IDS.PERFORMANCE_B;
  } else {
    // Groupes récréatifs
    if (normalizedSkill.includes('intermédiaire') || normalizedSkill.includes('avancé')) {
      return GROUP_IDS.INTERMEDIAIRE_LUNDI;
    }
    return GROUP_IDS.DEBUTANT_LUNDI;
  }
}

async function importMembers() {
  console.log('🚴 Démarrage de l\'import des membres Wild Apricot en PRODUCTION...\n');
  console.log(`📡 Connexion à: ${SUPABASE_URL}\n`);

  // Chemins vers les fichiers CSV
  const csv1xPath = 'c:\\Users\\pouli\\OneDrive\\Documents\\CCL\\CCL - Finances\\2026\\2026-01-26 Members CCL Montagne 1x.csv';
  const csv2xPath = 'c:\\Users\\pouli\\OneDrive\\Documents\\CCL\\CCL - Finances\\2026\\2026-01-26 Members CCL Montagne 2x.csv';

  let members1x: CSVMember[] = [];
  let members2x: CSVMember[] = [];

  try {
    if (fs.existsSync(csv1xPath)) {
      const content = fs.readFileSync(csv1xPath, 'utf-8');
      members1x = parseCSV(content);
      console.log(`📄 Fichier 1x/sem: ${members1x.length} membres trouvés`);
    } else {
      console.error(`❌ Fichier non trouvé: ${csv1xPath}`);
    }
  } catch (err) {
    console.error('Erreur lecture fichier 1x:', err);
  }

  try {
    if (fs.existsSync(csv2xPath)) {
      const content = fs.readFileSync(csv2xPath, 'utf-8');
      members2x = parseCSV(content);
      console.log(`📄 Fichier 2x/sem: ${members2x.length} membres trouvés`);
    } else {
      console.error(`❌ Fichier non trouvé: ${csv2xPath}`);
    }
  } catch (err) {
    console.error('Erreur lecture fichier 2x:', err);
  }

  const allMembers = [...members1x, ...members2x];
  console.log(`\n📊 Total: ${allMembers.length} membres à importer\n`);

  if (allMembers.length === 0) {
    console.error('❌ Aucun membre à importer. Vérifiez les fichiers CSV.');
    process.exit(1);
  }

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const member of allMembers) {
    const memberId = member['Member ID'];
    if (!memberId) {
      skipped++;
      continue;
    }

    const skillLevel = getSkillLevel(member['Quel est votre niveau actuel en vélo de montagne?']);
    const membershipLevel = member['Membership level'] || 'Jeunesse Montagne 1x/sem';

    try {
      // Upsert dans wild_apricot_members
      const { error: waError } = await supabase
        .from('wild_apricot_members')
        .upsert({
          wa_member_id: memberId,
          first_name: member['Prénom'] || 'Inconnu',
          last_name: member['Nom'] || 'Inconnu',
          email: member['Courriel'] || null,
          phone: member['Téléphone'] || null,
          mobile: member['Cellulaire'] || null,
          address: member['Address'] || null,
          city: member['Ville'] || null,
          postal_code: member['Code Postal'] || null,
          parent_name: member['Nom du parent'] || null,
          birth_year: member['Année de naissance (enfant)'] ? parseInt(member['Année de naissance (enfant)']) : null,
          health_insurance_number: member['No. Assurance Maladie'] || null,
          allergies_medical: member['Allergie et condition médicale particulière'] || null,
          membership_level: membershipLevel,
          membership_status: getMembershipStatus(member['Membership status']),
          objective: member['Quel est votre objectif principal pour la saison 2026?'] || null,
          experience_years: member['Depuis combien d\'années pratiquez-vous le vélo de montagne (sur sentiers)?'] || null,
          skill_level: skillLevel,
          wheel_size: member['Quel sera le diamètre des roues de votre vélo?'] || null,
          photo_permission: getPhotoPermission(member['Permettez-vous que des photos de votre enfant apparaissent dans nos médias sociaux du club ?']),
          additional_info: member['Informations complémentaires :'] || null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'wa_member_id'
        });

      if (waError) {
        console.error(`❌ Erreur WA pour ${memberId}:`, waError.message);
        errors++;
        continue;
      }

      // Créer/Mettre à jour le profil
      const birthYearStr = member['Année de naissance (enfant)'];
      let birthYear: number | null = null;
      
      // Valider que c'est une année valide (1900-2030)
      if (birthYearStr) {
        const parsed = parseInt(birthYearStr);
        if (!isNaN(parsed) && parsed >= 1900 && parsed <= 2030) {
          birthYear = parsed;
        }
      }
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .upsert({
          wa_member_id: memberId,
          first_name: member['Prénom'] || 'Inconnu',
          last_name: member['Nom'] || 'Inconnu',
          email: member['Courriel'] || null,
          phone: member['Cellulaire'] || member['Téléphone'] || null,
          role: 'athlete',
          address_line1: member['Address'] || null,
          address_city: member['Ville'] || null,
          address_postal_code: member['Code Postal'] || null,
          birth_date: birthYear ? `${birthYear}-06-15` : null,
          medical_notes: member['Allergie et condition médicale particulière'] || null,
          photo_permission: getPhotoPermission(member['Permettez-vous que des photos de votre enfant apparaissent dans nos médias sociaux du club ?']),
          is_active: true,
          claim_code: `CCL-${memberId}`,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'wa_member_id'
        })
        .select('id')
        .single();

      if (profileError) {
        console.error(`❌ Erreur profil pour ${memberId}:`, profileError.message);
        errors++;
        continue;
      }

      // Lier le profil au WA member
      if (profileData) {
        await supabase
          .from('wild_apricot_members')
          .update({ profile_id: profileData.id })
          .eq('wa_member_id', memberId);

        // NOTE: On n'assigne PAS les membres aux groupes automatiquement
        // Le coach en chef va créer les groupes et assigner les membres
        // basé sur ses connaissances, l'âge de l'enfant, etc.
      }

      imported++;
      if (imported % 10 === 0) {
        console.log(`⏳ ${imported} membres importés...`);
      }

    } catch (err) {
      console.error(`❌ Exception pour ${memberId}:`, err);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 Résumé de l'import:`);
  console.log(`   ✅ Importés: ${imported}`);
  console.log(`   ⏭️  Ignorés: ${skipped}`);
  console.log(`   ❌ Erreurs: ${errors}`);
  console.log('='.repeat(50));
}

// Exécution
importMembers().catch(console.error);
