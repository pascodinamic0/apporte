"use client";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";

export function Providers() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("SW register failed", err));
    }
  }, []);
  return <Toaster position="top-right" />;
}

