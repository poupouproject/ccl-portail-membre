"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, MessageSquare, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetIdentity, usePermissions } from "@refinedev/core";
import type { Profile } from "@/types/database";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresStaff?: boolean;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/calendar", label: "Agenda", icon: Calendar },
  { href: "/team", label: "Équipe", icon: MessageSquare },
  { href: "/admin", label: "Admin", icon: Shield, requiresStaff: true },
];

export function BottomNav() {
  const pathname = usePathname();
  const { data: identity, isLoading } = useGetIdentity<{ profile: Profile }>();
  const { data: permissions } = usePermissions<{
    isAdmin: boolean;
    isCoach: boolean;
  }>();

  const isAdmin = permissions?.isAdmin ?? false;
  const isCoach = permissions?.isCoach ?? false;

  const filteredNavItems = navItems.filter((item) => {
    if (!item.requiresStaff) return true;
    if (isLoading || !identity) return false;
    return isAdmin || isCoach;
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg pb-safe">
      <div className="container mx-auto max-w-lg">
        <div className="flex items-center justify-around h-16">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors no-select",
                  isActive
                    ? "text-club-orange"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
