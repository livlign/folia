const CACHE = 'folia-shell-v7';
const SHELL = [
  './',
  './index.html',
  './app.js',
  './source.js',
  './store.js',
  './discovery.js',
  './pagination.js',
  './reader.js',
  './report.js',
  './theme.js',
  './styles.css',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './fonts/newsreader-latin.woff2',
  './fonts/newsreader-latin-ext.woff2',
  './fonts/newsreader-vietnamese.woff2',
  './fonts/splinemono-latin.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Book JSON lives in IndexedDB, not the shell cache — let it hit the network.
  if (url.pathname.includes('/books/')) return;

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }

  if (url.origin === location.origin) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
  }
});
