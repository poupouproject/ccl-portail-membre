"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import type { Profile, RelationType } from "@/types/database";

interface ProfileAccess {
  profile: Profile;
  relation: RelationType;
}

interface ProfileContextType {
  user: User | null;
  profiles: ProfileAccess[];
  activeProfile: Profile | null;
  setActiveProfile: (profile: Profile) => void;
  isLoading: boolean;
  isCoach: boolean;
  isAdmin: boolean;
  refetch: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profiles, setProfiles] = useState<ProfileAccess[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfiles = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("user_profile_access")
      .select(`
        relation,
        profile:profiles(*)
      `)
      .eq("user_id", userId);

    if (error) {
      console.error("Erreur lors du chargement des profils:", error);
      return;
    }

    if (data && data.length > 0) {
      const profileAccess = data
        .filter((item) => item.profile)
        .map((item) => ({
          profile: item.profile as unknown as Profile,
          relation: item.relation as RelationType,
        }));

      setProfiles(profileAccess);

      // Définir le profil actif (self en priorité)
      const selfProfile = profileAccess.find((p) => p.relation === "self");
      setActiveProfile(selfProfile?.profile || profileAccess[0]?.profile || null);
    }
  }, []);

  const refetch = useCallback(async () => {
    if (user) {
      await fetchProfiles(user.id);
    }
  }, [user, fetchProfiles]);

  useEffect(() => {
    // Vérifier la session initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfiles(session.user.id);
      }
      setIsLoading(false);
    });

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfiles(session.user.id);
        } else {
          setProfiles([]);
          setActiveProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfiles]);

  const isCoach = activeProfile?.role === "coach" || activeProfile?.role === "admin";
  const isAdmin = activeProfile?.role === "admin";

  return (
    <ProfileContext.Provider
      value={{
        user,
        profiles,
        activeProfile,
        setActiveProfile,
        isLoading,
        isCoach,
        isAdmin,
        refetch,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile doit être utilisé dans un ProfileProvider");
  }
  return context;
}
