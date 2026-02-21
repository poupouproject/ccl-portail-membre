"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import type { Profile, RelationType } from "@/types/database";

interface ProfileAccess {
  profile: Profile;
  relation: RelationType;
}

interface ProfileAccessRow {
  relation: string;
  profile: Profile | null;
}

interface ProfileContextType {
  user: User | null;
  profiles: ProfileAccess[];
  activeProfile: Profile | null;
  setActiveProfile: (profile: Profile) => void;
  isLoading: boolean;
  isCoach: boolean;
  isAdmin: boolean;
  isCoordinator: boolean;
  isParent: boolean;
  hasChildren: boolean;
  refetch: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profiles, setProfiles] = useState<ProfileAccess[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfiles = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_profile_access")
        .select(`
          relation,
          profile:profiles(*)
        `)
        .eq("user_id", userId);

      if (error) {
        console.error("Erreur lors du chargement des profils:", error.message || error);
        console.error("Détails:", error);
        setProfiles([]);
        setActiveProfile(null);
        return;
      }

      if (data && data.length > 0) {
        const rawData = data as unknown as ProfileAccessRow[];
        const profileAccess = rawData
          .filter((item) => item.profile)
          .map((item) => ({
            profile: item.profile as Profile,
            relation: item.relation as RelationType,
          }));

        setProfiles(profileAccess);

        // Définir le profil actif (self en priorité)
        const selfProfile = profileAccess.find((p) => p.relation === "self");
        setActiveProfile(selfProfile?.profile || profileAccess[0]?.profile || null);
      } else {
        // Pas de profils trouvés
        setProfiles([]);
        setActiveProfile(null);
      }
    } catch (err) {
      console.error("Exception lors du chargement des profils:", err);
      setProfiles([]);
      setActiveProfile(null);
    }
  }, []);

  const refetch = useCallback(async () => {
    if (user) {
      await fetchProfiles(user.id);
    }
  }, [user, fetchProfiles]);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    
    // Timeout de sécurité pour éviter les loading infinis (10 secondes)
    timeoutId = setTimeout(() => {
      if (isMounted && isLoading) {
        console.warn("ProfileProvider: Timeout de chargement atteint, forçage de isLoading à false");
        setIsLoading(false);
      }
    }, 10000);
    
    // Vérifier la session initiale
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfiles(session.user.id);
      }
      if (isMounted) {
        setIsLoading(false);
        if (timeoutId) clearTimeout(timeoutId);
      }
    }).catch((error) => {
      console.error("Erreur lors de getSession:", error);
      if (isMounted) {
        setIsLoading(false);
        if (timeoutId) clearTimeout(timeoutId);
      }
    });

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        // Ignorer les événements INITIAL_SESSION car ils sont gérés par getSession()
        if (event === "INITIAL_SESSION") return;
        
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfiles(session.user.id);
        } else {
          setProfiles([]);
          setActiveProfile(null);
        }
      }
    );

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [fetchProfiles]);

  const isCoach = activeProfile?.role === "coach" || activeProfile?.role === "admin" || activeProfile?.is_coordinator === true;
  const isAdmin = activeProfile?.role === "admin" || activeProfile?.is_admin === true;
  const isCoordinator = activeProfile?.is_coordinator === true || activeProfile?.role === "admin" || activeProfile?.role === "coach";
  // Vérifie si l'utilisateur a accès à des profils d'enfants (relation parent ou guardian)
  const hasChildren = profiles.some((p) => p.relation === "parent" || p.relation === "guardian");
  // Vérifie si le profil actif est celui d'un parent (self avec accès enfants ou role explicitement parent)
  const selfProfile = profiles.find((p) => p.relation === "self");
  const isParent = activeProfile?.role === "parent" || (hasChildren && activeProfile?.id === selfProfile?.profile.id);

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
        isCoordinator,
        isParent,
        hasChildren,
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
