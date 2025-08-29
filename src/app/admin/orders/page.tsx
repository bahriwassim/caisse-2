
"use client"

import { useEffect, useState, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  RefreshCw
} from "lucide-react";
import type { OrderStatus, Order, PaymentMethod, FullOrder, OrderItem } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseISO } from 'date-fns';

export default function OrdersPage() {
  const [activeOrders, setActiveOrders] = useState<FullOrder[]>([]);
  const [completedOrders, setCompletedOrders] = useState<FullOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<FullOrder | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { toast } = useToast();
  const notificationsRef = useRef(notificationsEnabled);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('disconnected');
  const [eventCount, setEventCount] = useState<number>(0);
  const [lastPayload, setLastPayload] = useState<any>(null);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [originalTitle, setOriginalTitle] = useState<string>('');

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
      .in('status', ['awaiting_payment', 'in_preparation'])
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
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger les commandes." });
    } else {
      setActiveOrders(active || []);
      setCompletedOrders(completed || []);
      setLastUpdate(new Date());
    }
    setLoading(false);
  }, [toast]);

  const showNotification = (title: string, body: string, isUrgent = false) => {
    if (!notificationsEnabled) return;
    
    // Son de notification
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = isUrgent ? 0.8 : 0.5;
      audio.play().catch(() => {
        // Si le son ne peut pas être joué, utiliser un bip système
        if ('speechSynthesis' in window) {
          speechSynthesis.speak(new SpeechSynthesisUtterance(''));
        }
      });
    } catch (e) {
      console.log('Impossible de jouer le son de notification');
    }
    
    // Notification browser
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, { 
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'order-update',
        requireInteraction: isUrgent,
        silent: false
      });
      
      // Auto-close after 5 seconds if not urgent
      if (!isUrgent) {
        setTimeout(() => notification.close(), 5000);
      }
    }
    
    // Toast notification
    toast({
      title,
      description: body,
      duration: isUrgent ? 10000 : 5000,
    });
    
    // Faire clignoter l'onglet si la page n'est pas visible
    if (document.hidden) {
      let originalTitle = document.title;
      let blinkCount = 0;
      const blinkInterval = setInterval(() => {
        document.title = blinkCount % 2 === 0 ? '🔔 ' + originalTitle : originalTitle;
        blinkCount++;
        if (blinkCount >= 6) {
          document.title = originalTitle;
          clearInterval(blinkInterval);
        }
      }, 500);
      
      // Arrêter le clignotement quand la page redevient visible
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          document.title = originalTitle;
          clearInterval(blinkInterval);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
  };

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
        
        // Pour les INSERT et UPDATE, on doit refetch pour obtenir les détails complets
        if (event === 'INSERT' || event === 'UPDATE') {
          fetchOrders();
          return;
        }

        if (event === 'INSERT' && newRec) {
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
          
          // insert into correct list
          if (newRec.status === 'awaiting_payment' || newRec.status === 'in_preparation') {
            setActiveOrders((prev) => [newRec, ...prev]);
          } else {
            setCompletedOrders((prev) => [newRec, ...prev]);
          }
          setLastUpdate(new Date());

          if (notificationsRef.current) {
            showNotification(
              '🛎️ Nouvelle commande reçue',
              `Commande #${newRec.short_id || newRec.id.substring(0, 6)} - Table ${newRec.table_id} - ${newRec.customer} - ${newRec.total.toFixed(2)}€`,
              true // Nouvelle commande = urgent
            );
          }
        }

        if (event === 'UPDATE' && newRec && oldRec) {
          // update existing order in place or move between lists if status changed
          const wasActive = oldRec.status === 'awaiting_payment' || oldRec.status === 'in_preparation';
          const isActive = newRec.status === 'awaiting_payment' || newRec.status === 'in_preparation';

          // remove from previous list
          if (wasActive && !isActive) {
            setActiveOrders((prev) => prev.filter((o) => o.id !== newRec.id));
            setCompletedOrders((prev) => [newRec, ...prev.filter((o) => o.id !== newRec.id)]);
          } else if (!wasActive && isActive) {
            setCompletedOrders((prev) => prev.filter((o) => o.id !== newRec.id));
            setActiveOrders((prev) => [newRec, ...prev.filter((o) => o.id !== newRec.id)]);
          } else {
            // update in place
            if (isActive) {
              setActiveOrders((prev) => prev.map((o) => (o.id === newRec.id ? newRec : o)));
            } else {
              setCompletedOrders((prev) => prev.map((o) => (o.id === newRec.id ? newRec : o)));
            }
          }
          setLastUpdate(new Date());

          if (notificationsRef.current && oldRec.status !== newRec.status) {
            const statusMessages: Record<string, string> = {
              awaiting_payment: 'En attente de paiement',
              in_preparation: 'En préparation',
              delivered: 'Livrée',
              cancelled: 'Annulée',
            };
            const statusEmojis: Record<string, string> = {
              awaiting_payment: '⏳',
              in_preparation: '👨‍🍳',
              delivered: '✅',
              cancelled: '❌',
            };
            showNotification(
              `${statusEmojis[newRec.status]} Commande #${newRec.short_id || newRec.id.substring(0, 6)} mise à jour`,
              `Table ${newRec.table_id} - ${newRec.customer} - Statut: "${statusMessages[newRec.status]}"`
            );
          }
        }

        if (event === 'DELETE' && oldRec) {
          setActiveOrders((prev) => prev.filter((o) => o.id !== oldRec.id));
          setCompletedOrders((prev) => prev.filter((o) => o.id !== oldRec.id));
          setLastUpdate(new Date());
        }
      })
      .subscribe();

    // mark connected after subscribe returns
    setSubscriptionStatus('subscribed');

    return () => {
      supabase.removeChannel(channel);
      setSubscriptionStatus('disconnected');
      // Restaurer le titre original
      if (originalTitle) {
        document.title = originalTitle;
      }
    };
  }, []);

  // Auto-refresh toutes les 30 secondes si activé
  useEffect(() => {
  if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchOrders();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Keep a ref-like current value of notificationsEnabled and request permission when toggled on
  useEffect(() => {
    if (notificationsEnabled && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [notificationsEnabled]);

  // keep notificationsRef up to date for realtime callbacks
  useEffect(() => {
    notificationsRef.current = notificationsEnabled;
  }, [notificationsEnabled]);
  
  // Mettre à jour le titre avec le nombre de commandes en attente
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
      toast({
          variant: "destructive",
          title: "Erreur",
          description: "Impossible de mettre à jour le statut de la commande.",
      })
    } else {
       toast({
          title: "Statut mis à jour",
          description: `La commande a été marquée comme "${status}".`,
      })
    }
  };

  const handleViewDetails = (order: FullOrder) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const OrderDetailsModal = () => {
    if (!selectedOrder) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white dark:bg-gray-900 border-b p-4 flex justify-between items-center">
            <h3 className="text-lg font-semibold">Détails de la commande #{selectedOrder.short_id || selectedOrder.id.substring(0, 6)}</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowOrderDetails(false)}>×</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Info commande */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">CLIENT</h4>
                <p className="font-semibold">{selectedOrder.customer}</p>
                <p className="text-sm text-muted-foreground">Table {selectedOrder.table_id}</p>
              </div>
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">STATUT</h4>
                {getStatusBadge(selectedOrder.status)}
              </div>
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">PAIEMENT</h4>
                {getPaymentBadge(selectedOrder.payment_method)}
              </div>
              <div>
                <h4 className="font-medium text-sm text-muted-foreground">HEURE</h4>
                <p>{selectedOrder.created_at ? parseISO(selectedOrder.created_at).toLocaleString('fr-FR') : 'N/A'}</p>
              </div>
            </div>

            {/* Articles commandés */}
            <div>
              <h4 className="font-medium mb-3">Articles commandés</h4>
              <div className="space-y-3">
                {selectedOrder.order_items?.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <h5 className="font-medium">{item.menu_item?.name}</h5>
                      <p className="text-sm text-muted-foreground">{item.menu_item?.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">×{item.quantity}</p>
                      <p className="text-sm text-muted-foreground">{item.menu_item?.price.toFixed(2)}€ / unité</p>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-4 text-muted-foreground">
                    Aucun détail disponible pour cette commande
                  </div>
                )}
              </div>
            </div>

            {/* Total */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center font-semibold text-lg">
                <span>Total</span>
                <span>{selectedOrder.total.toFixed(2)} €</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              {selectedOrder.status === 'awaiting_payment' && (
                <Button onClick={() => handleUpdateStatus(selectedOrder.id, 'in_preparation')} className="flex-1">
                  <CircleDollarSign className="mr-2 h-4 w-4" />
                  Marquer comme Payée
                </Button>
              )}
              {selectedOrder.status === 'in_preparation' && (
                <Button onClick={() => handleUpdateStatus(selectedOrder.id, 'delivered')} className="flex-1">
                  <Truck className="mr-2 h-4 w-4" />
                  Marquer comme Livrée
                </Button>
              )}
              {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                <Button variant="destructive" onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled')} className="flex-1">
                  <Ban className="mr-2 h-4 w-4" />
                  Annuler
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const OrderTable = ({ orders }: { orders: FullOrder[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID Commande</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Articles</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Paiement</TableHead>
          <TableHead>Heure</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
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
            <TableCell className="font-medium">{order.short_id || order.id.substring(0, 6)}</TableCell>
            <TableCell>
              <div>{order.customer}</div>
              {order.table_id > 0 && <div className="text-sm text-muted-foreground">Table {order.table_id}</div>}
            </TableCell>
            <TableCell>
              <div className="text-sm">
                {order.order_items?.length || 0} article(s)
              </div>
            </TableCell>
            <TableCell>{getStatusBadge(order.status)}</TableCell>
            <TableCell>{getPaymentBadge(order.payment_method)}</TableCell>
            <TableCell>{order.created_at ? parseISO(order.created_at).toLocaleTimeString('fr-FR') : 'N/A'}</TableCell>
            <TableCell className="text-right font-semibold">{order.total.toFixed(2)} €</TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleViewDetails(order); }}>
                Voir détails
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "awaiting_payment":
        return <Badge variant="outline" className="border-orange-500 text-orange-500"><AlertCircle className="mr-1 h-3 w-3"/>En attente de paiement</Badge>;
      case "in_preparation":
        return <Badge variant="default" className="bg-blue-500 text-white"><Clock className="mr-1 h-3 w-3"/>En préparation</Badge>;
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
        return <Badge variant="secondary">Stripe</Badge>;
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
    <div className="space-y-6 p-6">
      <Card className="border-0 shadow-lg">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Gestion des Commandes</CardTitle>
                <CardDescription className="text-base">Suivez et gérez les commandes des clients en temps réel.</CardDescription>
              </div>
            </div>
            
            {/* Contrôles de notification et rafraîchissement */}
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="notifications"
                  checked={notificationsEnabled}
                  onCheckedChange={setNotificationsEnabled}
                />
                <Label htmlFor="notifications" className="flex items-center gap-2 text-sm">
                  {notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                  Notifications
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
                  Auto-refresh
                </Label>
              </div>
              
              <Button onClick={fetchOrders} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
              <div className="text-sm text-muted-foreground">
                <div>Sub: {subscriptionStatus}</div>
                <div>Events: {eventCount}</div>
              </div>
            </div>
          </div>
          
          {/* Informations de mise à jour */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>Commandes actives: {activeOrders.length}</span>
              <span>Commandes terminées: {completedOrders.length}</span>
            </div>
            <span>Dernière mise à jour: {lastUpdate.toLocaleTimeString('fr-FR')}</span>
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="active">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active" className="flex items-center gap-2">
                Commandes Actives ({activeOrders.length})
                {activeOrders.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {activeOrders.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-2">
                Historique ({completedOrders.length})
                {completedOrders.length > 0 && (
                  <Badge variant="outline" className="ml-1">
                    {completedOrders.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="active" className="mt-6">
              <RenderContent orders={activeOrders} emptyMessage="Aucune commande active pour le moment."/>
            </TabsContent>
            <TabsContent value="completed" className="mt-6">
              <RenderContent orders={completedOrders} emptyMessage="Aucune commande dans l'historique."/>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      {showOrderDetails && <OrderDetailsModal />}
    </div>
  );
}
