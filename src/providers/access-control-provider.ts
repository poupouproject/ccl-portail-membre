"use client";

import type { AccessControlProvider } from "@refinedev/core";
import { supabase } from "@/lib/supabase";

/**
 * Access control basé sur les rôles du profil membre.
 * - admin : accès complet
 * - coach : accès admin limité (pas de gestion membres/groupes)
 * - athlete/parent : accès standard
 */
export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action }) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { can: false, reason: "Non authentifié" };

    const { data } = await supabase
      .from("user_profile_access")
      .select("profile:profiles(role, is_coordinator)")
      .eq("user_id", user.id)
      .eq("relation", "self")
      .limit(1)
      .maybeSingle();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileData = data as any;
    const role = profileData?.profile?.role || "athlete";
    const isCoordinator = profileData?.profile?.is_coordinator === true;

    // Admin a accès à tout
    if (role === "admin") return { can: true };

    // Coach a accès admin limité
    if (role === "coach" || isCoordinator) {
      const coachAllowed = [
        "dashboard",
        "calendar",
        "team",
        "academy",
        "profile",
        "admin",
        "events",
        "announcements",
        "locations",
        "staff-chat",
      ];
      if (resource && coachAllowed.includes(resource)) return { can: true };
      // Membres et groupes : lecture seule pour les coachs
      if (resource === "members" || resource === "groups") {
        if (action === "list" || action === "show") return { can: true };
        return { can: false, reason: "Accès réservé aux administrateurs" };
      }
    }

    // Ressources accessibles à tous les membres authentifiés
    const memberAllowed = ["dashboard", "calendar", "team", "academy", "profile"];
    if (resource && memberAllowed.includes(resource)) return { can: true };

    return { can: false, reason: "Accès non autorisé" };
  },
  options: {
    buttons: {
      enableAccessControl: true,
      hideIfUnauthorized: true,
    },
  },
};
