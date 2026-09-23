import * as React from "react";
import { cn } from "@/src/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "outline" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant === "default"
          ? "bg-emerald-100 text-emerald-800"
          : "border border-gray-300 text-gray-700",
        className,
      )}
      {...props}
    />
  );
}

