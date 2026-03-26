const CACHE = 'grind-v4';
const ASSETS = [
  '/Grind/',
  '/Grind/index.html',
  '/Grind/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,600&family=Space+Mono:wght@400;700&display=swap'
];

// Install — cache core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS.map(url => new Request(url, { mode: 'no-cors' }))))
      .catch(() => {}) // Don't fail install if some assets miss
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache-first for app assets, network-first for everything else
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Always serve app files from cache first
  if (url.pathname.startsWith('/Grind/') || ASSETS.includes(e.request.url)) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return response;
        }).catch(() => caches.match('/Grind/index.html'));
      })
    );
    return;
  }
  // For CDN resources — stale-while-revalidate
  if (url.hostname.includes('cloudflare') || url.hostname.includes('fonts.g')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fresh = fetch(e.request).then(r => {
          if (r && r.status === 200) {
            caches.open(CACHE).then(c => c.put(e.request, r.clone()));
          }
          return r;
        }).catch(() => cached);
        return cached || fresh;
      })
    );
  }
});
