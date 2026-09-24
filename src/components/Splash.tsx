"use client";
import { useEffect, useState } from "react";

export function Splash() {
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("apporte_splash_seen") === "1") return;
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReduced(mq.matches);
      setVisible(true);
      const timeout = setTimeout(() => {
        setVisible(false);
        sessionStorage.setItem("apporte_splash_seen", "1");
      }, mq.matches ? 300 : 900);
      return () => clearTimeout(timeout);
    } catch {
      // no-op
    }
  }, []);

  if (!visible) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white"
      onClick={() => setVisible(false)}
      aria-label="Écran de démarrage Apporte"
    >
      <div
        className="flex flex-col items-center"
        style={{
          transition: "transform 500ms cubic-bezier(.2,.7,.2,1), opacity 500ms ease",
          animation: reduced ? undefined : "apporte-pop 600ms cubic-bezier(.2,.7,.2,1)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/apporte.svg" alt="" className="h-16 w-16" />
        <div className="mt-3 font-extrabold tracking-tight text-2xl text-emerald-800">
          Apporte
        </div>
      </div>
      <style jsx>{`
        @keyframes apporte-pop {
          0% {
            transform: translateY(8px) scale(0.92);
            opacity: 0;
          }
          60% {
            transform: translateY(-4px) scale(1.03);
            opacity: 1;
          }
          100% {
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

