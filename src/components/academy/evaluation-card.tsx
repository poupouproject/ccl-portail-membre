"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate, getInitials } from "@/lib/utils";
import type { Evaluation, Profile, Json } from "@/types/database";

interface EvaluationWithCoach extends Evaluation {
  coach: Profile | null;
}

interface EvaluationCardProps {
  evaluation: EvaluationWithCoach;
}

// Libellés pour les critères d'évaluation
const criteriaLabels: Record<string, string> = {
  confiance: "Confiance",
  freinage: "Freinage",
  virage: "Virages",
  equilibre: "Équilibre",
  attitude_groupe: "Attitude en groupe",
  respect_consignes: "Respect des consignes",
  securite: "Sécurité",
};

export function EvaluationCard({ evaluation }: EvaluationCardProps) {
  const details = evaluation.details as Record<string, number> | null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">
              Évaluation du{" "}
              {formatDate(evaluation.evaluation_date, {
                weekday: undefined,
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </CardTitle>
            {evaluation.coach && (
              <CardDescription className="flex items-center gap-2 mt-1">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={evaluation.coach.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(evaluation.coach.first_name, evaluation.coach.last_name)}
                  </AvatarFallback>
                </Avatar>
                <span>
                  Coach {evaluation.coach.first_name} {evaluation.coach.last_name}
                </span>
              </CardDescription>
            )}
          </div>
          {evaluation.recommended_level && (
            <Badge variant="outline">
              Niveau recommandé: {evaluation.recommended_level}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Critères */}
        {details && Object.keys(details).length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(details).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {criteriaLabels[key] || key}
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <div
                      key={star}
                      className={`h-2 w-2 rounded-full ${
                        star <= (value as number)
                          ? "bg-club-orange"
                          : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Notes du coach */}
        {evaluation.notes && (
          <div className="bg-muted/50 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-muted-foreground mb-1">
              COMMENTAIRES
            </h4>
            <p className="text-sm">{evaluation.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
