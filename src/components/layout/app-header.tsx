"use client";

import { Bike, ChevronDown, LogOut } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function AppHeader() {
  const { profiles, activeProfile, setActiveProfile, isLoading } = useProfile();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (isLoading) {
    return (
      <header className="sticky top-0 z-40 bg-white border-b">
        <div className="container mx-auto max-w-lg px-4 h-14 flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b">
      <div className="container mx-auto max-w-lg px-4 h-14 flex items-center justify-between">
        {/* Logo et sélecteur de profil */}
        <div className="flex items-center gap-2">
          <Bike className="h-6 w-6 text-club-orange" />
          
          {/* Profile Switcher */}
          {profiles.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 font-semibold hover:text-club-orange transition-colors">
                {activeProfile?.first_name || "Profil"}
                <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>Changer de profil</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {profiles.map(({ profile, relation }) => (
                  <DropdownMenuItem
                    key={profile.id}
                    onClick={() => setActiveProfile(profile)}
                    className={activeProfile?.id === profile.id ? "bg-accent" : ""}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(profile.first_name, profile.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="text-sm">
                          {profile.first_name} {profile.last_name}
                        </span>
                        {relation !== "self" && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({relation === "parent" ? "Enfant" : "Tuteur"})
                          </span>
                        )}
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="font-semibold">
              {activeProfile?.first_name || "CCL"}
            </span>
          )}
        </div>

        {/* Avatar et déconnexion */}
        <DropdownMenu>
          <DropdownMenuTrigger className="focus:outline-none">
            <Avatar className="h-8 w-8">
              <AvatarImage src={activeProfile?.avatar_url || undefined} />
              <AvatarFallback>
                {activeProfile
                  ? getInitials(activeProfile.first_name, activeProfile.last_name)
                  : "?"}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              {activeProfile?.first_name} {activeProfile?.last_name}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
