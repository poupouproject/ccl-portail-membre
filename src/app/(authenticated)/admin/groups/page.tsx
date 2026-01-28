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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  UserPlus,
  X,
} from "lucide-react";
import type { Group, GroupCategory, Profile } from "@/types/database";
import { getCategoryLabel, getCategoryBadgeColor, getInitials, getStaffRoleLabel } from "@/lib/utils";

interface GroupWithCounts extends Group {
  memberCount?: number;
  staffCount?: number;
  staff?: GroupStaff[];
}

interface GroupStaff {
  id: string;
  group_id: string;
  profile_id: string;
  role: string;
  profiles?: Profile;
}

const CATEGORY_OPTIONS: { value: GroupCategory; label: string; description: string }[] = [
  { value: "recreational", label: "Récréatif", description: "Sortie le lundi seulement" },
  { value: "intensive", label: "Intensif", description: "Sorties lundi ET mercredi" },
];

const STAFF_ROLES = [
  { value: "head_coach", label: "Coach Lead" },
  { value: "assistant", label: "Assistant" },
  { value: "sweeper", label: "Serre-file" },
];

export default function AdminGroupsPage() {
  const router = useRouter();
  const { isLoading: profileLoading, isAdmin } = useProfile();
  const [groups, setGroups] = useState<GroupWithCounts[]>([]);
  const [coaches, setCoaches] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isStaffDialogOpen, setIsStaffDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [selectedGroupForStaff, setSelectedGroupForStaff] = useState<GroupWithCounts | null>(null);
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
  const [staffForm, setStaffForm] = useState({
    profile_id: "",
    role: "assistant",
  });

  useEffect(() => {
    if (!profileLoading && !isAdmin) {
      router.push("/dashboard");
      return;
    }
    fetchData();
  }, [profileLoading, isAdmin, router]);

  async function fetchData() {
    setIsLoading(true);
    try {
      // Récupérer les groupes avec le staff
      const { data: groupsData, error } = await supabase
        .from("groups")
        .select("*")
        .order("category")
        .order("name");

      if (error) throw error;

      // Récupérer les counts et le staff pour chaque groupe
      const groupsWithCounts: GroupWithCounts[] = await Promise.all(
        ((groupsData || []) as Group[]).map(async (group) => {
          const [memberRes, staffRes] = await Promise.all([
            supabase
              .from("group_members")
              .select("*", { count: "exact", head: true })
              .eq("group_id", group.id),
            supabase
              .from("group_staff")
              .select(`
                id,
                group_id,
                profile_id,
                role,
                profiles(id, first_name, last_name)
              `)
              .eq("group_id", group.id)
              .then(res => {
                // Gérer le cas où la table n'existe pas encore
                if (res.error && res.error.code === '42P01') {
                  return { data: [], error: null };
                }
                return res;
              }),
          ]);

          return {
            ...group,
            memberCount: memberRes.count || 0,
            staffCount: staffRes.data?.length || 0,
            staff: (staffRes.data || []) as unknown as GroupStaff[],
          };
        })
      );

      setGroups(groupsWithCounts);

      // Récupérer tous les coaches/admins pour l'assignation
      const { data: coachesData } = await supabase
        .from("profiles")
        .select("*")
        .in("role", ["admin", "coach"])
        .order("first_name");

      setCoaches((coachesData as Profile[]) || []);
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

  async function handleAddStaff() {
    if (!selectedGroupForStaff || !staffForm.profile_id) {
      toast({ title: "Erreur", description: "Sélectionnez un coach", variant: "destructive" });
      return;
    }

    try {
      const { error } = await (supabase as any).from("group_staff").insert({
        group_id: selectedGroupForStaff.id,
        profile_id: staffForm.profile_id,
        role: staffForm.role,
      });

      if (error) {
        if (error.code === "23505") {
          toast({ title: "Erreur", description: "Ce coach est déjà assigné à ce groupe", variant: "destructive" });
          return;
        }
        throw error;
      }

      toast({ title: "Coach assigné" });
      setStaffForm({ profile_id: "", role: "assistant" });
      fetchData();
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible d'assigner", variant: "destructive" });
    }
  }

  async function handleRemoveStaff(staffId: string) {
    try {
      const { error } = await supabase.from("group_staff").delete().eq("id", staffId);
      if (error) throw error;
      toast({ title: "Coach retiré" });
      fetchData();
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de retirer", variant: "destructive" });
    }
  }

  async function handleUpdateStaffRole(staffId: string, newRole: string) {
    try {
      const { error } = await (supabase as any).from("group_staff").update({ role: newRole }).eq("id", staffId);
      if (error) throw error;
      toast({ title: "Rôle modifié" });
      fetchData();
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de modifier le rôle", variant: "destructive" });
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
      level_required: group.level_required,
      color_code: group.color_code,
      category: group.category || "recreational",
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

  function openStaffDialog(group: GroupWithCounts) {
    setSelectedGroupForStaff(group);
    setStaffForm({ profile_id: "", role: "assistant" });
    setIsStaffDialogOpen(true);
  }

  // Filtrer les groupes par catégorie et saison
  const filteredGroups = groups.filter((g) => {
    const matchCategory = filterCategory === "all" || g.category === filterCategory;
    const matchSeason = !filterSeason || g.season === filterSeason || !g.season;
    return matchCategory && matchSeason;
  });

  // Saisons disponibles pour le filtre
  const availableSeasons = [...new Set(groups.map(g => g.season).filter(Boolean) as number[])].sort((a, b) => b - a);

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              Configurez les groupes et assignez les coachs
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
                <div className="grid grid-cols-2 gap-3">
                  {CATEGORY_OPTIONS.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat.value })}
                      className={`p-3 rounded-lg border-2 text-left transition-colors ${
                        formData.category === cat.value
                          ? "border-club-orange bg-club-orange/10"
                          : "border-border hover:border-club-orange/50"
                      }`}
                    >
                      <div className="font-medium">{cat.label}</div>
                      <div className="text-xs text-muted-foreground">{cat.description}</div>
                    </button>
                  ))}
                </div>
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

              {/* Saison, Niveau et couleur */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="season">Saison</Label>
                  <Input
                    id="season"
                    type="number"
                    min="2020"
                    max="2050"
                    value={formData.season}
                    onChange={(e) =>
                      setFormData({ ...formData, season: parseInt(e.target.value) || new Date().getFullYear() })
                    }
                  />
                </div>
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
                  </div>
                </div>
              </div>

              {/* Notes internes (visibles par coachs/admin uniquement) */}
              <div className="space-y-2">
                <Label htmlFor="internal_notes">Notes internes</Label>
                <p className="text-xs text-muted-foreground">Visibles uniquement par les coachs et admins</p>
                <Textarea
                  id="internal_notes"
                  value={formData.internal_notes}
                  onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                  placeholder="Notes pour les coachs..."
                  rows={2}
                />
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

      {/* Dialog Gestion Staff */}
      <Dialog open={isStaffDialogOpen} onOpenChange={setIsStaffDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gérer les coachs</DialogTitle>
            <DialogDescription>
              {selectedGroupForStaff?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Staff actuel */}
            <div className="space-y-2">
              <Label>Coachs assignés</Label>
              {selectedGroupForStaff?.staff && selectedGroupForStaff.staff.length > 0 ? (
                <div className="space-y-2">
                  {selectedGroupForStaff.staff.map((staff) => (
                    <div
                      key={staff.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {staff.profiles
                              ? getInitials(staff.profiles.first_name, staff.profiles.last_name)
                              : "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="text-sm font-medium">
                            {staff.profiles?.first_name} {staff.profiles?.last_name}
                          </div>
                          <Select
                            value={staff.role}
                            onValueChange={(v) => handleUpdateStaffRole(staff.id, v)}
                          >
                            <SelectTrigger className="h-6 text-xs w-auto">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STAFF_ROLES.map((role) => (
                                <SelectItem key={role.value} value={role.value} className="text-xs">
                                  {role.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveStaff(staff.id)}
                        className="h-8 w-8 text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun coach assigné</p>
              )}
            </div>

            <Separator />

            {/* Ajouter un coach */}
            <div className="space-y-3">
              <Label>Ajouter un coach</Label>
              <Select
                value={staffForm.profile_id}
                onValueChange={(v) => setStaffForm({ ...staffForm, profile_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un coach..." />
                </SelectTrigger>
                <SelectContent>
                  {coaches
                    .filter(
                      (c) =>
                        !selectedGroupForStaff?.staff?.some((s) => s.profile_id === c.id)
                    )
                    .map((coach) => (
                      <SelectItem key={coach.id} value={coach.id}>
                        {coach.first_name} {coach.last_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Select
                value={staffForm.role}
                onValueChange={(v) => setStaffForm({ ...staffForm, role: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAFF_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={handleAddStaff}
                className="w-full bg-club-orange hover:bg-club-orange/90"
                disabled={!staffForm.profile_id}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </div>
          </div>
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
      <div className="flex flex-wrap gap-4 items-center">
        <Tabs value={filterCategory} onValueChange={(v) => setFilterCategory(v as GroupCategory | "all")}>
          <TabsList>
            <TabsTrigger value="all">Tous ({groups.length})</TabsTrigger>
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
                  <div className="flex gap-1">
                    {group.season && (
                      <Badge variant="outline" className="text-xs">
                        {group.season}
                      </Badge>
                    )}
                    <Badge className={`text-xs text-white ${getCategoryBadgeColor(group.category)}`}>
                      {getCategoryLabel(group.category)}
                    </Badge>
                  </div>
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
                  <div>{group.staffCount || 0} coachs</div>
                </div>

                {/* Liste des coachs */}
                {group.staff && group.staff.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {group.staff.map((staff) => (
                      <Badge key={staff.id} variant="outline" className="text-xs">
                        {staff.profiles?.first_name} ({getStaffRoleLabel(staff.role)})
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Notes internes */}
                {group.internal_notes && (
                  <div className="text-xs text-muted-foreground italic bg-muted/50 p-2 rounded">
                    📝 {group.internal_notes}
                  </div>
                )}

                {!group.is_active && (
                  <Badge variant="secondary" className="text-xs">
                    Inactif
                  </Badge>
                )}

                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openStaffDialog(group)}
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Coachs
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
