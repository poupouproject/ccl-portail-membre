"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Bike, Loader2 } from "lucide-react";

/**
 * Page de callback OAuth
 * Reçoit le hash fragment avec les tokens d'authentification
 * et établit la session avant de rediriger.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Connexion en cours...");
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Écouter les changements d'auth pour capturer la session OAuth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Ne traiter qu'une seule fois
        if (hasProcessed.current) return;
        
        // Ignorer les événements non pertinents
        if (event !== "SIGNED_IN" && event !== "INITIAL_SESSION") return;
        
        if (!session) {
          // Pas de session, attendre un peu plus
          return;
        }

        hasProcessed.current = true;
        const userId = session.user.id;
        const email = session.user.email;

        setStatus("Vérification du profil...");

        try {
          // 1. Vérifier si l'utilisateur a déjà un accès profil
          const { data: accessData } = await supabase
            .from("user_profile_access")
            .select("id")
            .eq("user_id", userId)
            .limit(1);

          if (accessData && accessData.length > 0) {
            setStatus("Profil trouvé, redirection...");
            router.replace("/dashboard");
            return;
          }

          // 2. Pas d'accès direct, chercher un profil par email
          if (email) {
            const { data: profileDataRaw } = await supabase
              .from("profiles")
              .select("id")
              .eq("email", email)
              .eq("is_active", true)
              .limit(1);

            const profileData = profileDataRaw as any[] | null;

            if (profileData && profileData.length > 0) {
              // Profil trouvé par email, créer le lien user_profile_access
              const { error: linkError } = await (supabase as any)
                .from("user_profile_access")
                .insert({
                  user_id: userId,
                  profile_id: profileData[0].id,
                  relation: "self",
                });

              if (!linkError) {
                setStatus("Profil associé, redirection...");
                router.replace("/dashboard");
                return;
              }
              console.error("[Auth Callback] Link error:", linkError);
            }
          }

          // 3. Aucun profil trouvé
          setStatus("Aucun profil actif trouvé...");
          setTimeout(() => router.replace("/not-registered"), 500);
          
        } catch (err) {
          console.error("[Auth Callback] Error:", err);
          setStatus("Une erreur est survenue...");
          setTimeout(() => router.replace("/login"), 2000);
        }
      }
    );

    // Fallback: si aucun événement après 5 secondes, vérifier manuellement
    const timeout = setTimeout(async () => {
      if (hasProcessed.current) return;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatus("Session expirée, retour au login...");
        router.replace("/login");
      }
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <Bike className="h-12 w-12 text-club-orange animate-pulse" />
        <Loader2 className="h-8 w-8 animate-spin text-club-orange" />
        <p className="text-muted-foreground">{status}</p>
      </div>
    </div>
  );
}

