import * as React from "react";
import { cn } from "@/src/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
  size?: "sm" | "md" | "lg" | "icon";
}

const base =
  "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background active:scale-[.98] transition-transform will-change-transform";

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default: "bg-emerald-700 text-white hover:bg-emerald-800",
  outline:
    "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 dark:bg-transparent dark:text-gray-100",
  ghost: "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-900",
  destructive: "bg-red-600 text-white hover:bg-red-700",
  secondary: "bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
};

const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
  icon: "h-10 w-10",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

