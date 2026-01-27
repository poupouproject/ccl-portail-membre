"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Send } from "lucide-react";
import { getInitials, formatDate } from "@/lib/utils";
import type { Profile } from "@/types/database";

interface StaffMessage {
  id: string;
  sender_profile_id: string;
  content: string;
  message_type: string;
  is_pinned: boolean;
  created_at: string;
  sender?: Profile;
}

export default function StaffChatPage() {
  const router = useRouter();
  const { activeProfile, isLoading: profileLoading, isCoach } = useProfile();
  const [messages, setMessages] = useState<StaffMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileLoading && !isCoach) {
      router.push("/dashboard");
      return;
    }
    fetchMessages();

    // Realtime subscription
    const channel = supabase
      .channel("staff-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "staff_messages" },
        (payload) => {
          fetchSingleMessage(payload.new.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileLoading, isCoach, router]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function fetchMessages() {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("staff_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;

      // Fetch sender profiles
      const senderIds = [...new Set((data || []).map((m: StaffMessage) => m.sender_profile_id).filter(Boolean))] as string[];
      if (senderIds.length > 0) {
        const { data: profiles } = await (supabase as any)
          .from("profiles")
          .select("id, first_name, last_name, avatar_url")
          .in("id", senderIds);

        const profileMap = new Map((profiles || []).map((p: Profile) => [p.id, p]));

        setMessages(
          (data || []).map((m: StaffMessage) => ({
            ...m,
            sender: profileMap.get(m.sender_profile_id),
          }))
        );
      } else {
        setMessages(data || []);
      }
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible de charger les messages", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchSingleMessage(id: string) {
    const { data } = await (supabase as any)
      .from("staff_messages")
      .select("*")
      .eq("id", id)
      .single();

    if (data) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, avatar_url")
        .eq("id", data.sender_profile_id)
        .single();

      setMessages((prev) => [...prev, { ...data, sender: profile }]);
    }
  }

  async function handleSend() {
    if (!newMessage.trim() || !activeProfile) return;

    setIsSending(true);
    try {
      const { error } = await (supabase as any).from("staff_messages").insert({
        sender_profile_id: activeProfile.id,
        content: newMessage.trim(),
        message_type: "message",
      });

      if (error) throw error;
      setNewMessage("");
    } catch (error) {
      console.error("Erreur:", error);
      toast({ title: "Erreur", description: "Impossible d'envoyer le message", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  }

  if (profileLoading || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Chat Staff / Coordinateurs</h1>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Aucun message. Commencez la conversation !
            </div>
          ) : (
            messages.map((message) => {
              const isOwnMessage = message.sender_profile_id === activeProfile?.id;
              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : ""}`}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={message.sender?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {message.sender
                        ? getInitials(message.sender.first_name, message.sender.last_name)
                        : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      isOwnMessage
                        ? "bg-club-orange text-white"
                        : "bg-muted"
                    }`}
                  >
                    {!isOwnMessage && message.sender && (
                      <p className="text-xs font-medium mb-1">
                        {message.sender.first_name} {message.sender.last_name}
                      </p>
                    )}
                    <p className="text-sm">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isOwnMessage ? "text-white/70" : "text-muted-foreground"
                      }`}
                    >
                      {formatDate(message.created_at, { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        <div className="border-t p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrivez un message..."
              disabled={isSending}
              className="flex-1"
            />
            <Button type="submit" disabled={isSending || !newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
