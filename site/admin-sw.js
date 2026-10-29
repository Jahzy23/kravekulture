/* Order board helper. Only here so phones (Android Chrome) can show the "New order"
   notification, which they allow only through a service worker. It handles no network
   requests and is scoped to /admin, so the rest of the site never touches it. */
"use strict";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const board = wins.find((w) => new URL(w.url).pathname.startsWith("/admin"));
      return board ? board.focus() : self.clients.openWindow("/admin.html");
    })
  );
});
