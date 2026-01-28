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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Eye,
} from "lucide-react";
import type { Group, GroupCategory } from "@/types/database";
import { getCategoryLabel, getCategoryBadgeColor, getDayName } from "@/lib/utils";
import Link from "next/link";

interface GroupWithCounts extends Group {
  memberCount?: number;
  staffCount?: number;
}

const CATEGORY_OPTIONS: { value: GroupCategory; label: string }[] = [
  { value: "recreational", label: "Récréatif" },
  { value: "intensive", label: "Intensif" },
];

const DAY_OPTIONS = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
  { value: 0, label: "Dimanche" },
];

export default function AdminGroupsPage() {
  const router = useRouter();
  const { isLoading: profileLoading, isAdmin } = useProfile();
  const [groups, setGroups] = useState<GroupWithCounts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [filterCategory, setFilterCategory] = useState<GroupCategory | "all">("all");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    level_required: 1,
    color_code: "#FF6600",
    category: "recreational" as GroupCategory,
    default_day_of_week: 1,
    is_active: true,
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
        .order("category")
        .order("name");

      if (error) throw error;

      // Récupérer les counts
      const groupsWithCounts: GroupWithCounts[] = await Promise.all(
        ((groupsData || []) as Group[]).map(async (group) => {
          const { count: memberCount } = await supabase
            .from("group_members")
            .select("*", { count: "exact", head: true })
            .eq("group_id", group.id);

          const { count: staffCount } = await supabase
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
    if (!formData.name.trim()) {
      toast({ title: "Erreur", description: "Le nom est requis", variant: "destructive" });
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        level_required: formData.level_required,
        color_code: formData.color_code,
        category: formData.category,
        default_day_of_week: formData.default_day_of_week,
        is_active: formData.is_active,
      };

      if (editingGroup) {
        const { error } = await (supabase as any).from("groups").update(payload).eq("id", editingGroup.id);
        if (error) throw error;
        toast({ title: "Groupe modifié" });
      } else {
        const { error } = await (supabase as any).from("groups").insert(payload);
        if (error) throw error;
        toast({ title: "Groupe créé" });
      }

      setIsDialogOpen(false);
      setEditingGroup(null);
      resetForm();
      fetchGroups();
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    }
  }

  async function handleDelete(groupId: string) {
    if (!confirm("Supprimer ce groupe et retirer tous ses membres ?")) return;
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

  function resetForm() {
    setFormData({
      name: "",
      description: "",
      level_required: 1,
      color_code: "#FF6600",
      category: "recreational",
      default_day_of_week: 1,
      is_active: true,
    });
  }

  function openEditDialog(group: Group) {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || "",
      level_required: group.level_required,
      color_code: group.color_code,
      category: group.category || "recreational",
      default_day_of_week: group.default_day_of_week || 1,
      is_active: group.is_active,
    });
    setIsDialogOpen(true);
  }

  function openCreateDialog() {
    setEditingGroup(null);
    resetForm();
    setIsDialogOpen(true);
  }

  // Filtrer les groupes
  const filteredGroups =
    filterCategory === "all"
      ? groups
      : groups.filter((g) => g.category === filterCategory);

  // Statistiques
  const stats = {
    total: groups.length,
    recreational: groups.filter((g) => g.category === "recreational").length,
    intensive: groups.filter((g) => g.category === "intensive").length,
    totalMembers: groups.reduce((sum, g) => sum + (g.memberCount || 0), 0),
  };

  if (profileLoading || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
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
          <div>
            <h1 className="text-2xl font-bold">Gestion des groupes</h1>
            <p className="text-sm text-muted-foreground">
              Configurez les groupes et leurs catégories
            </p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="bg-club-orange hover:bg-club-orange/90">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau groupe
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingGroup ? "Modifier le groupe" : "Nouveau groupe"}</DialogTitle>
              <DialogDescription>
                {editingGroup
                  ? "Modifiez les informations du groupe"
                  : "Créez un nouveau groupe d'athlètes"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Nom */}
              <div className="space-y-2">
                <Label htmlFor="name">Nom du groupe *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Atome A - Compétition"
                />
              </div>

              {/* Catégorie */}
              <div className="space-y-2">
                <Label>Catégorie *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v as GroupCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.category === "recreational"
                    ? "Sortie le lundi (récréatif + intensif)"
                    : "Sorties le lundi ET mercredi"}
                </p>
              </div>

              {/* Jour par défaut */}
              <div className="space-y-2">
                <Label>Jour de sortie principal</Label>
                <Select
                  value={String(formData.default_day_of_week)}
                  onValueChange={(v) => setFormData({ ...formData, default_day_of_week: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_OPTIONS.map((day) => (
                      <SelectItem key={day.value} value={String(day.value)}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description du groupe..."
                  rows={2}
                />
              </div>

              {/* Niveau et couleur */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="level">Niveau requis</Label>
                  <Input
                    id="level"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.level_required}
                    onChange={(e) =>
                      setFormData({ ...formData, level_required: parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Couleur</Label>
                  <div className="flex gap-2">
                    <Input
                      id="color"
                      type="color"
                      value={formData.color_code}
                      onChange={(e) => setFormData({ ...formData, color_code: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={formData.color_code}
                      onChange={(e) => setFormData({ ...formData, color_code: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Statut actif */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Groupe actif</Label>
                  <p className="text-xs text-muted-foreground">
                    Les groupes inactifs ne sont pas visibles
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave} className="bg-club-orange hover:bg-club-orange/90">
                {editingGroup ? "Enregistrer" : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Groupes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.recreational}</div>
            <p className="text-xs text-muted-foreground">Récréatif</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{stats.intensive}</div>
            <p className="text-xs text-muted-foreground">Intensif</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">Membres total</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Tabs value={filterCategory} onValueChange={(v) => setFilterCategory(v as GroupCategory | "all")}>
        <TabsList>
          <TabsTrigger value="all">Tous ({groups.length})</TabsTrigger>
          <TabsTrigger value="recreational">Récréatif ({stats.recreational})</TabsTrigger>
          <TabsTrigger value="intensive">Intensif ({stats.intensive})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Liste des groupes */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredGroups.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun groupe trouvé</p>
            </CardContent>
          </Card>
        ) : (
          filteredGroups.map((group) => (
            <Card key={group.id} className={!group.is_active ? "opacity-60" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: group.color_code }}
                    />
                    <CardTitle className="text-base">{group.name}</CardTitle>
                  </div>
                  <Badge className={`text-xs text-white ${getCategoryBadgeColor(group.category)}`}>
                    {getCategoryLabel(group.category)}
                  </Badge>
                </div>
                {group.description && (
                  <CardDescription className="text-sm line-clamp-2">
                    {group.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {group.memberCount || 0} membres
                  </div>
                  <div>{group.staffCount || 0} staff</div>
                </div>

                {group.default_day_of_week !== null && (
                  <div className="text-xs text-muted-foreground">
                    Jour: {getDayName(group.default_day_of_week)}
                  </div>
                )}

                {!group.is_active && (
                  <Badge variant="secondary" className="text-xs">
                    Inactif
                  </Badge>
                )}

                <div className="flex gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link href={`/admin/groups/${group.id}`}>
                      <Eye className="h-3 w-3 mr-1" />
                      Voir
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(group)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(group.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
