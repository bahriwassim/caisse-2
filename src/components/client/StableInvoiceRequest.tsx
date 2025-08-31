"use client"

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import type { Order } from "@/lib/types";

interface StableInvoiceRequestProps {
  order: Order;
  className?: string;
  onRefreshPauseChange?: (paused: boolean) => void; // Maintenu pour rétrocompatibilité
}

export function StableInvoiceRequest({ order, className }: StableInvoiceRequestProps) {
  const router = useRouter();

  const handleInvoiceRequest = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Rediriger vers la page dédiée de demande de facture
    router.push(`/invoice-request/${order.id}`);
  }, [router, order.id]);

  return (
    <Button 
      type="button"
      variant="outline" 
      className={`gap-2 ${className}`}
      onClick={handleInvoiceRequest}
    >
      <FileText className="h-4 w-4" />
      Demander une facture
    </Button>
  );
}