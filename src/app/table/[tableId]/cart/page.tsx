"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  PackageCheck, 
  Loader2, 
  Coins, 
  AlertTriangle, 
  Clock 
} from "lucide-react";
import type { CartItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from "@/lib/supabase";

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

export default function CartPage() {
  const params = useParams();
  const router = useRouter();
  const tableId = params.tableId as string;
  const [cart, setCart] = useState<CartItem[]>([]);
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

  // Load cart from localStorage
  useEffect(() => {
    const cartKey = `cart_table_${tableId}`;
    const savedCart = localStorage.getItem(cartKey);
    console.log('Loading cart from localStorage:', cartKey, savedCart);
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        console.log('Parsed cart:', parsedCart);
        setCart(parsedCart);
      } catch (error) {
        console.error('Error parsing cart from localStorage:', error);
      }
    }
  }, [tableId]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(`cart_table_${tableId}`, JSON.stringify(cart));
  }, [cart, tableId]);

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
    const interval = setInterval(checkSystemStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);

  const updateCartQuantity = (menuItemId: string, quantity: number) => {
    setCart((prevCart) => {
      const newCart = quantity <= 0 
        ? prevCart.filter((item) => item.menuItem.id !== menuItemId)
        : prevCart.map((item) =>
            item.menuItem.id === menuItemId ? { ...item, quantity } : item
          );
      
      // Save to localStorage immediately
      localStorage.setItem(`cart_table_${tableId}`, JSON.stringify(newCart));
      
      // Dispatch custom event to notify MenuDisplay
      window.dispatchEvent(new CustomEvent('cartUpdated', { 
        detail: { tableId, cart: newCart } 
      }));
      
      return newCart;
    });
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem(`cart_table_${tableId}`);
    // Dispatch custom event to notify MenuDisplay
    window.dispatchEvent(new CustomEvent('cartUpdated', { 
      detail: { tableId, cart: [] } 
    }));
  };

  const handleBackToMenu = () => {
    // Trigger cart update before navigating back
    window.dispatchEvent(new CustomEvent('cartUpdated', { 
      detail: { tableId, cart } 
    }));
    router.push(`/table/${tableId}`);
  };

  const onOrderPlaced = (orderId: string) => {
    localStorage.setItem(`orderId_table_${tableId}`, orderId);
    clearCart();
    router.push(`/table/${tableId}`);
  };

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

      const orderItems = cart.map(item => ({
        order_id: orderId,
        menu_item_id: item.menuItem.id,
        quantity: item.quantity,
        price: item.menuItem.price,
      }));
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;
      
      onOrderPlaced(orderId);
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
  };

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
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={handleBackToMenu}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au menu
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Mon Panier</h1>
            <p className="text-muted-foreground">Table {tableId}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Votre Commande
              {totalItems > 0 && (
                <Badge variant="secondary">{totalItems} article{totalItems > 1 ? 's' : ''}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Vérifiez votre commande avant de procéder au paiement
            </CardDescription>
          </CardHeader>

          <CardContent>
            {cart.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart size={48} className="text-muted-foreground/50 mb-4 mx-auto" />
                <p className="text-muted-foreground mb-2">Votre panier est vide</p>
                <p className="text-sm text-muted-foreground/80 mb-4">
                  Ajoutez des articles du menu pour commencer
                </p>
                <Button onClick={handleBackToMenu}>
                  Retour au menu
                </Button>
              </div>
            ) : (
              <>
                <ScrollArea className="max-h-96">
                  <div className="space-y-4">
                    {cart.map(({ menuItem, quantity }) => (
                      <div key={menuItem.id} className="flex justify-between items-center gap-4 p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-semibold">{menuItem.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {menuItem.description}
                          </p>
                          <p className="text-sm font-medium text-primary">
                            {menuItem.price.toFixed(2)} € l'unité
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateCartQuantity(menuItem.id, quantity - 1)}
                          >
                            {quantity === 1 ? <Trash2 className="h-4 w-4 text-destructive" /> : <Minus className="h-4 w-4" />}
                          </Button>
                          <span className="w-8 text-center font-bold">{quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateCartQuantity(menuItem.id, quantity + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-right min-w-[80px]">
                          <p className="font-bold">
                            {(menuItem.price * quantity).toFixed(2)} €
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <Separator className="my-6" />

                <div className="space-y-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{totalPrice.toFixed(2)} €</span>
                  </div>
                </div>

                {/* System Status Warning */}
                {!systemStatus.ordersEnabled && (
                  <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-semibold text-orange-800 dark:text-orange-200 mb-1">
                          Commandes temporairement suspendues
                        </h4>
                        <p className="text-xs text-orange-700 dark:text-orange-300 leading-relaxed">
                          {systemStatus.pausedReason}
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-orange-600 dark:text-orange-400">
                          <Clock className="h-3 w-3" />
                          Nous reprendrons très bientôt !
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cash Payment Information */}
                {systemStatus.ordersEnabled && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Coins className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">
                          Paiement à la caisse
                        </h4>
                        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                         Pour régler en caisse (espèces, carte…), présentez-vous avec votre numéro de commande obtenu après validation.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment buttons */}
                <div className="mt-6 space-y-3">
                  {systemStatus.paymentMethods.card && (
                    <Button
                      size="lg"
                      className="w-full"
                      disabled={isLoading || !systemStatus.ordersEnabled}
                      onClick={handleStripeCheckout}
                    >
                      {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PackageCheck className="mr-2 h-5 w-5" />}
                      Paiement en ligne (Apple & Google Pay, Visa…)
                    </Button>
                  )}
                  {systemStatus.paymentMethods.cash && (
                    <Button
                      size="lg"
                      variant="secondary"
                      className="w-full"
                      disabled={isLoading || !systemStatus.ordersEnabled}
                      onClick={handleCashCheckout}
                    >
                      {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Coins className="mr-2 h-5 w-5" />}
                      Payer à la caisse
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}