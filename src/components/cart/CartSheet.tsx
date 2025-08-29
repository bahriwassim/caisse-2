
"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  PackageCheck,
  Loader2,
  Coins,
} from "lucide-react";
import type { CartItem, Order } from "@/lib/types";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from "@/lib/supabase";

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

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
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart
    .reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);

  const handleCashCheckout = async () => {
    setIsLoading(true);
    const customerName = `Table ${tableId}`;
    const randomOrderNum = Math.floor(Math.random() * 900) + 100;
    const orderShortId = `CMD-${tableId}-${String(randomOrderNum).padStart(3, '0')}`;

    try {
      // 1. Create order in Supabase
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer: customerName,
          table_id: parseInt(tableId, 10),
          total: totalPrice,
          status: 'awaiting_payment',
          payment_method: 'Espèces',
          short_id: orderShortId,
        })
        .select()
        .single();
      
      if (orderError) throw orderError;
      const orderId = orderData.id;

      // 2. Create order items
      const orderItems = cart.map(item => ({
        order_id: orderId,
        menu_item_id: item.menuItem.id,
        quantity: item.quantity,
        price: item.menuItem.price,
      }));
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;
      
      // 3. Success
      onOrderPlaced(orderId);
      clearCart();
      toast({
          title: "Commande envoyée !",
          description: "Un serveur viendra à votre table pour l'encaissement.",
      });

    } catch (error) {
       console.error("Error creating cash order in Supabase: ", error);
        toast({
            variant: "destructive",
            title: "Erreur",
            description: "Impossible de créer la commande. Veuillez réessayer.",
        });
    } finally {
      setIsLoading(false);
    }
  }

  const handleStripeCheckout = async () => {
    if (!stripePublishableKey) {
        toast({
            variant: "destructive",
            title: "Configuration requise",
            description: "Le paiement par carte n'est pas encore activé sur cette version de démonstration.",
        });
        return;
    }
    if (!stripePromise) {
       console.error("Stripe.js n'a pas pu être chargé.");
       toast({
            variant: "destructive",
            title: "Erreur de configuration",
            description: "Impossible de charger le service de paiement.",
       });
       return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/checkout_sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            cart, 
            tableId, 
            customerName: `Table ${tableId}`,
            total: totalPrice,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'La création de la session de paiement a échoué');
      }

      const { sessionId, orderId } = await response.json();
      const stripe = await stripePromise;

      if (stripe) {
        onOrderPlaced(orderId);
        clearCart(); // Clear cart before redirect
        const { error } = await stripe.redirectToCheckout({ sessionId });
        if (error) {
          toast({
            variant: "destructive",
            title: "Erreur de paiement",
            description: error.message || "Une erreur est survenue lors de la redirection vers Stripe.",
          });
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de contacter le service de paiement.",
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <ShoppingCart className="mr-2 h-5 w-5" />
          <span>Ma Commande</span>
          {totalItems > 0 && (
            <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {totalItems}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader className="pr-10">
          <SheetTitle className="font-headline text-2xl">Votre Commande</SheetTitle>
          <SheetDescription>
            Confirmez les articles avant de payer.
          </SheetDescription>
        </SheetHeader>
        {cart.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center text-center">
             <ShoppingCart size={64} className="text-muted-foreground/50 mb-4" />
             <p className="text-muted-foreground">Votre panier est vide.</p>
             <p className="text-sm text-muted-foreground/80">Ajoutez des articles du menu pour commencer.</p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-grow my-4">
              <div className="flex flex-col gap-4 pr-4">
                {cart.map(({ menuItem, quantity }) => (
                  <div key={menuItem.id} className="flex justify-between items-center gap-4">
                    <div className="flex-grow">
                      <p className="font-semibold">{menuItem.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {menuItem.price.toFixed(2)} €
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateCartQuantity(menuItem.id, quantity - 1)}
                      >
                        {quantity === 1 ? <Trash2 className="h-4 w-4 text-destructive" /> : <Minus className="h-4 w-4" />}
                      </Button>
                      <span className="w-6 text-center font-bold">{quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateCartQuantity(menuItem.id, quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <Separator />
            <div className="py-4">
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{totalPrice.toFixed(2)} €</span>
              </div>
            </div>
          </>
        )}
        <SheetFooter className="grid grid-cols-1 gap-2">
           <Button
           size="lg"
           className="w-full"
           disabled={cart.length === 0 || isLoading}
           onClick={handleStripeCheckout}
           >
           {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PackageCheck className="mr-2 h-5 w-5" />}
             Payer par Carte
           </Button>
             <SheetClose asChild>
                <Button
                    size="lg"
                    variant="secondary"
                    className="w-full"
                    disabled={cart.length === 0 || isLoading}
                    onClick={handleCashCheckout}
                >
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Coins className="mr-2 h-5 w-5" />}
                    Payer en espèces
                </Button>
            </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
