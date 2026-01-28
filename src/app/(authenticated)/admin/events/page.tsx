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
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
  Users,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import type { Event, Location, Group, EventScheduleType } from "@/types/database";
import { formatDate, formatTime, getCategoryLabel, getCategoryBadgeColor } from "@/lib/utils";

interface EventWithDetails extends Event {
  locations?: Location;
  event_groups?: { group_id: string; groups: Group }[];
}

const SCHEDULE_TYPES: { value: EventScheduleType; label: string }[] = [
  { value: "regular", label: "Sortie régulière" },
  { value: "special", label: "Événement spécial" },
];

export default function AdminEventsPage() {
  const router = useRouter();
  const { isLoading: profileLoading, isCoach } = useProfile();
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [cancellingEvent, setCancellingEvent] = useState<Event | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location_id: "",
    start_date: "",
    start_time: "18:00",
    end_time: "20:00",
    schedule_type: "regular" as EventScheduleType,
    is_for_recreational: true,
    is_for_intensive: false,
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
      const [eventsRes, locationsRes, groupsRes] = await Promise.all([
        supabase
          .from("events")
          .select(`
            *,
            locations(*),
            event_groups(group_id, groups(*))
          `)
          .gte("start_time", new Date().toISOString())
          .order("start_time"),
        supabase.from("locations").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("groups").select("*").eq("is_active", true).order("name"),
      ]);

      setEvents((eventsRes.data as EventWithDetails[]) || []);
      const locs = (locationsRes.data as Location[]) || [];
      setLocations(locs);
      setGroups((groupsRes.data as Group[]) || []);

      // Pré-sélectionner l'emplacement par défaut
      const defaultLocation = locs.find((l) => l.is_default);
      if (defaultLocation) {
        setFormData((prev) => ({ ...prev, location_id: defaultLocation.id }));
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de charger les données", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!formData.title.trim() || !formData.start_date) {
      toast({ title: "Erreur", description: "Remplissez tous les champs obligatoires", variant: "destructive" });
      return;
    }

    if (!formData.is_for_recreational && !formData.is_for_intensive) {
      toast({ title: "Erreur", description: "Sélectionnez au moins un type de groupe", variant: "destructive" });
      return;
    }

    try {
      const startTime = new Date(`${formData.start_date}T${formData.start_time}`);
      const endTime = new Date(`${formData.start_date}T${formData.end_time}`);

      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        location_id: formData.location_id || null,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        event_type: "training",
        schedule_type: formData.schedule_type,
        is_for_recreational: formData.is_for_recreational,
        is_for_intensive: formData.is_for_intensive,
      };

      if (editingEvent) {
        const { error } = await (supabase as any).from("events").update(payload).eq("id", editingEvent.id);
        if (error) throw error;

        // Supprimer les anciennes liaisons et recréer
        await (supabase as any).from("event_groups").delete().eq("event_id", editingEvent.id);
        await createEventGroupLinks(editingEvent.id);

        toast({ title: "Événement modifié" });
      } else {
        const { data: newEvent, error } = await (supabase as any).from("events").insert(payload).select().single();
        if (error) throw error;

        // Créer les liaisons avec les groupes
        await createEventGroupLinks(newEvent.id);

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

  async function createEventGroupLinks(eventId: string) {
    const groupsToLink = groups.filter((g) => {
      if (formData.is_for_recreational && g.category === "recreational") return true;
      if (formData.is_for_intensive && g.category === "intensive") return true;
      return false;
    });

    if (groupsToLink.length > 0) {
      await (supabase as any).from("event_groups").insert(
        groupsToLink.map((g) => ({ event_id: eventId, group_id: g.id }))
      );
    }
  }

  async function handleCancel() {
    if (!cancellingEvent) return;

    try {
      const { error } = await (supabase as any)
        .from("events")
        .update({
          is_cancelled: true,
          cancellation_reason: cancellationReason.trim() || "Annulé",
        })
        .eq("id", cancellingEvent.id);

      if (error) throw error;
      toast({ title: "Événement annulé" });
      setIsCancelDialogOpen(false);
      setCancellingEvent(null);
      setCancellationReason("");
      fetchData();
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", variant: "destructive" });
    }
  }

  async function handleDelete(eventId: string) {
    if (!confirm("Supprimer définitivement cet événement ?")) return;
    try {
      const { error } = await supabase.from("events").delete().eq("id", eventId);
      if (error) throw error;
      toast({ title: "Événement supprimé" });
      fetchData();
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", variant: "destructive" });
    }
  }

  function resetForm() {
    const defaultLocation = locations.find((l) => l.is_default);
    setFormData({
      title: "",
      description: "",
      location_id: defaultLocation?.id || "",
      start_date: "",
      start_time: "18:00",
      end_time: "20:00",
      schedule_type: "regular",
      is_for_recreational: true,
      is_for_intensive: false,
    });
  }

  function openEditDialog(event: Event) {
    setEditingEvent(event);
    const startDate = new Date(event.start_time);
    const endDate = new Date(event.end_time);

    setFormData({
      title: event.title,
      description: event.description || "",
      location_id: event.location_id || "",
      start_date: startDate.toISOString().split("T")[0],
      start_time: startDate.toTimeString().slice(0, 5),
      end_time: endDate.toTimeString().slice(0, 5),
      schedule_type: event.schedule_type || "regular",
      is_for_recreational: event.is_for_recreational,
      is_for_intensive: event.is_for_intensive,
    });
    setIsDialogOpen(true);
  }

  function openCreateDialog() {
    setEditingEvent(null);
    resetForm();
    setIsDialogOpen(true);
  }

  function openCancelDialog(event: Event) {
    setCancellingEvent(event);
    setCancellationReason("");
    setIsCancelDialogOpen(true);
  }

  if (profileLoading || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
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
            <h1 className="text-2xl font-bold">Événements</h1>
            <p className="text-sm text-muted-foreground">
              Créez et gérez les sorties et événements
            </p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="bg-club-orange hover:bg-club-orange/90">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle sortie
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingEvent ? "Modifier l'événement" : "Nouvelle sortie"}
              </DialogTitle>
              <DialogDescription>
                {editingEvent
                  ? "Modifiez les informations de l'événement"
                  : "Créez une nouvelle sortie pour le club"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              {/* Titre */}
              <div className="space-y-2">
                <Label htmlFor="title">Titre *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Sortie du lundi"
                />
              </div>

              {/* Type de sortie */}
              <div className="space-y-2">
                <Label>Type de sortie</Label>
                <Select
                  value={formData.schedule_type}
                  onValueChange={(v) => setFormData({ ...formData, schedule_type: v as EventScheduleType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEDULE_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Groupes cibles */}
              <div className="space-y-3">
                <Label>Groupes concernés *</Label>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="recreational"
                      checked={formData.is_for_recreational}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_for_recreational: checked as boolean })
                      }
                    />
                    <label
                      htmlFor="recreational"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                    >
                      <Badge className="bg-green-500 text-white">Récréatif</Badge>
                      <span className="text-muted-foreground text-xs">
                        ({groups.filter((g) => g.category === "recreational").length} groupes)
                      </span>
                    </label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="intensive"
                      checked={formData.is_for_intensive}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_for_intensive: checked as boolean })
                      }
                    />
                    <label
                      htmlFor="intensive"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                    >
                      <Badge className="bg-blue-600 text-white">Intensif</Badge>
                      <span className="text-muted-foreground text-xs">
                        ({groups.filter((g) => g.category === "intensive").length} groupes)
                      </span>
                    </label>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tous les groupes de la catégorie sélectionnée seront automatiquement ajoutés
                </p>
              </div>

              {/* Date et heures */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_time">Début</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">Fin</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>
              </div>

              {/* Emplacement */}
              <div className="space-y-2">
                <Label htmlFor="location">Emplacement</Label>
                <Select
                  value={formData.location_id}
                  onValueChange={(v) => setFormData({ ...formData, location_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un emplacement..." />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {location.name}
                          {location.is_default && (
                            <Badge variant="secondary" className="text-xs">
                              Défaut
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (optionnel)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Informations complémentaires..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave} className="bg-club-orange hover:bg-club-orange/90">
                {editingEvent ? "Enregistrer" : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Dialog d'annulation */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Annuler l'événement
            </DialogTitle>
            <DialogDescription>
              Indiquez la raison de l'annulation. Les participants seront notifiés.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reason">Raison de l'annulation</Label>
            <Textarea
              id="reason"
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="Ex: Mauvaise météo, terrain impraticable..."
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
              Retour
            </Button>
            <Button onClick={handleCancel} variant="destructive">
              Confirmer l'annulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Liste des événements */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {events.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun événement à venir</p>
            </CardContent>
          </Card>
        ) : (
          events.map((event) => (
            <Card
              key={event.id}
              className={event.is_cancelled ? "opacity-60 border-dashed" : ""}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {event.is_cancelled && <XCircle className="h-4 w-4 text-destructive" />}
                      {event.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {formatDate(event.start_time, { weekday: "long", month: "short", day: "numeric" })}
                    </CardDescription>
                  </div>
                  {event.schedule_type === "special" && (
                    <Badge variant="secondary">Spécial</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {event.is_cancelled && event.cancellation_reason && (
                  <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                    Annulé: {event.cancellation_reason}
                  </div>
                )}

                {/* Horaires */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {formatTime(event.start_time)} - {formatTime(event.end_time)}
                </div>

                {/* Emplacement */}
                {event.locations && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {event.locations.name}
                  </div>
                )}

                {/* Badges des groupes */}
                <div className="flex flex-wrap gap-1">
                  {event.is_for_recreational && (
                    <Badge className="bg-green-500 text-white text-xs">Récréatif</Badge>
                  )}
                  {event.is_for_intensive && (
                    <Badge className="bg-blue-600 text-white text-xs">Intensif</Badge>
                  )}
                </div>

                {/* Actions */}
                {!event.is_cancelled && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEditDialog(event)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openCancelDialog(event)}
                      className="text-amber-600 hover:text-amber-700"
                    >
                      <AlertTriangle className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(event.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
