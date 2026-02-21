"use client";

import { useState, useEffect, useCallback } from "react";
import { useGetIdentity, usePermissions } from "@refinedev/core";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import type { UserContext, Group, RoleInfo, Profile, RelationType } from "@/types/database";

interface ActiveContextState {
  contexts: UserContext[];
  activeContext: UserContext | null;
  user: User | null;
  isLoading: boolean;
  setActiveContext: (context: UserContext) => void;
  refetch: () => Promise<void>;
  isCoach: boolean;
  isAdmin: boolean;
  isCoordinator: boolean;
  isParent: boolean;
  hasMultipleContexts: boolean;
  getChildrenContexts: () => UserContext[];
  activeGroup: Group | null;
  activeRoles: RoleInfo[];
  hasPermission: (permission: string) => boolean;
}

interface IdentityData {
  id: string;
  profile: Profile;
  profiles: { profile: Profile; relation: RelationType }[];
  user: User;
}

interface PermissionsData {
  role: string;
  isAdmin: boolean;
  isCoach: boolean;
  isCoordinator: boolean;
}

const STORAGE_KEY = "ccl_active_context";

/**
 * Hook de compatibilité qui fournit les contextes utilisateur.
 * Utilise Refine (useGetIdentity / usePermissions) pour l'auth,
 * et charge les contextes via RPC Supabase comme avant.
 */
export function useActiveContext(): ActiveContextState {
  const { data: identity, isLoading: identityLoading } =
    useGetIdentity<IdentityData>();
  const { data: permissions, isLoading: permissionsLoading } =
    usePermissions<PermissionsData>();

  const user = identity?.user ?? null;
  const [contexts, setContexts] = useState<UserContext[]>([]);
  const [activeContext, setActiveContextState] = useState<UserContext | null>(null);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [isContextLoading, setIsContextLoading] = useState(true);

  const fetchContexts = useCallback(async (userId: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("get_user_contexts", {
        user_uuid: userId,
      });

      if (error) {
        console.error("Erreur lors du chargement des contextes:", error.message);
        return [];
      }

      return (data || []) as UserContext[];
    } catch (err) {
      console.error("Exception lors du chargement des contextes:", err);
      return [];
    }
  }, []);

  const fetchGroup = useCallback(async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .maybeSingle();

      if (error) {
        console.error("Erreur lors du chargement du groupe:", error);
        return null;
      }

      return data as Group | null;
    } catch (err) {
      console.error("Exception lors du chargement du groupe:", err);
      return null;
    }
  }, []);

  const loadActiveContext = useCallback(
    async (contextsList: UserContext[]) => {
      if (contextsList.length === 0) {
        setActiveContextState(null);
        setActiveGroup(null);
        return;
      }

      const savedContextId = localStorage.getItem(STORAGE_KEY);
      let contextToActivate: UserContext | null = null;

      if (savedContextId) {
        contextToActivate =
          contextsList.find((c) => {
            if (c.subscription_id) {
              return c.subscription_id === savedContextId;
            }
            return `coach-${c.group_id}` === savedContextId;
          }) || null;
      }

      if (!contextToActivate) {
        contextToActivate =
          contextsList.find((c) => c.relation === "self") || contextsList[0];
      }

      setActiveContextState(contextToActivate);

      if (contextToActivate) {
        const group = await fetchGroup(contextToActivate.group_id);
        setActiveGroup(group);
      }
    },
    [fetchGroup]
  );

  const refetch = useCallback(async () => {
    if (user) {
      setIsContextLoading(true);
      const contextsList = await fetchContexts(user.id);
      setContexts(contextsList);
      await loadActiveContext(contextsList);
      setIsContextLoading(false);
    }
  }, [user, fetchContexts, loadActiveContext]);

  // Load contexts once identity is ready
  useEffect(() => {
    let isMounted = true;

    if (!user || identityLoading) {
      if (!identityLoading) setIsContextLoading(false);
      return;
    }

    const load = async () => {
      const contextsList = await fetchContexts(user.id);
      if (!isMounted) return;
      setContexts(contextsList);
      await loadActiveContext(contextsList);
      if (isMounted) setIsContextLoading(false);
    };
    load();

    return () => {
      isMounted = false;
    };
  }, [user, identityLoading, fetchContexts, loadActiveContext]);

  const setActiveContext = useCallback(
    async (context: UserContext) => {
      setActiveContextState(context);
      const contextId = context.subscription_id || `coach-${context.group_id}`;
      localStorage.setItem(STORAGE_KEY, contextId);
      const group = await fetchGroup(context.group_id);
      setActiveGroup(group);
      window.dispatchEvent(
        new CustomEvent("context-changed", { detail: context })
      );
    },
    [fetchGroup]
  );

  const getChildrenContexts = useCallback(() => {
    return contexts.filter(
      (c) =>
        c.context_type === "dependent" ||
        c.relation === "parent" ||
        c.relation === "guardian"
    );
  }, [contexts]);

  const isCoach = permissions?.isCoach ?? activeContext?.context_type === "coach";
  const isAdmin = permissions?.isAdmin ?? false;
  const isCoordinator = permissions?.isCoordinator ?? false;
  const isParent =
    activeContext?.context_type === "dependent" ||
    contexts.some(
      (c) => c.relation === "parent" || c.relation === "guardian"
    );
  const hasMultipleContexts = contexts.length > 1;
  const activeRoles: RoleInfo[] = activeContext?.roles || [];

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!activeContext) return false;
      return activeRoles.some((role) => {
        const perms = role.permissions as Record<string, unknown>;
        return perms[permission] === true;
      });
    },
    [activeContext, activeRoles]
  );

  const isLoading = identityLoading || permissionsLoading || isContextLoading;

  return {
    contexts,
    activeContext,
    user,
    isLoading,
    setActiveContext,
    refetch,
    isCoach,
    isAdmin,
    isCoordinator,
    isParent,
    hasMultipleContexts,
    getChildrenContexts,
    activeGroup,
    activeRoles,
    hasPermission,
  };
}

// Hook simplifié pour accéder rapidement au contexte actif
export function useCurrentContext() {
  const { activeContext, activeGroup, isLoading } = useActiveContext();
  return { context: activeContext, group: activeGroup, isLoading };
}

// Re-export ActiveContextProvider as no-op for backward compatibility
export function ActiveContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
