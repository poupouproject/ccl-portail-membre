"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, X } from "lucide-react";

export function NotificationPrompt() {
  const { activeProfile } = useProfile();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    
    setPermission(Notification.permission);
    
    // Montrer le prompt seulement si la permission n'a pas été demandée
    // et si l'utilisateur est connecté
    if (Notification.permission === "default" && activeProfile) {
      const dismissed = localStorage.getItem("notification-prompt-dismissed");
      if (!dismissed) {
        // Attendre un peu avant de montrer le prompt
        const timer = setTimeout(() => setShowPrompt(true), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [activeProfile]);

  async function handleSubscribe() {
    if (!activeProfile || typeof window === "undefined") return;
    
    setIsSubscribing(true);
    
    try {
      const newPermission = await Notification.requestPermission();
      setPermission(newPermission);
      
      if (newPermission === "granted") {
        // Enregistrer le service worker pour les notifications push
        if ("serviceWorker" in navigator && "PushManager" in window) {
          const registration = await navigator.serviceWorker.ready;
          
          // Pour les notifications push, vous aurez besoin d'une clé VAPID
          // Ceci est une configuration de base
          const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
          if (vapidKey) {
            const subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: vapidKey,
            }).catch(() => null);
            
            if (subscription) {
              // Enregistrer l'appareil dans la base de données
              const { error } = await (supabase as any).from("user_devices").insert({
                profile_id: activeProfile.id,
                device_type: getDeviceType(),
                push_token: JSON.stringify(subscription),
                push_enabled: true,
              });
              
              if (error) {
                console.error("Erreur enregistrement appareil:", error);
              }
            }
          }
        }
        
        setShowPrompt(false);
      } else if (newPermission === "denied") {
        setShowPrompt(false);
      }
    } catch (error) {
      console.error("Erreur lors de l'abonnement:", error);
    } finally {
      setIsSubscribing(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem("notification-prompt-dismissed", "true");
    setShowPrompt(false);
  }

  if (!showPrompt || permission !== "default") return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-lg mx-auto">
      <Card className="shadow-lg border-club-orange/30">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-club-orange/10 rounded-full">
                <Bell className="h-5 w-5 text-club-orange" />
              </div>
              <CardTitle className="text-base">Notifications</CardTitle>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDismiss}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <CardDescription className="mb-4">
            Activez les notifications pour être informé des entraînements, 
            annonces et messages importants du club.
          </CardDescription>
          <div className="flex gap-2">
            <Button 
              onClick={handleSubscribe} 
              disabled={isSubscribing}
              className="flex-1"
            >
              {isSubscribing ? "Activation..." : "Activer"}
            </Button>
            <Button variant="outline" onClick={handleDismiss}>
              Plus tard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getDeviceType(): string {
  if (typeof window === "undefined") return "web";
  
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "web";
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  if (!base64String) return new Uint8Array();
  
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
