import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";
import { ProfileProvider } from "@/hooks/use-profile";
import { BottomNav } from "@/components/layout/bottom-nav";
import { AppHeader } from "@/components/layout/app-header";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
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

  // Utiliser getUser() au lieu de getSession() pour la validation sécurisée côté serveur
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <ProfileProvider>
      <div className="min-h-screen bg-slate-50 pb-20">
        <AppHeader />
        <main className="container mx-auto px-4 py-4 max-w-lg">
          {children}
        </main>
        <BottomNav />
      </div>
    </ProfileProvider>
  );
}
