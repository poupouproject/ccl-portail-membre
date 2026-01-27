"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pin, ExternalLink, Tag, Package } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Announcement, Partner } from "@/types/database";
import { OptionalImage } from "@/components/ui/safe-image";

interface AnnouncementsFeedProps {
  announcements: Announcement[];
  partners: Partner[];
}

export function AnnouncementsFeed({ announcements, partners }: AnnouncementsFeedProps) {
  // Intercaler les partenaires dans le flux d'annonces
  const feedItems: Array<{ type: "announcement" | "partner"; data: Announcement | Partner }> = [];
  
  let partnerIndex = 0;
  announcements.forEach((announcement, index) => {
    feedItems.push({ type: "announcement", data: announcement });
    
    // Insérer un partenaire tous les 3 annonces
    if ((index + 1) % 3 === 0 && partners[partnerIndex]) {
      feedItems.push({ type: "partner", data: partners[partnerIndex] });
      partnerIndex++;
    }
  });

  if (feedItems.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          Aucune actualité pour le moment
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {feedItems.map((item) => {
        if (item.type === "announcement") {
          const announcement = item.data as Announcement;
          return (
            <AnnouncementCard key={`announcement-${announcement.id}`} announcement={announcement} />
          );
        } else {
          const partner = item.data as Partner;
          return (
            <PartnerCard key={`partner-${partner.id}`} partner={partner} />
          );
        }
      })}
    </div>
  );
}

function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              {announcement.is_pinned && (
                <Pin className="h-4 w-4 text-club-orange" />
              )}
              {announcement.title}
            </CardTitle>
            <CardDescription>
              {formatDate(announcement.created_at, { 
                weekday: undefined, 
                year: undefined, 
                month: "short", 
                day: "numeric" 
              })}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {announcement.image_url && (
          <div className="relative w-full h-40 mb-3 rounded-lg overflow-hidden bg-muted">
            <OptionalImage
              src={announcement.image_url}
              alt={announcement.title}
              className="w-full h-full object-cover"
              fallback={<div className="w-full h-full bg-muted" />}
            />
          </div>
        )}
        {announcement.content && (
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {announcement.content}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PartnerCard({ partner }: { partner: Partner }) {
  const tierLabel = partner.tier === 1 ? "Or" : partner.tier === 2 ? "Argent" : "Bronze";
  
  return (
    <Card className="bg-gradient-to-r from-club-orange/5 to-orange-50 border-club-orange/20">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 text-xs text-club-orange font-medium">
          <Tag className="h-3 w-3" />
          COMMANDITAIRE {tierLabel.toUpperCase()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-white flex-shrink-0 flex items-center justify-center border border-orange-200">
            {partner.logo_url ? (
              <OptionalImage
                src={partner.logo_url}
                alt={partner.name}
                className="w-full h-full object-contain p-1"
                fallback={<Package className="h-8 w-8 text-club-orange/40" />}
              />
            ) : (
              <Package className="h-8 w-8 text-club-orange/40" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">{partner.name}</h3>
            {partner.promo_description && (
              <p className="text-xs text-muted-foreground mt-1">
                {partner.promo_description}
              </p>
            )}
            {partner.promo_code && (
              <Badge variant="outline" className="mt-2 font-mono">
                {partner.promo_code}
              </Badge>
            )}
          </div>
          {partner.website_url && (
            <Button variant="ghost" size="icon" asChild>
              <a href={partner.website_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
