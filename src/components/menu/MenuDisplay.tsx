
"use client";

import type { MenuCategory, CartItem, MenuItem, Order, FullOrder } from "@/lib/types";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MenuItemCard from "./MenuItemCard";
import CartSheet from "../cart/CartSheet";
import PosCartSheet from "../cart/PosCartSheet";
import { useToast } from "@/hooks/use-toast";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "../ui/card";
import { supabase } from "@/lib/supabase";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Loader2, CheckCircle, Ban } from "lucide-react";
import { Separator } from "../ui/separator";
import { parseISO } from 'date-fns';

interface MenuDisplayProps {
  menu: MenuCategory[];
  tableId: string;
  isPosMode?: boolean;
}

export default function MenuDisplay({ menu, tableId, isPosMode = false }: MenuDisplayProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [currentOrder, setCurrentOrder] = useState<FullOrder | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const { toast } = useToast();

  const fetchOrder = async (orderId: string) => {
     setIsLoadingOrder(true);
      const { data: order, error } = await supabase
        .from('orders')
        .select(`
            *,
            order_items (
                *,
                menu_items (
                    *
                )
            )
        `)
        .eq('id', orderId)
        .single();
    
    if (error) {
        console.error("Error fetching order:", error);
        handleClearOrder();
    } else {
        // This is a type assertion because Supabase SDK cannot know about the nested structure type
        const fullOrder = order as unknown as FullOrder;
        setCurrentOrder(fullOrder);

        // If order is finished, allow user to start a new one
        if (fullOrder.status === 'delivered' || fullOrder.status === 'cancelled') {
           // The "New Order" button will handle clearing the state.
        }
    }
     setIsLoadingOrder(false);
  }

  useEffect(() => {
    const storedOrderId = localStorage.getItem(`orderId_table_${tableId}`);
    if (storedOrderId) {
      setCurrentOrderId(storedOrderId);
    } else {
      setIsLoadingOrder(false);
    }
  }, [tableId]);

  useEffect(() => {
    if (!currentOrderId) {
      setCurrentOrder(null);
      setIsLoadingOrder(false);
      return;
    }

    fetchOrder(currentOrderId);

    // Real-time WebSocket avec Supabase
    const channel = supabase
      .channel(`order-updates-${currentOrderId}`)
      .on('postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${currentOrderId}`}, 
          (payload) => {
              fetchOrder(currentOrderId);
          }
       )
      .subscribe();

    // Polling de secours toutes les 8 secondes pour garantir l'actualisation
    const pollingInterval = setInterval(() => {
      fetchOrder(currentOrderId);
    }, 8000);
      
    return () => {
        supabase.removeChannel(channel);
        clearInterval(pollingInterval);
    }

  }, [currentOrderId, tableId]);

  const handleOrderPlaced = (orderId: string) => {
    localStorage.setItem(`orderId_table_${tableId}`, orderId);
    setCurrentOrderId(orderId);
    setCart([]);
  };

  const handleClearOrder = () => {
    if(currentOrderId) {
        localStorage.removeItem(`orderId_table_${tableId}`);
        setCurrentOrderId(null);
        setCurrentOrder(null);
        toast({
            title: "Prêt pour une nouvelle commande",
            description: "Vous pouvez maintenant passer une nouvelle commande.",
        });
    }
  };

  const addToCart = (menuItem: MenuItem) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find(
        (item) => item.menuItem.id === menuItem.id
      );
      if (existingItem) {
        return prevCart.map((item) =>
          item.menuItem.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { menuItem, quantity: 1 }];
    });
    toast({
      title: "Ajouté à la commande",
      description: `${menuItem.name} a été ajouté.`,
    });
  };

  const updateCartQuantity = (menuItemId: string, quantity: number) => {
    setCart((prevCart) => {
      if (quantity <= 0) {
        return prevCart.filter((item) => item.menuItem.id !== menuItemId);
      }
      return prevCart.map((item) =>
        item.menuItem.id === menuItemId ? { ...item, quantity } : item
      );
    });
  };
  
  const clearCart = () => {
    setCart([]);
  }

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case "awaiting_payment":
        return <Badge variant="outline" className="border-orange-500 text-orange-500">En attente de paiement</Badge>;
      case "in_preparation":
        return <Badge variant="default" className="bg-blue-500 text-white">En préparation</Badge>;
      case "delivered":
        return <Badge className="bg-green-600 text-white">Livrée</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Annulée</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const OrderStatusTracker = () => {
    if (isLoadingOrder) {
        return (
            <Card className="mb-8">
                <CardContent className="pt-6 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <p>Recherche de votre commande en cours...</p>
                </CardContent>
            </Card>
        )
    }

    if (!currentOrder) return null;

    const isOrderFinished = currentOrder.status === 'delivered' || currentOrder.status === 'cancelled';

    return (
        <Card className="mb-8 shadow-lg bg-card/90">
            <CardHeader>
                <CardTitle className="font-headline text-xl flex justify-between items-center">
                    <span>Suivi de votre commande</span>
                    {getStatusBadge(currentOrder.status)}
                </CardTitle>
                <CardDescription>ID de la commande : {currentOrder.short_id}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {currentOrder.order_items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                            <p><span className="font-bold">{item.quantity}x</span> {item.menu_items.name}</p>
                            <p className="text-muted-foreground">{(item.quantity * item.price).toFixed(2)} €</p>
                        </div>
                    ))}
                </div>
                <Separator className="my-3" />
                <div className="flex justify-between font-bold text-lg">
                    <p>Total</p>
                    <p>{currentOrder.total.toFixed(2)} €</p>
                </div>
                
                 {isOrderFinished && (
                     <div className="mt-4 text-center p-4 bg-green-100 dark:bg-green-900/50 rounded-lg">
                        {currentOrder.status === 'delivered' ? (
                            <CheckCircle className="mx-auto h-8 w-8 text-green-600 mb-2" />
                        ) : (
                            <Ban className="mx-auto h-8 w-8 text-destructive mb-2" />
                        )}
                        <p className="font-semibold text-green-700 dark:text-green-300">
                           {currentOrder.status === 'delivered' ? 'Votre commande a été livrée. Bon appétit !' : 'Votre commande a été annulée.'}
                        </p>
                        <Button onClick={handleClearOrder} className="mt-3" size="sm">Passer une nouvelle commande</Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
  }

  const PageHeader = () => {
    if (isPosMode) {
      return (
         <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="font-headline text-2xl">Caisse</CardTitle>
                <CardDescription>Créez une nouvelle commande pour un client au comptoir.</CardDescription>
              </div>
              <PosCartSheet cart={cart} updateCartQuantity={updateCartQuantity} clearCart={clearCart} />
            </div>
        </CardHeader>
      )
    }
    return (
       <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold font-headline">Menu</h1>
          <p className="text-muted-foreground">Commande pour la Table {tableId}</p>
        </div>
        <CartSheet 
            cart={cart} 
            updateCartQuantity={updateCartQuantity} 
            clearCart={clearCart} 
            tableId={tableId}
            onOrderPlaced={handleOrderPlaced}
        />
      </div>
    )
  }
  
  const showMenu = !currentOrder || currentOrder.status === 'delivered' || currentOrder.status === 'cancelled';

  return (
    <div className="container mx-auto px-4 py-8">
      {!isPosMode && <OrderStatusTracker />}
      
      {showMenu && (
        <>
            <PageHeader />
            <Tabs defaultValue={menu[0]?.id || 'entrees'} className="w-full">
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 mb-4">
                {menu.map((category) => (
                    <TabsTrigger key={category.id} value={category.id}>
                    {category.name}
                    </TabsTrigger>
                ))}
                </TabsList>
                {menu.map((category) => (
                <TabsContent key={category.id} value={category.id}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {category.items.map((item) => (
                        <MenuItemCard key={item.id} item={item} onAddToCart={addToCart} />
                    ))}
                    </div>
                </TabsContent>
                ))}
            </Tabs>
        </>
      )}
    </div>
  );
}
