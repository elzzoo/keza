/// KEZA Service Worker — offline-first for static assets, network-first for API and pages
// v4: navigation requests (HTML pages) are now network-first. Under the old
// stale-while-revalidate strategy every page — not just "/" — served the
// PREVIOUS deploy's HTML on every load and only refreshed the cache for next
// time, one version behind forever, since CACHE_NAME never changed. Users
// (and this audit) were seeing already-fixed bugs because the SW masked
// every deploy. Bumping CACHE_NAME here forces a one-time cache purge for
// all existing clients on next activate.
const CACHE_NAME = "keza-v4";
const STATIC_ASSETS = ["/manifest.json"];

// Install: pre-cache shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Push notifications
self.addEventListener("push", (event) => {
  let data = { title: "KEZA", body: "Price drop alert!", url: "/" };
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: "/api/icons/192",
    badge: "/api/icons/192",
    tag: "keza-price-alert",
    renotify: true,
    data: { url: data.url || "/" },
    actions: [
      { action: "open", title: "Voir / View" },
      { action: "dismiss", title: "Fermer / Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Focus existing tab if available
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Otherwise open new window
      return clients.openWindow(url);
    })
  );
});

// Fetch strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls: network-first (never serve stale search results)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Navigation requests (HTML pages, incl. Next.js RSC payloads): network-first.
  // Every deploy must be visible on the very next load — offline is the only
  // acceptable reason to fall back to a cached page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  // Static assets (Next.js content-hashed JS/CSS, images): stale-while-revalidate
  // is safe here since a new deploy produces new hashed filenames automatically.
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
