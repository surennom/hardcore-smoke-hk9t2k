// simple service worker (install/activate only)
self.addEventListener("install", (e) => {
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  // clients.claim ensures SW controls the page immediately on refresh
  e.waitUntil(self.clients.claim());
});
