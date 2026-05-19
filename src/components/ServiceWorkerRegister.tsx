"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister())),
        )
        .then(async () => {
          if (!("caches" in window)) return;
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        })
        .catch(() => {
          // Local dev cleanup is best-effort.
        });
      return;
    }
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // Service worker is best-effort for offline shell caching.
    });
  }, []);
  return null;
}
