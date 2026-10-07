// Service Worker Trailer 94 - PWA & Push Notifications
const CACHE_NAME = 'trailer94-v2';
const ASSETS_STATIC = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_STATIC).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptor de requisições para PWA
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignora requisições de API, WebSocket, Supabase e assets dinâmicos do Vite do cache antigo
  if (
    url.pathname.startsWith('/api/') || 
    url.pathname.startsWith('/ws') ||
    url.pathname.startsWith('/assets/') ||
    url.hostname.includes('supabase.co')
  ) {
    return; // Deixa o navegador fazer o fetch de rede padrão diretamente
  }

  // Para navegação HTML (ex: / ou /admin), usar Network First para garantir a versão mais nova do index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return cached || caches.match('/') || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
          });
        })
    );
    return;
  }

  // Para assets estáticos públicos (/manifest.json, /icons/...)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        return networkResponse;
      }).catch(() => {
        return new Response('', { status: 404, statusText: 'Not Found' });
      });
    })
  );
});

// Push notification do entregador e admin
self.addEventListener('push', (event) => {
  let dados = { titulo: 'Trailer 94', corpo: 'Nova atualização de pedido.', url: '/admin' };
  try {
    dados = event.data.json();
  } catch {
    // usa o padrão acima se o payload não vier em JSON
  }

  event.waitUntil(
    self.registration.showNotification(dados.titulo, {
      body: dados.corpo,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: dados.url || '/admin' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/admin';
  event.waitUntil(clients.openWindow(url));
});
