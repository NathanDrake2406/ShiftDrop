self.addEventListener("push", function (event) {
  const data = event.data ? event.data.json() : {};

  const title = data.title || "ShiftDrop";
  const options = {
    body: data.body || "You have a new notification",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: {
      url: data.url || "/",
    },
    vibrate: [200, 100, 200],
    requireInteraction: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    }),
  );
});
