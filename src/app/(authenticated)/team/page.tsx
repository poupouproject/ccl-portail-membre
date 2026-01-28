"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Pin, AlertTriangle, Filter } from "lucide-react";
import {
  getInitials,
  formatRelativeTime,
  getChannelLabel,
  getChannelBadgeColor,
} from "@/lib/utils";
import type { ChatMessage, Profile, ChatChannelType } from "@/types/database";

interface ChatMessageWithAuthor extends ChatMessage {
  author: Profile;
}

const CHANNEL_OPTIONS: { value: ChatChannelType; label: string; color: string }[] = [
  { value: "all", label: "Tous", color: "bg-slate-500" },
  { value: "recreational", label: "Récréatif", color: "bg-green-500" },
  { value: "intensive", label: "Intensif", color: "bg-blue-600" },
  { value: "staff", label: "Staff", color: "bg-purple-600" },
];

export default function TeamPage() {
  const { user, activeProfile, isLoading: profileLoading, isCoach } = useProfile();
  const [messages, setMessages] = useState<ChatMessageWithAuthor[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<ChatChannelType>("all");
  const [filterChannel, setFilterChannel] = useState<ChatChannelType | "none">("none");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select(`
          *,
          author:profiles!chat_messages_author_id_fkey(*)
        `)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) {
        console.error("Erreur:", error);
        return;
      }

      setMessages((data as ChatMessageWithAuthor[]) || []);
    } catch (err) {
      console.error("Exception:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMessages();

    // Abonnement realtime
    const channel = supabase
      .channel("chat-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        async (payload) => {
          // Récupérer le message avec l'auteur
          const { data } = await supabase
            .from("chat_messages")
            .select(`*, author:profiles!chat_messages_author_id_fkey(*)`)
            .eq("id", payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => [...prev, data as ChatMessageWithAuthor]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMessages]);

  useEffect(() => {
    // Auto-scroll vers le bas
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSendMessage() {
    if (!newMessage.trim() || !activeProfile || isSending) return;

    setIsSending(true);
    try {
      const { error } = await (supabase as any).from("chat_messages").insert({
        author_id: activeProfile.id,
        channel: selectedChannel,
        content: newMessage.trim(),
      });

      if (error) {
        console.error("Erreur envoi:", error);
        return;
      }

      setNewMessage("");
    } catch (err) {
      console.error("Exception:", err);
    } finally {
      setIsSending(false);
    }
  }

  // Filtrer les messages
  const filteredMessages =
    filterChannel === "none"
      ? messages
      : messages.filter((m) => m.channel === filterChannel);

  // Canaux disponibles pour l'écriture
  const availableChannels = isCoach
    ? CHANNEL_OPTIONS
    : CHANNEL_OPTIONS.filter((c) => c.value !== "staff");

  if (profileLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 h-[calc(100vh-180px)] lg:h-[calc(100vh-120px)] flex flex-col">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Communications</h1>

        {/* Filtre */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={filterChannel}
            onValueChange={(v) => setFilterChannel(v as ChatChannelType | "none")}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filtrer..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Tous les canaux</SelectItem>
              {CHANNEL_OPTIONS.map((channel) => (
                <SelectItem key={channel.value} value={channel.value}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${channel.color}`} />
                    {channel.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Zone des messages */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {isLoading ? (
              <>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  </div>
                ))}
              </>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Aucun message</p>
                <p className="text-sm mt-1">
                  Soyez le premier à envoyer un message !
                </p>
              </div>
            ) : (
              filteredMessages.map((message) => {
                const isOwn = message.author_id === activeProfile?.id;

                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                  >
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={message.author?.avatar_url || undefined} />
                      <AvatarFallback>
                        {message.author
                          ? getInitials(message.author.first_name, message.author.last_name)
                          : "?"}
                      </AvatarFallback>
                    </Avatar>

                    <div
                      className={`flex-1 max-w-[80%] ${isOwn ? "text-right" : ""}`}
                    >
                      {/* En-tête du message */}
                      <div
                        className={`flex items-center gap-2 mb-1 ${
                          isOwn ? "justify-end" : ""
                        }`}
                      >
                        <span className="text-sm font-medium">
                          {message.author?.first_name} {message.author?.last_name}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`text-xs text-white ${getChannelBadgeColor(
                            message.channel
                          )}`}
                        >
                          {getChannelLabel(message.channel)}
                        </Badge>
                        {message.is_pinned && (
                          <Pin className="h-3 w-3 text-club-orange" />
                        )}
                        {message.is_important && (
                          <AlertTriangle className="h-3 w-3 text-amber-500" />
                        )}
                      </div>

                      {/* Contenu du message */}
                      <div
                        className={`rounded-lg p-3 ${
                          isOwn
                            ? "bg-club-orange text-white"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>

                      {/* Horodatage */}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatRelativeTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Zone de saisie (coachs et admins seulement) */}
        {isCoach && (
          <div className="border-t p-4 space-y-3">
            {/* Sélection du canal */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Envoyer à :</span>
              <Tabs
                value={selectedChannel}
                onValueChange={(v) => setSelectedChannel(v as ChatChannelType)}
              >
                <TabsList className="h-8">
                  {availableChannels.map((channel) => (
                    <TabsTrigger
                      key={channel.value}
                      value={channel.value}
                      className="text-xs px-2 py-1 data-[state=active]:bg-club-orange data-[state=active]:text-white"
                    >
                      {channel.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* Champ de texte */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Écrire un message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="flex-1 min-h-[60px] resize-none"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isSending}
                className="bg-club-orange hover:bg-club-orange/90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Message pour les non-coachs */}
        {!isCoach && (
          <div className="border-t p-4 text-center text-sm text-muted-foreground">
            Seuls les coachs peuvent envoyer des messages
          </div>
        )}
      </Card>
    </div>
  );
}
