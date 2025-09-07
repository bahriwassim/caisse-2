"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Package, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { MenuItem } from "@/lib/types";

interface StockAlertItem extends MenuItem {
  stock_status: 'rupture' | 'stock_bas' | 'normal';
}

export default function StockAlert() {
  const [lowStockItems, setLowStockItems] = useState<StockAlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLowStockItems();
    const interval = setInterval(fetchLowStockItems, 30000); // Rafraîchir toutes les 30 secondes
    return () => clearInterval(interval);
  }, []);

  async function fetchLowStockItems() {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('track_stock', true)
        .not('stock_quantity', 'is', null)
        .not('min_stock_alert', 'is', null);

      if (error) {
        console.error('Erreur lors du chargement des alertes de stock:', error);
        return;
      }

      const itemsWithStatus: StockAlertItem[] = data
        .map(item => ({
          ...item,
          stock_status: item.stock_quantity <= 0 
            ? 'rupture' 
            : item.stock_quantity <= item.min_stock_alert 
            ? 'stock_bas' 
            : 'normal'
        }))
        .filter(item => item.stock_status !== 'normal');

      setLowStockItems(itemsWithStatus);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  }

  async function restockItem(itemId: string, quantityToAdd: number) {
    try {
      // Appeler la fonction PostgreSQL pour remettre en stock
      const { error } = await supabase.rpc('restock_item', {
        item_id: itemId,
        quantity_to_add: quantityToAdd
      });

      if (error) {
        console.error('Erreur lors du réapprovisionnement:', error);
        return;
      }

      // Rafraîchir la liste
      fetchLowStockItems();
    } catch (error) {
      console.error('Erreur:', error);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Alertes de Stock
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  if (lowStockItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Alertes de Stock
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-green-600">Tous les stocks sont suffisants ✓</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Alertes de Stock ({lowStockItems.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {lowStockItems.map((item) => (
          <Alert key={item.id} variant={item.stock_status === 'rupture' ? 'destructive' : 'default'}>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="flex items-center justify-between">
              <span>{item.name}</span>
              <Badge variant={item.stock_status === 'rupture' ? 'destructive' : 'secondary'}>
                {item.stock_status === 'rupture' ? 'Rupture' : 'Stock bas'}
              </Badge>
            </AlertTitle>
            <AlertDescription className="flex items-center justify-between mt-2">
              <div>
                <p>Stock actuel: <strong>{item.stock_quantity}</strong></p>
                <p>Seuil d'alerte: <strong>{item.min_stock_alert}</strong></p>
                <p className="text-sm text-gray-600">{item.category}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => restockItem(item.id, 10)}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  +10
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => restockItem(item.id, 50)}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  +50
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
}