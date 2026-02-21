"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Bike, Loader2 } from "lucide-react";

/**
 * Page de callback OAuth
 * Reçoit le hash fragment avec les tokens d'authentification,
 * établit la session et lie le profil avant de rediriger.
 */
export default function AuthCallbackPage() {
  const hasChecked = useRef(false);

  useEffect(() => {
    const handleAuth = async () => {
      if (hasChecked.current) return;
      hasChecked.current = true;

      try {
        // Obtenir la session (gère le fragment d'URL automatiquement)
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          console.error("[Auth Callback] Session error:", sessionError);
          window.location.href = "/login";
          return;
        }

        const userId = session.user.id;
        const email = session.user.email;

        // Vérifier si l'utilisateur a déjà un accès profil
        const { data: accessData } = await supabase
          .from("user_profile_access")
          .select("id")
          .eq("user_id", userId)
          .limit(1);

        if (accessData && accessData.length > 0) {
          window.location.href = "/dashboard";
          return;
        }

        // Pas d'accès direct, chercher un profil par email
        if (email) {
          const { data: profileDataRaw } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", email)
            .eq("is_active", true)
            .limit(1);

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const profileData = profileDataRaw as any[] | null;

          if (profileData && profileData.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: linkError } = await (supabase as any)
              .from("user_profile_access")
              .insert({
                user_id: userId,
                profile_id: profileData[0].id,
                relation: "self",
              });

            if (!linkError) {
              window.location.href = "/dashboard";
              return;
            }
            console.error("[Auth Callback] Link error:", linkError);
          }
        }

        // Aucun profil trouvé
        window.location.href = "/not-registered";
      } catch (err) {
        console.error("[Auth Callback] Unexpected error:", err);
        window.location.href = "/login";
      }
    };

    handleAuth();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <Bike className="h-12 w-12 text-club-orange animate-pulse" />
        <Loader2 className="h-8 w-8 animate-spin text-club-orange" />
        <p className="text-muted-foreground">Connexion en cours...</p>
      </div>
    </div>
  );
}

