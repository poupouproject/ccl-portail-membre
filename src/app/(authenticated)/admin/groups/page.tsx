"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import type { Group, GroupCategory } from "@/types/database";
import { getCategoryLabel, getCategoryBadgeColor } from "@/lib/utils";

interface GroupWithCounts extends Group {
  memberCount?: number;
  staffCount?: number;
  staffNames?: string[];
}

const CATEGORY_OPTIONS: { value: GroupCategory; label: string; description: string }[] = [
  { value: "recreational", label: "Récréatif", description: "Sortie le lundi seulement" },
  { value: "intensive", label: "Intensif", description: "Sorties lundi ET mercredi" },
];

export default function AdminGroupsPage() {
  const router = useRouter();
  const { isLoading: profileLoading, isAdmin, isCoach } = useProfile();
  const [groups, setGroups] = useState<GroupWithCounts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [filterCategory, setFilterCategory] = useState<GroupCategory | "all">("all");
  const [filterSeason, setFilterSeason] = useState<number>(new Date().getFullYear());
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    level_required: 1,
    color_code: "#FF6600",
    category: "recreational" as GroupCategory,
    season: new Date().getFullYear(),
    internal_notes: "",
    is_active: true,
  });

  useEffect(() => {
    if (!profileLoading && !isAdmin && !isCoach) {
      router.push("/dashboard");
      return;
    }
    fetchData();
  }, [profileLoading, isAdmin, isCoach, router]);

  async function fetchData() {
    setIsLoading(true);
    try {
      // Récupérer les groupes
      const { data: groupsData, error } = await supabase
        .from("groups")
        .select("*")
        .order("category")
        .order("name");

      if (error) throw error;

      // Récupérer les compteurs pour chaque groupe
      const groupsWithCounts = await Promise.all(
        ((groupsData || []) as Group[]).map(async (group) => {
          const [memberRes, staffRes] = await Promise.all([
            (supabase as any)
              .from("group_members")
              .select("*", { count: "exact", head: true })
              .eq("group_id", group.id),
            (supabase as any)
              .from("group_staff")
              .select(`
                default_role,
                profiles(first_name)
              `)
              .eq("group_id", group.id),
          ]);

          return {
            ...group,
            memberCount: memberRes.count || 0,
            staffCount: staffRes.data?.length || 0,
            staffNames: (staffRes.data || []).map((s: any) => s.profiles?.first_name).filter(Boolean),
          };
        })
      );

      setGroups(groupsWithCounts);
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de charger les données", variant: "destructive" });
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
        season: formData.season,
        internal_notes: formData.internal_notes.trim() || null,
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
      fetchData();
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
      fetchData();
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
      season: new Date().getFullYear(),
      internal_notes: "",
      is_active: true,
    });
  }

  function openEditDialog(group: Group) {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || "",
      level_required: group.level_required || 1,
      color_code: group.color_code || "#FF6600",
      category: group.category,
      season: group.season || new Date().getFullYear(),
      internal_notes: group.internal_notes || "",
      is_active: group.is_active,
    });
    setIsDialogOpen(true);
  }

  function openCreateDialog() {
    setEditingGroup(null);
    resetForm();
    setIsDialogOpen(true);
  }

  // Filtrer les groupes par catégorie et saison
  const filteredGroups = groups.filter((g) => {
    const matchCategory = filterCategory === "all" || g.category === filterCategory;
    const matchSeason = !filterSeason || g.season === filterSeason || !g.season;
    return matchCategory && matchSeason;
  });

  // Saisons disponibles
  const availableSeasons = [...new Set(groups.map((g) => g.season).filter(Boolean))] as number[];

  // Stats
  const stats = {
    total: groups.length,
    recreational: groups.filter((g) => g.category === "recreational").length,
    intensive: groups.filter((g) => g.category === "intensive").length,
    totalMembers: groups.reduce((acc, g) => acc + (g.memberCount || 0), 0),
  };

  if (isLoading || profileLoading) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Gestion des groupes</h1>
            <p className="text-muted-foreground">
              Configurez les groupes et assignez les coachs
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button onClick={openCreateDialog} className="bg-club-orange hover:bg-club-orange/90">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau groupe
          </Button>
        )}
      </div>

      {/* Dialog Création/Édition */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Modifier le groupe" : "Nouveau groupe"}</DialogTitle>
            <DialogDescription>
              {editingGroup
                ? "Modifiez les informations du groupe"
                : "Créez un nouveau groupe pour organiser vos membres"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du groupe *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ex: Débutants Lundi"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Couleur</Label>
                <Input
                  id="color"
                  type="color"
                  value={formData.color_code}
                  onChange={(e) => setFormData({ ...formData, color_code: e.target.value })}
                  className="h-10 cursor-pointer"
                />
              </div>
            </div>

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

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Catégorie</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v: GroupCategory) => setFormData({ ...formData, category: v })}
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
              </div>
              <div className="space-y-2">
                <Label>Niveau requis</Label>
                <Select
                  value={formData.level_required.toString()}
                  onValueChange={(v) => setFormData({ ...formData, level_required: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((level) => (
                      <SelectItem key={level} value={level.toString()}>
                        Niveau {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Saison</Label>
                <Select
                  value={formData.season.toString()}
                  onValueChange={(v) => setFormData({ ...formData, season: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027].map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes internes (visibles par coachs/admin uniquement) */}
            <div className="space-y-2">
              <Label htmlFor="internal_notes">Notes internes</Label>
              <p className="text-xs text-muted-foreground">Visibles uniquement par les coachs et admins</p>
              <Textarea
                id="internal_notes"
                value={formData.internal_notes}
                placeholder="Notes pour les coachs..."
                onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label>Groupe actif</Label>
                <p className="text-xs text-muted-foreground">Visible et utilisable</p>
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
            <div className="text-2xl font-bold">{stats.recreational}</div>
            <p className="text-xs text-muted-foreground">Récréatif</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.intensive}</div>
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
      <div className="flex items-center gap-4 flex-wrap">
        <Tabs value={filterCategory} onValueChange={(v) => setFilterCategory(v as GroupCategory | "all")}>
          <TabsList>
            <TabsTrigger value="all">Tous ({stats.total})</TabsTrigger>
            <TabsTrigger value="recreational">Récréatif ({stats.recreational})</TabsTrigger>
            <TabsTrigger value="intensive">Intensif ({stats.intensive})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground">Saison:</Label>
          <Select value={filterSeason.toString()} onValueChange={(v) => setFilterSeason(parseInt(v))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(availableSeasons.length > 0 ? availableSeasons : [new Date().getFullYear()]).map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

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
            <Card
              key={group.id}
              className={`cursor-pointer transition-all hover:shadow-md hover:border-club-orange/50 ${
                !group.is_active ? "opacity-60" : ""
              }`}
              onClick={() => router.push(`/admin/groups/${group.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: group.color_code || "#FF6600" }}
                    />
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{group.season}</Badge>
                    <Badge className={getCategoryBadgeColor(group.category)}>
                      {getCategoryLabel(group.category)}
                    </Badge>
                  </div>
                </div>
                {group.description && (
                  <CardDescription className="line-clamp-1">{group.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {group.memberCount || 0} membres
                  </div>
                  <div>{group.staffCount || 0} coachs</div>
                </div>

                {/* Liste des coachs */}
                {group.staffNames && group.staffNames.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {group.staffNames.map((name, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {name}
                      </Badge>
                    ))}
                  </div>
                )}

                {!group.is_active && (
                  <Badge variant="secondary" className="text-xs">
                    Inactif
                  </Badge>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t justify-between items-center">
                  <div className="flex gap-2">
                    {isAdmin && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(group);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(group.id);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    Voir détails
                    <ChevronRight className="h-4 w-4 ml-1" />
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
