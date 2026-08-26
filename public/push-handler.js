/* SHIMAI Web Push — mirrors FoodCore: icon comes from payload, with branded fallback. */
self.addEventListener("push", (event) => {
  let payload = {
    title: "SHIMAI",
    body: "",
    url: "/",
    icon: "/icon-192x192.png",
    badge: "/icon-192x192.png",
    image: "/logo_shimai.jpeg",
    tag: "shimai-notification",
  };

  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() };
    }
  } catch {
    payload.body = event.data?.text() ?? "";
  }

  // Prefer absolute URLs when the SW origin is known (Android is picky)
  const origin = self.location?.origin || "";
  const toAbs = (path) => {
    if (!path) return undefined;
    if (/^https?:\/\//i.test(path)) return path;
    return origin ? `${origin}${path.startsWith("/") ? path : `/${path}`}` : path;
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || "SHIMAI", {
      body: payload.body || "",
      icon: toAbs(payload.icon) || toAbs("/icon-192x192.png"),
      badge: toAbs(payload.badge) || toAbs("/icon-192x192.png"),
      image: toAbs(payload.image) || toAbs("/logo_shimai.jpeg"),
      tag: payload.tag || "shimai-notification",
      renotify: true,
      data: { url: payload.url || "/" },
      vibrate: [200, 100, 200],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      }),
  );
});
