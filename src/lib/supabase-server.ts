import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database, Profile } from "@/types/database";

interface ProfileAccessRow {
  relation: string;
  profile: Profile | null;
}

/**
 * Crée un client Supabase pour les composants serveur
 * Nécessite d'être appelé dans un contexte async (Server Component ou Route Handler)
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Les cookies ne peuvent pas être définis dans certains contextes (génération statique)
          }
        },
      },
    }
  );
}

/**
 * Récupère l'utilisateur courant côté serveur
 * Plus sécurisé que getSession() car valide le token JWT
 */
export async function getServerUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Récupère le profil membre de l'utilisateur courant
 */
export async function getServerProfile() {
  const user = await getServerUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();
  
  // Récupère les profils auxquels l'utilisateur a accès
  const { data: accessData } = await supabase
    .from("user_profile_access")
    .select(`
      relation,
      profile:profiles(*)
    `)
    .eq("user_id", user.id);

  const access = accessData as unknown as ProfileAccessRow[] | null;

  if (!access || access.length === 0) return null;

  // Le profil principal est celui avec relation 'self'
  const selfAccess = access.find((a) => a.relation === "self");
  
  return {
    user,
    profile: selfAccess?.profile || access[0]?.profile,
    familyProfiles: access.map((a) => a.profile).filter(Boolean) as Profile[],
  };
}
