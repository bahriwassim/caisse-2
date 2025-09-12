import { NextRequest, NextResponse } from 'next/server';
import { DataExporter, type ExportData } from '@/lib/export-utils';
import { supabase } from '@/lib/supabase';
import type { Order, PaymentMethod } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { period, includeProductStats = true } = await request.json();

    // Récupérer les commandes depuis Supabase
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          quantity,
          price,
          menu_item:menu_items (
            name
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    const fetchedOrders: Order[] = orders || [];

    // Calculer les statistiques
    const totalRevenue = fetchedOrders.reduce((sum, o) => o.status !== 'cancelled' ? sum + o.total : sum, 0);
    const totalOrders = fetchedOrders.filter(o => o.status !== 'cancelled').length;
    const totalCustomers = new Set(fetchedOrders.map(o => o.table_id > 0 ? `Table ${o.table_id}`: o.customer)).size;

    // Calculer les statistiques des produits
    const productStatsMap: { [key: string]: { paymentMethod: PaymentMethod; quantity: number; revenue: number } } = {};
    const productQuantityMap: { [key: string]: number } = {};

    fetchedOrders.forEach(order => {
      if (order.status !== 'cancelled' && order.order_items) {
        order.order_items.forEach((item: any) => {
          const productName = item.menu_item?.name || 'Produit inconnu';
          const key = `${productName}-${order.payment_method}`;
          
          if (!productStatsMap[key]) {
            productStatsMap[key] = {
              paymentMethod: order.payment_method as PaymentMethod,
              quantity: 0,
              revenue: 0
            };
          }
          
          productStatsMap[key].quantity += item.quantity;
          productStatsMap[key].revenue += item.price * item.quantity;
          
          if (!productQuantityMap[productName]) {
            productQuantityMap[productName] = 0;
          }
          productQuantityMap[productName] += item.quantity;
        });
      }
    });

    const productStats = Object.entries(productStatsMap).map(([key, stats]) => ({
      productName: key.split('-')[0],
      paymentMethod: stats.paymentMethod,
      quantity: stats.quantity,
      revenue: stats.revenue
    })).sort((a, b) => b.revenue - a.revenue);

    const topProductQuantities = Object.entries(productQuantityMap)
      .map(([productName, quantity]) => ({ productName, quantity }))
      .sort((a, b) => b.quantity - a.quantity);

    const exportData: ExportData = {
      orders: fetchedOrders,
      period,
      totalRevenue,
      totalOrders,
      totalCustomers,
      productStats,
      topProductQuantities
    };

    // Générer le CSV
    const csvBlob = await DataExporter.exportToCSV(exportData, {
      format: 'csv',
      period,
      includeProductStats
    });

    // Retourner le CSV
    return new NextResponse(csvBlob, {
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment; filename="rapport-statistiques-${period.replace(/\s+/g, '-').toLowerCase()}.csv"`
      }
    });

  } catch (error) {
    console.error('Error generating CSV:', error);
    return NextResponse.json({ error: 'Failed to generate CSV' }, { status: 500 });
  }
}
