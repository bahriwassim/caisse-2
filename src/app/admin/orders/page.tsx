
"use client"

import { useEffect, useState, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  MoreHorizontal, 
  Truck, 
  CircleDollarSign, 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  Ban, 
  Bell,
  BellOff,
  Settings,
  RefreshCw,
  Filter,
  Search,
  Volume2,
  VolumeX,
  BellRing,
  Euro
} from "lucide-react";
import { MobileThemeToggle } from "@/components/theme/ThemeToggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { OrderStatus, Order, PaymentMethod, FullOrder, OrderItem } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { useEnhancedToast } from "@/hooks/use-enhanced-toast";
import { useGlobalRefreshPause } from "@/hooks/use-global-refresh-pause";
import { useSoundNotification } from "@/hooks/use-sound-notification";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseISO } from 'date-fns';
import { InvoiceGenerator } from "@/components/admin/InvoiceGenerator";

export default function OrdersPage() {
  const router = useRouter();
  const [activeOrders, setActiveOrders] = useState<FullOrder[]>([]);
  const [completedOrders, setCompletedOrders] = useState<FullOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const enhancedToast = useEnhancedToast();
  const { isPaused: isGlobalRefreshPaused } = useGlobalRefreshPause();
  const notificationsRef = useRef(notificationsEnabled);
  const { playNotification, requestPermission } = useSoundNotification({ volume: 0.7, playback: notificationsEnabled });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('disconnected');
  const [eventCount, setEventCount] = useState<number>(0);
  const [lastPayload, setLastPayload] = useState<any>(null);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [originalTitle, setOriginalTitle] = useState<string>('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data: active, error: activeError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          menu_item:menu_items(*)
        )
      `)
      .in('status', ['awaiting_payment', 'in_preparation', 'ready_for_delivery'])
      .order('created_at', { ascending: false });

    const { data: completed, error: completedError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          menu_item:menu_items(*)
        )
      `)
      .in('status', ['delivered', 'cancelled'])
      .order('created_at', { ascending: false });

    if (activeError || completedError) {
      console.error("Error fetching orders:", activeError || completedError);
      enhancedToast.error("Erreur", "Impossible de charger les commandes.");
    } else {
      setActiveOrders(active || []);
      setCompletedOrders(completed || []);
      setLastUpdate(new Date());
    }
    setLoading(false);
  }, [enhancedToast]);


  useEffect(() => {
    // Sauvegarder le titre original
    setOriginalTitle(document.title);
    
    // Demander la permission pour les notifications seulement si nécessaire (on mount)
    if ('Notification' in window && Notification.permission === 'default') {
      // don't force the prompt if user hasn't enabled notifications yet
    }

    fetchOrders();

  // keep a mutable ref updated via effect below

    const channel = supabase
      .channel('realtime-orders-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        try {
          setEventCount((c) => c + 1);
          setLastPayload(payload);
          setSubscriptionStatus('received-event');
        } catch (e) {
          console.error('Error updating realtime debug state', e);
        }

        // Apply change locally for real-time UX
        const event = payload.eventType;
        const newRec = payload.new as FullOrder | null;
        const oldRec = payload.old as FullOrder | null;
        
        if (event === 'INSERT' && newRec) {
          // Pour les INSERT, on fait le refetch après avoir géré les notifications
          fetchOrders();
          
          // Notification pour nouvelle commande
          if (notificationsRef.current) {
            enhancedToast.success(
              '🛎️ Nouvelle commande reçue',
              `Commande #${newRec.short_id || newRec.id.substring(0, 6)} - Table ${newRec.table_id} - ${newRec.customer} - ${newRec.total?.toFixed(2) || '0.00'}€`,
              { 
                position: 'top-right',
                duration: 8000,
                blink: true,
                playSound: true
              }
            );
            
            // Sound notification
            if (soundEnabled) {
              playNotification('new_order');
            }
            
            // Notification native du navigateur si permission accordée
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Nouvelle commande reçue', {
                body: `Table ${newRec.table_id} - ${newRec.customer} - ${newRec.total?.toFixed(2) || '0.00'}€`,
                icon: '/favicon.ico',
                tag: `order-${newRec.id}`,
                requireInteraction: true
              });
            }
          }
          
          // Marquer comme nouvelle commande pour mise en évidence visuelle
          setNewOrderIds(prev => new Set([...prev, newRec.id]));
          
          // Enlever la mise en évidence après 10 secondes
          setTimeout(() => {
            setNewOrderIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(newRec.id);
              return newSet;
            });
          }, 10000);
          
          setLastUpdate(new Date());
          return;
        }

        if (event === 'UPDATE' && newRec) {
          // Pour les UPDATE, on fait le refetch pour obtenir les détails complets
          fetchOrders();
          
          if (notificationsRef.current && oldRec && oldRec.status !== newRec.status) {
            const statusMessages: Record<string, string> = {
              awaiting_payment: 'En attente de paiement',
              in_preparation: 'En préparation', 
              ready_for_delivery: 'Prête pour livraison',
              delivered: 'Livrée',
              cancelled: 'Annulée',
            };
            const statusEmojis: Record<string, string> = {
              awaiting_payment: '⏳',
              in_preparation: '👨‍🍳',
              ready_for_delivery: '🚚',
              delivered: '✅',
              cancelled: '❌',
            };
            
            const notificationTitle = `${statusEmojis[newRec.status]} Commande mise à jour`;
            const notificationDesc = `#${newRec.short_id || newRec.id.substring(0, 6)} - Table ${newRec.table_id} - ${newRec.customer} - "${statusMessages[newRec.status]}"`;
            
            if (newRec.status === 'delivered') {
              enhancedToast.success(notificationTitle, notificationDesc, {
                position: 'top-right',
                duration: 5000,
                blink: false
              });
              if (soundEnabled) {
                playNotification('payment_received');
              }
            } else if (newRec.status === 'cancelled') {
              enhancedToast.warning(notificationTitle, notificationDesc, {
                position: 'top-right',
                duration: 6000,
                blink: true
              });
            } else {
              enhancedToast.info(notificationTitle, notificationDesc, {
                position: 'top-right',
                duration: 4000
              });
              if (soundEnabled) {
                playNotification('order_update');
              }
            }
          }
          
          setLastUpdate(new Date());
          return;
        }

        if (event === 'DELETE' && oldRec) {
          fetchOrders(); // Refetch pour synchroniser
          setLastUpdate(new Date());
          return;
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setSubscriptionStatus('subscribed');
        } else if (status === 'CHANNEL_ERROR') {
          setSubscriptionStatus('error');
          console.error('Erreur de subscription aux changements temps réel');
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setSubscriptionStatus('disconnected');
      if (originalTitle) {
        document.title = originalTitle;
      }
    };
  }, [fetchOrders, enhancedToast]);

  useEffect(() => {
    if (!autoRefresh || isGlobalRefreshPaused) return;

    const interval = setInterval(() => {
      if (!isGlobalRefreshPaused) {
        fetchOrders();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, isGlobalRefreshPaused, fetchOrders]);

  useEffect(() => {
    if (notificationsEnabled && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            enhancedToast.success(
              "Notifications activées", 
              "Vous recevrez des notifications pour les nouvelles commandes",
              { duration: 3000 }
            );
          }
        });
      }
    }
  }, [notificationsEnabled, enhancedToast]);

  useEffect(() => {
    notificationsRef.current = notificationsEnabled;
  }, [notificationsEnabled]);

  // Request audio permission when sound is first enabled
  useEffect(() => {
    if (soundEnabled) {
      requestPermission();
    }
  }, [soundEnabled, requestPermission]);
  
  useEffect(() => {
    if (originalTitle) {
      const pendingCount = activeOrders.length;
      if (pendingCount > 0) {
        document.title = `(${pendingCount}) ${originalTitle}`;
      } else {
        document.title = originalTitle;
      }
    }
  }, [activeOrders.length, originalTitle]);

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (error) {
      console.error("Erreur de mise à jour du statut:", error);
      enhancedToast.error("Erreur", "Impossible de mettre à jour le statut de la commande.");
    }
    // Suppression de la notification redondante - elle sera gérée par le realtime listener
  };

  const handleViewDetails = (order: FullOrder) => {
    router.push(`/admin/orders/${order.id}`);
  };

  const handleRingBell = async (order: FullOrder) => {
    // Notification visuelle
    enhancedToast.info(
      `🔔 Sonnerie activée`,
      `Commande #${order.short_id || order.id.substring(0, 6)} - Table ${order.table_id} - ${order.customer}`,
      { 
        position: 'top-right',
        duration: 3000,
        blink: true
      }
    );
    
    // Son de notification
    if (soundEnabled) {
      playNotification('order_ready');
    }
    
    // Notification native du navigateur si permission accordée
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Commande prête !', {
        body: `Table ${order.table_id} - ${order.customer} - Commande #${order.short_id || order.id.substring(0, 6)}`,
        icon: '/favicon.ico',
        tag: `ready-${order.id}`,
        requireInteraction: true
      });
    }
  };

  const filterOrdersByPayment = (orders: FullOrder[]) => {
    if (paymentMethodFilter === 'all') {
      return orders;
    }
    return orders.filter(order => order.payment_method === paymentMethodFilter);
  };

  const filterOrdersByStatus = (orders: FullOrder[]) => {
    if (statusFilter === 'all') {
      return orders;
    }
    return orders.filter(order => order.status === statusFilter);
  };

  const filterOrdersBySearch = (orders: FullOrder[]) => {
    if (!searchQuery.trim()) {
      return orders;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return orders.filter(order => {
      // Search by order number
      const orderNumber = order.short_id || order.id.substring(0, 6);
      if (orderNumber.toLowerCase().includes(query)) {
        return true;
      }
      
      // Search by customer name
      if (order.customer.toLowerCase().includes(query)) {
        return true;
      }
      
      // Search by price
      if (order.total.toString().includes(query)) {
        return true;
      }
      
      // Search by product names in order items
      if (order.order_items?.some(item => 
        item.menu_item?.name.toLowerCase().includes(query)
      )) {
        return true;
      }
      
      return false;
    });
  };

  const getFilteredOrders = (orders: FullOrder[]) => {
    let filtered = filterOrdersByPayment(orders);
    filtered = filterOrdersByStatus(filtered);
    filtered = filterOrdersBySearch(filtered);
    return filtered;
  };


  const OrderTable = ({ orders }: { orders: FullOrder[] }) => (
    <div className="overflow-x-auto">
      <Table className="min-w-[800px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">ID</TableHead>
            <TableHead className="w-[120px]">Client</TableHead>
            <TableHead className="w-[80px] hidden sm:table-cell">Articles</TableHead>
            <TableHead className="w-[120px]">Statut</TableHead>
            <TableHead className="w-[100px] hidden md:table-cell">Paiement</TableHead>
            <TableHead className="w-[80px] hidden lg:table-cell">Heure</TableHead>
            <TableHead className="w-[80px] text-right">Total</TableHead>
            <TableHead className="w-[160px] sm:w-[200px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow 
              key={order.id} 
              className={`hover:bg-gray-50 dark:hover:bg-gray-900/50 cursor-pointer transition-all duration-500 ${
                newOrderIds.has(order.id) 
                  ? 'bg-green-50 dark:bg-green-900/20 border-l-4 border-l-green-500 animate-pulse' 
                  : ''
              }`} 
              onClick={() => handleViewDetails(order)}
            >
              <TableCell className="font-medium text-xs sm:text-sm">
                {order.short_id || order.id.substring(0, 6)}
              </TableCell>
              <TableCell>
                <div className="text-xs sm:text-sm font-medium">{order.customer}</div>
                {order.table_id > 0 && <div className="text-xs text-muted-foreground">Table {order.table_id}</div>}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <div className="text-xs">
                  {order.order_items?.length || 0} art.
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(order.status)}</TableCell>
              <TableCell className="hidden md:table-cell">{getPaymentBadge(order.payment_method)}</TableCell>
              <TableCell className="hidden lg:table-cell text-xs">
                {order.created_at ? parseISO(order.created_at).toLocaleTimeString('fr-FR') : 'N/A'}
              </TableCell>
              <TableCell className="text-right font-semibold text-xs sm:text-sm">
                {order.total.toFixed(2)} €
              </TableCell>
              <TableCell>
                <div className="flex gap-1 justify-end flex-wrap">
                  {order.status === 'awaiting_payment' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => { e.stopPropagation(); handleUpdateStatus(order.id, 'in_preparation'); }}
                      className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:border-green-300 text-xs h-7 px-2"
                    >
                      <Euro className="h-3 w-3 sm:mr-1" />
                      <span className="hidden sm:inline">Payée</span>
                    </Button>
                  )}
                  {order.status === 'in_preparation' && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => { e.stopPropagation(); handleUpdateStatus(order.id, 'ready_for_delivery'); }}
                        className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 hover:border-purple-300 text-xs h-7 px-2"
                      >
                        <Truck className="h-3 w-3 sm:mr-1" />
                        <span className="hidden sm:inline">Prête</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => { e.stopPropagation(); handleRingBell(order); }}
                        className="bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100 hover:border-yellow-300 text-xs h-7 px-2"
                      >
                        <BellRing className="h-3 w-3 sm:mr-1" />
                        <span className="hidden sm:inline">Sonner</span>
                      </Button>
                    </>
                  )}
                  {order.status === 'ready_for_delivery' && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => { e.stopPropagation(); handleUpdateStatus(order.id, 'delivered'); }}
                        className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 text-xs h-7 px-2"
                      >
                        <CheckCircle className="h-3 w-3 sm:mr-1" />
                        <span className="hidden sm:inline">Livrée</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => { e.stopPropagation(); handleRingBell(order); }}
                        className="bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100 hover:border-yellow-300 text-xs h-7 px-2"
                      >
                        <BellRing className="h-3 w-3 sm:mr-1" />
                        <span className="hidden sm:inline">Sonner</span>
                      </Button>
                    </>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => { e.stopPropagation(); handleViewDetails(order); }}
                    className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 text-xs h-7 px-2"
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "awaiting_payment":
        return <Badge variant="outline" className="border-orange-500 text-orange-500"><AlertCircle className="mr-1 h-3 w-3"/>En attente de paiement</Badge>;
      case "in_preparation":
        return <Badge variant="default" className="bg-blue-500 text-white"><Clock className="mr-1 h-3 w-3"/>En préparation</Badge>;
      case "ready_for_delivery":
        return <Badge variant="outline" className="border-purple-500 text-purple-500"><Truck className="mr-1 h-3 w-3"/>Prête pour livraison</Badge>;
      case "delivered":
        return <Badge className="bg-green-600 text-white"><CheckCircle className="mr-1 h-3 w-3"/>Livrée</Badge>;
      case "cancelled":
        return <Badge variant="destructive"><Ban className="mr-1 h-3 w-3"/>Annulée</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPaymentBadge = (method: PaymentMethod) => {
     switch (method) {
      case "Stripe":
        return <Badge variant="secondary">Carte</Badge>;
      case "Espèces":
        return <Badge variant="outline">Espèces</Badge>;
      default:
        return <Badge>{method}</Badge>;
    }
  }

  const RenderContent = ({ orders, emptyMessage }: { orders: Order[], emptyMessage: string }) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Chargement des commandes...</p>
          </div>
        </div>
      );
    }
    if (orders.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-center space-y-4">
            <Clock className="h-16 w-16 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">{emptyMessage}</p>
          </div>
        </div>
      );
    }
    return <OrderTable orders={orders} />;
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <Card className="border-0 shadow-lg">
        <CardHeader className="space-y-3 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between sm:block">
                  <CardTitle className="text-lg sm:text-xl lg:text-2xl">Gestion des Commandes</CardTitle>
                  <MobileThemeToggle />
                </div>
                <CardDescription className="text-xs sm:text-sm lg:text-base hidden sm:block">
                  Suivez et gérez les commandes des clients en temps réel.
                </CardDescription>
              </div>
            </div>
            
            {/* Contrôles de notification et rafraîchissement */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="flex items-center justify-between sm:justify-start gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="notifications"
                    checked={notificationsEnabled}
                    onCheckedChange={setNotificationsEnabled}
                  />
                  <Label htmlFor="notifications" className="flex items-center gap-2 text-sm">
                    {notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                    <span className="hidden sm:inline">Notifications</span>
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="sound-notifications"
                    checked={soundEnabled}
                    onCheckedChange={setSoundEnabled}
                  />
                  <Label htmlFor="sound-notifications" className="flex items-center gap-2 text-sm">
                    {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    <span className="hidden sm:inline">Sons</span>
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-refresh"
                    checked={autoRefresh}
                    onCheckedChange={setAutoRefresh}
                  />
                  <Label htmlFor="auto-refresh" className="flex items-center gap-2 text-sm">
                    <RefreshCw className="h-4 w-4" />
                    <span className="hidden sm:inline">Auto-refresh</span>
                  </Label>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button onClick={fetchOrders} variant="outline" size="sm" className="text-xs sm:text-sm">
                  <RefreshCw className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Actualiser</span>
                </Button>
                <div className="text-xs text-muted-foreground hidden lg:block">
                  <div>Sub: {subscriptionStatus}</div>
                  <div>Events: {eventCount}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Recherche et Filtres */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Barre de recherche */}
              <div className="flex items-center gap-2 flex-1">
                <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-[200px] lg:w-[300px]"
                />
              </div>
              
              {/* Filtre par paiement */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Label htmlFor="payment-filter" className="text-sm font-medium hidden sm:block">
                  Paiement:
                </Label>
                <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                  <SelectTrigger id="payment-filter" className="w-[120px] sm:w-[150px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="Stripe">Carte</SelectItem>
                    <SelectItem value="Espèces">Espèces</SelectItem>
                  </SelectContent>
                </Select>

                <Label htmlFor="status-filter" className="text-sm font-medium hidden sm:block">
                  Statut:
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status-filter" className="w-[120px] sm:w-[150px]">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="awaiting_payment">En attente</SelectItem>
                    <SelectItem value="in_preparation">Préparation</SelectItem>
                    <SelectItem value="ready_for_delivery">Prête</SelectItem>
                    <SelectItem value="delivered">Livrée</SelectItem>
                    <SelectItem value="cancelled">Annulée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <span className="text-xs sm:text-sm text-muted-foreground text-center lg:text-right">
              Mise à jour: {lastUpdate.toLocaleTimeString('fr-FR')}
            </span>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
            <span>Actives: {getFilteredOrders(activeOrders).length}/{activeOrders.length}</span>
            <span>Terminées: {getFilteredOrders(completedOrders).length}/{completedOrders.length}</span>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 sm:p-6">
          <Tabs defaultValue="active">
            <TabsList className="grid w-full grid-cols-2 h-auto">
              <TabsTrigger value="active" className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 py-2 px-2 sm:px-4">
                <span className="text-xs sm:text-sm font-medium">
                  <span className="hidden sm:inline">Commandes Actives</span>
                  <span className="sm:hidden">Actives</span>
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-xs">({getFilteredOrders(activeOrders).length})</span>
                  {getFilteredOrders(activeOrders).length > 0 && (
                    <Badge variant="secondary" className="text-xs h-4 px-1">
                      {getFilteredOrders(activeOrders).length}
                    </Badge>
                  )}
                </div>
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 py-2 px-2 sm:px-4">
                <span className="text-xs sm:text-sm font-medium">
                  <span className="hidden sm:inline">Historique</span>
                  <span className="sm:hidden">Terminées</span>
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-xs">({getFilteredOrders(completedOrders).length})</span>
                  {getFilteredOrders(completedOrders).length > 0 && (
                    <Badge variant="outline" className="text-xs h-4 px-1">
                      {getFilteredOrders(completedOrders).length}
                    </Badge>
                  )}
                </div>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="active" className="mt-6">
              <RenderContent orders={getFilteredOrders(activeOrders)} emptyMessage={
                searchQuery || paymentMethodFilter !== 'all' 
                  ? "Aucune commande active ne correspond à vos critères de recherche." 
                  : "Aucune commande active pour le moment."
              }/>
            </TabsContent>
            <TabsContent value="completed" className="mt-6">
              <RenderContent orders={getFilteredOrders(completedOrders)} emptyMessage={
                searchQuery || paymentMethodFilter !== 'all'
                  ? "Aucune commande terminée ne correspond à vos critères de recherche."
                  : "Aucune commande dans l'historique."
              }/>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
