// ShiftDrop Service Worker
// Handles push notifications and notification clicks

const CACHE_NAME = "shiftdrop-v1";

// Install event - cache essential assets
self.addEventListener("install", (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)));
    }),
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Push notification received
self.addEventListener("push", (event) => {
  if (!event.data) {
    console.warn("Push event received without data");
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    console.error("Failed to parse push data:", e);
    return;
  }

  const title = data.title || "ShiftDrop";
  const options = {
    body: data.body || "You have a new notification",
    icon: "/icon.svg",
    badge: "/icon.svg",
    vibrate: [100, 50, 100],
    data: { url: data.url },
    actions: data.url ? [{ action: "open", title: "View" }] : [],
    tag: "shiftdrop-notification",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification clicked
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url;
  const urlToOpen = url ? (url.startsWith("/") ? self.location.origin + url : url) : self.location.origin;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    }),
  );
});
