"use client";

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import type { UserContext, Group } from "@/types/database";

interface ActiveContextState {
  contexts: UserContext[];
  activeContext: UserContext | null;
  user: User | null;
  isLoading: boolean;
  setActiveContext: (context: UserContext) => void;
  refetch: () => Promise<void>;
  // Computed properties
  isCoach: boolean;
  isAdmin: boolean;
  isParent: boolean;
  hasMultipleContexts: boolean;
  // Helper to get children contexts
  getChildrenContexts: () => UserContext[];
  // Get group details for active context
  activeGroup: Group | null;
}

const STORAGE_KEY = "ccl_active_context";

const ActiveContextContext = createContext<ActiveContextState | undefined>(undefined);

export function ActiveContextProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [contexts, setContexts] = useState<UserContext[]>([]);
  const [activeContext, setActiveContextState] = useState<UserContext | null>(null);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchContexts = useCallback(async (userId: string) => {
    try {
      // Note: La fonction get_user_contexts est créée par la migration subscriptions
      // On cast temporairement en any car les types Supabase ne sont pas encore générés
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
    const { data } = await supabase
      .from("groups")
      .select("*")
      .eq("id", groupId)
      .single();
    return data as Group | null;
  }, []);

  const loadActiveContext = useCallback(
    async (userId: string, contextsList: UserContext[]) => {
      if (contextsList.length === 0) {
        setActiveContextState(null);
        setActiveGroup(null);
        return;
      }

      // Essayer de restaurer le contexte sauvegardé
      const savedContextId = localStorage.getItem(STORAGE_KEY);

      let contextToActivate: UserContext | null = null;

      if (savedContextId) {
        // Chercher le contexte sauvegardé
        contextToActivate = contextsList.find((c) => {
          if (c.subscription_id) {
            return c.subscription_id === savedContextId;
          }
          return `coach-${c.group_id}` === savedContextId;
        }) || null;
      }

      // Si pas trouvé ou pas de sauvegarde, prendre le premier contexte "self"
      if (!contextToActivate) {
        contextToActivate =
          contextsList.find((c) => c.relation === "self") || contextsList[0];
      }

      setActiveContextState(contextToActivate);

      // Charger les détails du groupe
      if (contextToActivate) {
        const group = await fetchGroup(contextToActivate.group_id);
        setActiveGroup(group);
      }
    },
    [fetchGroup]
  );

  const refetch = useCallback(async () => {
    if (user) {
      setIsLoading(true);
      const contextsList = await fetchContexts(user.id);
      setContexts(contextsList);
      await loadActiveContext(user.id, contextsList);
      setIsLoading(false);
    }
  }, [user, fetchContexts, loadActiveContext]);

  useEffect(() => {
    // Vérifier la session initiale
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const contextsList = await fetchContexts(session.user.id);
        setContexts(contextsList);
        await loadActiveContext(session.user.id, contextsList);
      }
      setIsLoading(false);
    });

    // Écouter les changements d'auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const contextsList = await fetchContexts(session.user.id);
        setContexts(contextsList);
        await loadActiveContext(session.user.id, contextsList);
      } else {
        setContexts([]);
        setActiveContextState(null);
        setActiveGroup(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchContexts, loadActiveContext]);

  const setActiveContext = useCallback(
    async (context: UserContext) => {
      setActiveContextState(context);

      // Sauvegarder le contexte
      const contextId = context.subscription_id || `coach-${context.group_id}`;
      localStorage.setItem(STORAGE_KEY, contextId);

      // Charger les détails du groupe
      const group = await fetchGroup(context.group_id);
      setActiveGroup(group);

      // Émettre un événement pour les autres composants
      window.dispatchEvent(
        new CustomEvent("context-changed", { detail: context })
      );
    },
    [fetchGroup]
  );

  const getChildrenContexts = useCallback(() => {
    return contexts.filter(
      (c) => c.context_type === "dependent" || c.relation === "parent" || c.relation === "guardian"
    );
  }, [contexts]);

  // Computed properties
  const isCoach = activeContext?.context_type === "coach";
  const isParent =
    activeContext?.context_type === "dependent" ||
    contexts.some((c) => c.relation === "parent" || c.relation === "guardian");
  const hasMultipleContexts = contexts.length > 1;

  // Check if user has admin role (need to check from profiles)
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    async function checkAdmin() {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .from("user_profile_access")
        .select("profile:profiles(role)")
        .eq("user_id", user.id)
        .eq("relation", "self")
        .limit(1)
        .single();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profileData = data as any;
      if (profileData?.profile) {
        const profile = profileData.profile as { role: string };
        setIsAdmin(profile.role === "admin");
      }
    }
    checkAdmin();
  }, [user]);

  return (
    <ActiveContextContext.Provider
      value={{
        contexts,
        activeContext,
        user,
        isLoading,
        setActiveContext,
        refetch,
        isCoach,
        isAdmin,
        isParent,
        hasMultipleContexts,
        getChildrenContexts,
        activeGroup,
      }}
    >
      {children}
    </ActiveContextContext.Provider>
  );
}

export function useActiveContext() {
  const context = useContext(ActiveContextContext);
  if (context === undefined) {
    throw new Error("useActiveContext doit être utilisé dans un ActiveContextProvider");
  }
  return context;
}

// Hook simplifié pour accéder rapidement au contexte actif
export function useCurrentContext() {
  const { activeContext, activeGroup, isLoading } = useActiveContext();
  return { context: activeContext, group: activeGroup, isLoading };
}
