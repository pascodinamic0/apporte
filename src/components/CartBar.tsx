\"use client\";
import Link from \"next/link\";
import { usePathname } from \"next/navigation\";
import { useCartStore } from \"@/src/store/cart\";
import { formatPriceUSD } from \"@/src/lib/utils\";
import { ShoppingCart } from \"lucide-react\";

export function CartBar() {
  const pathname = usePathname();
  const items = useCartStore((s) => s.items);
  const subtotal = items.reduce((s, i) => s + i.unitPriceUsd * i.quantity, 0);
  const hide =
    pathname.startsWith(\"/merchant\") ||
    pathname.startsWith(\"/rider\") ||
    pathname.startsWith(\"/admin\") ||
    pathname.startsWith(\"/cart\") ||
    pathname.startsWith(\"/checkout\");
  if (hide || items.length === 0) return null;
  return (
    <div className=\"fixed bottom-16 left-0 right-0 z-50 md:bottom-4\">
      <div className=\"mx-auto max-w-5xl px-4\">
        <Link
          href=\"/cart\"
          className=\"flex items-center justify-between rounded-full bg-emerald-700 text-white px-4 py-3 shadow-lg\"
        >
          <div className=\"flex items-center gap-2\">
            <ShoppingCart className=\"h-5 w-5\" />
            <span className=\"text-sm\">
              {items.length} article{items.length > 1 ? \"s\" : \"\"} — {formatPriceUSD(subtotal)}
            </span>
          </div>
          <span className=\"font-semibold\">Voir le panier</span>
        </Link>
      </div>
    </div>
  );
}

