
"use client";

import type { MenuCategory, CartItem, MenuItem, Order, FullOrder } from "@/lib/types";
import { useState, useEffect } from "react";
import MenuItemCard from "./MenuItemCard";
import CartSheet from "../cart/CartSheet";
import PosCartSheet from "../cart/PosCartSheet";
import { useToast } from "@/hooks/use-toast";
import { useState as useNotificationState } from "react";
import type { POSNotification } from "@/components/pos/POSNotifications";
import POSNotifications from "@/components/pos/POSNotifications";
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "../ui/card";
import { supabase } from "@/lib/supabase";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Loader2, CheckCircle, Ban, AlertTriangle, Clock } from "lucide-react";
import { MobileThemeToggle } from "@/components/theme/ThemeToggle";
import { Separator } from "../ui/separator";
import { parseISO } from 'date-fns';
import { StableInvoiceRequest } from "@/components/client/StableInvoiceRequest";

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
  const [posNotifications, setPosNotifications] = useNotificationState<POSNotification[]>([]);
  const [systemStatus, setSystemStatus] = useState({ ordersEnabled: true, pausedReason: '' });
  const [isRefreshPaused, setIsRefreshPaused] = useState(false);
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

  // Check system status for customer-facing pages
  useEffect(() => {
    if (!isPosMode) {
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
      // Check status every 15 seconds for customer pages
      const interval = setInterval(checkSystemStatus, 15000);
      return () => clearInterval(interval);
    }
  }, [isPosMode]);

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
    // Sauf si explicitement mis en pause
    const pollingInterval = setInterval(() => {
      if (!isRefreshPaused) {
        fetchOrder(currentOrderId);
      }
    }, 8000);
      
    return () => {
        supabase.removeChannel(channel);
        clearInterval(pollingInterval);
    }

  }, [currentOrderId, tableId, isRefreshPaused]);

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
        // POS notification on left side if in POS mode
        if (isPosMode) {
          const notification: POSNotification = {
            id: Math.random().toString(36).substr(2, 9),
            title: "Nouvelle commande",
            description: "Prêt pour une nouvelle commande",
            type: 'info',
            duration: 3000
          };
          setPosNotifications(prev => [...prev, notification]);
        }
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
    
    if (isPosMode) {
      // POS notification on left side if in POS mode
      const notification: POSNotification = {
        id: Math.random().toString(36).substr(2, 9),
        title: "Ajouté",
        description: `${menuItem.name} ajouté à la commande`,
        type: 'success',
        duration: 2000
      };
      setPosNotifications(prev => [...prev, notification]);
    } else {
      // Client notification with toast
      toast({
        title: "Ajouté au panier",
        description: `${menuItem.name} a été ajouté à votre panier`,
        duration: 2000,
        variant: "success",
      });
    }
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
                        <div className="flex gap-2 mt-3 justify-center flex-wrap">
                          {currentOrder.status === 'delivered' && (
                            <StableInvoiceRequest 
                              order={currentOrder} 
                              className="flex-shrink-0"
                              onRefreshPauseChange={setIsRefreshPaused}
                            />
                          )}
                          <Button onClick={handleClearOrder} size="sm">Passer une nouvelle commande</Button>
                        </div>
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
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between sm:block">
                  <CardTitle className="font-headline text-xl sm:text-2xl">Caisse</CardTitle>
                  <MobileThemeToggle />
                </div>
                <CardDescription className="text-sm sm:text-base">Créez une nouvelle commande pour un client au comptoir.</CardDescription>
              </div>
              <PosCartSheet 
                cart={cart} 
                updateCartQuantity={updateCartQuantity} 
                clearCart={clearCart}
                onNotification={(notification) => {
                  const posNotification: POSNotification = {
                    ...notification,
                    type: notification.type as 'success' | 'warning' | 'info'
                  };
                  setPosNotifications(prev => [...prev, posNotification]);
                }}
              />
            </div>
        </CardHeader>
      )
    }
    return (
       <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 px-4 sm:px-0">
        <div className="flex-1">
          <div className="flex items-center justify-between sm:block">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-headline">Menu</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Table {tableId}</p>
            </div>
            <MobileThemeToggle />
          </div>
        </div>
        <div className="w-full sm:w-auto">
          <CartSheet 
              cart={cart} 
              updateCartQuantity={updateCartQuantity} 
              clearCart={clearCart} 
              tableId={tableId}
              onOrderPlaced={handleOrderPlaced}
          />
        </div>
      </div>
    )
  }
  
  const showMenu = !currentOrder || currentOrder.status === 'delivered' || currentOrder.status === 'cancelled';

  // System Status Banner for customers
  const SystemStatusBanner = () => {
    if (isPosMode || systemStatus.ordersEnabled) return null;

    return (
      <Card className="mb-6 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="bg-orange-100 dark:bg-orange-800 p-3 rounded-full flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200 mb-2">
                ⏸️ Commandes temporairement suspendues
              </h3>
              <p className="text-orange-700 dark:text-orange-300 leading-relaxed">
                {systemStatus.pausedReason}
              </p>
              <div className="flex items-center gap-2 mt-3 text-sm text-orange-600 dark:text-orange-400">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Nous reprendrons les commandes très bientôt ! Merci pour votre patience 🙏</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const handleCloseNotification = (id: string) => {
    setPosNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  return (
    <>
      {isPosMode && (
        <POSNotifications 
          notifications={posNotifications} 
          onClose={handleCloseNotification} 
        />
      )}
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <SystemStatusBanner />
      {!isPosMode && <OrderStatusTracker />}
      
      {showMenu && (
        <>
            <PageHeader />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {menu.flatMap((category) => category.items).map((item) => (
                    <MenuItemCard key={item.id} item={item} onAddToCart={addToCart} />
                ))}
            </div>
        </>
      )}
      </div>
    </>
  );
}
