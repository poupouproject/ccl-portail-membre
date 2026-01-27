"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, GraduationCap, MessageSquare, User, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/use-profile";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ("admin" | "coach" | "athlete")[];
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/calendar", label: "Agenda", icon: Calendar },
  { href: "/academy", label: "Académie", icon: GraduationCap, roles: ["admin", "coach"] },
  { href: "/team", label: "Équipe", icon: MessageSquare },
  { href: "/admin", label: "Admin", icon: Shield, roles: ["admin", "coach"] },
  { href: "/profile", label: "Profil", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const { activeProfile, isLoading } = useProfile();

  const filteredNavItems = navItems.filter((item) => {
    if (!item.roles) return true;
    if (isLoading || !activeProfile) return false;
    return item.roles.includes(activeProfile.role as "admin" | "coach" | "athlete");
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
