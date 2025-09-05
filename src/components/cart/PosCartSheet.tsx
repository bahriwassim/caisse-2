
"use client";

import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
} from "lucide-react";
import type { CartItem } from "@/lib/types";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface PosCartSheetProps {
  cart: CartItem[];
  updateCartQuantity: (menuItemId: string, quantity: number) => void;
  clearCart: () => void;
  onNotification?: (notification: { id: string; title: string; description: string; type: 'success' | 'warning' | 'info'; duration: number }) => void;
}

export default function PosCartSheet({
  cart,
  updateCartQuantity,
  clearCart,
  onNotification,
}: PosCartSheetProps) {
  const router = useRouter();

  // The cart is already saved by MenuDisplay component, no need to save again here

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCartClick = () => {
    router.push('/admin/pos/cart');
  };

  return (
    <Button className="relative" onClick={handleCartClick}>
      <ShoppingCart className="mr-2 h-5 w-5" />
      <span>Voir la Commande</span>
      {totalItems > 0 && (
        <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {totalItems}
        </span>
      )}
    </Button>
  );
}
