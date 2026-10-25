"use client";

import { useEffect, type ReactNode } from "react";
import { ConnectionNotice } from "./connection-notice";

async function removeLegacyOfflineMode() {
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith("meu-trocado-static-"))
        .map((key) => caches.delete(key)),
    );
  }
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map(async (registration) => {
        const worker =
          registration.active ??
          registration.waiting ??
          registration.installing;
        if (
          worker?.scriptURL === new URL("/sw.js", window.location.origin).href
        ) {
          // The retirement worker claims existing windows, removes its cache and unregisters itself.
          try {
            await registration.update();
          } catch {
            await registration.unregister();
          }
        }
      }),
    );
  }
}

export function PwaProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    void removeLegacyOfflineMode().catch((error: unknown) => {
      console.error(
        "Não foi possível remover o cache antigo do aplicativo.",
        error,
      );
    });
  }, []);
  return (
    <>
      <ConnectionNotice />
      {children}
    </>
  );
}
