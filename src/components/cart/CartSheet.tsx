
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
  AlertTriangle,
  Clock,
} from "lucide-react";
import type { CartItem, Order } from "@/lib/types";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { useState, useEffect } from "react";
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
  const [systemStatus, setSystemStatus] = useState({ 
    ordersEnabled: true, 
    pausedReason: '',
    paymentMethods: {
      cash: true,
      card: true
    }
  });
  const { toast } = useToast();

  // Check system status
  useEffect(() => {
    const checkSystemStatus = async () => {
      try {
        const response = await fetch('/api/system/status');
        if (response.ok) {
          const status = await response.json();
          setSystemStatus(status);
        }
      } catch (error) {
        console.error('Error checking system status:', error);
      }
    };

    checkSystemStatus();
    // Check status every 10 seconds
    const interval = setInterval(checkSystemStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart
    .reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);

  const handleCashCheckout = async () => {
    if (!systemStatus.ordersEnabled) {
      toast({
        variant: "destructive",
        title: "Commandes suspendues",
        description: systemStatus.pausedReason || "Les commandes sont temporairement suspendues.",
      });
      return;
    }

    setIsLoading(true);
    const customerName = `Table ${tableId}`;
    const randomOrderNum = Math.floor(Math.random() * 900) + 100;
    const orderShortId = `TABLE-${tableId}-${String(randomOrderNum).padStart(3, '0')}`;

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
          description: `Présentez-vous à la caisse avec votre numéro de commande ${orderShortId} pour régler votre commande.`,
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
    if (!systemStatus.ordersEnabled) {
      toast({
        variant: "destructive",
        title: "Commandes suspendues",
        description: systemStatus.pausedReason || "Les commandes sont temporairement suspendues.",
      });
      return;
    }

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
        <Button variant="outline" className="relative w-full sm:w-auto">
          <ShoppingCart className="mr-2 h-5 w-5" />
          <span className="hidden sm:inline">Ma Commande</span>
          <span className="sm:hidden">Panier</span>
          {totalItems > 0 && (
            <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {totalItems}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col w-full sm:max-w-md">
        <SheetHeader className="pr-8 sm:pr-10">
          <SheetTitle className="font-headline text-xl sm:text-2xl">Votre Commande</SheetTitle>
          <SheetDescription className="text-sm sm:text-base">
            Confirmez les articles avant de payer.
          </SheetDescription>
        </SheetHeader>
        {cart.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center text-center px-4">
             <ShoppingCart size={48} className="text-muted-foreground/50 mb-4" />
             <p className="text-muted-foreground">Votre panier est vide.</p>
             <p className="text-sm text-muted-foreground/80">Ajoutez des articles du menu pour commencer.</p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-grow my-4">
              <div className="flex flex-col gap-3 pr-2 sm:pr-4">
                {cart.map(({ menuItem, quantity }) => (
                  <div key={menuItem.id} className="flex justify-between items-center gap-2 sm:gap-4">
                    <div className="flex-grow min-w-0">
                      <p className="font-semibold text-sm sm:text-base truncate">{menuItem.name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {menuItem.price.toFixed(2)} €
                      </p>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6 sm:h-7 sm:w-7"
                        onClick={() => updateCartQuantity(menuItem.id, quantity - 1)}
                      >
                        {quantity === 1 ? <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" /> : <Minus className="h-3 w-3 sm:h-4 sm:w-4" />}
                      </Button>
                      <span className="w-6 text-center font-bold text-sm sm:text-base">{quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6 sm:h-7 sm:w-7"
                        onClick={() => updateCartQuantity(menuItem.id, quantity + 1)}
                      >
                        <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <Separator />
            <div className="py-3 sm:py-4">
              <div className="flex justify-between font-bold text-base sm:text-lg">
                <span>Total</span>
                <span>{totalPrice.toFixed(2)} €</span>
              </div>
            </div>

            {/* System Status Warning */}
            {!systemStatus.ordersEnabled && (
              <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <div className="flex items-start gap-2 sm:gap-3">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-orange-800 dark:text-orange-200 mb-1">
                      Commandes temporairement suspendues
                    </h4>
                    <p className="text-xs text-orange-700 dark:text-orange-300 leading-relaxed">
                      {systemStatus.pausedReason}
                    </p>
                    <div className="flex items-center gap-1 mt-1 sm:mt-2 text-xs text-orange-600 dark:text-orange-400">
                      <Clock className="h-3 w-3" />
                      Nous reprendrons très bientôt !
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Cash Payment Information */}
        {cart.length > 0 && systemStatus.ordersEnabled && (
          <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-2 sm:gap-3">
              <Coins className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">
                  Paiement à la caisse
                </h4>
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                 Pour régler en caisse (espèces, carte…), présentez-vous avec votre numéro de commande obtenu après validation.
                </p>
              </div>
            </div>
          </div>
        )}

        <SheetFooter className="grid grid-cols-1 gap-2 pt-2">
           {systemStatus.paymentMethods.card && (
             <Button
             size="lg"
             className="w-full h-12 sm:h-10 text-sm sm:text-base"
             disabled={cart.length === 0 || isLoading || !systemStatus.ordersEnabled}
             onClick={handleStripeCheckout}
             >
             {isLoading ? <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <PackageCheck className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />}
               <span className="truncate">{systemStatus.ordersEnabled ? 'Paiement en ligne( Apple & Google Pay,Visa…)' : 'Commandes suspendues'}</span>
             </Button>
           )}
           {systemStatus.paymentMethods.cash && (
             <SheetClose asChild>
                <Button
                    size="lg"
                    variant="secondary"
                    className="w-full h-12 sm:h-10 text-sm sm:text-base"
                    disabled={cart.length === 0 || isLoading || !systemStatus.ordersEnabled}
                    onClick={handleCashCheckout}
                >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <Coins className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />}
                    <span className="truncate">{systemStatus.ordersEnabled ? 'Payer à la caisse' : 'Commandes suspendues'}</span>
                </Button>
            </SheetClose>
           )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
