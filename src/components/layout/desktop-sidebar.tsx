"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Calendar, GraduationCap, MessageSquare, Shield, MapPin, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetIdentity, usePermissions } from "@refinedev/core";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { Profile } from "@/types/database";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const mainNavItems: NavItem[] = [
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/calendar", label: "Calendrier", icon: Calendar },
  { href: "/team", label: "Équipe", icon: MessageSquare },
];

const adminNavItems: NavItem[] = [
  { href: "/admin", label: "Tableau de bord", icon: Shield },
  { href: "/admin/events", label: "Événements", icon: Calendar },
  { href: "/admin/groups", label: "Groupes", icon: Users, adminOnly: true },
  { href: "/admin/members", label: "Membres", icon: Users, adminOnly: true },
  { href: "/admin/locations", label: "Emplacements", icon: MapPin },
  { href: "/admin/announcements", label: "Annonces", icon: MessageSquare },
  { href: "/admin/academy", label: "Académie", icon: GraduationCap },
];

export function DesktopSidebar() {
  const pathname = usePathname();
  const { data: identity, isLoading } = useGetIdentity<{ profile: Profile }>({});
  const { data: permissions } = usePermissions<{
    isAdmin: boolean;
    isCoach: boolean;
  }>({});

  const isAdmin = permissions?.isAdmin ?? false;
  const isCoach = permissions?.isCoach ?? false;

  if (isLoading || !identity) return null;

  const showAdminNav = isAdmin || isCoach;

  const filteredAdminItems = isAdmin 
    ? adminNavItems 
    : adminNavItems.filter(item => !item.adminOnly);

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:border-r bg-white z-30">
      {/* Logo */}
      <div className="h-14 flex items-center px-6 border-b">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-club-orange flex items-center justify-center">
            <span className="text-white font-bold text-sm">CCL</span>
          </div>
          <span className="font-semibold text-lg">Club Cycliste</span>
        </Link>
      </div>

      <ScrollArea className="flex-1 py-4">
        {/* Navigation principale */}
        <div className="px-3 space-y-1">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Navigation
          </p>
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-club-orange/10 text-club-orange"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Navigation admin */}
        {showAdminNav && (
          <>
            <Separator className="my-4" />
            <div className="px-3 space-y-1">
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {isAdmin ? "Administration" : "Espace Coach"}
              </p>
              {filteredAdminItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-club-orange/10 text-club-orange"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="text-xs text-muted-foreground text-center">
          Club Cycliste de Lévis © 2026
        </div>
      </div>
    </aside>
  );
}
