// Service worker de Volta App.
//
// Estrategia: RED PRIMERO, caché solo como respaldo offline.
// Esto es deliberado: ya tuvimos dolores de cabeza con GitHub Pages/navegadores
// cacheando una versión vieja del HTML y la gente sin ver los cambios nuevos.
// Un service worker mal armado (cache-primero) empeoraría eso, no lo mejoraría.
// Acá siempre se intenta traer la versión más nueva del servidor primero; el caché
// solo entra en juego si no hay conexión.
//
// Importante: esto NUNCA cachea ni intercepta pedidos a otros orígenes (Google
// Sheets, Drive, login, etc.) — esos siempre van directo a la red, sin pasar
// por acá. Si algún día se sube una versión nueva (volta_app_v2.html, etc.),
// cambiar CACHE_NAME para que el navegador limpie el caché viejo.

// IMPORTANTE: este número tiene que ir de la mano con APP_VERSION en volta_app_v1.html.
// Cada vez que se sube una versión nueva del HTML, bumpear también este nombre — es lo que
// obliga al navegador a descartar el shell viejo cacheado y traer el nuevo.
const CACHE_NAME = 'volta-app-shell-v2';
const APP_SHELL = [
  './volta_app_v1.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Solo nos metemos con pedidos al mismo origen (el shell de la app: el HTML,
  // el manifest, los íconos). Todo lo demás pasa de largo sin tocar — nunca
  // se cachea ni se intercepta. Esto es crítico: las llamadas a Google (login,
  // Sheets, Drive) tienen que llegar siempre en vivo a la red.
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return resp;
      })
      .catch(() => caches.match(event.request))
  );
});
