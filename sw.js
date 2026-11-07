/* Offline cache for Square & Cube Quest. Bump VERSION when files change. */
const VERSION = 'sqcq-v1';
const FILES = ['./', 'index.html', 'game.js', 'PressStart2P.ttf', 'manifest.webmanifest',
  'sprites/idle.png', 'sprites/run.png', 'sprites/throw.png', 'sprites/celebrate.png', 'sprites/ball.png', 'sprites/hero.png', 'sprites/face.png',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // network first (so updates arrive), fall back to cache when offline
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
