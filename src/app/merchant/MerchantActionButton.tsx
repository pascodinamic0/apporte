"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/src/components/ui/button";
import { advanceOrder } from "./actions";

const ERRORS: Record<string, string> = {
  unauthorized: "Session expirée. Reconnecte-toi.",
  forbidden: "Cette commande n’appartient pas à ton restaurant.",
  invalid_state: "La commande a déjà changé d’étape.",
  not_found: "Commande introuvable.",
};

const SUCCESS: Record<string, string> = {
  merchant_accept: "Commande acceptée",
  merchant_preparing: "Commande en préparation",
  merchant_ready: "Commande prête : on cherche un livreur",
};

export function MerchantActionButton({
  orderId,
  action,
  children,
}: {
  orderId: string;
  action: "merchant_accept" | "merchant_preparing" | "merchant_ready";
  children: React.ReactNode;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      size="md"
      className="w-full sm:w-auto"
      disabled={pending}
      data-action={action}
      onClick={() =>
        start(async () => {
          try {
            const res = await advanceOrder(orderId, action);
            if (res.ok) toast.success(SUCCESS[action]);
            else toast.error(ERRORS[res.error] || "Action impossible. Réessaie.");
          } catch {
            toast.error("Connexion perdue. Réessaie.");
          }
          router.refresh();
        })
      }
    >
      {pending ? "Un instant…" : children}
    </Button>
  );
}
