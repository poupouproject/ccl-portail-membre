// Service Worker pour CCL Portail Membre
// Gère les notifications push et le caching pour PWA

const CACHE_NAME = 'ccl-portail-v1';

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

// Installation du service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
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
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Prendre le contrôle immédiatement
  self.clients.claim();
});

// Stratégie de cache: Network First avec fallback sur cache
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') return;
  
  // Ignorer les requêtes API Supabase (toujours réseau)
  if (event.request.url.includes('supabase.co')) return;
  
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

// Fermeture d'une notification (statistiques)
self.addEventListener('notificationclose', (event) => {
  // On pourrait logger ceci pour des statistiques
  console.log('Notification fermée:', event.notification.data);
});
