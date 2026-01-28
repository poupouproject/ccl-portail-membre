"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  ExternalLink,
  Star,
  GripVertical,
} from "lucide-react";
import type { Location } from "@/types/database";

export default function AdminLocationsPage() {
  const router = useRouter();
  const { isLoading: profileLoading, isCoach } = useProfile();
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    google_maps_url: "",
    is_default: false,
  });

  useEffect(() => {
    if (!profileLoading && !isCoach) {
      router.push("/dashboard");
      return;
    }
    fetchLocations();
  }, [profileLoading, isCoach, router]);

  async function fetchLocations() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de charger les emplacements", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      toast({ title: "Erreur", description: "Le nom est requis", variant: "destructive" });
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        address: formData.address.trim() || null,
        google_maps_url: formData.google_maps_url.trim() || null,
        is_default: formData.is_default,
      };

      if (editingLocation) {
        const { error } = await (supabase as any)
          .from("locations")
          .update(payload)
          .eq("id", editingLocation.id);
        if (error) throw error;
        toast({ title: "Emplacement modifié" });
      } else {
        // Déterminer le prochain sort_order
        const maxOrder = Math.max(...locations.map(l => l.sort_order), 0);
        const { error } = await (supabase as any)
          .from("locations")
          .insert({ ...payload, sort_order: maxOrder + 1 });
        if (error) throw error;
        toast({ title: "Emplacement créé" });
      }

      setIsDialogOpen(false);
      setEditingLocation(null);
      resetForm();
      fetchLocations();
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    }
  }

  async function handleDelete(locationId: string) {
    if (!confirm("Supprimer cet emplacement ?")) return;
    try {
      const { error } = await (supabase as any)
        .from("locations")
        .update({ is_active: false })
        .eq("id", locationId);
      if (error) throw error;
      toast({ title: "Emplacement supprimé" });
      fetchLocations();
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" });
    }
  }

  async function handleSetDefault(locationId: string) {
    try {
      // Retirer le défaut des autres
      await (supabase as any).from("locations").update({ is_default: false }).neq("id", locationId);
      // Mettre le nouveau par défaut
      await (supabase as any).from("locations").update({ is_default: true }).eq("id", locationId);
      toast({ title: "Emplacement par défaut mis à jour" });
      fetchLocations();
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", variant: "destructive" });
    }
  }

  function resetForm() {
    setFormData({
      name: "",
      address: "",
      google_maps_url: "",
      is_default: false,
    });
  }

  function openEditDialog(location: Location) {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      address: location.address || "",
      google_maps_url: location.google_maps_url || "",
      is_default: location.is_default,
    });
    setIsDialogOpen(true);
  }

  function openCreateDialog() {
    setEditingLocation(null);
    resetForm();
    setIsDialogOpen(true);
  }

  if (profileLoading || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Emplacements</h1>
            <p className="text-sm text-muted-foreground">
              Gérez les lieux de rendez-vous pour les sorties
            </p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingLocation ? "Modifier l'emplacement" : "Nouvel emplacement"}
              </DialogTitle>
              <DialogDescription>
                {editingLocation
                  ? "Modifiez les informations de l'emplacement"
                  : "Ajoutez un nouveau lieu de rendez-vous"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du lieu *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Parc de la Pointe-de-la-Martinière"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Ex: 123 rue du Parc, Lévis"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maps_url">Lien Google Maps</Label>
                <Input
                  id="maps_url"
                  type="url"
                  value={formData.google_maps_url}
                  onChange={(e) => setFormData({ ...formData, google_maps_url: e.target.value })}
                  placeholder="https://maps.google.com/?q=..."
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Emplacement par défaut</Label>
                  <p className="text-xs text-muted-foreground">
                    Sera présélectionné lors de la création d'événements
                  </p>
                </div>
                <Switch
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave} className="bg-club-orange hover:bg-club-orange/90">
                {editingLocation ? "Enregistrer" : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Liste des emplacements */}
      <div className="grid gap-4">
        {locations.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun emplacement configuré</p>
              <p className="text-sm mt-1">Ajoutez vos lieux de rendez-vous habituels</p>
            </CardContent>
          </Card>
        ) : (
          locations.map((location) => (
            <Card key={location.id} className="group">
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-club-orange/10 text-club-orange">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{location.name}</h3>
                      {location.is_default && (
                        <Badge className="bg-club-orange text-white text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Par défaut
                        </Badge>
                      )}
                    </div>
                    {location.address && (
                      <p className="text-sm text-muted-foreground truncate">
                        {location.address}
                      </p>
                    )}
                    {location.google_maps_url && (
                      <a
                        href={location.google_maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1 mt-1"
                      >
                        Voir sur Google Maps
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!location.is_default && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSetDefault(location.id)}
                        title="Définir par défaut"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(location)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(location.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
