"use client"

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft,
  CircleDollarSign, 
  Truck, 
  Ban
} from "lucide-react";
import { useEnhancedToast } from "@/hooks/use-enhanced-toast";
import type { OrderStatus, FullOrder, PaymentMethod } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { parseISO } from 'date-fns';
import { InvoiceGenerator } from "@/components/admin/InvoiceGenerator";

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<FullOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const enhancedToast = useEnhancedToast();

  useEffect(() => {
    if (!orderId) return;
    
    const fetchOrder = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (
              *,
              menu_item:menu_items(*)
            )
          `)
          .eq('id', orderId)
          .single();

        if (error) {
          throw error;
        }

        setOrder(data as FullOrder);
      } catch (err: any) {
        console.error("Error fetching order:", err);
        setError(err.message || "Impossible de charger la commande");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();

    // Real-time subscription for order updates
    const channel = supabase
      .channel(`order-details-${orderId}`)
      .on('postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}`}, 
          (payload) => {
            fetchOrder();
          }
       )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const handleUpdateStatus = async (status: OrderStatus) => {
    if (!order) return;

    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', order.id);

    if (error) {
      console.error("Erreur de mise à jour du statut:", error);
      enhancedToast.error("Erreur", "Impossible de mettre à jour le statut de la commande.");
    } else {
      enhancedToast.success("Statut mis à jour", `La commande a été marquée comme "${status}".`, { duration: 4000 });
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
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

  const getPaymentBadge = (method: PaymentMethod) => {
    switch (method) {
      case "TPE":
        return <Badge variant="secondary">TPE</Badge>;
      case "Espèces":
        return <Badge variant="outline">Espèces</Badge>;
      default:
        return <Badge>{method}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-lg text-muted-foreground">Chargement des détails de la commande...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-lg text-destructive mb-4">{error || "Commande introuvable"}</p>
            <Button onClick={() => router.push('/admin/orders')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux commandes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/admin/orders')}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Détails de la commande #{order.short_id || order.id.substring(0, 6)}</h1>
          <p className="text-muted-foreground">Informations complètes de la commande</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">Informations de la commande</CardTitle>
              <CardDescription>
                Créée le {order.created_at ? parseISO(order.created_at).toLocaleString('fr-FR') : 'N/A'}
              </CardDescription>
            </div>
            {getStatusBadge(order.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Info commande */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">CLIENT</h4>
              <p className="font-semibold">{order.customer}</p>
              <p className="text-sm text-muted-foreground">Table {order.table_id}</p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-muted-foreground mb-2">PAIEMENT</h4>
              {getPaymentBadge(order.payment_method)}
            </div>
          </div>

          {/* Articles commandés */}
          <div>
            <h4 className="font-medium mb-3">Articles commandés</h4>
            <div className="space-y-3">
              {order.order_items?.map((item, index) => (
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
              <span>{order.total.toFixed(2)} €</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3 pt-4">
            <div className="flex gap-2 flex-wrap">
              {order.status === 'awaiting_payment' && (
                <Button 
                  onClick={() => handleUpdateStatus('in_preparation')} 
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <CircleDollarSign className="mr-2 h-4 w-4" />
                  Marquer comme Payée
                </Button>
              )}
              {order.status === 'in_preparation' && (
                <Button 
                  onClick={() => handleUpdateStatus('delivered')} 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Truck className="mr-2 h-4 w-4" />
                  Marquer comme Livrée
                </Button>
              )}
              {order.status !== 'cancelled' && order.status !== 'delivered' && (
                <Button 
                  variant="destructive" 
                  onClick={() => handleUpdateStatus('cancelled')} 
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Annuler
                </Button>
              )}
            </div>

            {/* Facturation Pro */}
            {(order.status === 'delivered' || order.status === 'in_preparation') && (
              <div className="border-t pt-3">
                <div className="flex items-center justify-center">
                  <InvoiceGenerator order={order} />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}