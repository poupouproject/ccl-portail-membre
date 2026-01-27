"use client";

import { useState, useEffect } from "react";
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
  Users,
  CreditCard,
  Gift,
  ExternalLink,
  Plus,
  LogOut,
  Phone,
  AlertCircle,
  Pencil,
  Mail,
  Save,
  X,
} from "lucide-react";
import { getInitials } from "@/lib/utils";
import type { Partner, Profile } from "@/types/database";

interface ClaimedProfile extends Profile {
  id: string;
  first_name: string;
}

export default function ProfilePage() {
  const { user, activeProfile, profiles, isLoading: profileLoading, refetch } = useProfile();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [claimCode, setClaimCode] = useState("");
  const [isClaimingProfile, setIsClaimingProfile] = useState(false);
  
  // État pour l'édition du profil
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [isEditingEmergency, setIsEditingEmergency] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [contactForm, setContactForm] = useState({
    phone: "",
    address_line1: "",
    address_city: "",
    address_postal_code: "",
  });
  
  const [emergencyForm, setEmergencyForm] = useState({
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relation: "",
  });

  useEffect(() => {
    if (activeProfile) {
      setContactForm({
        phone: activeProfile.phone || "",
        address_line1: activeProfile.address_line1 || "",
        address_city: activeProfile.address_city || "",
        address_postal_code: activeProfile.address_postal_code || "",
      });
      setEmergencyForm({
        emergency_contact_name: activeProfile.emergency_contact_name || "",
        emergency_contact_phone: activeProfile.emergency_contact_phone || "",
        emergency_contact_relation: activeProfile.emergency_contact_relation || "",
      });
    }
  }, [activeProfile]);

  useEffect(() => {
    async function fetchPartners() {
      const { data } = await supabase
        .from("partners")
        .select("*")
        .eq("is_active", true)
        .not("promo_code", "is", null)
        .order("tier");

      if (data) {
        setPartners(data as Partner[]);
      }
    }

    fetchPartners();
  }, []);

  async function handleSaveContact() {
    if (!activeProfile) return;
    setIsSaving(true);
    
    try {
      const { error } = await (supabase as any)
        .from("profiles")
        .update({
          phone: contactForm.phone || null,
          address_line1: contactForm.address_line1 || null,
          address_city: contactForm.address_city || null,
          address_postal_code: contactForm.address_postal_code || null,
        })
        .eq("id", activeProfile.id);
        
      if (error) throw error;
      
      toast({ title: "Coordonnées mises à jour" });
      setIsEditingContact(false);
      refetch?.();
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveEmergency() {
    if (!activeProfile) return;
    setIsSaving(true);
    
    try {
      const { error } = await (supabase as any)
        .from("profiles")
        .update({
          emergency_contact_name: emergencyForm.emergency_contact_name || null,
          emergency_contact_phone: emergencyForm.emergency_contact_phone || null,
          emergency_contact_relation: emergencyForm.emergency_contact_relation || null,
        })
        .eq("id", activeProfile.id);
        
      if (error) throw error;
      
      toast({ title: "Contact d'urgence mis à jour" });
      setIsEditingEmergency(false);
      refetch?.();
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  const handleClaimProfile = async () => {
    if (!claimCode.trim() || !user) return;

    setIsClaimingProfile(true);

    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("claim_code", claimCode.toUpperCase())
        .single();

      const profile = profileData as ClaimedProfile | null;

      if (profileError || !profile) {
        toast({
          title: "Code invalide",
          description: "Ce code de réclamation n'existe pas ou a déjà été utilisé.",
          variant: "destructive",
        });
        return;
      }

      const { error: accessError } = await (supabase as any).from("user_profile_access").insert({
        user_id: user.id,
        profile_id: profile.id,
        relation: "parent",
      });

      if (accessError) {
        toast({
          title: "Erreur",
          description: "Impossible de lier ce profil à votre compte.",
          variant: "destructive",
        });
        return;
      }

      await (supabase as any)
        .from("profiles")
        .update({ claim_code: null })
        .eq("id", profile.id);

      toast({
        title: "Profil ajouté!",
        description: `Le profil de ${profile.first_name} a été lié à votre compte.`,
      });

      setClaimCode("");
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
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">{activeProfile?.role}</Badge>
                {activeProfile?.email && (
                  <span className="text-xs">{activeProfile.email}</span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Coordonnées */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Coordonnées
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setIsEditingContact(!isEditingContact)}>
              {isEditingContact ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isEditingContact ? (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  placeholder="(418) 555-1234"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={contactForm.address_line1}
                  onChange={(e) => setContactForm({ ...contactForm, address_line1: e.target.value })}
                  placeholder="123 rue Principale"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="city">Ville</Label>
                  <Input
                    id="city"
                    value={contactForm.address_city}
                    onChange={(e) => setContactForm({ ...contactForm, address_city: e.target.value })}
                    placeholder="Lévis"
                  />
                </div>
                <div>
                  <Label htmlFor="postal">Code postal</Label>
                  <Input
                    id="postal"
                    value={contactForm.address_postal_code}
                    onChange={(e) => setContactForm({ ...contactForm, address_postal_code: e.target.value })}
                    placeholder="G6V 1A1"
                  />
                </div>
              </div>
              <Button onClick={handleSaveContact} disabled={isSaving} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder
              </Button>
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              {activeProfile?.phone ? (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${activeProfile.phone}`} className="hover:underline">{activeProfile.phone}</a>
                </div>
              ) : null}
              {activeProfile?.email ? (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{activeProfile.email}</span>
                </div>
              ) : null}
              {activeProfile?.address_line1 ? (
                <div className="text-muted-foreground">
                  {activeProfile.address_line1}
                  {activeProfile.address_city && `, ${activeProfile.address_city}`}
                  {activeProfile.address_postal_code && ` ${activeProfile.address_postal_code}`}
                </div>
              ) : null}
              {!activeProfile?.phone && !activeProfile?.address_line1 && (
                <p className="text-muted-foreground">Aucune coordonnée enregistrée</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact d'urgence */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              Contact d&apos;urgence
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setIsEditingEmergency(!isEditingEmergency)}>
              {isEditingEmergency ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isEditingEmergency ? (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="emergency-name">Nom</Label>
                <Input
                  id="emergency-name"
                  value={emergencyForm.emergency_contact_name}
                  onChange={(e) => setEmergencyForm({ ...emergencyForm, emergency_contact_name: e.target.value })}
                  placeholder="Prénom Nom"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="emergency-phone">Téléphone</Label>
                <Input
                  id="emergency-phone"
                  value={emergencyForm.emergency_contact_phone}
                  onChange={(e) => setEmergencyForm({ ...emergencyForm, emergency_contact_phone: e.target.value })}
                  placeholder="(418) 555-1234"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="emergency-relation">Relation</Label>
                <Input
                  id="emergency-relation"
                  value={emergencyForm.emergency_contact_relation}
                  onChange={(e) => setEmergencyForm({ ...emergencyForm, emergency_contact_relation: e.target.value })}
                  placeholder="Mère, Père, Conjoint(e), etc."
                />
              </div>
              <Button onClick={handleSaveEmergency} disabled={isSaving} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder
              </Button>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              {activeProfile?.emergency_contact_name ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{activeProfile.emergency_contact_name}</span>
                      {activeProfile.emergency_contact_relation && (
                        <span className="text-sm text-muted-foreground ml-2">
                          ({activeProfile.emergency_contact_relation})
                        </span>
                      )}
                    </div>
                    {activeProfile.emergency_contact_phone && (
                      <a
                        href={`tel:${activeProfile.emergency_contact_phone}`}
                        className="flex items-center gap-1 text-sm text-red-600 font-medium"
                      >
                        <Phone className="h-4 w-4" />
                        {activeProfile.emergency_contact_phone}
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-red-600">
                  ⚠️ Aucun contact d&apos;urgence défini. Veuillez en ajouter un.
                </p>
              )}
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
