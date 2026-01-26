"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Bike, Loader2 } from "lucide-react";

/**
 * Page de callback OAuth
 * Reçoit le hash fragment avec les tokens d'authentification
 * et établit la session avant de rediriger vers le dashboard.
 */
export default function AuthCallbackPage() {
  const [status, setStatus] = useState("Connexion en cours...");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[Auth Callback] Auth state change:", event, !!session);

        if (event === "SIGNED_IN" && session) {
          setStatus("Session établie, redirection...");
          // Petit délai pour s'assurer que les cookies sont définis
          await new Promise((resolve) => setTimeout(resolve, 200));
          // Rechargement complet pour que le serveur voie les nouveaux cookies
          window.location.href = "/dashboard";
        } else if (event === "TOKEN_REFRESHED" && session) {
          window.location.href = "/dashboard";
        } else if (event === "SIGNED_OUT") {
          setStatus("Déconnecté, redirection...");
          window.location.href = "/login";
        }
      }
    );

    // Vérifier si une session existe déjà
    const checkExistingSession = async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const { data: { session } } = await supabase.auth.getSession();
      console.log("[Auth Callback] Existing session check:", !!session);

      if (session) {
        setStatus("Session trouvée, redirection...");
        window.location.href = "/dashboard";
      } else if (!window.location.hash.includes("access_token")) {
        setStatus("Aucune session, retour au login...");
        setTimeout(() => {
          window.location.href = "/login";
        }, 1000);
      }
    };

    checkExistingSession();

    return () => {
      subscription.unsubscribe();
    };
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
