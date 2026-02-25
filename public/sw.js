const CACHE_NAME = 'novella-v1';
const STATIC_CACHE = 'novella-static-v1';
const DYNAMIC_CACHE = 'novella-dynamic-v1';

// Ресурсы для предварительного кэширования
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Установка...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Кэширование статических ресурсов');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Активация...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => {
            console.log('[SW] Удаление старого кэша:', key);
            return caches.delete(key);
          })
      );
    })
  );
  self.clients.claim();
});

// Безопасная функция для кэширования ответа
function cacheResponse(cacheName, request, response) {
  if (!response || response.status !== 200) {
    return Promise.resolve();
  }
  
  const responseClone = response.clone();
  return caches.open(cacheName).then((cache) => {
    return cache.put(request, responseClone);
  }).catch((err) => {
    console.log('[SW] Cache put error:', err);
  });
}

// Обработка запросов
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Пропускаем запросы без URL
  if (!request.url) {
    return;
  }

  const url = new URL(request.url);

  // Пропускаем неподдерживаемые схемы
  const unsupportedSchemes = ['chrome-extension', 'moz-extension', 'chrome-untrusted', 'about', 'data', 'blob'];
  if (unsupportedSchemes.includes(url.protocol.replace(':', ''))) {
    return;
  }

  // Пропускаем запросы к Supabase API и non-GET запросы
  if (request.method !== 'GET' || url.origin.includes('supabase.co')) {
    return;
  }

  // Для навигационных запросов - сетевой приоритет с fallback на кэш
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          cacheResponse(DYNAMIC_CACHE, request, response);
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Для статических ресурсов - кэш с сетевым обновлением
  if (isStaticAsset(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Возвращаем кэш и обновляем в фоне
          fetch(request)
            .then((response) => cacheResponse(STATIC_CACHE, request, response))
            .catch(() => {});
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          cacheResponse(STATIC_CACHE, request, response);
          return response;
        });
      })
    );
    return;
  }

  // Для остальных запросов - сетевой приоритет с кэшированием
  event.respondWith(
    fetch(request)
      .then((response) => {
        cacheResponse(DYNAMIC_CACHE, request, response);
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Проверка, является ли ресурс статическим
function isStaticAsset(pathname) {
  return (
    pathname.endsWith('.js') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.gif') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.woff') ||
    pathname.endsWith('.woff2') ||
    pathname.endsWith('.ttf') ||
    pathname.endsWith('.json') ||
    pathname.endsWith('.wasm') ||
    pathname.endsWith('.riv') ||
    pathname.includes('/assets/') ||
    pathname.includes('/_app/immutable/')
  );
}
