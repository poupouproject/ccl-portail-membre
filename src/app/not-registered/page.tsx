"use client";

import { useEffect, useState } from "react";
import { Bike, Mail, CreditCard, Phone, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

/**
 * Page affichée quand un utilisateur se connecte mais n'a pas de profil
 * dans la base de données (pas encore inscrit au club).
 */
export default function NotRegisteredPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-orange-100 p-4">
              <Bike className="h-12 w-12 text-club-orange" />
            </div>
          </div>
          <CardTitle className="text-2xl">Vous n&apos;êtes pas encore inscrit</CardTitle>
          <CardDescription className="mt-2">
            {userEmail && (
              <span className="block text-sm text-muted-foreground mb-2">
                Connecté avec : <strong>{userEmail}</strong>
              </span>
            )}
            Nous n&apos;avons pas trouvé de profil membre associé à votre compte.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800">
              Pour accéder au portail membre, vous devez d&apos;abord être inscrit au 
              volet jeunesse du Club Cycliste de Lévis.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Comment s&apos;inscrire ?
            </h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-club-orange/10 p-2">
                  <CreditCard className="h-4 w-4 text-club-orange" />
                </div>
                <div>
                  <p className="font-medium text-sm">Payer votre abonnement</p>
                  <p className="text-xs text-muted-foreground">
                    Inscrivez-vous via notre site web officiel et complétez le paiement.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-full bg-club-orange/10 p-2">
                  <Mail className="h-4 w-4 text-club-orange" />
                </div>
                <div>
                  <p className="font-medium text-sm">Confirmer votre courriel</p>
                  <p className="text-xs text-muted-foreground">
                    Utilisez le même courriel ({userEmail || "votre courriel"}) lors de l&apos;inscription.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-full bg-club-orange/10 p-2">
                  <Phone className="h-4 w-4 text-club-orange" />
                </div>
                <div>
                  <p className="font-medium text-sm">Contacter le club</p>
                  <p className="text-xs text-muted-foreground">
                    Si vous êtes déjà inscrit, contactez-nous pour associer votre compte.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <Button asChild className="w-full bg-club-orange hover:bg-club-orange/90">
              <a href="https://clubcyclistelevis.com" target="_blank" rel="noopener noreferrer">
                Visiter le site du club
              </a>
            </Button>
            
            <Button variant="outline" onClick={handleLogout} className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Se déconnecter
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Si vous avez déjà payé votre inscription, votre profil sera activé 
            sous peu. Réessayez de vous connecter plus tard.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
