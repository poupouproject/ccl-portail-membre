"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Users,
  ArrowLeft,
  UserPlus,
  X,
  MessageSquare,
  Calendar,
  UserMinus,
  ArrowRightLeft,
  AlertCircle,
  Send,
  StickyNote,
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  XCircle,
  RotateCcw,
  FileText,
} from "lucide-react";
import type { Group, Profile } from "@/types/database";
import { getCategoryLabel, getCategoryBadgeColor, getInitials, getStaffRoleLabel } from "@/lib/utils";

interface GroupStaff {
  group_id: string;
  profile_id: string;
  default_role: string;
  profiles?: Profile;
}

interface GroupMember {
  profile_id: string;
  profiles: Profile;
}

interface GroupChangeRequest {
  id: string;
  member_id: string;
  from_group_id: string;
  to_group_id: string;
  requested_by: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  member?: Profile;
  requested_by_profile?: Profile;
  to_group?: Group;
}

interface CoachAbsence {
  id: string;
  coach_id: string;
  group_id: string;
  event_id?: string;
  date: string;
  reason: string;
  coach?: Profile;
}

interface GroupNote {
  id: string;
  group_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: Profile;
}

interface ChatMessage {
  id: string;
  group_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: Profile;
}

interface LessonPlanTemplate {
  id: string;
  author_id: string;
  title: string;
  content: string;
  duration_minutes: number | null;
  objectives: string | null;
  materials: string | null;
  category: string | null;
  level_min: number;
  level_max: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  author?: Profile;
}

interface LessonPlan {
  id: string;
  group_id: string;
  template_id: string | null;
  applied_by: string;
  session_date: string | null;
  title_override: string | null;
  content_override: string | null;
  duration_override: number | null;
  objectives_override: string | null;
  materials_override: string | null;
  is_cancelled: boolean;
  cancellation_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  template?: LessonPlanTemplate;
  appliedByProfile?: Profile;
}

