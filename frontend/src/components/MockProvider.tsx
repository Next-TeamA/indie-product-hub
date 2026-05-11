"use client";

import { useEffect } from "react";

export function MockProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    async function init() {
      const { worker } = await import("@/mocks/browser");
      await worker.start({ onUnhandledRequest: "bypass" });
    }
    init();
  }, []);

  return <>{children}</>;
}
