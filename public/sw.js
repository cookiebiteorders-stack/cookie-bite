/* Minimal stub: avoids 404 when PWA/next-pwa is disabled in development or before first build.
   Production builds may replace this via next-pwa. */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
