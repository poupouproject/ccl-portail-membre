"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChangelogVersion {
  version: string;
  changes: string[];
}

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  const [changelog, setChangelog] = useState<ChangelogVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchChangelog();
    }
  }, [isOpen]);

  const fetchChangelog = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/changelog");
      const text = await response.text();
      const versions = parseChangelog(text);
      setChangelog(versions);
    } catch (error) {
      console.error("Error fetching changelog:", error);
    } finally {
      setLoading(false);
    }
  };

  const parseChangelog = (markdown: string): ChangelogVersion[] => {
    const versions: ChangelogVersion[] = [];
    const lines = markdown.split("\n");
    let currentVersion: ChangelogVersion | null = null;

    for (const line of lines) {
      // Match version headers like "## 1.0.0"
      const versionMatch = line.match(/^## (\d+\.\d+\.\d+)/);
      if (versionMatch) {
        if (currentVersion) {
          versions.push(currentVersion);
        }
        currentVersion = {
          version: versionMatch[1],
          changes: [],
        };
      } else if (currentVersion && line.trim()) {
        // Add non-empty lines as changes
        currentVersion.changes.push(line);
      }
    }

    if (currentVersion) {
      versions.push(currentVersion);
    }

    return versions;
  };

  const formatChanges = (changes: string[]): React.ReactNode[] => {
    const formatted: React.ReactNode[] = [];

    changes.forEach((line, index) => {
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) return;

      // Section headers (### or **)
      if (trimmed.startsWith("###")) {
        formatted.push(
          <h4 key={index} className="text-sm font-semibold text-foreground mt-4 mb-2">
            {trimmed.replace(/^###\s*/, "")}
          </h4>
        );
        return;
      }

      // Bold text sections (**text**)
      if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
        formatted.push(
          <h4 key={index} className="text-sm font-semibold text-foreground mt-3 mb-1">
            {trimmed.replace(/\*\*/g, "")}
          </h4>
        );
        return;
      }

      // List items
      if (trimmed.startsWith("-")) {
        const content = trimmed.substring(1).trim();
        formatted.push(
          <div key={index} className="flex items-start gap-2 text-sm text-muted-foreground ml-2">
            <span className="text-club-orange">•</span>
            <span>{formatInlineText(content)}</span>
          </div>
        );
        return;
      }

      // Regular text
      formatted.push(
        <p key={index} className="text-sm text-muted-foreground">
          {formatInlineText(trimmed)}
        </p>
      );
    });

    return formatted;
  };

  const formatInlineText = (text: string): React.ReactNode => {
    // Handle bold text within the line
    const parts: React.ReactNode[] = [];
    const boldRegex = /\*\*([^*]+)\*\*/g;
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(
        <strong key={match.index} className="font-semibold text-foreground">
          {match[1]}
        </strong>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📋 Nouveautés
            <Badge variant="secondary" className="text-xs">
              v{changelog[0]?.version || "..."}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Découvrez les dernières mises à jour du portail CCL
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-club-orange"></div>
            </div>
          ) : changelog.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Aucune version disponible</p>
            </div>
          ) : (
            <div className="space-y-6">
              {changelog.map((version, index) => (
                <div
                  key={version.version}
                  className={`p-4 rounded-lg border ${
                    index === 0
                      ? "bg-club-orange/5 border-club-orange/20"
                      : "bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-lg font-bold">Version {version.version}</h3>
                    {index === 0 && (
                      <Badge className="bg-club-orange text-white text-xs">
                        Actuelle
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1">{formatChanges(version.changes)}</div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="pt-4 border-t">
          <Button onClick={onClose} className="w-full bg-club-orange hover:bg-club-orange/90">
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
