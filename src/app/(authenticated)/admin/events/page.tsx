"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  MapPin,
  Clock,
} from "lucide-react";
import type { Event, Group } from "@/types/database";
import { formatDate } from "@/lib/utils";

interface EventWithGroup extends Event {
  groups?: Group;
}

export default function AdminEventsPage() {
  const router = useRouter();
  const { isLoading: profileLoading, isCoach } = useProfile();
  const [events, setEvents] = useState<EventWithGroup[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    group_id: "",
    title: "",
    description: "",
    location_name: "",
    location_url: "",
    start_time: "",
    end_time: "",
    event_type: "training",
  });

  useEffect(() => {
    if (!profileLoading && !isCoach) {
      router.push("/dashboard");
      return;
    }
    fetchData();
  }, [profileLoading, isCoach, router]);

  async function fetchData() {
    setIsLoading(true);
    try {
      const [{ data: eventsData }, { data: groupsData }] = await Promise.all([
        supabase
          .from("events")
          .select("*, groups(*)")
          .gte("start_time", new Date().toISOString())
          .order("start_time"),
        supabase.from("groups").select("*").order("name"),
      ]);

      setEvents((eventsData as EventWithGroup[]) || []);
      setGroups(groupsData || []);
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de charger les données", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!formData.group_id || !formData.title || !formData.start_time || !formData.end_time) {
      toast({ title: "Erreur", description: "Remplissez tous les champs obligatoires", variant: "destructive" });
      return;
    }

    try {
      const payload = {
        group_id: formData.group_id,
        title: formData.title,
        description: formData.description || null,
        location_name: formData.location_name || null,
        location_url: formData.location_url || null,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        event_type: formData.event_type,
      };

      if (editingEvent) {
        const { error } = await (supabase as any).from("events").update(payload).eq("id", editingEvent.id);
        if (error) throw error;
        toast({ title: "Événement modifié" });
      } else {
        const { error } = await (supabase as any).from("events").insert(payload);
        if (error) throw error;
        toast({ title: "Événement créé" });
      }
      setIsDialogOpen(false);
      setEditingEvent(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    }
  }

  async function handleDelete(eventId: string) {
    if (!confirm("Supprimer cet événement ?")) return;
    try {
      const { error } = await (supabase as any).from("events").delete().eq("id", eventId);
      if (error) throw error;
      toast({ title: "Événement supprimé" });
      fetchData();
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" });
    }
  }

  function resetForm() {
    setFormData({
      group_id: "",
      title: "",
      description: "",
      location_name: "",
      location_url: "",
      start_time: "",
      end_time: "",
      event_type: "training",
    });
  }

  function openEditDialog(event: Event) {
    setEditingEvent(event);
    setFormData({
      group_id: event.group_id,
      title: event.title,
      description: event.description || "",
      location_name: event.location_name || "",
      location_url: event.location_url || "",
      start_time: new Date(event.start_time).toISOString().slice(0, 16),
      end_time: new Date(event.end_time).toISOString().slice(0, 16),
      event_type: event.event_type || "training",
    });
    setIsDialogOpen(true);
  }

  function openCreateDialog() {
    setEditingEvent(null);
    resetForm();
    setIsDialogOpen(true);
  }

  if (profileLoading || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
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
          <h1 className="text-2xl font-bold">Gestion des événements</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvel événement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingEvent ? "Modifier l'événement" : "Nouvel événement"}</DialogTitle>
              <DialogDescription>
                {editingEvent ? "Modifiez les détails de l'événement" : "Créez un nouvel événement pour un groupe"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="group">Groupe *</Label>
                <Select
                  value={formData.group_id}
                  onValueChange={(value) => setFormData({ ...formData, group_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un groupe" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Titre *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Entraînement technique"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.event_type}
                  onValueChange={(value) => setFormData({ ...formData, event_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="training">Entraînement</SelectItem>
                    <SelectItem value="race">Compétition</SelectItem>
                    <SelectItem value="social">Sortie sociale</SelectItem>
                    <SelectItem value="meeting">Réunion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start">Début *</Label>
                  <Input
                    id="start"
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end">Fin *</Label>
                  <Input
                    id="end"
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Lieu</Label>
                <Input
                  id="location"
                  value={formData.location_name}
                  onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                  placeholder="Ex: Parc des Chutes-de-la-Chaudière"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="locationUrl">Lien Google Maps</Label>
                <Input
                  id="locationUrl"
                  value={formData.location_url}
                  onChange={(e) => setFormData({ ...formData, location_url: e.target.value })}
                  placeholder="https://maps.google.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Détails de l'événement..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave}>
                {editingEvent ? "Enregistrer" : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {events.map((event) => (
          <Card key={event.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      style={{ backgroundColor: event.groups?.color_code || "#FF6600" }}
                      className="text-white"
                    >
                      {event.groups?.name}
                    </Badge>
                    <Badge variant="outline">
                      {event.event_type === "training" ? "Entraînement" :
                       event.event_type === "race" ? "Compétition" :
                       event.event_type === "social" ? "Sortie" : "Réunion"}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{event.title}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(event)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(event.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    {formatDate(event.start_time, { weekday: "short", month: "short", day: "numeric" })}
                    {" · "}
                    {new Date(event.start_time).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}
                    {" - "}
                    {new Date(event.end_time).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {event.location_name && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{event.location_name}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {events.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              Aucun événement à venir. Cliquez sur "Nouvel événement" pour en créer un.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
