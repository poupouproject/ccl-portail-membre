"use client";

import type { AuthProvider } from "@refinedev/core";
import { supabase } from "@/lib/supabase";
import type { Profile, RelationType } from "@/types/database";

interface ProfileAccessRow {
  relation: string;
  profile: Profile | null;
}

export const authProvider: AuthProvider = {
  login: async ({ provider, email, password }) => {
    if (provider) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        return {
          success: false,
          error: { name: "LoginError", message: error.message },
        };
      }
      return { success: true };
    }

    // Email/password login
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return {
        success: false,
        error: { name: "LoginError", message: error.message },
      };
    }
    return { success: true, redirectTo: "/dashboard" };
  },

  logout: async () => {
    await supabase.auth.signOut();
    return { success: true, redirectTo: "/login" };
  },

  check: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return { authenticated: false, redirectTo: "/login" };
    }

    return { authenticated: true };
  },

  getIdentity: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("user_profile_access")
      .select(
        `
        relation,
        profile:profiles(*)
      `
      )
      .eq("user_id", user.id);

    if (error || !data || data.length === 0) return null;

    const rawData = data as unknown as ProfileAccessRow[];
    const profiles = rawData
      .filter((item) => item.profile)
      .map((item) => ({
        profile: item.profile as Profile,
        relation: item.relation as RelationType,
      }));

    const selfAccess = profiles.find((p) => p.relation === "self");
    const activeProfile =
      selfAccess?.profile || profiles[0]?.profile || null;

    if (!activeProfile) return null;

    return {
      id: user.id,
      name: `${activeProfile.first_name} ${activeProfile.last_name}`,
      avatar: activeProfile.avatar_url,
      profile: activeProfile,
      profiles,
      user,
    };
  },

  getPermissions: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from("user_profile_access")
      .select("profile:profiles(role, is_coordinator, is_admin)")
      .eq("user_id", user.id)
      .eq("relation", "self")
      .limit(1)
      .maybeSingle();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileData = data as any;
    if (!profileData?.profile) return { role: "athlete" };

    const profile = profileData.profile as {
      role: string;
      is_coordinator?: boolean;
      is_admin?: boolean;
    };

    return {
      role: profile.role,
      isAdmin: profile.role === "admin",
      isCoach: profile.role === "coach" || profile.role === "admin",
      isCoordinator:
        profile.is_coordinator === true ||
        profile.role === "admin" ||
        profile.role === "coach",
    };
  },

  onError: async (error) => {
    if (error?.status === 401 || error?.status === 403) {
      return { logout: true, redirectTo: "/login" };
    }
    return { error };
  },
};
