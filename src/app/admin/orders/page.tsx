
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
import type { OrderStatus, Order, PaymentMethod } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseISO } from 'date-fns';

export default function OrdersPage() {
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { toast } = useToast();
  const notificationsRef = useRef(notificationsEnabled);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('disconnected');
  const [eventCount, setEventCount] = useState<number>(0);
  const [lastPayload, setLastPayload] = useState<any>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data: active, error: activeError } = await supabase
      .from('orders')
      .select('*')
      .in('status', ['awaiting_payment', 'in_preparation'])
      .order('created_at', { ascending: false });

    const { data: completed, error: completedError } = await supabase
      .from('orders')
      .select('*')
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

  const showNotification = (title: string, body: string) => {
    if (!notificationsEnabled) return;
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
    
    toast({
      title,
      description: body,
    });
  };

  useEffect(() => {
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
        const newRec = payload.new as Order | null;
        const oldRec = payload.old as Order | null;

        if (event === 'INSERT' && newRec) {
          // insert into correct list
          if (newRec.status === 'awaiting_payment' || newRec.status === 'in_preparation') {
            setActiveOrders((prev) => [newRec, ...prev]);
          } else {
            setCompletedOrders((prev) => [newRec, ...prev]);
          }
          setLastUpdate(new Date());

          if (notificationsRef.current) {
            showNotification(
              'Nouvelle commande reçue',
              `Commande ${newRec.short_id || newRec.id.substring(0, 6)} de la table ${newRec.table_id}`
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
            showNotification(
              `Commande ${newRec.short_id || newRec.id.substring(0, 6)} mise à jour`,
              `Statut changé de "${statusMessages[oldRec.status]}" à "${statusMessages[newRec.status]}"`
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

  const OrderTable = ({ orders }: { orders: Order[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID Commande</TableHead>
          <TableHead>Client</TableHead>
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
          <TableRow key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
            <TableCell className="font-medium">{order.short_id || order.id.substring(0, 6)}</TableCell>
            <TableCell>
              <div>{order.customer}</div>
              {order.table_id > 0 && <div className="text-sm text-muted-foreground">Table {order.table_id}</div>}
            </TableCell>
            <TableCell>{getStatusBadge(order.status)}</TableCell>
            <TableCell>{getPaymentBadge(order.payment_method)}</TableCell>
            <TableCell>{order.created_at ? parseISO(order.created_at).toLocaleTimeString('fr-FR') : 'N/A'}</TableCell>
            <TableCell className="text-right font-semibold">{order.total.toFixed(2)} €</TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button aria-haspopup="true" size="icon" variant="ghost">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Changer le statut</DropdownMenuLabel>
                   {order.status === 'awaiting_payment' && (
                    <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'in_preparation')}>
                      <CircleDollarSign className="mr-2 h-4 w-4" />
                      Marquer comme Payée
                    </DropdownMenuItem>
                  )}
                   {(order.status === 'in_preparation') && (
                    <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'delivered')}>
                       <Truck className="mr-2 h-4 w-4" />
                      Marquer comme Livrée
                    </DropdownMenuItem>
                  )}
                  {order.status !== 'cancelled' && order.status !== 'delivered' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleUpdateStatus(order.id, 'cancelled')}>
                            <Ban className="mr-2 h-4 w-4" />
                            Annuler la commande
                        </DropdownMenuItem>
                      </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
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
      case "Carte de crédit":
        return <Badge variant="secondary">Carte de crédit</Badge>;
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
    </div>
  );
}
