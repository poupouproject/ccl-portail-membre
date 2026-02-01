"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Pin, AlertTriangle, Filter, Users, UserCheck, MessageSquare } from "lucide-react";
import {
  getInitials,
  formatRelativeTime,
  getChannelLabel,
  getChannelBadgeColor,
  getCategoryLabel,
  getCategoryBadgeColor,
  getStaffRoleLabel,
} from "@/lib/utils";
import type { ChatMessage, Profile, ChatChannelType, Group } from "@/types/database";

interface ChatMessageWithAuthor extends ChatMessage {
  author: Profile;
}

interface GroupStaff {
  profile_id: string;
  default_role: string;
  profiles: Profile;
}

interface GroupWithStaff extends Group {
  staff?: GroupStaff[];
  memberCount?: number;
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
  const [myGroups, setMyGroups] = useState<GroupWithStaff[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<ChatChannelType>("all");
  const [filterChannel, setFilterChannel] = useState<ChatChannelType | "none">("none");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("chat");
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

  const fetchMyGroups = useCallback(async () => {
    if (!activeProfile) return;

    try {
      // Récupérer les groupes de l'utilisateur
      const { data: membershipData } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("profile_id", activeProfile.id);

      const membershipRows = membershipData as { group_id: string }[] | null;

      if (!membershipRows || membershipRows.length === 0) {
        setMyGroups([]);
        return;
      }

      const groupIds = membershipRows.map((m) => m.group_id);

      // Récupérer les détails des groupes avec le staff
      const { data: groupsData } = await supabase
        .from("groups")
        .select(`
          *,
          group_staff(
            profile_id,
            default_role,
            profiles(*)
          )
        `)
        .in("id", groupIds)
        .eq("is_active", true);

      interface GroupDataRow extends Group {
        group_staff?: GroupStaff[];
      }

      const groupRows = groupsData as GroupDataRow[] | null;

      if (groupRows) {
        // Récupérer le nombre de membres par groupe
        const groupsWithCounts = await Promise.all(
          groupRows.map(async (group) => {
            const { count } = await supabase
              .from("group_members")
              .select("*", { count: "exact", head: true })
              .eq("group_id", group.id);

            return {
              ...group,
              staff: group.group_staff || [],
              memberCount: count || 0,
            };
          })
        );
        setMyGroups(groupsWithCounts as GroupWithStaff[]);
      }
    } catch (err) {
      console.error("Erreur chargement groupes:", err);
    }
  }, [activeProfile]);

  useEffect(() => {
    fetchMessages();
    fetchMyGroups();

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
  }, [fetchMessages, fetchMyGroups]);

  useEffect(() => {
    // Auto-scroll vers le bas
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSendMessage() {
    if (!newMessage.trim() || !activeProfile || isSending) return;

    setIsSending(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // Filtrer les messages (exclure staff pour non-coachs)
  const filteredMessages = messages
    .filter((m) => isCoach || m.channel !== "staff")
    .filter((m) => filterChannel === "none" || m.channel === filterChannel);

  // Canaux disponibles pour l'écriture
  const availableChannels = isCoach
    ? CHANNEL_OPTIONS
    : CHANNEL_OPTIONS.filter((c) => c.value !== "staff");

  // Canaux disponibles pour le filtrage (parents/athlètes ne voient pas staff)
  const filterableChannels = isCoach
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
        <h1 className="text-2xl font-bold">Mon équipe</h1>
      </div>

      {/* Onglets pour athlètes/parents */}
      {!isCoach && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Mon groupe
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Messages
            </TabsTrigger>
          </TabsList>

          {/* Onglet Groupe */}
          <TabsContent value="team" className="flex-1 overflow-auto space-y-4 m-0">
            {myGroups.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Vous n&apos;êtes pas encore assigné à un groupe</p>
                  <p className="text-sm mt-1">Contactez un administrateur pour être ajouté</p>
                </CardContent>
              </Card>
            ) : (
              myGroups.map((group) => (
                <Card key={group.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: group.color_code || "#FF6600" }}
                        />
                        <CardTitle className="text-lg">{group.name}</CardTitle>
                      </div>
                      <Badge className={getCategoryBadgeColor(group.category)}>
                        {getCategoryLabel(group.category)}
                      </Badge>
                    </div>
                    {group.description && (
                      <CardDescription>{group.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Statistiques */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {group.memberCount || 0} membres
                      </div>
                      <div className="flex items-center gap-1">
                        <UserCheck className="h-4 w-4" />
                        {group.staff?.length || 0} encadrants
                      </div>
                    </div>

                    {/* Encadrants */}
                    {group.staff && group.staff.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">Vos encadrants</h4>
                        <div className="grid gap-2">
                          {group.staff.map((staffMember) => (
                            <div
                              key={staffMember.profile_id}
                              className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                            >
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={staffMember.profiles?.avatar_url || undefined} />
                                <AvatarFallback>
                                  {staffMember.profiles
                                    ? getInitials(staffMember.profiles.first_name, staffMember.profiles.last_name)
                                    : "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="text-sm font-medium">
                                  {staffMember.profiles?.first_name} {staffMember.profiles?.last_name}
                                </p>
                                <Badge variant="outline" className="text-xs mt-0.5">
                                  {getStaffRoleLabel(staffMember.default_role)}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Onglet Messages */}
          <TabsContent value="chat" className="flex-1 flex flex-col m-0">
            {renderChatSection()}
          </TabsContent>
        </Tabs>
      )}

      {/* Vue Coach - Chat seulement */}
      {isCoach && renderChatSection()}
    </div>
  );

  function renderChatSection() {
    return (
      <>
        {/* Filtre */}
        <div className="flex items-center justify-end gap-2 mb-2">
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
              {filterableChannels.map((channel) => (
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
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun message</p>
                  <p className="text-sm mt-1">
                    {isCoach ? "Envoyez le premier message !" : "Les communications de votre équipe apparaîtront ici"}
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
              <p>Mode lecture seule</p>
              <p className="text-xs">Seuls les coachs peuvent envoyer des messages</p>
            </div>
          )}
        </Card>
      </>
    );
  }
}
