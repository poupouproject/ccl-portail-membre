"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, CheckCircle2, Circle, ExternalLink } from "lucide-react";
import type { AcademyVideo } from "@/types/database";

interface VideoCardProps {
  video: AcademyVideo;
  isCompleted: boolean;
  onToggleComplete: (completed: boolean) => void;
}

export function VideoCard({ video, isCompleted, onToggleComplete }: VideoCardProps) {
  const [showVideo, setShowVideo] = useState(false);

  const getVideoUrl = () => {
    if (video.video_provider === "youtube") {
      return `https://www.youtube.com/watch?v=${video.video_id}`;
    }
    return null;
  };

  const getEmbedUrl = () => {
    if (video.video_provider === "youtube") {
      return `https://www.youtube.com/embed/${video.video_id}`;
    }
    return null;
  };

  const getThumbnailUrl = () => {
    if (video.video_provider === "youtube") {
      return `https://img.youtube.com/vi/${video.video_id}/mqdefault.jpg`;
    }
    return null;
  };

  return (
    <Card className={isCompleted ? "border-green-500/50 bg-green-50/50" : ""}>
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Thumbnail */}
          <div
            className="relative w-32 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0 cursor-pointer group"
            onClick={() => setShowVideo(true)}
          >
            {getThumbnailUrl() && (
              <Image
                src={getThumbnailUrl()!}
                alt={video.title}
                fill
                sizes="128px"
                className="object-cover"
                unoptimized // YouTube images sont déjà optimisées
              />
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/50 transition-colors">
              <Play className="h-8 w-8 text-white" fill="white" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-sm line-clamp-2">{video.title}</h3>
                {video.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                    {video.description}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => onToggleComplete(!isCompleted)}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </Button>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                Niveau {video.level_min}+
              </Badge>
              {getVideoUrl() && (
                <a
                  href={getVideoUrl()!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-club-orange flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Ouvrir
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Video Embed */}
        {showVideo && getEmbedUrl() && (
          <div className="mt-4">
            <div className="relative w-full pt-[56.25%] rounded-lg overflow-hidden">
              <iframe
                src={getEmbedUrl()!}
                title={video.title}
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => setShowVideo(false)}
            >
              Masquer la vidéo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
