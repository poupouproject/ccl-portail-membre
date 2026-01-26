import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Il manque les variables d'environnement Supabase dans .env.local");
}

/**
 * Client Supabase pour le navigateur (composants client)
 * Gère automatiquement les cookies pour la synchronisation client/serveur
 */
export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseKey);
