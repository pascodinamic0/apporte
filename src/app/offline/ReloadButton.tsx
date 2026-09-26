"use client";
import { useEffect } from "react";
import { Button } from "@/src/components/ui/button";

export function ReloadButton() {
  useEffect(() => {
    const back = () => window.location.reload();
    window.addEventListener("online", back);
    return () => window.removeEventListener("online", back);
  }, []);
  return (
    <Button className="w-full sm:w-auto" onClick={() => window.location.reload()}>
      Réessayer
    </Button>
  );
}
