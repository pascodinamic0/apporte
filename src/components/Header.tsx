import Link from "next/link";
import { getCurrentUser } from "@/src/lib/auth";
import { LogoutButton } from "./LogoutButton";
import { HeaderLinks } from "./HeaderLinks";

export async function Header() {
  const user = await getCurrentUser();
  const role = user?.role ?? "customer";
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/70 backdrop-blur">
      <div
        className="mx-auto max-w-5xl px-4 flex items-center justify-between gap-4"
        style={{ paddingTop: "max(var(--safe-top),12px)", paddingBottom: "12px", minHeight: "56px" }}
      >
        <Link href={role === "merchant" ? "/merchant" : role === "rider" ? "/rider" : role === "admin" ? "/admin" : "/"} className="flex shrink-0 items-center gap-2 text-emerald-800" aria-label="Apporte, accueil">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/apporte-lockup.svg" alt="Apporte" className="h-8" />
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          <HeaderLinks role={role} signedIn={!!user} />
          {user && <LogoutButton variant="icon" className="ml-1" />}
        </div>
      </div>
    </header>
  );
}
