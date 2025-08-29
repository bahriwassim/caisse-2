
"use client"

import { useEffect, useState } from "react";
import { ClipboardList, DollarSign, Users, Clock, AlertTriangle, TrendingUp, Package, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { supabase } from "@/lib/supabase";
import type { Order } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    startOfMonth,
    format,
    parseISO,
} from 'date-fns';
import { fr } from 'date-fns/locale';

const chartConfig = {
    sales: {
      label: "Ventes",
      color: "hsl(var(--primary))",
    },
};

interface DashboardStats {
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    waitingList: number;
    salesData: { month: string; sales: number }[];
}

export default function Dashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setDbError(null);
      try {
        const { data = [], error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error("Error fetching orders:", error);
          setDbError("Impossible de charger les données. Vérifiez que la sécurité au niveau des lignes (RLS) est désactivée pour la table 'orders' dans votre tableau de bord Supabase, ou qu'une politique autorise la lecture.");
          setOrders([]);
          setStats(null);
          setLoading(false);
          return;
        }

        const fetchedOrders: Order[] = data || [];
        setOrders(fetchedOrders);

        const totalRevenue = fetchedOrders.reduce((sum, o) => o.status !== 'cancelled' ? sum + o.total : sum, 0);
        const totalOrders = fetchedOrders.filter(o => o.status !== 'cancelled').length;
        const totalCustomers = new Set(fetchedOrders.map(o => o.table_id > 0 ? `Table ${o.table_id}`: o.customer)).size;
        const waitingOrders = fetchedOrders.filter(o => o.status === 'awaiting_payment' || o.status === 'in_preparation').length;

        const monthlySales: { [key: string]: { sales: number, date: Date } } = {};
        for (const order of fetchedOrders) {
          if (order.created_at && order.status !== 'cancelled') {
            const orderDate = parseISO(order.created_at);
            const monthKey = format(orderDate, 'yyyy-MM');
            if (!monthlySales[monthKey]) {
              monthlySales[monthKey] = { sales: 0, date: startOfMonth(orderDate) };
            }
            monthlySales[monthKey].sales += 1;
          }
        }

        const salesData = Object.values(monthlySales)
          .sort((a, b) => a.date.getTime() - b.date.getTime())
          .slice(-6)
          .map(data => ({
            month: format(data.date, 'MMM', { locale: fr }),
            sales: data.sales
          }));

        setStats({
          totalRevenue,
          totalOrders,
          totalCustomers,
          waitingList: waitingOrders,
          salesData
        });

      } catch (err) {
        console.error('Unexpected error fetching orders', err);
        setDbError('Erreur inattendue lors de la récupération des commandes.');
        setOrders([]);
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

        fetchOrders();
        
        const channel = supabase.channel('realtime orders')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
            fetchOrders();
          })
          .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="text-lg text-muted-foreground">Chargement des données du tableau de bord...</p>
                </div>
            </div>
        );
    }
    
    if (dbError) {
        return (
             <Card className="w-full max-w-4xl mx-auto">
                <CardHeader className="text-center">
                    <CardTitle className="flex items-center justify-center gap-3 text-xl">
                        <AlertTriangle className="text-destructive h-8 w-8"/>
                        Erreur de connexion à la base de données
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <p className="text-destructive text-lg">{dbError}</p>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        Pour résoudre ce problème, rendez-vous sur votre tableau de bord Supabase, sélectionnez la section "Authentication" puis "Policies", et assurez-vous que la sécurité RLS est désactivée pour vos tables ou que des politiques autorisent la lecture.
                    </p>
                </CardContent>
            </Card>
        )
    }
    
    if (!stats) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center space-y-4">
                    <Package className="h-16 w-16 text-muted-foreground mx-auto" />
                    <p className="text-lg text-muted-foreground">Aucune donnée à afficher.</p>
                </div>
            </div>
        );
    }

  return (
      <div className="flex flex-1 flex-col space-y-0 p-0">
        {/* Stats Cards avec espacement moderne */}
  <div className="grid gap-0 md:grid-cols-2 lg:grid-cols-4">
          <Card className="relative overflow-hidden border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                Revenu Total
              </CardTitle>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1 p-2">
              <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{stats.totalRevenue.toFixed(2)} €</div>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Revenu total généré
              </p>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-green-700 dark:text-green-300">
                Clients
              </CardTitle>
              <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1 p-2">
              <div className="text-2xl font-bold text-green-900 dark:text-green-100">+{stats.totalCustomers}</div>
              <p className="text-xs text-green-600 dark:text-green-400">
                Nombre total de clients
              </p>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-green-600"></div>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                Commandes Totales
              </CardTitle>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                <ClipboardList className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1 p-2">
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">+{stats.totalOrders}</div>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                 Nombre total de commandes
              </p>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 to-purple-600"></div>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                Commandes en attente
              </CardTitle>
              <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1 p-2">
              <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.waitingList}</div>
              <p className="text-xs text-orange-600 dark:text-orange-400">
                À traiter
              </p>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-orange-600"></div>
          </Card>
        </div>

        {/* Charts et Tableaux avec espacement moderne */}
  <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <Card className="xl:col-span-2 border-0 shadow-lg">
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Aperçu des Commandes</CardTitle>
                  <CardDescription className="text-base">
                    Nombre de commandes par mois.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.salesData}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      className="text-sm"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      allowDecimals={false}
                      className="text-sm"
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <ShoppingCart className="h-5 w-5 text-secondary-foreground" />
                </div>
                <CardTitle className="text-xl">Dernières Commandes</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-2">
               <Table>
                <TableHeader>
                  <TableRow className="border-b">
                    <TableHead className="font-semibold">Client</TableHead>
                    <TableHead className="text-right font-semibold">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.slice(0, 5).map((order, index) => (
                    <TableRow key={order.id} className={index === orders.length - 1 ? 'border-b-0' : ''}>
                        <TableCell className="py-4">
                        <div className="font-medium">{order.customer}</div>
                        <div className="text-sm text-muted-foreground">
                            Table {order.table_id || 'N/A'}
                        </div>
                        </TableCell>
                        <TableCell className="text-right py-4 font-semibold">{order.total.toFixed(2)} €</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
  )
}
