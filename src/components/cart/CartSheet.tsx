
"use client";

import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
} from "lucide-react";
import type { CartItem } from "@/lib/types";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface CartSheetProps {
  cart: CartItem[];
  updateCartQuantity: (menuItemId: string, quantity: number) => void;
  clearCart: () => void;
  tableId: string;
  onOrderPlaced: (orderId: string) => void;
}

export default function CartSheet({
  cart,
  updateCartQuantity,
  clearCart,
  tableId,
  onOrderPlaced,
}: CartSheetProps) {
  const router = useRouter();

  // The cart is already saved by MenuDisplay component, no need to save again here

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCartClick = () => {
    router.push(`/table/${tableId}/cart`);
  };

  return (
    <Button variant="outline" className="relative w-full sm:w-auto" onClick={handleCartClick}>
      <ShoppingCart className="mr-2 h-5 w-5" />
      <span className="hidden sm:inline">Ma Commande</span>
      <span className="sm:hidden">Panier</span>
      {totalItems > 0 && (
        <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {totalItems}
        </span>
      )}
    </Button>
  );
}
