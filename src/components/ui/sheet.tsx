"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/src/lib/utils";

/**
 * Side panel on tablet/desktop, bottom sheet on phones. Closes on Escape and
 * backdrop click. Content scrolls; `footer` stays pinned.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "md:w-[460px]",
  testId,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
  testId?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center md:items-stretch md:justify-end" role="presentation">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px] animate-[apporte-fade_150ms_ease]" onClick={onClose} />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        data-testid={testId}
        className={cn(
          "relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl outline-none animate-[apporte-slide-up_220ms_ease] motion-reduce:animate-none md:max-h-none md:rounded-none md:rounded-l-3xl",
          width,
        )}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-gray-200 md:hidden" aria-hidden />
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 pb-3 pt-3 md:pt-5">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold tracking-tight">{title}</h2>
            {subtitle && <div className="mt-0.5 text-sm text-gray-600">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="-mr-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="border-t border-gray-100 bg-white px-5 pt-3" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
