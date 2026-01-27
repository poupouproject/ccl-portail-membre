"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Pin,
} from "lucide-react";
import type { Announcement } from "@/types/database";
import { formatDate } from "@/lib/utils";

export default function AdminAnnouncementsPage() {
  const router = useRouter();
  const { isLoading: profileLoading, isCoach } = useProfile();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    is_pinned: false,
    expires_at: "",
  });

  useEffect(() => {
    if (!profileLoading && !isCoach) {
      router.push("/dashboard");
      return;
    }
    fetchAnnouncements();
  }, [profileLoading, isCoach, router]);

  async function fetchAnnouncements() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de charger les annonces", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!formData.title) {
      toast({ title: "Erreur", description: "Le titre est obligatoire", variant: "destructive" });
      return;
    }

    try {
      const payload = {
        title: formData.title,
        content: formData.content || null,
        is_pinned: formData.is_pinned,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
      };

      if (editingAnnouncement) {
        const { error } = await (supabase as any).from("announcements").update(payload).eq("id", editingAnnouncement.id);
        if (error) throw error;
        toast({ title: "Annonce modifiée" });
      } else {
        const { error } = await (supabase as any).from("announcements").insert(payload);
        if (error) throw error;
        toast({ title: "Annonce publiée" });
      }
      setIsDialogOpen(false);
      setEditingAnnouncement(null);
      resetForm();
      fetchAnnouncements();
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette annonce ?")) return;
    try {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Annonce supprimée" });
      fetchAnnouncements();
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" });
    }
  }

  function resetForm() {
    setFormData({ title: "", content: "", is_pinned: false, expires_at: "" });
  }

  function openEditDialog(announcement: Announcement) {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content || "",
      is_pinned: announcement.is_pinned,
      expires_at: announcement.expires_at ? new Date(announcement.expires_at).toISOString().slice(0, 16) : "",
    });
    setIsDialogOpen(true);
  }

  function openCreateDialog() {
    setEditingAnnouncement(null);
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
          <h1 className="text-2xl font-bold">Annonces</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle annonce
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAnnouncement ? "Modifier l'annonce" : "Nouvelle annonce"}</DialogTitle>
              <DialogDescription>
                L&apos;annonce sera visible sur le tableau de bord de tous les membres.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Inscriptions ouvertes pour la saison 2026"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Contenu</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Détails de l'annonce..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expires">Expire le (optionnel)</Label>
                <Input
                  id="expires"
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="pinned" className="text-sm">Épingler en haut</Label>
                <Switch
                  id="pinned"
                  checked={formData.is_pinned}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_pinned: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave}>
                {editingAnnouncement ? "Enregistrer" : "Publier"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {announcements.map((announcement) => (
          <Card key={announcement.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {announcement.is_pinned && <Pin className="h-4 w-4 text-club-orange" />}
                  <CardTitle className="text-lg">{announcement.title}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(announcement)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(announcement.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {announcement.content && (
                <p className="text-sm text-muted-foreground mb-2">{announcement.content}</p>
              )}
              <div className="text-xs text-muted-foreground">
                Publié le {formatDate(announcement.created_at, { month: "short", day: "numeric", year: "numeric" })}
                {announcement.expires_at && (
                  <> · Expire le {formatDate(announcement.expires_at, { month: "short", day: "numeric" })}</>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {announcements.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              Aucune annonce. Cliquez sur "Nouvelle annonce" pour en créer une.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
