"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Calendar,
  UserPlus,
  Settings,
  MessageSquare,
  Megaphone,
  GraduationCap,
} from "lucide-react";

interface AdminStat {
  label: string;
  value: number;
  icon: React.ReactNode;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { isLoading: profileLoading, isAdmin, isCoach } = useProfile();
  const [stats, setStats] = useState<AdminStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profileLoading && !isAdmin && !isCoach) {
      router.push("/dashboard");
      return;
    }
    fetchStats();
  }, [profileLoading, isAdmin, isCoach, router]);

  async function fetchStats() {
    setIsLoading(true);
    try {
      const [
        { count: groupCount },
        { count: memberCount },
        { count: eventCount },
        { count: coachCount },
      ] = await Promise.all([
        supabase.from("groups").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "athlete"),
        supabase.from("events").select("*", { count: "exact", head: true }).gte("start_time", new Date().toISOString()),
        supabase.from("profiles").select("*", { count: "exact", head: true }).in("role", ["coach", "admin"]),
      ]);

      setStats([
        { label: "Groupes", value: groupCount || 0, icon: <Users className="h-5 w-5" /> },
        { label: "Athlètes", value: memberCount || 0, icon: <UserPlus className="h-5 w-5" /> },
        { label: "Événements à venir", value: eventCount || 0, icon: <Calendar className="h-5 w-5" /> },
        { label: "Staff", value: coachCount || 0, icon: <Settings className="h-5 w-5" /> },
      ]);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setIsLoading(false);
    }
  }

  if (profileLoading || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  const adminMenuItems = [
    { label: "Groupes", description: "Gérer les groupes d'athlètes", icon: Users, href: "/admin/groups", adminOnly: true },
    { label: "Événements", description: "Créer et gérer les événements", icon: Calendar, href: "/admin/events", adminOnly: false },
    { label: "Membres", description: "Gérer les athlètes et familles", icon: UserPlus, href: "/admin/members", adminOnly: true },
    { label: "Annonces", description: "Publier des annonces", icon: Megaphone, href: "/admin/announcements", adminOnly: false },
    { label: "Académie", description: "Gérer les vidéos de formation", icon: GraduationCap, href: "/admin/academy", adminOnly: false },
    { label: "Messages", description: "Chat staff coordinateurs", icon: MessageSquare, href: "/admin/staff-chat", adminOnly: false },
  ];

  const filteredMenuItems = isAdmin 
    ? adminMenuItems 
    : adminMenuItems.filter(item => !item.adminOnly);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {isAdmin ? "Administration" : "Espace Coach"}
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-club-orange/10 text-club-orange">
                  {stat.icon}
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Menu */}
      <div className="grid gap-3">
        {filteredMenuItems.map((item) => (
          <Card
            key={item.href}
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => router.push(item.href)}
          >
            <CardHeader className="py-4">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-muted">
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">{item.label}</CardTitle>
                  <CardDescription className="text-sm">{item.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
