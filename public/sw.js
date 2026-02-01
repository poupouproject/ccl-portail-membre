// Service Worker pour CCL Portail Membre
// Gère les notifications push et le caching pour PWA

const CACHE_NAME = 'ccl-portail-v2';
const EMERGENCY_CACHE = 'ccl-emergency-v1';

// Assets à mettre en cache pour le mode hors-ligne
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/calendar',
  '/team',
  '/manifest.json',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
];

// Pages critiques pour les coachs/admins
const COACH_PAGES = [
  '/admin',
  '/admin/groups',
];

// Installation du service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      }),
      caches.open(EMERGENCY_CACHE).then((cache) => {
        return cache.addAll(COACH_PAGES);
      }),
    ])
  );
  // Activer immédiatement le nouveau service worker
  self.skipWaiting();
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== EMERGENCY_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Prendre le contrôle immédiatement
  self.clients.claim();
});

// Stratégie de cache: Network First avec fallback sur cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') return;
  
  // Stratégie spéciale pour les données d'urgence (contacts d'urgence)
  if (url.pathname.includes('/api/emergency') || 
      (url.href.includes('supabase.co') && url.pathname.includes('v_group_emergency_contacts'))) {
    event.respondWith(
      caches.open(EMERGENCY_CACHE).then(async (cache) => {
        try {
          const response = await fetch(event.request);
          if (response.ok) {
            // Mettre en cache les données d'urgence pour accès offline
            cache.put(event.request, response.clone());
          }
          return response;
        } catch {
          // En cas d'erreur réseau, retourner le cache
          return cache.match(event.request);
        }
      })
    );
    return;
  }
  
  // Ignorer les autres requêtes API Supabase (données temps réel)
  if (url.href.includes('supabase.co')) return;
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Mettre en cache la réponse si valide
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback sur le cache si le réseau échoue
        return caches.match(event.request);
      })
  );
});

// Gestion des notifications push
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  let data;
  try {
    data = event.data.json();
  } catch {
    data = {
      title: 'Club Cycliste de Lévis',
      body: event.data.text(),
      icon: '/icons/icon-192x192.svg',
    };
  }
  
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192x192.svg',
    badge: '/icons/icon-192x192.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.id || 1,
      url: data.url || '/dashboard',
    },
    actions: data.actions || [
      { action: 'open', title: 'Ouvrir' },
      { action: 'close', title: 'Fermer' },
    ],
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'CCL Portail', options)
  );
});

// Clic sur une notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const url = event.notification.data?.url || '/dashboard';
  
  if (event.action === 'close') {
    return;
  }
  
  // Ouvrir ou focus sur l'onglet existant
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Chercher un onglet existant
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Sinon ouvrir un nouvel onglet
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// Fermeture d'une notification - placeholder pour analytics futur
self.addEventListener('notificationclose', () => {
  // Les statistiques peuvent être implémentées ici
  // via un appel à une Edge Function Supabase
});
