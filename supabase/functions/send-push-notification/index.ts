// Edge Function: send-push-notification
// Envoie des notifications push aux utilisateurs via Web Push API
//
// IMPORTANT: Cette implémentation est un squelette qui démontre l'architecture.
// Pour une utilisation en production, vous devez:
// 1. Utiliser une bibliothèque web-push compatible Deno (ex: https://deno.land/x/web_push)
// 2. Configurer les secrets VAPID dans le dashboard Supabase
// 3. Implémenter la signature VAPID correcte pour l'authentification
//
// Configuration requise dans Supabase Dashboard > Edge Functions > Secrets:
// - VAPID_PUBLIC_KEY: Clé publique générée avec web-push
// - VAPID_PRIVATE_KEY: Clé privée correspondante
// - VAPID_SUBJECT: mailto:admin@votredomaine.com

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Interface pour les paramètres de la requête
interface PushRequest {
  title: string
  body: string
  url?: string
  icon?: string
  // Ciblage: soit user_ids, profile_ids, ou group_ids
  user_ids?: string[]
  profile_ids?: string[]
  group_ids?: string[]
  // Ou envoyer à tous les utilisateurs avec push activé
  broadcast?: boolean
}

// Clés VAPID (à configurer dans les secrets Supabase)
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@clubcyclistelevis.ca'
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Gérer les requêtes OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Vérifier les clés VAPID
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error('VAPID keys not configured')
    }

    // Parser la requête
    const pushRequest: PushRequest = await req.json()
    
    if (!pushRequest.title) {
      throw new Error('Title is required')
    }

    // Créer le client Supabase avec le service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Construire la requête pour récupérer les devices
    let query = supabase
      .from('user_devices')
      .select('id, user_id, push_endpoint, push_p256dh, push_auth')
      .eq('push_enabled', true)
      .not('push_endpoint', 'is', null)

    // Filtrer par utilisateurs
    if (pushRequest.user_ids && pushRequest.user_ids.length > 0) {
      query = query.in('user_id', pushRequest.user_ids)
    }

    // Filtrer par profils
    if (pushRequest.profile_ids && pushRequest.profile_ids.length > 0) {
      // Récupérer les user_ids associés aux profile_ids
      const { data: accessData } = await supabase
        .from('user_profile_access')
        .select('user_id')
        .in('profile_id', pushRequest.profile_ids)
      
      if (accessData && accessData.length > 0) {
        const userIds = accessData.map(a => a.user_id)
        query = query.in('user_id', userIds)
      }
    }

    // Filtrer par groupes
    if (pushRequest.group_ids && pushRequest.group_ids.length > 0) {
      // Récupérer les profile_ids des groupes
      const { data: membersData } = await supabase
        .from('group_members')
        .select('profile_id')
        .in('group_id', pushRequest.group_ids)
      
      if (membersData && membersData.length > 0) {
        const profileIds = membersData.map(m => m.profile_id)
        
        // Récupérer les user_ids
        const { data: accessData } = await supabase
          .from('user_profile_access')
          .select('user_id')
          .in('profile_id', profileIds)
        
        if (accessData && accessData.length > 0) {
          const userIds = [...new Set(accessData.map(a => a.user_id))]
          query = query.in('user_id', userIds)
        }
      }
    }

    // Exécuter la requête
    const { data: devices, error } = await query

    if (error) {
      throw error
    }

    if (!devices || devices.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No devices to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Payload de la notification
    const payload = JSON.stringify({
      title: pushRequest.title,
      body: pushRequest.body,
      icon: pushRequest.icon || '/icons/icon-192x192.svg',
      url: pushRequest.url || '/dashboard',
      timestamp: Date.now(),
    })

    // Envoyer les notifications (en parallèle)
    const results = await Promise.allSettled(
      devices.map(async (device) => {
        try {
          // Note: Dans un environnement de production, utiliser web-push library
          // Ici nous utilisons fetch directement vers l'endpoint push
          const response = await fetch(device.push_endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
              'TTL': '86400',
              // Note: L'implémentation complète nécessite la signature VAPID
              // Ce code est un placeholder - utiliser web-push en production
            },
            body: payload,
          })

          if (!response.ok) {
            // Si l'endpoint retourne une erreur, désactiver l'appareil
            if (response.status === 404 || response.status === 410) {
              await supabase
                .from('user_devices')
                .update({ push_enabled: false })
                .eq('id', device.id)
            }
            throw new Error(`Push failed: ${response.status}`)
          }

          return { success: true, device_id: device.id }
        } catch (err) {
          return { success: false, device_id: device.id, error: err.message }
        }
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failed = results.length - successful

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successful, 
        failed,
        total: devices.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
