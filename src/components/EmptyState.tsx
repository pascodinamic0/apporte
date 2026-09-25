"use client";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";

type Action = { href: string; label: string; variant?: "default" | "outline" | "secondary" };

export function EmptyState({
  imageSrc,
  title,
  message,
  primary,
  secondary,
}: {
  imageSrc: string;
  title?: string;
  message?: string;
  primary?: Action;
  secondary?: Action;
}) {
  return (
    <div className="text-center text-gray-700 py-10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageSrc} alt="" className="mx-auto h-28 w-auto mb-3" />
      {title && <h3 className="text-lg font-semibold mb-1">{title}</h3>}
      {message && <p className="text-sm mb-3">{message}</p>}
      <div className="flex items-center justify-center gap-2">
        {primary && (
          <Link href={primary.href}>
            <Button variant={primary.variant || "secondary"} size="md">
              {primary.label}
            </Button>
          </Link>
        )}
        {secondary && (
          <Link href={secondary.href}>
            <Button variant={secondary.variant || "outline"} size="md">
              {secondary.label}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

