"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Users } from "lucide-react";
import { getInitials, formatTime } from "@/lib/utils";
import type { Group, Profile } from "@/types/database";

interface ChatMessage {
  id: string;
  channel_id: string;
  profile_id: string;
  content: string;
  created_at: string;
  profile?: Profile;
}

export default function TeamPage() {
  const { activeProfile, isLoading: profileLoading } = useProfile();
  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchGroupData() {
      if (!activeProfile) return;

      setIsLoading(true);

      try {
        // Récupérer le groupe de l'athlète
        const { data: membership } = await supabase
          .from("group_members")
          .select("group_id, groups(*)")
          .eq("profile_id", activeProfile.id)
          .single();

        if (membership?.groups) {
          setGroup(membership.groups as unknown as Group);
        }
      } catch (error) {
        console.error("Erreur lors du chargement du groupe:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchGroupData();
  }, [activeProfile]);

  // Note: Pour un vrai chat, vous utiliseriez Supabase Realtime ici
  // Cette implémentation est simplifiée pour la démonstration

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !group || !activeProfile || isSending) return;

    setIsSending(true);

    // Simulation d'envoi de message
    // Dans une vraie implémentation, vous inséreriez dans une table chat_messages
    const newMsg: ChatMessage = {
      id: crypto.randomUUID(),
      channel_id: group.chat_channel_id,
      profile_id: activeProfile.id,
      content: newMessage,
      created_at: new Date().toISOString(),
      profile: activeProfile,
    };

    setMessages((prev) => [...prev, newMsg]);
    setNewMessage("");
    setIsSending(false);

    // Scroll vers le bas
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }, 100);
  };

  if (profileLoading || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-[calc(100vh-250px)] w-full rounded-xl" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Équipe</h1>
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Vous n&apos;êtes pas encore assigné à un groupe</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-[calc(100vh-200px)] flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Équipe</h1>
          <p className="text-sm text-muted-foreground">{group.name}</p>
        </div>
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: group.color_code }}
        />
      </div>

      {/* Zone de chat */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="py-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Discussion du groupe
          </CardTitle>
        </CardHeader>
        
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center text-muted-foreground">
              <div>
                <p className="text-sm">Aucun message pour le moment</p>
                <p className="text-xs mt-1">Soyez le premier à écrire!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isOwn = message.profile_id === activeProfile?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={message.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {message.profile
                          ? getInitials(
                              message.profile.first_name,
                              message.profile.last_name
                            )
                          : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`max-w-[70%] ${
                        isOwn ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`rounded-lg px-3 py-2 ${
                          isOwn
                            ? "bg-club-orange text-white"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">
                        {formatTime(message.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Input de message */}
        <div className="p-4 border-t">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex gap-2"
          >
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrivez un message..."
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
