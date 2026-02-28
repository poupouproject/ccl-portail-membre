"use client";

import { useGetIdentity } from "@refinedev/core";
import type { User } from "@supabase/supabase-js";
import type { Profile, RelationType } from "@/types/database";
import { useActiveContext } from "./use-active-context";

interface ProfileAccess {
  profile: Profile;
  relation: RelationType;
}

interface IdentityData {
  id: string;
  name: string;
  avatar: string | null;
  profile: Profile;
  profiles: ProfileAccess[];
  user: User;
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

/**
 * Hook de compatibilité qui expose la même interface que l'ancien ProfileProvider
 * mais utilise Refine (useGetIdentity / useActiveContext) en interne.
 * Les permissions (isAdmin, isCoach, isCoordinator) proviennent de useActiveContext
 * afin de respecter le contexte actif sélectionné par l'utilisateur.
 */
export function useProfile(): ProfileContextType {
  const { data: identity, isLoading: identityLoading, refetch: refetchIdentity } =
    useGetIdentity<IdentityData>({});
  const {
    isAdmin,
    isCoach,
    isCoordinator,
    isLoading: contextLoading,
  } = useActiveContext();

  const user = identity?.user ?? null;
  const profiles = identity?.profiles ?? [];
  const activeProfile = identity?.profile ?? null;
  const isLoading = identityLoading || contextLoading;
  const hasChildren = profiles.some(
    (p) => p.relation === "parent" || p.relation === "guardian"
  );
  const selfProfile = profiles.find((p) => p.relation === "self");
  const isParent =
    activeProfile?.role === "parent" ||
    (hasChildren && activeProfile?.id === selfProfile?.profile.id);

  const setActiveProfile = () => {
    // No-op in Refine mode — profile selection is managed by identity
  };

  const refetch = async () => {
    await refetchIdentity();
  };

  return {
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
  };
}

// Re-export ProfileProvider as no-op for backward compatibility
export function ProfileProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