const STAFF_ROLES = [
  { value: "head_coach", label: "Coach Lead" },
  { value: "assistant", label: "Assistant" },
  { value: "sweeper", label: "Serre-file" },
];

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;
  const { isLoading: profileLoading, isAdmin, isCoach } = useProfile();

  const [group, setGroup] = useState<Group | null>(null);
  const [staff, setStaff] = useState<GroupStaff[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [availableMembers, setAvailableMembers] = useState<Profile[]>([]);
  const [availableCoaches, setAvailableCoaches] = useState<Profile[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [changeRequests, setChangeRequests] = useState<GroupChangeRequest[]>([]);
  const [coachAbsences, setCoachAbsences] = useState<CoachAbsence[]>([]);
  const [notes, setNotes] = useState<GroupNote[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [lessonPlanTemplates, setLessonPlanTemplates] = useState<LessonPlanTemplate[]>([]);
  const [nextEvent, setNextEvent] = useState<any>(null);
  const [attendances, setAttendances] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("members");

  // Dialogs
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isChangeRequestOpen, setIsChangeRequestOpen] = useState(false);
  const [isAbsenceOpen, setIsAbsenceOpen] = useState(false);
  const [isLessonPlanOpen, setIsLessonPlanOpen] = useState(false);
  const [isCancelPlanOpen, setIsCancelPlanOpen] = useState(false);
  const [editingLessonPlan, setEditingLessonPlan] = useState<LessonPlan | null>(null);
  const [cancellingPlan, setCancellingPlan] = useState<LessonPlan | null>(null);

  // Forms
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedCoachId, setSelectedCoachId] = useState("");
  const [selectedRole, setSelectedRole] = useState("assistant");
  const [changeRequestForm, setChangeRequestForm] = useState({
    member_id: "",
    to_group_id: "",
    reason: "",
  });
  const [absenceForm, setAbsenceForm] = useState({
    date: "",
    reason: "",
  });
  const [lessonPlanForm, setLessonPlanForm] = useState({
    session_date: "",
    title_override: "",
    content_override: "",
    duration_override: "",
    objectives_override: "",
    materials_override: "",
    notes: "",
  });
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (!profileLoading && !isAdmin && !isCoach) {
      router.push("/dashboard");
      return;
    }
    if (groupId) {
      fetchGroupData();
    }
  }, [profileLoading, isAdmin, isCoach, groupId, router]);

  async function fetchGroupData() {
    setIsLoading(true);
    try {
      // Récupérer le groupe
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();

      if (groupError) throw groupError;
      setGroup(groupData);

      // Récupérer le staff
      const { data: staffData } = await (supabase as any)
        .from("group_staff")
        .select(`
          group_id,
          profile_id,
          default_role,
          profiles(id, first_name, last_name, email, role)
        `)
        .eq("group_id", groupId);
      setStaff(staffData || []);

      // Récupérer les membres
      const { data: membersData } = await (supabase as any)
        .from("group_members")
        .select(`
          profile_id,
          profiles(id, first_name, last_name, email, phone, member_category)
        `)
        .eq("group_id", groupId);
      setMembers(membersData || []);

      // Récupérer les membres disponibles (même catégorie, pas déjà dans le groupe)
      const memberIds = (membersData || []).map((m: any) => m.profile_id);
      const { data: availableMembersData } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("role", "athlete")
        .eq("member_category", (groupData as Group).category)
        .order("first_name");
      setAvailableMembers(
        ((availableMembersData || []) as Profile[]).filter((m) => !memberIds.includes(m.id))
      );

      // Récupérer les coachs disponibles
      const { data: coachesData } = await supabase
        .from("profiles")
        .select("*")
        .in("role", ["admin", "coach"])
        .order("first_name");
      setAvailableCoaches(coachesData || []);

      // Récupérer tous les groupes (pour les demandes de changement)
      const { data: allGroupsData } = await supabase
        .from("groups")
        .select("*")
        .eq("is_active", true)
        .neq("id", groupId)
        .order("name");
      setAllGroups(allGroupsData || []);

      // Récupérer le prochain événement du groupe
      const today = new Date().toISOString().split("T")[0];
      const { data: eventData } = await supabase
        .from("events")
        .select(`
          *,
          event_groups!inner(group_id)
        `)
        .eq("event_groups.group_id", groupId)
        .gte("start_date", today)
        .order("start_date", { ascending: true })
        .limit(1)
        .single();
      setNextEvent(eventData);

      // Récupérer les présences pour le prochain événement
      if (eventData) {
        const { data: attendanceData } = await supabase
          .from("attendances")
          .select("*")
          .eq("event_id", (eventData as any).id);
        setAttendances(attendanceData || []);
      }

      // Récupérer les notes du groupe (simulé - à créer la table si besoin)
      // Pour l'instant on utilise internal_notes du groupe
      setNotes([]);

      // Récupérer les messages du chat (simulé)
      setChatMessages([]);

      // Récupérer les demandes de changement de groupe (simulé)
      setChangeRequests([]);

      // Récupérer les absences de coachs (simulé)
      setCoachAbsences([]);

      // Récupérer les templates de plans de cours
      const { data: templatesData } = await (supabase as any)
        .from("lesson_plan_templates")
        .select(`
          *,
          profiles:author_id(id, first_name, last_name, email, role)
        `)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      setLessonPlanTemplates(
        (templatesData || []).map((t: any) => ({
          ...t,
          author: t.profiles,
        }))
      );

      // Récupérer les plans de cours du groupe avec les templates
      const { data: lessonPlansData } = await (supabase as any)
        .from("group_lesson_plans")
        .select(`
          *,
          template:template_id(id, title, content, duration_minutes, objectives, materials, category, level_min, level_max),
          appliedByProfile:applied_by(id, first_name, last_name, email, role)
        `)
        .eq("group_id", groupId)
        .order("session_date", { ascending: true, nullsFirst: false });
      setLessonPlans(lessonPlansData || []);

    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de charger le groupe", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddMember() {
    if (!selectedMemberId) return;

    try {
      const { error } = await (supabase as any).from("group_members").insert({
        group_id: groupId,
        profile_id: selectedMemberId,
      });

      if (error) {
        if (error.code === "23505") {
          toast({ title: "Erreur", description: "Ce membre est déjà dans le groupe", variant: "destructive" });
          return;
        }
        throw error;
      }

      toast({ title: "Membre ajouté" });
      setSelectedMemberId("");
      setIsAddMemberOpen(false);
      fetchGroupData();
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible d'ajouter le membre", variant: "destructive" });
    }
  }

  async function handleRemoveMember(profileId: string) {
    if (!confirm("Retirer ce membre du groupe ?")) return;

    try {
      const { error } = await (supabase as any)
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("profile_id", profileId);

      if (error) throw error;
      toast({ title: "Membre retiré" });
      fetchGroupData();
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de retirer le membre", variant: "destructive" });
    }
  }

  async function handleAddStaff() {
    if (!selectedCoachId) return;

    try {
      const { error } = await (supabase as any).from("group_staff").insert({
        group_id: groupId,
        profile_id: selectedCoachId,
        default_role: selectedRole,
      });

      if (error) {
        if (error.code === "23505") {
          toast({ title: "Erreur", description: "Ce coach est déjà assigné", variant: "destructive" });
          return;
        }
        throw error;
      }

      toast({ title: "Coach assigné" });
      setSelectedCoachId("");
      setSelectedRole("assistant");
      setIsAddStaffOpen(false);
      fetchGroupData();
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible d'assigner le coach", variant: "destructive" });
    }
  }

  async function handleRemoveStaff(profileId: string) {
    if (!confirm("Retirer ce coach du groupe ?")) return;

    try {
      const { error } = await (supabase as any)
        .from("group_staff")
        .delete()
        .eq("group_id", groupId)
        .eq("profile_id", profileId);

      if (error) throw error;
      toast({ title: "Coach retiré" });
      fetchGroupData();
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de retirer le coach", variant: "destructive" });
    }
  }

  async function handleRequestChange() {
    if (!changeRequestForm.member_id || !changeRequestForm.to_group_id) {
      toast({ title: "Erreur", description: "Sélectionnez un membre et un groupe", variant: "destructive" });
      return;
    }

    // Pour l'instant, simuler la création de la demande
    toast({ title: "Demande envoyée", description: "L'administrateur va examiner votre demande" });
    setChangeRequestForm({ member_id: "", to_group_id: "", reason: "" });
    setIsChangeRequestOpen(false);
  }

  async function handleReportAbsence() {
    if (!absenceForm.date) {
      toast({ title: "Erreur", description: "Sélectionnez une date", variant: "destructive" });
      return;
    }

    // Pour l'instant, simuler l'enregistrement
    toast({ title: "Absence signalée", description: "Les autres coachs seront notifiés" });
    setAbsenceForm({ date: "", reason: "" });
    setIsAbsenceOpen(false);
  }

  async function handleSendNote() {
    if (!newNote.trim()) return;

    // Pour l'instant, simuler l'ajout de la note
    toast({ title: "Note ajoutée" });
    setNewNote("");
    // TODO: Implémenter la table group_notes
  }

  async function handleSendMessage() {
    if (!newMessage.trim()) return;

    // Pour l'instant, simuler l'envoi du message
    toast({ title: "Message envoyé" });
    setNewMessage("");
    // TODO: Implémenter la table group_chat
  }

  // Helper function to get display values (override or template value)
  function getPlanDisplayValue(plan: LessonPlan, field: 'title' | 'content' | 'duration_minutes' | 'objectives' | 'materials') {
    const overrideField = `${field}_override` as keyof LessonPlan;
    const overrideValue = plan[overrideField];
    if (overrideValue !== null && overrideValue !== undefined) {
      return overrideValue;
    }
    if (plan.template) {
      return plan.template[field as keyof LessonPlanTemplate];
    }
    return null;
  }

  async function handleSaveLessonPlan() {
    // For new plans, require template selection; for edits, just update
    if (!editingLessonPlan && !selectedTemplateId) {
      toast({ title: "Erreur", description: "Sélectionnez un plan de cours modèle", variant: "destructive" });
      return;
    }

    try {
      // Get current user's profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

      if (!profile) throw new Error("Profil non trouvé");

      if (editingLessonPlan) {
        // Update existing lesson plan (customize it)
        const updateData = {
          session_date: lessonPlanForm.session_date || null,
          title_override: lessonPlanForm.title_override.trim() || null,
          content_override: lessonPlanForm.content_override.trim() || null,
          duration_override: lessonPlanForm.duration_override ? parseInt(lessonPlanForm.duration_override) : null,
          objectives_override: lessonPlanForm.objectives_override.trim() || null,
          materials_override: lessonPlanForm.materials_override.trim() || null,
          notes: lessonPlanForm.notes.trim() || null,
          updated_at: new Date().toISOString(),
        };

        const { error } = await (supabase as any)
          .from("group_lesson_plans")
          .update(updateData)
          .eq("id", editingLessonPlan.id);

        if (error) throw error;
        toast({ title: "Plan de cours modifié" });
      } else {
        // Apply template to group (admin only)
        const insertData = {
          group_id: groupId,
          template_id: selectedTemplateId,
          applied_by: profile.id,
          session_date: lessonPlanForm.session_date || null,
          title_override: lessonPlanForm.title_override.trim() || null,
          content_override: lessonPlanForm.content_override.trim() || null,
          duration_override: lessonPlanForm.duration_override ? parseInt(lessonPlanForm.duration_override) : null,
          objectives_override: lessonPlanForm.objectives_override.trim() || null,
          materials_override: lessonPlanForm.materials_override.trim() || null,
          notes: lessonPlanForm.notes.trim() || null,
        };

        const { error } = await (supabase as any)
          .from("group_lesson_plans")
          .insert(insertData);

        if (error) throw error;
        toast({ title: "Plan de cours appliqué au groupe" });
      }

      resetLessonPlanForm();
      setIsLessonPlanOpen(false);
      fetchGroupData();
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de sauvegarder le plan de cours", variant: "destructive" });
    }
  }

  async function handleCancelLessonPlan() {
    if (!cancellingPlan) return;

    try {
      const { error } = await (supabase as any)
        .from("group_lesson_plans")
        .update({
          is_cancelled: true,
          cancellation_reason: cancellationReason.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", cancellingPlan.id);

      if (error) throw error;
      toast({ title: "Plan de cours annulé" });
      setCancellingPlan(null);
      setCancellationReason("");
      setIsCancelPlanOpen(false);
      fetchGroupData();
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible d'annuler le plan de cours", variant: "destructive" });
    }
  }

  async function handleRestoreLessonPlan(planId: string) {
    try {
      const { error } = await (supabase as any)
        .from("group_lesson_plans")
        .update({
          is_cancelled: false,
          cancellation_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", planId);

      if (error) throw error;
      toast({ title: "Plan de cours restauré" });
      fetchGroupData();
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de restaurer le plan de cours", variant: "destructive" });
    }
  }

  async function handleDeleteLessonPlan(planId: string) {
    try {
      const { error } = await (supabase as any)
        .from("group_lesson_plans")
        .delete()
        .eq("id", planId);

      if (error) throw error;
      toast({ title: "Plan de cours supprimé" });
      fetchGroupData();
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de supprimer le plan de cours", variant: "destructive" });
    }
  }

  function handleEditLessonPlan(plan: LessonPlan) {
    setEditingLessonPlan(plan);
    setSelectedTemplateId(plan.template_id || "");
    setLessonPlanForm({
      session_date: plan.session_date || "",
      title_override: plan.title_override || "",
      content_override: plan.content_override || "",
      duration_override: plan.duration_override?.toString() || "",
      objectives_override: plan.objectives_override || "",
      materials_override: plan.materials_override || "",
      notes: plan.notes || "",
    });
    setIsLessonPlanOpen(true);
  }

  function openCancelDialog(plan: LessonPlan) {
    setCancellingPlan(plan);
    setCancellationReason("");
    setIsCancelPlanOpen(true);
  }

  function resetLessonPlanForm() {
    setLessonPlanForm({
      session_date: "",
      title_override: "",
      content_override: "",
      duration_override: "",
      objectives_override: "",
      materials_override: "",
      notes: "",
    });
    setSelectedTemplateId("");
    setEditingLessonPlan(null);
  }

  function openNewLessonPlan() {
    resetLessonPlanForm();
    setIsLessonPlanOpen(true);
  }

  function getAttendanceStatus(profileId: string) {
    const attendance = attendances.find((a) => a.profile_id === profileId);
    if (!attendance) return null;
    return attendance.status;
  }

  if (isLoading || profileLoading) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Groupe non trouvé</p>
            <Button variant="outline" className="mt-4" onClick={() => router.push("/admin/groups")}>
              Retour aux groupes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/admin/groups")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: group.color_code || "#FF6600" }}
              />
              <h1 className="text-2xl font-bold">{group.name}</h1>
              <Badge className={getCategoryBadgeColor(group.category)}>
                {getCategoryLabel(group.category)}
              </Badge>
              {!group.is_active && <Badge variant="secondary">Inactif</Badge>}
            </div>
            <p className="text-muted-foreground mt-1">{group.description}</p>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="flex gap-2">
          {(isCoach || isAdmin) && (
            <Button variant="outline" onClick={() => setIsAbsenceOpen(true)}>
              <AlertCircle className="h-4 w-4 mr-2" />
              Signaler absence
            </Button>
          )}
          {(isCoach || isAdmin) && (
            <Button variant="outline" onClick={() => setIsChangeRequestOpen(true)}>
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Recommander changement
            </Button>
          )}
        </div>
      </div>

      {/* Infos rapides */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-xs text-muted-foreground">Membres</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{staff.length}</div>
            <p className="text-xs text-muted-foreground">Coachs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{group.season}</div>
            <p className="text-xs text-muted-foreground">Saison</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">Niv. {group.level_required}</div>
            <p className="text-xs text-muted-foreground">Niveau requis</p>
          </CardContent>
        </Card>
      </div>

      {/* Prochaine séance */}
      {nextEvent && (
        <Card className="border-club-orange/30 bg-club-orange/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-club-orange" />
              Prochaine séance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{nextEvent.title}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(nextEvent.start_date).toLocaleDateString("fr-CA", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}{" "}
                  à {nextEvent.start_time?.slice(0, 5)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">
                  {attendances.filter((a) => a.status === "present").length} présents
                </p>
                <p className="text-xs text-muted-foreground">
                  sur {members.length} membres
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Onglets principaux */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Membres</span>
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Coachs</span>
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            <span className="hidden sm:inline">Plans</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Discussion</span>
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex items-center gap-2">
            <StickyNote className="h-4 w-4" />
            <span className="hidden sm:inline">Notes</span>
          </TabsTrigger>
        </TabsList>

        {/* Onglet Membres */}
        <TabsContent value="members" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Membres du groupe ({members.length})</h3>
            {isAdmin && (
              <Button onClick={() => setIsAddMemberOpen(true)} className="bg-club-orange hover:bg-club-orange/90">
                <UserPlus className="h-4 w-4 mr-2" />
                Ajouter un membre
              </Button>
            )}
          </div>

          <div className="grid gap-3">
            {members.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun membre dans ce groupe</p>
                </CardContent>
              </Card>
            ) : (
              members.map((member) => {
                const status = getAttendanceStatus(member.profile_id);
                return (
                  <Card key={member.profile_id}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {getInitials(member.profiles?.first_name, member.profiles?.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {member.profiles?.first_name} {member.profiles?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {member.profiles?.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {nextEvent && (
                            <Badge
                              variant={
                                status === "present"
                                  ? "default"
                                  : status === "absent"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {status === "present"
                                ? "Présent"
                                : status === "absent"
                                ? "Absent"
                                : "Non confirmé"}
                            </Badge>
                          )}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveMember(member.profile_id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Onglet Coachs */}
        <TabsContent value="staff" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Coachs assignés ({staff.length})</h3>
            {isAdmin && (
              <Button onClick={() => setIsAddStaffOpen(true)} className="bg-club-orange hover:bg-club-orange/90">
                <UserPlus className="h-4 w-4 mr-2" />
                Assigner un coach
              </Button>
            )}
          </div>

          <div className="grid gap-3">
            {staff.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun coach assigné</p>
                </CardContent>
              </Card>
            ) : (
              staff.map((s) => (
                <Card key={s.profile_id}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {getInitials(s.profiles?.first_name || "", s.profiles?.last_name || "")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {s.profiles?.first_name} {s.profiles?.last_name}
                          </p>
                          <Badge variant="outline">{getStaffRoleLabel(s.default_role)}</Badge>
                        </div>
                      </div>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveStaff(s.profile_id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Onglet Plans de cours */}
        <TabsContent value="plans" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Plans de cours ({lessonPlans.filter(p => !p.is_cancelled).length})</h3>
            {isAdmin && (
              <Button onClick={openNewLessonPlan} className="bg-club-orange hover:bg-club-orange/90">
                <Plus className="h-4 w-4 mr-2" />
                Appliquer un plan
              </Button>
            )}
          </div>

          {/* Info box for coaches */}
          {isCoach && !isAdmin && (
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
              <CardContent className="py-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  💡 Les plans de cours sont définis par l'administration. Vous pouvez les adapter pour ce groupe si nécessaire.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {lessonPlans.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun plan de cours assigné</p>
                  {isAdmin && (
                    <p className="text-sm mt-2">
                      Appliquez un plan de cours modèle à ce groupe
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              lessonPlans.map((plan) => {
                const title = getPlanDisplayValue(plan, 'title') as string || "Sans titre";
                const content = getPlanDisplayValue(plan, 'content') as string || "";
                const duration = getPlanDisplayValue(plan, 'duration_minutes') as number | null;
                const objectives = getPlanDisplayValue(plan, 'objectives') as string | null;
                const materials = getPlanDisplayValue(plan, 'materials') as string | null;
                const isCustomized = plan.title_override || plan.content_override || plan.duration_override || plan.objectives_override || plan.materials_override;

                return (
                  <Card 
                    key={plan.id} 
                    className={`hover:shadow-md transition-shadow ${plan.is_cancelled ? 'opacity-60 border-red-200' : ''}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className={`text-lg ${plan.is_cancelled ? 'line-through' : ''}`}>
                              {title}
                            </CardTitle>
                            {plan.is_cancelled && (
                              <Badge variant="destructive">Annulé</Badge>
                            )}
                            {isCustomized && !plan.is_cancelled && (
                              <Badge variant="outline" className="text-xs">Adapté</Badge>
                            )}
                          </div>
                          <CardDescription className="flex flex-wrap items-center gap-2">
                            {plan.template && (
                              <span className="flex items-center gap-1 text-xs">
                                <FileText className="h-3 w-3" />
                                Modèle: {plan.template.title}
                              </span>
                            )}
                            {plan.session_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(plan.session_date).toLocaleDateString("fr-CA", {
                                  weekday: "long",
                                  day: "numeric",
                                  month: "long",
                                })}
                              </span>
                            )}
                            {duration && (
                              <Badge variant="secondary">{duration} min</Badge>
                            )}
                          </CardDescription>
                        </div>
                        {(isCoach || isAdmin) && (
                          <div className="flex gap-1">
                            {!plan.is_cancelled && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditLessonPlan(plan)}
                                  aria-label="Adapter le plan de cours"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openCancelDialog(plan)}
                                  className="text-orange-600 hover:text-orange-700"
                                  aria-label="Annuler le plan de cours"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {plan.is_cancelled && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRestoreLessonPlan(plan.id)}
                                className="text-green-600 hover:text-green-700"
                                aria-label="Restaurer le plan de cours"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (window.confirm("Êtes-vous sûr de vouloir supprimer ce plan de cours ?")) {
                                    handleDeleteLessonPlan(plan.id);
                                  }
                                }}
                                className="text-destructive hover:text-destructive"
                                aria-label="Supprimer le plan de cours"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {plan.is_cancelled && plan.cancellation_reason && (
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                          <p className="text-xs font-medium text-red-800 dark:text-red-200 mb-1">
                            ❌ Raison de l'annulation
                          </p>
                          <p className="text-sm">{plan.cancellation_reason}</p>
                        </div>
                      )}

                      {!plan.is_cancelled && (
                        <>
                          <div>
                            <p className="text-sm whitespace-pre-wrap">{content}</p>
                          </div>
                          
                          {objectives && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                              <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">
                                🎯 Objectifs
                              </p>
                              <p className="text-sm">{objectives}</p>
                            </div>
                          )}

                          {materials && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                              <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">
                                🛠️ Matériel
                              </p>
                              <p className="text-sm">{materials}</p>
                            </div>
                          )}

                          {plan.notes && (
                            <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-3">
                              <p className="text-xs font-medium text-gray-800 dark:text-gray-200 mb-1">
                                📝 Notes du groupe
                              </p>
                              <p className="text-sm">{plan.notes}</p>
                            </div>
                          )}
                        </>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        <span>
                          Appliqué par {plan.appliedByProfile?.first_name} {plan.appliedByProfile?.last_name}
                        </span>
                        <span>
                          {new Date(plan.created_at).toLocaleDateString("fr-CA")}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Onglet Discussion */}
        <TabsContent value="chat" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Discussion du groupe</CardTitle>
              <CardDescription>
                Échangez avec les autres coachs et l'administration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-64 border rounded-lg p-4 overflow-y-auto bg-muted/30">
                  {chatMessages.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Aucun message pour l'instant
                    </p>
                  ) : (
                    chatMessages.map((msg) => (
                      <div key={msg.id} className="mb-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {msg.author?.first_name} {msg.author?.last_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.created_at).toLocaleString("fr-CA")}
                          </span>
                        </div>
                        <p className="text-sm bg-background rounded-lg p-2">
                          {msg.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Écrire un message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  />
                  <Button onClick={handleSendMessage} className="bg-club-orange hover:bg-club-orange/90">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Notes */}
        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notes internes</CardTitle>
              <CardDescription>
                Notes visibles uniquement par les coachs et l'administration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Note du groupe */}
              {group.internal_notes && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                    📝 Note du groupe
                  </p>
                  <p className="text-sm">{group.internal_notes}</p>
                </div>
              )}

              <Separator />

              {/* Ajouter une note */}
              <div className="space-y-2">
                <Label>Ajouter une note</Label>
                <Textarea
                  placeholder="Écrire une note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleSendNote} disabled={!newNote.trim()}>
                  <StickyNote className="h-4 w-4 mr-2" />
                  Ajouter la note
                </Button>
              </div>

              {/* Liste des notes */}
              {notes.length > 0 && (
                <div className="space-y-3">
                  {notes.map((note) => (
                    <div key={note.id} className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {note.author?.first_name} {note.author?.last_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(note.created_at).toLocaleDateString("fr-CA")}
                        </span>
                      </div>
                      <p className="text-sm">{note.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Ajouter un membre */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un membre</DialogTitle>
            <DialogDescription>
              Membres {getCategoryLabel(group.category)} disponibles
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un membre..." />
              </SelectTrigger>
              <SelectContent>
                {availableMembers.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Aucun membre disponible
                  </SelectItem>
                ) : (
                  availableMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.first_name} {m.last_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddMember} disabled={!selectedMemberId} className="bg-club-orange hover:bg-club-orange/90">
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Assigner un coach */}
      <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assigner un coach</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Coach</Label>
              <Select value={selectedCoachId} onValueChange={setSelectedCoachId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un coach..." />
                </SelectTrigger>
                <SelectContent>
                  {availableCoaches
                    .filter((c) => !staff.some((s) => s.profile_id === c.id))
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.first_name} {c.last_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddStaffOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddStaff} disabled={!selectedCoachId} className="bg-club-orange hover:bg-club-orange/90">
              Assigner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Recommander changement de groupe */}
      <Dialog open={isChangeRequestOpen} onOpenChange={setIsChangeRequestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recommander un changement de groupe</DialogTitle>
            <DialogDescription>
              La demande sera envoyée à l'administration pour approbation
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Membre</Label>
              <Select
                value={changeRequestForm.member_id}
                onValueChange={(v) => setChangeRequestForm({ ...changeRequestForm, member_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un membre..." />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.profile_id} value={m.profile_id}>
                      {m.profiles?.first_name} {m.profiles?.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nouveau groupe</Label>
              <Select
                value={changeRequestForm.to_group_id}
                onValueChange={(v) => setChangeRequestForm({ ...changeRequestForm, to_group_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un groupe..." />
                </SelectTrigger>
                <SelectContent>
                  {allGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name} ({getCategoryLabel(g.category)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Raison (optionnel)</Label>
              <Textarea
                placeholder="Expliquer la raison du changement..."
                value={changeRequestForm.reason}
                onChange={(e) => setChangeRequestForm({ ...changeRequestForm, reason: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChangeRequestOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleRequestChange} className="bg-club-orange hover:bg-club-orange/90">
              Envoyer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Signaler absence */}
      <Dialog open={isAbsenceOpen} onOpenChange={setIsAbsenceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Signaler une absence</DialogTitle>
            <DialogDescription>
              Les autres coachs et l'administration seront notifiés
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={absenceForm.date}
                onChange={(e) => setAbsenceForm({ ...absenceForm, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Raison (optionnel)</Label>
              <Textarea
                placeholder="Raison de l'absence..."
                value={absenceForm.reason}
                onChange={(e) => setAbsenceForm({ ...absenceForm, reason: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAbsenceOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleReportAbsence} className="bg-club-orange hover:bg-club-orange/90">
              Signaler l'absence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Plan de cours */}
      <Dialog open={isLessonPlanOpen} onOpenChange={(open) => {
        setIsLessonPlanOpen(open);
        if (!open) resetLessonPlanForm();
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingLessonPlan ? "Adapter le plan de cours" : "Appliquer un plan de cours"}
            </DialogTitle>
            <DialogDescription>
              {editingLessonPlan 
                ? "Personnalisez ce plan pour ce groupe. Laissez vide pour utiliser les valeurs du modèle."
                : "Sélectionnez un plan modèle et personnalisez-le si nécessaire"
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {/* Template selection - only for new plans */}
            {!editingLessonPlan && (
              <div className="space-y-2">
                <Label>Plan de cours modèle *</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un modèle..." />
                  </SelectTrigger>
                  <SelectContent>
                    {lessonPlanTemplates.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Aucun modèle disponible
                      </SelectItem>
                    ) : (
                      lessonPlanTemplates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.title} {t.category && `(${getCategoryLabel(t.category)})`}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Show template preview when selected */}
            {selectedTemplateId && !editingLessonPlan && (
              <Card className="bg-muted/50">
                <CardContent className="py-3">
                  {(() => {
                    const template = lessonPlanTemplates.find(t => t.id === selectedTemplateId);
                    if (!template) return null;
                    return (
                      <div className="space-y-2 text-sm">
                        <p className="font-medium">{template.title}</p>
                        <p className="text-muted-foreground line-clamp-2">{template.content}</p>
                        {template.duration_minutes && (
                          <Badge variant="secondary">{template.duration_minutes} min</Badge>
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Show current template info when editing */}
            {editingLessonPlan?.template && (
              <Card className="bg-muted/50">
                <CardContent className="py-3">
                  <div className="space-y-2 text-sm">
                    <p className="text-xs text-muted-foreground">Basé sur le modèle:</p>
                    <p className="font-medium">{editingLessonPlan.template.title}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Separator />

            <div className="space-y-2">
              <Label>Date de séance</Label>
              <Input
                type="date"
                value={lessonPlanForm.session_date}
                onChange={(e) => setLessonPlanForm({ ...lessonPlanForm, session_date: e.target.value })}
              />
            </div>

            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground">
                Adaptations pour ce groupe (optionnel)
              </p>

              <div className="space-y-2">
                <Label>Titre personnalisé</Label>
                <Input
                  placeholder="Laisser vide pour utiliser le titre du modèle"
                  value={lessonPlanForm.title_override}
                  onChange={(e) => setLessonPlanForm({ ...lessonPlanForm, title_override: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Durée personnalisée (minutes)</Label>
                <Input
                  type="number"
                  placeholder="Laisser vide pour utiliser la durée du modèle"
                  value={lessonPlanForm.duration_override}
                  onChange={(e) => setLessonPlanForm({ ...lessonPlanForm, duration_override: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Contenu personnalisé</Label>
                <Textarea
                  placeholder="Laisser vide pour utiliser le contenu du modèle"
                  value={lessonPlanForm.content_override}
                  onChange={(e) => setLessonPlanForm({ ...lessonPlanForm, content_override: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Objectifs personnalisés</Label>
                <Textarea
                  placeholder="Laisser vide pour utiliser les objectifs du modèle"
                  value={lessonPlanForm.objectives_override}
                  onChange={(e) => setLessonPlanForm({ ...lessonPlanForm, objectives_override: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Matériel personnalisé</Label>
                <Textarea
                  placeholder="Laisser vide pour utiliser le matériel du modèle"
                  value={lessonPlanForm.materials_override}
                  onChange={(e) => setLessonPlanForm({ ...lessonPlanForm, materials_override: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes pour ce groupe</Label>
                <Textarea
                  placeholder="Notes spécifiques à ce groupe..."
                  value={lessonPlanForm.notes}
                  onChange={(e) => setLessonPlanForm({ ...lessonPlanForm, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsLessonPlanOpen(false);
              resetLessonPlanForm();
            }}>
              Annuler
            </Button>
            <Button 
              onClick={handleSaveLessonPlan} 
              disabled={!editingLessonPlan && !selectedTemplateId}
              className="bg-club-orange hover:bg-club-orange/90"
            >
              {editingLessonPlan ? "Enregistrer" : "Appliquer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Annuler un plan de cours */}
      <Dialog open={isCancelPlanOpen} onOpenChange={(open) => {
        setIsCancelPlanOpen(open);
        if (!open) {
          setCancellingPlan(null);
          setCancellationReason("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Annuler le plan de cours</DialogTitle>
            <DialogDescription>
              Le plan sera marqué comme annulé mais restera visible
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Raison de l'annulation</Label>
              <Textarea
                placeholder="Ex: Mauvaises conditions météo, absence de coach..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCancelPlanOpen(false);
              setCancellingPlan(null);
              setCancellationReason("");
            }}>
              Retour
            </Button>
            <Button 
              onClick={handleCancelLessonPlan}
              variant="destructive"
            >
              Confirmer l'annulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
