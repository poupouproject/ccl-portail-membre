"use client";

import { supabase } from "@/lib/supabase";
import { Provider } from "@supabase/supabase-js";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bike } from "lucide-react";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDevLogin, setShowDevLogin] = useState(false);

  const handleLogin = async (provider: Provider) => {
    const redirectUrl = `${window.location.origin}/auth/callback`;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      console.error("[Auth] OAuth error:", error);
      alert(`Erreur d'authentification: ${error.message}`);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("[Auth] Email login error:", error);
        alert(`Erreur: ${error.message}`);
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err) {
      console.error("[Auth] Unexpected error:", err);
      alert("Erreur inattendue lors de la connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl border shadow-lg">
        <Link
          href="/"
          className="mb-6 text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2 text-sm"
        >
          ← Retour à l&apos;accueil
        </Link>

        <div className="flex items-center justify-center gap-2 mb-2">
          <Bike className="h-8 w-8 text-club-orange" />
        </div>
        <h1 className="text-2xl font-bold text-center mb-2">CCL Jeunesse</h1>
        <p className="text-muted-foreground text-center mb-8 text-sm">
          Connectez-vous pour accéder au portail
        </p>

        {/* MODE DEV - Email/Password */}
        {showDevLogin ? (
          <>
            <form onSubmit={handleEmailLogin} className="space-y-4 mb-4">
              <div>
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <Input
                  type="password"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-club-orange hover:bg-club-orange/90"
                disabled={loading}
              >
                {loading ? "Connexion..." : "Se connecter"}
              </Button>
            </form>
            
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-slate-500">ou</span>
              </div>
            </div>

            <Button
              onClick={() => setShowDevLogin(false)}
              variant="ghost"
              className="w-full text-sm text-muted-foreground"
            >
              Utiliser OAuth (production)
            </Button>
          </>
        ) : (
          <>
            {/* BOUTON GOOGLE */}
            <Button
              onClick={() => handleLogin("google")}
              variant="outline"
              className="w-full py-6 mb-3 font-semibold"
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continuer avec Google
            </Button>

            {/* BOUTON GITHUB */}
            <Button
              onClick={() => handleLogin("github")}
              className="w-full py-6 mb-3 bg-[#24292e] hover:bg-[#2f363d] text-white font-semibold"
            >
              <svg
                className="h-5 w-5 mr-2"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
              Continuer avec GitHub
            </Button>

            {/* BOUTON MICROSOFT */}
            <Button
              onClick={() => handleLogin("azure")}
              variant="outline"
              className="w-full py-6 mb-6 font-semibold"
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 23 23" aria-hidden="true">
                <path fill="#f35325" d="M1 1h10v10H1z" />
                <path fill="#81bc06" d="M12 1h10v10H12z" />
                <path fill="#05a6f0" d="M1 12h10v10H1z" />
                <path fill="#ffba08" d="M12 12h10v10H12z" />
              </svg>
              Continuer avec Microsoft
            </Button>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-slate-500">Mode développement</span>
              </div>
            </div>

            <Button
              onClick={() => setShowDevLogin(true)}
              variant="ghost"
              className="w-full text-sm text-muted-foreground"
            >
              Connexion par email (dev local)
            </Button>
          </>
        )}

        <p className="text-muted-foreground text-center text-xs mt-6">
          En vous connectant, vous acceptez les conditions d&apos;utilisation
        </p>
      </div>
    </div>
  );
}
