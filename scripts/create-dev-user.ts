/**
 * Script pour créer un utilisateur de développement local
 * À exécuter avec: node --import tsx scripts/create-dev-user.ts
 * OU PLUS SIMPLE: Ouvrir http://127.0.0.1:54323 et créer via l'interface
 */

import { createClient } from '@supabase/supabase-js';

// Service role key pour l'admin (dev local uniquement)
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createDevUser() {
  console.log('🔧 Création d\'un utilisateur de développement...');
  console.log('   Email: admin@ccljeunesse.local');
  console.log('   Password: TestAdmin123!');
  
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'admin@ccljeunesse.local',
    password: 'TestAdmin123!',
    email_confirm: true,
    user_metadata: {
      name: 'Admin CCL'
    }
  });

  if (error) {
    console.error('❌ Erreur:', error.message);
    // Si l'utilisateur existe déjà, ce n'est pas grave
    if (error.message.includes('already')) {
      console.log('ℹ️  L\'utilisateur existe déjà, vous pouvez vous connecter.');
      return;
    }
    return;
  }

  if (!data.user) {
    console.error('❌ Aucun utilisateur créé');
    return;
  }

  console.log('✅ Utilisateur créé avec succès!');
  console.log('   User ID:', data.user.id);

  // Lier au profil Jonathan Poulin
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', 'poulin.jon@gmail.com')
    .single();

  if (profile) {
    const { error: linkError } = await supabase
      .from('user_profile_access')
      .insert({
        user_id: data.user.id,
        profile_id: profile.id,
        relation: 'self'
      });

    if (linkError && !linkError.message.includes('duplicate')) {
      console.warn('⚠️  Impossible de lier au profil:', linkError.message);
    } else {
      console.log('✅ Profil lié avec succès!');
    }
  }

  console.log('\n📝 Vous pouvez maintenant vous connecter avec:');
  console.log('   Email: admin@ccljeunesse.local');
  console.log('   Password: TestAdmin123!');
  console.log('\n🌐 Ouvrir: http://localhost:3001/login');
}

createDevUser().catch(console.error);
