"use client";

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import type { UserContext, Group, RoleInfo } from "@/types/database";

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
  isCoordinator: boolean;
  isParent: boolean;
  hasMultipleContexts: boolean;
  // Helper to get children contexts
  getChildrenContexts: () => UserContext[];
  // Get group details for active context
  activeGroup: Group | null;
  // Get all roles for active context
  activeRoles: RoleInfo[];
  // Check permission
  hasPermission: (permission: string) => boolean;
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
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;
    
    // Timeout de sécurité pour éviter les loading infinis (10 secondes)
    timeoutId = setTimeout(() => {
      if (isMounted && isLoading) {
        console.warn("ActiveContextProvider: Timeout de chargement atteint, forçage de isLoading à false");
        setIsLoading(false);
      }
    }, 10000);
    
    // Vérifier la session initiale
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        const contextsList = await fetchContexts(session.user.id);
        if (!isMounted) return;
        setContexts(contextsList);
        await loadActiveContext(session.user.id, contextsList);
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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      // Ignorer les événements INITIAL_SESSION car ils sont gérés par getSession()
      if (event === "INITIAL_SESSION") return;
      
      setUser(session?.user ?? null);
      if (session?.user) {
        const contextsList = await fetchContexts(session.user.id);
        if (!isMounted) return;
        setContexts(contextsList);
        await loadActiveContext(session.user.id, contextsList);
      } else {
        setContexts([]);
        setActiveContextState(null);
        setActiveGroup(null);
      }
    });

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
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

  const isCoach = activeContext?.context_type === "coach";
  const isParent =
    activeContext?.context_type === "dependent" ||
    contexts.some((c) => c.relation === "parent" || c.relation === "guardian");
  const hasMultipleContexts = contexts.length > 1;

  // Get roles for active context
  const activeRoles: RoleInfo[] = activeContext?.roles || [];

  // Check if user has a specific permission
  const hasPermission = useCallback((permission: string): boolean => {
    if (!activeContext) return false;
    return activeRoles.some((role) => {
      const permissions = role.permissions as Record<string, unknown>;
      return permissions[permission] === true;
    });
  }, [activeContext, activeRoles]);

  // Check if user has admin or coordinator role (need to check from profiles)
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCoordinator, setIsCoordinator] = useState(false);
  
  useEffect(() => {
    let isMounted = true;
    
    async function checkAdminStatus() {
      if (!user) {
        setIsAdmin(false);
        setIsCoordinator(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from("user_profile_access")
          .select("profile:profiles(role, is_coordinator)")
          .eq("user_id", user.id)
          .eq("relation", "self")
          .limit(1)
          .maybeSingle();

        if (!isMounted) return;

        if (error) {
          console.error("Erreur lors de la vérification du statut admin:", error);
          setIsAdmin(false);
          setIsCoordinator(false);
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const profileData = data as any;
        if (profileData?.profile) {
          const profile = profileData.profile as { role: string; is_coordinator?: boolean };
          // Utiliser uniquement le champ role pour déterminer le statut admin
          setIsAdmin(profile.role === "admin");
          setIsCoordinator(profile.is_coordinator === true || profile.role === "admin" || profile.role === "coach");
        } else {
          setIsAdmin(false);
          setIsCoordinator(false);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Exception lors de la vérification du statut admin:", err);
        setIsAdmin(false);
        setIsCoordinator(false);
      }
    }
    checkAdminStatus();
    
    return () => {
      isMounted = false;
    };
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
        isCoordinator,
        isParent,
        hasMultipleContexts,
        getChildrenContexts,
        activeGroup,
        activeRoles,
        hasPermission,
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
