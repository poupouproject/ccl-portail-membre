"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User,
  Users,
  CreditCard,
  Gift,
  ExternalLink,
  Plus,
  LogOut,
  Phone,
  AlertCircle,
} from "lucide-react";
import { getInitials } from "@/lib/utils";
import type { Partner } from "@/types/database";
import { useEffect } from "react";

export default function ProfilePage() {
  const { user, activeProfile, profiles, isLoading: profileLoading } = useProfile();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [claimCode, setClaimCode] = useState("");
  const [isClaimingProfile, setIsClaimingProfile] = useState(false);

  useEffect(() => {
    async function fetchPartners() {
      const { data } = await supabase
        .from("partners")
        .select("*")
        .eq("is_active", true)
        .not("promo_code", "is", null)
        .order("tier");

      if (data) {
        setPartners(data);
      }
    }

    fetchPartners();
  }, []);

  const handleClaimProfile = async () => {
    if (!claimCode.trim() || !user) return;

    setIsClaimingProfile(true);

    try {
      // Chercher le profil avec ce code
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("claim_code", claimCode.toUpperCase())
        .single();

      if (profileError || !profile) {
        toast({
          title: "Code invalide",
          description: "Ce code de réclamation n'existe pas ou a déjà été utilisé.",
          variant: "destructive",
        });
        return;
      }

      // Créer le lien d'accès
      const { error: accessError } = await supabase.from("user_profile_access").insert({
        user_id: user.id,
        profile_id: profile.id,
        relation: "parent", // Par défaut, on assume que c'est un parent qui réclame
      });

      if (accessError) {
        toast({
          title: "Erreur",
          description: "Impossible de lier ce profil à votre compte.",
          variant: "destructive",
        });
        return;
      }

      // Supprimer le code de réclamation (utilisé une seule fois)
      await supabase
        .from("profiles")
        .update({ claim_code: null })
        .eq("id", profile.id);

      toast({
        title: "Profil ajouté!",
        description: `Le profil de ${profile.first_name} a été lié à votre compte.`,
      });

      setClaimCode("");
      // Recharger la page pour voir le nouveau profil
      window.location.reload();
    } catch (error) {
      console.error("Erreur lors de la réclamation:", error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setIsClaimingProfile(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (profileLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Profil</h1>

      {/* Carte de profil */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={activeProfile?.avatar_url || undefined} />
              <AvatarFallback className="text-xl">
                {activeProfile
                  ? getInitials(activeProfile.first_name, activeProfile.last_name)
                  : "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>
                {activeProfile?.first_name} {activeProfile?.last_name}
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Badge variant="outline">{activeProfile?.role}</Badge>
                {activeProfile?.email && (
                  <span className="text-xs">{activeProfile.email}</span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Informations d'urgence */}
          {activeProfile?.emergency_contact_name && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-red-700 flex items-center gap-1 mb-2">
                <AlertCircle className="h-3 w-3" />
                CONTACT D&apos;URGENCE
              </h4>
              <div className="flex items-center justify-between">
                <span className="text-sm">{activeProfile.emergency_contact_name}</span>
                {activeProfile.emergency_contact_phone && (
                  <a
                    href={`tel:${activeProfile.emergency_contact_phone}`}
                    className="flex items-center gap-1 text-sm text-red-600"
                  >
                    <Phone className="h-4 w-4" />
                    {activeProfile.emergency_contact_phone}
                  </a>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gestion familiale */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Gestion familiale
          </CardTitle>
          <CardDescription>
            Gérez les profils liés à votre compte
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Liste des profils */}
          <div className="space-y-2">
            {profiles.map(({ profile, relation }) => (
              <div
                key={profile.id}
                className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(profile.first_name, profile.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="text-sm font-medium">
                      {profile.first_name} {profile.last_name}
                    </span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {relation === "self" ? "Moi" : relation === "parent" ? "Enfant" : "Tuteur"}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Ajouter un profil */}
          <div className="space-y-2">
            <Label htmlFor="claim-code" className="text-xs">
              Ajouter un profil avec un code de réclamation
            </Label>
            <div className="flex gap-2">
              <Input
                id="claim-code"
                value={claimCode}
                onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
                placeholder="Ex: VELO-8832"
                className="font-mono"
              />
              <Button
                onClick={handleClaimProfile}
                disabled={isClaimingProfile || !claimCode.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Portefeuille Membre */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="h-4 w-4" />
            Portefeuille Membre
          </CardTitle>
          <CardDescription>
            Codes rabais exclusifs de nos partenaires
          </CardDescription>
        </CardHeader>
        <CardContent>
          {partners.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucune offre disponible pour le moment
            </p>
          ) : (
            <div className="space-y-3">
              {partners.map((partner) => (
                <div
                  key={partner.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{partner.name}</h4>
                    {partner.promo_description && (
                      <p className="text-xs text-muted-foreground">
                        {partner.promo_description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      {partner.promo_code}
                    </Badge>
                    {partner.website_url && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={partner.website_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lien Admin / Odoo */}
      <Card>
        <CardContent className="py-4">
          <Button variant="outline" className="w-full" asChild>
            <a
              href="https://odoo.clubcyclistelevis.ca" // À remplacer par l'URL réelle
              target="_blank"
              rel="noopener noreferrer"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Paiement & Administration (Odoo)
              <ExternalLink className="h-4 w-4 ml-2" />
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Déconnexion */}
      <Button variant="destructive" className="w-full" onClick={handleLogout}>
        <LogOut className="h-4 w-4 mr-2" />
        Déconnexion
      </Button>
    </div>
  );
}
