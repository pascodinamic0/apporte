import { cookies } from "next/headers";
import { getDemoUsers } from "./data/memory";
import { User, UserRole } from "./types";

const DEMO_COOKIE = "demo_user_id";

export function isClerkEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
}

export function isDemoAuth(): boolean {
  return !isClerkEnabled();
}

export async function getCurrentUser(): Promise<User | null> {
  if (isDemoAuth()) {
    const cstore = await cookies();
    const c = cstore.get(DEMO_COOKIE)?.value;
    if (!c) return null;
    const u = getDemoUsers().find((u) => u.id === c);
    return u ?? null;
  }
  // Clerk integration placeholder: implement when env is present
  return null;
}

export async function requireRole(roles: UserRole[]): Promise<User | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!roles.includes(user.role)) return null;
  return user;
}

