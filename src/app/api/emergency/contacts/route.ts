import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

/**
 * API Route: /api/emergency/contacts
 * 
 * Récupère les contacts d'urgence des membres des groupes accessibles
 * par le coach/admin authentifié.
 * 
 * Cette route est conçue pour être mise en cache par le Service Worker
 * pour un accès hors-ligne en forêt.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Cookies can't be set in some contexts
            }
          },
        },
      }
    );

    // Vérifier l'authentification
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur est coach ou admin
    const { data: profileAccess } = await supabase
      .from("user_profile_access")
      .select(`
        profile:profiles(id, role)
      `)
      .eq("user_id", user.id)
      .eq("relation", "self")
      .single();

    interface ProfileWithRole {
      profile: { id: string; role: string } | null;
    }
    
    const access = profileAccess as unknown as ProfileWithRole;
    const userRole = access?.profile?.role;
    const profileId = access?.profile?.id;

    if (!userRole || (userRole !== "coach" && userRole !== "admin")) {
      return NextResponse.json(
        { error: "Accès non autorisé - réservé aux coachs et admins" },
        { status: 403 }
      );
    }

    // Si admin: récupérer tous les contacts d'urgence
    // Si coach: récupérer uniquement les contacts de ses groupes
    let groupIds: string[] = [];

    if (userRole === "admin") {
      // Admin voit tous les groupes actifs
      const { data: groups } = await supabase
        .from("groups")
        .select("id")
        .eq("is_active", true);
      
      const groupsData = groups as { id: string }[] | null;
      groupIds = groupsData?.map(g => g.id) || [];
    } else {
      // Coach voit uniquement ses groupes assignés
      const { data: staffAssignments } = await supabase
        .from("group_staff")
        .select("group_id")
        .eq("profile_id", profileId!);
      
      const staffData = staffAssignments as { group_id: string }[] | null;
      groupIds = staffData?.map(s => s.group_id) || [];
    }

    if (groupIds.length === 0) {
      return NextResponse.json({
        groups: [],
        lastUpdated: new Date().toISOString(),
      });
    }

    // Récupérer les contacts d'urgence par groupe
    const { data: groups } = await supabase
      .from("groups")
      .select("id, name, color_code")
      .in("id", groupIds)
      .eq("is_active", true);

    interface GroupData {
      id: string;
      name: string;
      color_code: string;
    }
    
    interface MemberData {
      group_id: string;
      profiles: {
        id: string;
        first_name: string;
        last_name: string;
        phone: string | null;
        emergency_contact_name: string | null;
        emergency_contact_phone: string | null;
        emergency_contact_relation: string | null;
        medical_notes: string | null;
      };
    }

    const { data: members } = await supabase
      .from("group_members")
      .select(`
        group_id,
        profiles(
          id,
          first_name,
          last_name,
          phone,
          emergency_contact_name,
          emergency_contact_phone,
          emergency_contact_relation,
          medical_notes
        )
      `)
      .in("group_id", groupIds);

    // Organiser les données par groupe
    interface GroupWithMembers {
      id: string;
      name: string;
      color_code: string;
      members: Array<{
        id: string;
        first_name: string;
        last_name: string;
        phone: string | null;
        emergency_contact_name: string | null;
        emergency_contact_phone: string | null;
        emergency_contact_relation: string | null;
        medical_notes: string | null;
      }>;
    }

    const groupsTyped = groups as GroupData[] | null;
    const membersTyped = members as MemberData[] | null;

    const groupedData: GroupWithMembers[] = (groupsTyped || []).map(group => ({
      id: group.id,
      name: group.name,
      color_code: group.color_code,
      members: (membersTyped || [])
        .filter(m => m.group_id === group.id)
        .map(m => {
          const profile = m.profiles;
          return {
            id: profile.id,
            first_name: profile.first_name,
            last_name: profile.last_name,
            phone: profile.phone,
            emergency_contact_name: profile.emergency_contact_name,
            emergency_contact_phone: profile.emergency_contact_phone,
            emergency_contact_relation: profile.emergency_contact_relation,
            medical_notes: profile.medical_notes,
          };
        })
    }));

    // Headers pour le caching par le Service Worker
    const response = NextResponse.json({
      groups: groupedData,
      lastUpdated: new Date().toISOString(),
      role: userRole,
    });

    // Permettre au SW de cacher cette réponse
    response.headers.set('Cache-Control', 'max-age=300, stale-while-revalidate=3600');
    
    return response;

  } catch (error) {
    console.error("Erreur API emergency contacts:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
