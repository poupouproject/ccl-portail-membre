import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Bike, Users, Calendar, Trophy, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bike className="h-8 w-8 text-club-orange" />
            <span className="text-xl font-bold">CCL Jeunesse</span>
          </div>
          <Link href="/login">
            <Button>Connexion</Button>
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-club-orange to-orange-600 bg-clip-text text-transparent">
            Club Cycliste de Lévis
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Portail membre du volet jeunesse - Le plaisir avant la performance
          </p>
          <Link href="/login">
            <Button size="lg" className="gap-2">
              Accéder au portail <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20 max-w-4xl mx-auto">
          <div className="bg-white rounded-xl p-6 shadow-lg border">
            <Calendar className="h-10 w-10 text-club-orange mb-4" />
            <h3 className="text-lg font-semibold mb-2">Calendrier</h3>
            <p className="text-muted-foreground text-sm">
              Consultez les séances d&apos;entraînement et gérez vos présences en un clic.
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-lg border">
            <Users className="h-10 w-10 text-club-orange mb-4" />
            <h3 className="text-lg font-semibold mb-2">Équipe</h3>
            <p className="text-muted-foreground text-sm">
              Restez connecté avec les coachs et les autres familles du groupe.
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-lg border">
            <Trophy className="h-10 w-10 text-club-orange mb-4" />
            <h3 className="text-lg font-semibold mb-2">Académie</h3>
            <p className="text-muted-foreground text-sm">
              Suivez la progression technique avec des capsules vidéo adaptées.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-20 border-t">
        <p className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Club Cycliste de Lévis. Tous droits réservés.
        </p>
      </footer>
    </div>
  );
}
