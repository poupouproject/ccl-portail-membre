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
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Search,
  UserPlus,
} from "lucide-react";
import type { Profile, Group } from "@/types/database";
import { getInitials } from "@/lib/utils";

interface ProfileWithGroups extends Profile {
  groups?: { name: string; color_code: string }[];
}

export default function AdminMembersPage() {
  const router = useRouter();
  const { isLoading: profileLoading, isAdmin } = useProfile();
  const [profiles, setProfiles] = useState<ProfileWithGroups[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "athlete" as "athlete" | "coach" | "admin" | "parent",
    member_category: "" as "" | "recreational" | "intensive",
    birth_date: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    group_id: "",
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
      const [{ data: profilesData }, { data: groupsData }] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("is_active", true)
          .order("last_name"),
        supabase.from("groups").select("*").order("name"),
      ]);

      // Récupérer les groupes pour chaque profil
      const profilesWithGroups: ProfileWithGroups[] = await Promise.all(
        ((profilesData || []) as Profile[]).map(async (profile) => {
          const { data: memberData } = await (supabase as any)
            .from("group_members")
            .select("group_id, groups(name, color_code)")
            .eq("profile_id", profile.id);

          return {
            ...profile,
            groups: memberData?.map((m: { groups: { name: string; color_code: string } | null }) => m.groups).filter(Boolean) || [],
          };
        })
      );

      setProfiles(profilesWithGroups);
      setGroups((groupsData || []) as Group[]);
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de charger les données", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!formData.first_name || !formData.last_name) {
      toast({ title: "Erreur", description: "Le nom est obligatoire", variant: "destructive" });
      return;
    }

    try {
      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email || null,
        phone: formData.phone || null,
        role: formData.role,
        member_category: formData.member_category || null,
        birth_date: formData.birth_date || null,
        emergency_contact_name: formData.emergency_contact_name || null,
        emergency_contact_phone: formData.emergency_contact_phone || null,
      };

      if (editingProfile) {
        const { error } = await (supabase as any).from("profiles").update(payload).eq("id", editingProfile.id);
        if (error) throw error;
        toast({ title: "Membre modifié" });
      } else {
        // Générer un claim_code unique
        const claimCode = `VELO-${Math.floor(1000 + Math.random() * 9000)}`;
        const { data: newProfile, error } = await (supabase as any)
          .from("profiles")
          .insert({ ...payload, claim_code: claimCode })
          .select()
          .single();
        if (error) throw error;

        // Ajouter au groupe si spécifié
        if (formData.group_id && newProfile) {
          await (supabase as any).from("group_members").insert({
            group_id: formData.group_id,
            profile_id: newProfile.id,
          });
        }

        toast({ title: "Membre créé", description: `Code de réclamation: ${claimCode}` });
      }
      setIsDialogOpen(false);
      setEditingProfile(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    }
  }

  async function handleDelete(profileId: string) {
    if (!confirm("Désactiver ce membre ?")) return;
    try {
      const { error } = await (supabase as any)
        .from("profiles")
        .update({ is_active: false })
        .eq("id", profileId);
      if (error) throw error;
      toast({ title: "Membre désactivé" });
      fetchData();
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de désactiver", variant: "destructive" });
    }
  }

  function resetForm() {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      role: "athlete",
      member_category: "",
      birth_date: "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      group_id: "",
    });
  }

  function openEditDialog(profile: Profile) {
    setEditingProfile(profile);
    setFormData({
      first_name: profile.first_name,
      last_name: profile.last_name,
      email: profile.email || "",
      phone: profile.phone || "",
      role: profile.role,
      member_category: (profile as any).member_category || "",
      birth_date: profile.birth_date || "",
      emergency_contact_name: profile.emergency_contact_name || "",
      emergency_contact_phone: profile.emergency_contact_phone || "",
      group_id: "",
    });
    setIsDialogOpen(true);
  }

  function openCreateDialog() {
    setEditingProfile(null);
    resetForm();
    setIsDialogOpen(true);
  }

  const filteredProfiles = profiles.filter((profile) => {
    const matchesSearch =
      `${profile.first_name} ${profile.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || profile.role === filterRole;
    return matchesSearch && matchesRole;
  });

  if (profileLoading || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-12 w-full" />
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
          <h1 className="text-2xl font-bold">Gestion des membres</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <UserPlus className="h-4 w-4 mr-2" />
              Nouveau membre
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingProfile ? "Modifier le membre" : "Nouveau membre"}</DialogTitle>
              <DialogDescription>
                {editingProfile ? "Modifiez les informations du membre" : "Ajoutez un nouveau membre au club"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Prénom *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Nom *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rôle</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: "athlete" | "coach" | "admin") => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="athlete">Athlète</SelectItem>
                    <SelectItem value="coach">Coach</SelectItem>
                    <SelectItem value="admin">Administrateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="member_category">Catégorie (abonnement)</Label>
                <Select
                  value={formData.member_category || "undefined"}
                  onValueChange={(value: any) => setFormData({ ...formData, member_category: value === "undefined" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Non défini" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="undefined">Non défini</SelectItem>
                    <SelectItem value="recreational">Récréatif</SelectItem>
                    <SelectItem value="intensive">Intensif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!editingProfile && (
                <div className="space-y-2">
                  <Label htmlFor="group">Groupe (optionnel)</Label>
                  <Select
                    value={formData.group_id || "none"}
                    onValueChange={(value) => setFormData({ ...formData, group_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Aucun groupe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun groupe</SelectItem>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Courriel</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birth_date">Date de naissance</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                />
              </div>
              <div className="border-t pt-4 space-y-4">
                <h4 className="text-sm font-medium">Contact d&apos;urgence</h4>
                <div className="space-y-2">
                  <Label htmlFor="emergency_name">Nom</Label>
                  <Input
                    id="emergency_name"
                    value={formData.emergency_contact_name}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_phone">Téléphone</Label>
                  <Input
                    id="emergency_phone"
                    type="tel"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave}>
                {editingProfile ? "Enregistrer" : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un membre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="athlete">Athlètes</SelectItem>
            <SelectItem value="coach">Coachs</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Members List */}
      <div className="grid gap-3">
        {filteredProfiles.map((profile) => (
          <Card key={profile.id}>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback>{getInitials(profile.first_name, profile.last_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {profile.first_name} {profile.last_name}
                    </span>
                    <Badge variant={profile.role === "admin" ? "default" : profile.role === "coach" ? "secondary" : "outline"}>
                      {profile.role}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {profile.email || "Pas de courriel"}
                  </div>
                  {profile.groups && profile.groups.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {profile.groups.map((group: { name: string; color_code: string }, idx: number) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          style={{ borderColor: group.color_code, color: group.color_code }}
                          className="text-xs"
                        >
                          {group.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(profile)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(profile.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredProfiles.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              {searchTerm || filterRole !== "all"
                ? "Aucun membre correspondant aux critères"
                : "Aucun membre. Cliquez sur \"Nouveau membre\" pour commencer."}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
