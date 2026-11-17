// Firebase Cloud Messaging Service Worker for Smart University Parking System

self.addEventListener("push", function (event) {
  if (event.data) {
    let payload;
    try {
      payload = event.data.json();
    } catch {
      payload = {
        notification: {
          title: "Smart University Parking",
          body: event.data.text(),
        },
      };
    }

    const title = payload.notification?.title || payload.data?.title || "UniParking Alert";
    const options = {
      body: payload.notification?.body || payload.data?.body || "You have an update regarding your parking slot.",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      data: payload.data || {},
      actions: [
        {
          action: "open-app",
          title: "View Booking",
        },
      ],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const clickAction = event.notification.data?.click_action || "/driver";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(clickAction) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(clickAction);
      }
    })
  );
});
