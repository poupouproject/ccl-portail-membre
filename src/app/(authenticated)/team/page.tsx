"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Send, Users, Megaphone } from "lucide-react";
import { getInitials, formatDate } from "@/lib/utils";
import type { Group, Profile } from "@/types/database";

interface GroupMessage {
  id: string;
  group_id: string;
  sender_profile_id: string;
  content: string;
  message_type: string;
  is_pinned: boolean;
  created_at: string;
  sender?: Profile;
}

export default function TeamPage() {
  const { activeProfile, isLoading: profileLoading, isCoach } = useProfile();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeProfile) return;
    fetchGroups();
  }, [activeProfile, isCoach]);

  useEffect(() => {
    if (selectedGroup) {
      fetchMessages(selectedGroup.id);
      
      // Realtime subscription
      const channel = supabase
        .channel(`group-${selectedGroup.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${selectedGroup.id}` },
          (payload) => {
            fetchSingleMessage(payload.new.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedGroup]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function fetchGroups() {
    setIsLoading(true);
    try {
      let fetchedGroups: Group[] = [];
      
      if (isCoach) {
        // Admin voit tous les groupes
        if (activeProfile?.role === "admin") {
          const { data } = await supabase.from("groups").select("*").order("name");
          fetchedGroups = data || [];
        } else {
          // Coaches voient les groupes où ils sont staff
          const { data: staffGroups } = await supabase
            .from("group_staff")
            .select("group_id, groups(*)")
            .eq("profile_id", activeProfile!.id);
          fetchedGroups = staffGroups?.map((s: { groups: Group | null }) => s.groups).filter(Boolean) as Group[] || [];
        }
      } else {
        // Athlètes voient leur groupe
        const { data: memberData } = await supabase
          .from("group_members")
          .select("group_id, groups(*)")
          .eq("profile_id", activeProfile!.id);
        fetchedGroups = memberData?.map((m: { groups: Group | null }) => m.groups).filter(Boolean) as Group[] || [];
      }

      setGroups(fetchedGroups);
      if (fetchedGroups.length > 0 && !selectedGroup) {
        setSelectedGroup(fetchedGroups[0]);
      }
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchMessages(groupId: string) {
    try {
      const { data, error } = await (supabase as any)
        .from("group_messages")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;

      const senderIds = [...new Set((data || []).map((m: GroupMessage) => m.sender_profile_id).filter(Boolean))] as string[];
      if (senderIds.length > 0) {
        const { data: profiles } = await (supabase as any)
          .from("profiles")
          .select("id, first_name, last_name, avatar_url, role")
          .in("id", senderIds);

        const profileMap = new Map((profiles || []).map((p: Profile) => [p.id, p]));
        setMessages((data || []).map((m: GroupMessage) => ({ ...m, sender: profileMap.get(m.sender_profile_id) })));
      } else {
        setMessages(data || []);
      }
    } catch (error) {
      console.error("Erreur:", error);
    }
  }

  async function fetchSingleMessage(id: string) {
    const { data } = await (supabase as any).from("group_messages").select("*").eq("id", id).single();
    if (data) {
      const { data: profile } = await (supabase as any)
        .from("profiles")
        .select("id, first_name, last_name, avatar_url, role")
        .eq("id", data.sender_profile_id)
        .single();
      setMessages((prev) => [...prev, { ...data, sender: profile }]);
    }
  }

  async function handleSend() {
    if (!newMessage.trim() || !activeProfile || !selectedGroup) return;
    setIsSending(true);
    try {
      const { error } = await (supabase as any).from("group_messages").insert({
        group_id: selectedGroup.id,
        sender_profile_id: activeProfile.id,
        content: newMessage.trim(),
        message_type: "message",
      });
      if (error) throw error;
      setNewMessage("");
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setIsSending(false);
    }
  }

  if (profileLoading || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      <h1 className="text-2xl font-bold mb-4">
        <Users className="inline h-6 w-6 mr-2" />
        Mon Équipe
      </h1>

      {groups.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {groups.map((group) => (
            <Button
              key={group.id}
              variant={selectedGroup?.id === group.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedGroup(group)}
              style={{
                backgroundColor: selectedGroup?.id === group.id ? group.color_code : undefined,
                borderColor: group.color_code,
              }}
            >
              {group.name}
            </Button>
          ))}
        </div>
      )}

      {groups.length === 0 ? (
        <Card className="flex-1">
          <CardContent className="py-8 text-center text-muted-foreground">
            Vous n&apos;êtes assigné à aucun groupe pour le moment.
          </CardContent>
        </Card>
      ) : (
        <Card className="flex-1 flex flex-col overflow-hidden">
          {selectedGroup && (
            <CardHeader className="py-3 border-b" style={{ backgroundColor: `${selectedGroup.color_code}10` }}>
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedGroup.color_code }} />
                {selectedGroup.name}
                {isCoach && <Badge variant="secondary" className="ml-2">Coach</Badge>}
              </CardTitle>
            </CardHeader>
          )}

          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Aucun message dans ce groupe. {isCoach && "Envoyez le premier message !"}
              </div>
            ) : (
              messages.map((message) => {
                const isOwnMessage = message.sender_profile_id === activeProfile?.id;
                const isAnnouncement = message.message_type === "announcement";
                return (
                  <div key={message.id}>
                    {isAnnouncement ? (
                      <div className="bg-club-orange/10 border border-club-orange/20 rounded-lg p-3 text-center">
                        <div className="flex items-center justify-center gap-2 text-club-orange text-xs font-medium mb-1">
                          <Megaphone className="h-3 w-3" />
                          ANNONCE
                        </div>
                        <p className="text-sm font-medium">{message.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {message.sender?.first_name} · {formatDate(message.created_at, { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    ) : (
                      <div className={`flex gap-3 ${isOwnMessage ? "flex-row-reverse" : ""}`}>
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarImage src={message.sender?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {message.sender ? getInitials(message.sender.first_name, message.sender.last_name) : "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`max-w-[70%] rounded-lg p-3 ${isOwnMessage ? "bg-club-orange text-white" : "bg-muted"}`}>
                          {!isOwnMessage && message.sender && (
                            <p className="text-xs font-medium mb-1 flex items-center gap-1">
                              {message.sender.first_name} {message.sender.last_name}
                              {message.sender.role !== "athlete" && <Badge variant="secondary" className="text-[10px] py-0">Coach</Badge>}
                            </p>
                          )}
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${isOwnMessage ? "text-white/70" : "text-muted-foreground"}`}>
                            {formatDate(message.created_at, { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </CardContent>

          {isCoach && selectedGroup && (
            <div className="border-t p-4">
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Écrivez un message au groupe..."
                  disabled={isSending}
                  className="flex-1"
                />
                <Button type="submit" disabled={isSending || !newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
