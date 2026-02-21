"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Bike, Loader2 } from "lucide-react";

/**
 * Page de callback OAuth
 * Reçoit le hash fragment avec les tokens d'authentification
 * et établit la session avant de rediriger.
 */
export default function AuthCallbackPage() {
  const [status, setStatus] = useState("Connexion en cours...");
  const hasChecked = useRef(false);

  useEffect(() => {
    const handleAuth = async () => {
      if (hasChecked.current) return;
      
      try {
        // Obtenir la session (gère le fragment d'URL automatiquement)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
          console.error("[Auth Callback] Session error:", sessionError);
          setStatus("Erreur de session, retour au login...");
          setTimeout(() => window.location.href = "/login", 1500);
          return;
        }

        hasChecked.current = true;
        const userId = session.user.id;
        const email = session.user.email;

        setStatus("Vérification du profil...");

        // 1. Vérifier si l'utilisateur a déjà un accès profil
        const { data: accessData } = await supabase
          .from("user_profile_access")
          .select("id")
          .eq("user_id", userId)
          .limit(1);

        if (accessData && accessData.length > 0) {
          setStatus("Profil trouvé, redirection...");
          window.location.href = "/dashboard";
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
              window.location.href = "/dashboard";
              return;
            }
            console.error("[Auth Callback] Link error:", linkError);
          }
        }

        // 3. Aucun profil trouvé
        setStatus("Aucun profil actif trouvé...");
        setTimeout(() => window.location.href = "/not-registered", 500);

      } catch (err) {
        console.error("[Auth Callback] Unexpected error:", err);
        setStatus("Une erreur est survenue...");
        setTimeout(() => window.location.href = "/login", 2000);
      }
    };

    handleAuth();
  }, []);

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

