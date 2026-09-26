import type { ReactNode } from "react";

/** Shared layout for 404 / error / offline screens, in the Apporte style. */
export function StatusScreen({ code, title, children, actions }: { code?: string; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-10 text-center sm:py-16">
      <div className="brand-gradient flex h-24 w-24 items-center justify-center rounded-3xl shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo/apporte-symbol.svg" alt="" className="h-12 w-12" />
      </div>
      {code && <div className="mt-5 text-sm font-semibold tracking-widest text-emerald-700">{code}</div>}
      <h1 className="mt-1 text-2xl font-extrabold tracking-tight">{title}</h1>
      {children && <div className="mt-2 text-sm text-gray-600">{children}</div>}
      {actions && <div className="mt-6 flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-center">{actions}</div>}
    </div>
  );
}
