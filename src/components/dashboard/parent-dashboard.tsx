"use client";

import { useActiveContext } from "@/hooks/use-active-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ChevronRight, Bike, Calendar, GraduationCap } from "lucide-react";
import { getInitials } from "@/lib/utils";
import type { UserContext } from "@/types/database";

interface ChildrenOverviewProps {
  onSelectChild?: (context: UserContext) => void;
}

export function ChildrenOverview({ onSelectChild }: ChildrenOverviewProps) {
  const { getChildrenContexts, setActiveContext, activeContext } = useActiveContext();
  const childrenContexts = getChildrenContexts();

  if (childrenContexts.length === 0) {
    return null;
  }

  const handleSelectChild = (context: UserContext) => {
    setActiveContext(context);
    onSelectChild?.(context);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-purple-600" />
          <CardTitle className="text-lg">Mes enfants</CardTitle>
        </div>
        <CardDescription>
          Sélectionnez un enfant pour voir son calendrier et son activité
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {childrenContexts.map((context) => (
          <button
            key={context.subscription_id || context.profile_id}
            onClick={() => handleSelectChild(context)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
              activeContext?.subscription_id === context.subscription_id
                ? "bg-purple-50 border-purple-200"
                : "hover:bg-accent"
            }`}
          >
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-purple-100 text-purple-700">
                {getInitials(context.profile_name.split(" ")[0], context.profile_name.split(" ")[1] || "")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left">
              <div className="font-medium">{context.profile_name}</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Bike className="h-3 w-3" />
                <span>{context.group_name}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeContext?.subscription_id === context.subscription_id && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                  Actif
                </Badge>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

interface ChildQuickActionsProps {
  context: UserContext;
}

export function ChildQuickActions({ context }: ChildQuickActionsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span>Actions pour {context.profile_name.split(" ")[0]}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
          <a href="/calendar">
            <Calendar className="h-5 w-5" />
            <span className="text-sm">Calendrier</span>
          </a>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
          <a href="/academy">
            <GraduationCap className="h-5 w-5" />
            <span className="text-sm">Académie</span>
          </a>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
          <a href="/team">
            <Users className="h-5 w-5" />
            <span className="text-sm">Équipe</span>
          </a>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
          <a href="/profile">
            <Bike className="h-5 w-5" />
            <span className="text-sm">Profil</span>
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

export function ParentDashboardSection() {
  const { activeContext, isParent, getChildrenContexts } = useActiveContext();
  const childrenContexts = getChildrenContexts();

  // Only show for parents with children
  if (!isParent || childrenContexts.length === 0) {
    return null;
  }

  // If active context is a child, show quick actions for that child
  const isViewingChild = activeContext?.context_type === "dependent";

  return (
    <section className="space-y-4">
      {/* Always show children overview for parents */}
      <ChildrenOverview />
      
      {/* Show quick actions when viewing a child */}
      {isViewingChild && activeContext && (
        <ChildQuickActions context={activeContext} />
      )}
    </section>
  );
}
