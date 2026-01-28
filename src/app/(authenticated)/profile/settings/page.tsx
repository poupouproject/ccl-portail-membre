"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Bell, Shield, Smartphone, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SettingsPage() {
  const router = useRouter();
  const { user, activeProfile, isLoading: profileLoading } = useProfile();
  const [isSaving, setIsSaving] = useState(false);
  
  const [settings, setSettings] = useState({
    notifications_enabled: true,
    email_notifications: true,
    push_notifications: false,
  });

  useEffect(() => {
    if (activeProfile) {
      // Charger les préférences de l'utilisateur si elles existent
      // Pour l'instant on utilise les valeurs par défaut
    }
  }, [activeProfile]);

  async function handleSave() {
    setIsSaving(true);
    try {
      // Sauvegarder les paramètres
      toast({ title: "Paramètres sauvegardés" });
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  if (profileLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Paramètres</h1>
          <p className="text-sm text-muted-foreground">
            Gérez vos préférences de notification et de confidentialité
          </p>
        </div>
      </div>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Configurez comment vous souhaitez être notifié
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notifications activées</Label>
              <p className="text-xs text-muted-foreground">
                Recevoir des notifications sur les événements
              </p>
            </div>
            <Switch
              checked={settings.notifications_enabled}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, notifications_enabled: checked }))
              }
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notifications par email</Label>
              <p className="text-xs text-muted-foreground">
                Recevoir un email pour les annonces importantes
              </p>
            </div>
            <Switch
              checked={settings.email_notifications}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, email_notifications: checked }))
              }
              disabled={!settings.notifications_enabled}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notifications push</Label>
              <p className="text-xs text-muted-foreground">
                Recevoir des notifications sur votre appareil
              </p>
            </div>
            <Switch
              checked={settings.push_notifications}
              onCheckedChange={(checked) =>
                setSettings((prev) => ({ ...prev, push_notifications: checked }))
              }
              disabled={!settings.notifications_enabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sécurité */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Compte et sécurité
          </CardTitle>
          <CardDescription>
            Informations sur votre compte
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Adresse email</Label>
            <Input value={user?.email || ""} disabled />
            <p className="text-xs text-muted-foreground">
              Connecté via Google
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Appareil */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Application
          </CardTitle>
          <CardDescription>
            Informations sur l'application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Version</span>
            <span>1.0.0</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Environnement</span>
            <span>{process.env.NODE_ENV}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" asChild>
          <Link href="/profile">Retour au profil</Link>
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="flex-1 bg-club-orange hover:bg-club-orange/90"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}
