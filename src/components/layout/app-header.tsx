"use client";

import { useEffect, useState, useCallback } from "react";
import { Bike, LogOut, Bell, Settings, User, Sparkles } from "lucide-react";
import { useGetIdentity, useLogout, usePermissions } from "@refinedev/core";
import { supabase } from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getInitials, formatRelativeTime } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ChangelogModal } from "@/components/changelog-modal";
import type { Notification, Profile } from "@/types/database";
import Link from "next/link";

interface IdentityData {
  id: string;
  name: string;
  avatar: string | null;
  profile: Profile;
  user: { id: string };
}

export function AppHeader() {
  const { data: identity, isLoading } = useGetIdentity<IdentityData>({});
  const { data: permissions } = usePermissions<{
    role: string;
    isAdmin: boolean;
    isCoach: boolean;
  }>({});
  const { mutate: logout } = useLogout();

  const activeProfile = identity?.profile;
  const user = identity?.user;
  const isAdmin = permissions?.isAdmin ?? false;
  const isCoach = permissions?.isCoach ?? false;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        const notifs = data as Notification[];
        setNotifications(notifs);
        setUnreadCount(notifs.filter((n) => !n.is_read).length);
      }
    } catch (err) {
      console.error("Erreur chargement notifications:", err);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();

    if (user) {
      const channel = supabase
        .channel("notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            setNotifications((prev) => [payload.new as Notification, ...prev]);
            setUnreadCount((prev) => prev + 1);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Erreur:", err);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Erreur:", err);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "event":
        return "📅";
      case "chat":
        return "💬";
      case "warning":
        return "⚠️";
      default:
        return "ℹ️";
    }
  };

  if (isLoading) {
    return (
      <header className="sticky top-0 z-40 bg-white border-b">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Bike className="h-6 w-6 text-club-orange" />

          {/* Beta Badge with changelog button */}
          <button
            onClick={() => setShowChangelog(true)}
            className="flex items-center gap-1 px-2 py-0.5 bg-club-orange/10 hover:bg-club-orange/20 border border-club-orange/30 rounded-full transition-colors"
          >
            <Sparkles className="h-3 w-3 text-club-orange" />
            <span className="text-xs font-medium text-club-orange">BETA</span>
          </button>

          {activeProfile && (
            <span className="font-medium text-sm">
              {activeProfile.first_name}
            </span>
          )}
        </div>

        {/* Actions: Notifications & Avatar */}
        <div className="flex items-center gap-2">
          {/* Bouton Notifications */}
          <Sheet open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md">
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <SheetTitle>Notifications</SheetTitle>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                      Tout marquer lu
                    </Button>
                  )}
                </div>
                <SheetDescription>
                  {notifications.length === 0
                    ? "Aucune notification"
                    : `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`}
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-120px)] mt-4">
                <div className="space-y-2 pr-4">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        notification.is_read
                          ? "bg-background"
                          : "bg-club-orange/5 border-club-orange/20"
                      }`}
                      onClick={() => {
                        if (!notification.is_read) {
                          markAsRead(notification.id);
                        }
                      }}
                    >
                      <div className="flex gap-3">
                        <span className="text-xl">
                          {getNotificationIcon(notification.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm ${
                              notification.is_read ? "text-muted-foreground" : "font-medium"
                            }`}
                          >
                            {notification.title}
                          </p>
                          {notification.body && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {notification.body}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatRelativeTime(notification.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>

          {/* Avatar et menu utilisateur */}
          <DropdownMenu>
            <DropdownMenuTrigger className="focus:outline-none">
              <Avatar className="h-8 w-8">
                <AvatarImage src={activeProfile?.avatar_url || undefined} />
                <AvatarFallback>
                  {activeProfile
                    ? getInitials(activeProfile.first_name, activeProfile.last_name)
                    : "?"}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span>
                      {activeProfile?.first_name} {activeProfile?.last_name}
                    </span>
                    {isAdmin && (
                      <Badge variant="default" className="text-xs bg-purple-600">Admin</Badge>
                    )}
                    {!isAdmin && isCoach && (
                      <Badge variant="default" className="text-xs bg-blue-600">Coach</Badge>
                    )}
                  </div>
                  <span className="text-xs font-normal text-muted-foreground">
                    {activeProfile?.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  Mon profil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profile/settings" className="flex items-center">
                  <Settings className="h-4 w-4 mr-2" />
                  Paramètres
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Changelog Modal */}
      <ChangelogModal isOpen={showChangelog} onClose={() => setShowChangelog(false)} />
    </header>
  );
}
