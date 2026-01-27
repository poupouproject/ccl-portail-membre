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
  Users,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import type { Group, Profile } from "@/types/database";

interface GroupWithCounts extends Group {
  memberCount?: number;
  staffCount?: number;
}

export default function AdminGroupsPage() {
  const router = useRouter();
  const { activeProfile, isLoading: profileLoading, isAdmin } = useProfile();
  const [groups, setGroups] = useState<GroupWithCounts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    level_required: 1,
    color_code: "#FF6600",
  });

  useEffect(() => {
    if (!profileLoading && !isAdmin) {
      router.push("/dashboard");
      return;
    }
    fetchGroups();
  }, [profileLoading, isAdmin, router]);

  async function fetchGroups() {
    setIsLoading(true);
    try {
      const { data: groupsData, error } = await supabase
        .from("groups")
        .select("*")
        .order("name");

      if (error) throw error;

      // Récupérer les counts
      const groupsWithCounts: GroupWithCounts[] = await Promise.all(
        ((groupsData || []) as Group[]).map(async (group) => {
          const { count: memberCount } = await (supabase as any)
            .from("group_members")
            .select("*", { count: "exact", head: true })
            .eq("group_id", group.id);

          const { count: staffCount } = await (supabase as any)
            .from("group_staff")
            .select("*", { count: "exact", head: true })
            .eq("group_id", group.id);

          return {
            ...group,
            memberCount: memberCount || 0,
            staffCount: staffCount || 0,
          };
        })
      );

      setGroups(groupsWithCounts);
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de charger les groupes", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    try {
      if (editingGroup) {
        const { error } = await (supabase as any)
          .from("groups")
          .update(formData)
          .eq("id", editingGroup.id);
        if (error) throw error;
        toast({ title: "Groupe modifié" });
      } else {
        const { error } = await (supabase as any)
          .from("groups")
          .insert(formData);
        if (error) throw error;
        toast({ title: "Groupe créé" });
      }
      setIsDialogOpen(false);
      setEditingGroup(null);
      setFormData({ name: "", description: "", level_required: 1, color_code: "#FF6600" });
      fetchGroups();
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    }
  }

  async function handleDelete(groupId: string) {
    if (!confirm("Supprimer ce groupe et tous ses membres ?")) return;
    try {
      const { error } = await supabase.from("groups").delete().eq("id", groupId);
      if (error) throw error;
      toast({ title: "Groupe supprimé" });
      fetchGroups();
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" });
    }
  }

  function openEditDialog(group: Group) {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || "",
      level_required: group.level_required,
      color_code: group.color_code,
    });
    setIsDialogOpen(true);
  }

  function openCreateDialog() {
    setEditingGroup(null);
    setFormData({ name: "", description: "", level_required: 1, color_code: "#FF6600" });
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
          <h1 className="text-2xl font-bold">Gestion des groupes</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau groupe
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGroup ? "Modifier le groupe" : "Nouveau groupe"}</DialogTitle>
              <DialogDescription>
                {editingGroup ? "Modifiez les informations du groupe" : "Créez un nouveau groupe d'athlètes"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du groupe</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Atome A - Compétition"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description du groupe..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="level">Niveau requis</Label>
                  <Input
                    id="level"
                    type="number"
                    min={1}
                    max={5}
                    value={formData.level_required}
                    onChange={(e) => setFormData({ ...formData, level_required: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Couleur</Label>
                  <Input
                    id="color"
                    type="color"
                    value={formData.color_code}
                    onChange={(e) => setFormData({ ...formData, color_code: e.target.value })}
                    className="h-10 p-1"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave}>
                {editingGroup ? "Enregistrer" : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {groups.map((group) => (
          <Card key={group.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: group.color_code }}
                  />
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                  <Badge variant="outline">Niveau {group.level_required}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(group)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(group.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              {group.description && (
                <CardDescription>{group.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{group.memberCount} athlètes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{group.staffCount} coachs</span>
                </div>
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => router.push(`/admin/groups/${group.id}`)}
                >
                  Gérer les membres →
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {groups.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              Aucun groupe créé. Cliquez sur "Nouveau groupe" pour commencer.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
