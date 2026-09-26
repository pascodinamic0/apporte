import type { LucideIcon } from "lucide-react";
import { BarChart3, Bike, ClipboardList, History, Home, LifeBuoy, Package, ShoppingCart, Store, User, Utensils, Users } from "lucide-react";
import type { UserRole } from "@/src/lib/types";

export type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };

export function navItemsForRole(role: UserRole, signedIn: boolean): NavItem[] {
  const account: NavItem = { href: "/account", label: "Compte", icon: User };
  switch (role) {
    case "merchant":
      return [
        { href: "/merchant", label: "Commandes", icon: ClipboardList, exact: true },
        { href: "/merchant/menu", label: "Menu", icon: Utensils },
        { href: "/merchant/stats", label: "Stats", icon: BarChart3 },
        account,
      ];
    case "rider":
      return [
        { href: "/rider", label: "Courses", icon: Bike, exact: true },
        { href: "/rider/historique", label: "Historique", icon: History },
        { href: "/support", label: "Support", icon: LifeBuoy },
        account,
      ];
    case "admin":
      return [
        { href: "/admin", label: "Vue d’ensemble", icon: Home, exact: true },
        { href: "/admin/commandes", label: "Commandes", icon: ClipboardList },
        { href: "/admin/marchands", label: "Marchands", icon: Store },
        { href: "/admin/livreurs", label: "Livreurs", icon: Users },
        account,
      ];
    default:
      return [
        { href: "/", label: "Accueil", icon: Home, exact: true },
        { href: "/food", label: "Restaurants", icon: Utensils },
        { href: "/smart-finds", label: "Trouvailles", icon: Package },
        { href: "/cart", label: "Panier", icon: ShoppingCart },
        signedIn ? account : { href: "/account", label: "Compte", icon: User },
      ];
  }
}

export function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}
