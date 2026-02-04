"use client";

import { Users, ChevronDown, Bike, GraduationCap } from "lucide-react";
import { useActiveContext } from "@/hooks/use-active-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserContext } from "@/types/database";

function getContextIcon(context: UserContext) {
  if (context.context_type === "coach") {
    return <GraduationCap className="h-4 w-4 text-blue-600" />;
  }
  if (context.relation === "parent" || context.relation === "guardian") {
    return <Users className="h-4 w-4 text-purple-600" />;
  }
  return <Bike className="h-4 w-4 text-club-orange" />;
}

function getContextBadgeVariant(context: UserContext) {
  if (context.context_type === "coach") return "default";
  if (context.relation === "parent" || context.relation === "guardian") return "secondary";
  return "outline";
}

export function ContextSelector() {
  const { contexts, activeContext, setActiveContext, isLoading, hasMultipleContexts } =
    useActiveContext();

  if (isLoading) {
    return <Skeleton className="h-8 w-32" />;
  }

  if (!activeContext) {
    return null;
  }

  // Si un seul contexte, afficher simplement le nom
  if (!hasMultipleContexts) {
    return (
      <div className="flex items-center gap-2">
        {getContextIcon(activeContext)}
        <span className="font-medium text-sm">
          {activeContext.profile_name.split(" ")[0]}
        </span>
        <Badge variant={getContextBadgeVariant(activeContext)} className="text-xs">
          {activeContext.group_name}
        </Badge>
      </div>
    );
  }

  // Grouper les contextes par type
  const coachContexts = contexts.filter((c) => c.context_type === "coach");
  const participantContexts = contexts.filter((c) => c.context_type === "participant");
  const dependentContexts = contexts.filter((c) => c.context_type === "dependent");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 hover:bg-accent hover:text-accent-foreground rounded-md px-2 py-1.5 transition-colors">
        {getContextIcon(activeContext)}
        <div className="flex flex-col items-start">
          <span className="font-medium text-sm leading-none">
            {activeContext.profile_name.split(" ")[0]}
          </span>
          <span className="text-xs text-muted-foreground leading-tight">
            {activeContext.group_name}
          </span>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Changer de contexte</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Contextes Coach */}
        {coachContexts.length > 0 && (
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              Encadrement
            </DropdownMenuLabel>
            {coachContexts.map((ctx) => (
              <ContextMenuItem
                key={`coach-${ctx.group_id}`}
                context={ctx}
                isActive={
                  activeContext.context_type === "coach" &&
                  activeContext.group_id === ctx.group_id
                }
                onSelect={() => setActiveContext(ctx)}
              />
            ))}
          </DropdownMenuGroup>
        )}

        {/* Contextes Participant */}
        {participantContexts.length > 0 && (
          <DropdownMenuGroup>
            {coachContexts.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              Mes activités
            </DropdownMenuLabel>
            {participantContexts.map((ctx) => (
              <ContextMenuItem
                key={ctx.subscription_id}
                context={ctx}
                isActive={activeContext.subscription_id === ctx.subscription_id}
                onSelect={() => setActiveContext(ctx)}
              />
            ))}
          </DropdownMenuGroup>
        )}

        {/* Contextes Enfants */}
        {dependentContexts.length > 0 && (
          <DropdownMenuGroup>
            {(coachContexts.length > 0 || participantContexts.length > 0) && (
              <DropdownMenuSeparator />
            )}
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              Mes enfants
            </DropdownMenuLabel>
            {dependentContexts.map((ctx) => (
              <ContextMenuItem
                key={ctx.subscription_id}
                context={ctx}
                isActive={activeContext.subscription_id === ctx.subscription_id}
                onSelect={() => setActiveContext(ctx)}
              />
            ))}
          </DropdownMenuGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface ContextMenuItemProps {
  context: UserContext;
  isActive: boolean;
  onSelect: () => void;
}

function ContextMenuItem({ context, isActive, onSelect }: ContextMenuItemProps) {
  return (
    <DropdownMenuItem
      onClick={onSelect}
      className={`flex items-center gap-3 cursor-pointer ${isActive ? "bg-accent" : ""}`}
    >
      {getContextIcon(context)}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">
            {context.profile_name}
          </span>
          {isActive && (
            <Badge variant="secondary" className="text-xs shrink-0">
              Actif
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="truncate">{context.group_name}</span>
          {context.staff_role && (
            <Badge variant="outline" className="text-xs shrink-0">
              {context.staff_role === "head_coach"
                ? "Coach"
                : context.staff_role === "assistant"
                ? "Aide"
                : "Serre-file"}
            </Badge>
          )}
        </div>
      </div>
    </DropdownMenuItem>
  );
}
