
"use client"

import { useEffect, useState } from "react";
import { ClipboardList, Euro, Users, Clock, AlertTriangle, TrendingUp, Package, ShoppingCart, Filter } from "lucide-react";
import { MobileThemeToggle } from "@/components/theme/ThemeToggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { supabase } from "@/lib/supabase";
import type { Order, PaymentMethod } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import type { DateRange } from "react-day-picker";
import {
    startOfMonth,
    startOfWeek,
    startOfDay,
    format,
    parseISO,
    isWithinInterval,
    subDays,
    subWeeks,
    subMonths,
    endOfDay,
    endOfWeek,
    endOfMonth,
    startOfQuarter,
    endOfQuarter,
    subQuarters,
    startOfYear,
    endOfYear,
} from 'date-fns';
import { fr } from 'date-fns/locale';

const chartConfig = {
    sales: {
      label: "Commandes",
      color: "hsl(var(--primary))",
    },
    revenue: {
      label: "Chiffre d'affaires (€)",
      color: "hsl(var(--secondary))",
    },
};

interface DashboardStats {
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    waitingList: number;
    salesData: { period: string; sales: number; revenue: number }[];
    productStats: { productName: string; paymentMethod: PaymentMethod; quantity: number; revenue: number }[];
    topProductQuantities: { productName: string; quantity: number }[];
}

type PeriodFilter = '7days' | '15days' | '30days' | '60days' | 'current_month' | 'last_month' | 'current_quarter' | 'last_quarter' | 'current_year' | 'custom';

export default function Dashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [dbError, setDbError] = useState<string | null>(null);
    const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('30days');
    const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();

  const getPaymentBadge = (method: PaymentMethod) => {
    switch (method) {
      case "Stripe":
        return <Badge variant="secondary" className="text-xs">Carte</Badge>;
      case "Espèces":
        return <Badge variant="outline" className="text-xs">Espèces</Badge>;
      default:
        return <Badge className="text-xs">{method}</Badge>;
    }
  };

  const calculatePeriodStats = (orders: Order[], period: PeriodFilter, customRange?: DateRange) => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let periodsToShow: number;
    let periodType: 'day' | 'week' | 'month';

    // Déterminer les dates de début et fin selon le filtre
    switch (period) {
      case '7days':
        startDate = subDays(now, 6);
        endDate = now;
        periodsToShow = 7;
        periodType = 'day';
        break;
      case '15days':
        startDate = subDays(now, 14);
        endDate = now;
        periodsToShow = 15;
        periodType = 'day';
        break;
      case '30days':
        startDate = subDays(now, 29);
        endDate = now;
        periodsToShow = 30;
        periodType = 'day';
        break;
      case '60days':
        startDate = subDays(now, 59);
        endDate = now;
        periodsToShow = 60;
        periodType = 'day';
        break;
      case 'current_month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        periodsToShow = endDate.getDate();
        periodType = 'day';
        break;
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
        periodsToShow = endDate.getDate();
        periodType = 'day';
        break;
      case 'current_quarter':
        startDate = startOfQuarter(now);
        endDate = endOfQuarter(now);
        periodsToShow = 13; // ~3 mois
        periodType = 'week';
        break;
      case 'last_quarter':
        const lastQuarter = subQuarters(now, 1);
        startDate = startOfQuarter(lastQuarter);
        endDate = endOfQuarter(lastQuarter);
        periodsToShow = 13; // ~3 mois
        periodType = 'week';
        break;
      case 'current_year':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        periodsToShow = 12;
        periodType = 'month';
        break;
      case 'custom':
        if (customRange?.from && customRange?.to) {
          startDate = customRange.from;
          endDate = customRange.to;
          const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          periodsToShow = Math.min(diffDays, 365);
          periodType = diffDays > 60 ? 'week' : 'day';
        } else {
          startDate = subDays(now, 29);
          endDate = now;
          periodsToShow = 30;
          periodType = 'day';
        }
        break;
      default:
        startDate = subDays(now, 29);
        endDate = now;
        periodsToShow = 30;
        periodType = 'day';
    }

    const periodData: { [key: string]: { sales: number; revenue: number; date: Date } } = {};
    
    // Initialiser les périodes
    for (let i = 0; i < periodsToShow; i++) {
      let periodStart: Date;
      let periodKey: string;
      
      if (periodType === 'day') {
        periodStart = subDays(endDate, periodsToShow - 1 - i);
        periodKey = format(periodStart, 'yyyy-MM-dd');
      } else if (periodType === 'week') {
        periodStart = startOfWeek(subWeeks(endDate, periodsToShow - 1 - i));
        periodKey = format(periodStart, 'yyyy-ww');
      } else {
        periodStart = startOfMonth(subMonths(endDate, periodsToShow - 1 - i));
        periodKey = format(periodStart, 'yyyy-MM');
      }
      
      periodData[periodKey] = { sales: 0, revenue: 0, date: periodStart };
    }
    
    // Comptabiliser les commandes dans la période sélectionnée
    for (const order of orders) {
      if (order.created_at && order.status !== 'cancelled') {
        const orderDate = parseISO(order.created_at);
        
        // Vérifier si la commande est dans la période
        if (orderDate >= startDate && orderDate <= endDate) {
          let periodKey: string;
          
          if (periodType === 'day') {
            periodKey = format(orderDate, 'yyyy-MM-dd');
          } else if (periodType === 'week') {
            periodKey = format(startOfWeek(orderDate), 'yyyy-ww');
          } else {
            periodKey = format(orderDate, 'yyyy-MM');
          }
          
          if (periodData[periodKey]) {
            periodData[periodKey].sales += 1;
            periodData[periodKey].revenue += order.total;
          }
        }
      }
    }
    
    // Retourner les données formatées
    return Object.values(periodData)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(data => ({
        period: periodType === 'day' 
          ? format(data.date, 'dd/MM', { locale: fr })
          : periodType === 'week'
          ? `S${format(data.date, 'w', { locale: fr })}`
          : format(data.date, 'MMM', { locale: fr }),
        sales: data.sales,
        revenue: data.revenue
      }));
  };

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setDbError(null);
      try {
        const { data = [], error } = await supabase
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
        const waitingOrders = fetchedOrders.filter(o => o.status === 'awaiting_payment' || o.status === 'in_preparation' || o.status === 'ready_for_delivery').length;

        const salesData = calculatePeriodStats(fetchedOrders, periodFilter, customDateRange);

        // Calculate product statistics by payment method
        const productStatsMap: { [key: string]: { paymentMethod: PaymentMethod; quantity: number; revenue: number } } = {};
        
        // Calculate total product quantities for the period
        const productQuantityMap: { [key: string]: number } = {};
        
        // Determine filter dates for products
        const now = new Date();
        let filterStartDate: Date;
        let filterEndDate: Date;
        
        switch (periodFilter) {
          case '7days':
            filterStartDate = subDays(now, 6);
            break;
          case '15days':
            filterStartDate = subDays(now, 14);
            break;
          case '30days':
            filterStartDate = subDays(now, 29);
            break;
          case '60days':
            filterStartDate = subDays(now, 59);
            break;
          case 'current_month':
            filterStartDate = startOfMonth(now);
            break;
          case 'last_month':
            const lastMonth = subMonths(now, 1);
            filterStartDate = startOfMonth(lastMonth);
            filterEndDate = endOfMonth(lastMonth);
            break;
          case 'current_quarter':
            filterStartDate = startOfQuarter(now);
            break;
          case 'last_quarter':
            const lastQuarter = subQuarters(now, 1);
            filterStartDate = startOfQuarter(lastQuarter);
            filterEndDate = endOfQuarter(lastQuarter);
            break;
          case 'current_year':
            filterStartDate = startOfYear(now);
            break;
          case 'custom':
            if (customDateRange?.from && customDateRange?.to) {
              filterStartDate = customDateRange.from;
              filterEndDate = customDateRange.to;
            } else {
              filterStartDate = subDays(now, 29);
              filterEndDate = now;
            }
            break;
          default:
            filterStartDate = subDays(now, 29);
        }
        
        if (!filterEndDate) {
          filterEndDate = now;
        }
        
        fetchedOrders.forEach(order => {
          if (order.status !== 'cancelled' && order.order_items && order.created_at) {
            const orderDate = parseISO(order.created_at);
            
            // Only process orders within the selected period
            if (orderDate >= filterStartDate && orderDate <= filterEndDate) {
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
                
                // Calculate total quantities per product
                if (!productQuantityMap[productName]) {
                  productQuantityMap[productName] = 0;
                }
                productQuantityMap[productName] += item.quantity;
              });
            }
          }
        });

        const productStats = Object.entries(productStatsMap).map(([key, stats]) => ({
          productName: key.split('-')[0],
          paymentMethod: stats.paymentMethod,
          quantity: stats.quantity,
          revenue: stats.revenue
        })).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

        // Product quantities (sorted by quantity)
        const topProductQuantities = Object.entries(productQuantityMap)
          .map(([productName, quantity]) => ({ productName, quantity }))
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 10);

        setStats({
          totalRevenue,
          totalOrders,
          totalCustomers,
          waitingList: waitingOrders,
          salesData,
          productStats,
          topProductQuantities
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
    }, [periodFilter, customDateRange]);

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
      <div className="flex flex-1 flex-col space-y-0 p-2 sm:p-4 lg:p-6">
        {/* Header avec bouton mode nuit */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Tableau de Bord</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Vue d'ensemble des performances</p>
          </div>
          <MobileThemeToggle />
        </div>

        {/* Stats Cards avec espacement moderne */}
  <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 mb-4 sm:mb-6">
          <Card className="relative overflow-hidden border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300">
                Revenu
              </CardTitle>
              <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <Euro className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1 p-3 sm:p-4 pt-0">
              <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-blue-900 dark:text-blue-100">{stats.totalRevenue.toFixed(2)} €</div>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                Total généré
              </p>
              {stats.totalCustomers > 0 && (
                <p className="text-xs text-blue-500 dark:text-blue-400 font-medium">
                  {(stats.totalRevenue / stats.totalCustomers).toFixed(2)} €/client
                </p>
              )}
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-semibold text-green-700 dark:text-green-300">
                Clients
              </CardTitle>
              <div className="p-1.5 sm:p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                <Users className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1 p-3 sm:p-4 pt-0">
              <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-green-900 dark:text-green-100">+{stats.totalCustomers}</div>
              <p className="text-xs text-green-600 dark:text-green-400">
                Total clients
              </p>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-green-600"></div>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-semibold text-purple-700 dark:text-purple-300">
                <span className="hidden sm:inline">Commandes Totales</span>
                <span className="sm:hidden">Commandes</span>
              </CardTitle>
              <div className="p-1.5 sm:p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                <ClipboardList className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1 p-3 sm:p-4 pt-0">
              <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-purple-900 dark:text-purple-100">+{stats.totalOrders}</div>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                Total réalisées
              </p>
              {stats.totalOrders > 0 && (
                <p className="text-xs text-purple-500 dark:text-purple-400 font-medium">
                  {(stats.totalRevenue / stats.totalOrders).toFixed(2)} €/commande
                </p>
              )}
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 to-purple-600"></div>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-sm bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-sm font-semibold text-orange-700 dark:text-orange-300">
                <span className="hidden sm:inline">En attente</span>
                <span className="sm:hidden">Attente</span>
              </CardTitle>
              <div className="p-1.5 sm:p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600 dark:text-orange-400" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1 p-3 sm:p-4 pt-0">
              <div className="text-lg sm:text-2xl lg:text-3xl font-bold text-orange-900 dark:text-orange-100">{stats.waitingList}</div>
              <p className="text-xs text-orange-600 dark:text-orange-400">
                À traiter
              </p>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-orange-600"></div>
          </Card>
        </div>

        {/* Filtre de période */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-4 py-4 px-2">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="period-filter-main" className="text-sm font-medium">
              <span className="hidden sm:inline">Période d'analyse:</span>
              <span className="sm:hidden">Période:</span>
            </Label>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <Select value={periodFilter} onValueChange={(value: PeriodFilter) => setPeriodFilter(value)}>
              <SelectTrigger id="period-filter-main" className="w-full sm:w-[180px] max-w-[200px] mx-auto sm:mx-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">7 derniers jours</SelectItem>
                <SelectItem value="15days">15 derniers jours</SelectItem>
                <SelectItem value="30days">30 derniers jours</SelectItem>
                <SelectItem value="60days">60 derniers jours</SelectItem>
                <SelectItem value="current_month">Mois en cours</SelectItem>
                <SelectItem value="last_month">Mois dernier</SelectItem>
                <SelectItem value="current_quarter">Trimestre en cours</SelectItem>
                <SelectItem value="last_quarter">Dernier trimestre</SelectItem>
                <SelectItem value="current_year">Année en cours</SelectItem>
                <SelectItem value="custom">Période personnalisée</SelectItem>
              </SelectContent>
            </Select>
            
            {periodFilter === 'custom' && (
              <DateRangePicker 
                date={customDateRange}
                onDateChange={setCustomDateRange}
                className="mx-auto sm:mx-0"
              />
            )}
          </div>
        </div>

        {/* Charts et Tableaux avec espacement moderne */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {/* Graphique des commandes */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="space-y-2 sm:space-y-3 p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                  <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg">
                    <span className="hidden sm:inline">Nombre de Commandes</span>
                    <span className="sm:hidden">Commandes</span>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {periodFilter.includes('days') ? 'Par jour' : 
                     periodFilter.includes('quarter') ? 'Par semaine' : 
                     periodFilter.includes('year') ? 'Par mois' : 'Par jour'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-3">
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={stats.salesData}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="period"
                      tickLine={false}
                      tickMargin={6}
                      axisLine={false}
                      className="text-xs"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={6}
                      allowDecimals={false}
                      className="text-xs"
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

          {/* Graphique des revenus */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="space-y-2 sm:space-y-3 p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                  <Euro className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg">
                    <span className="hidden sm:inline">Chiffre d'Affaires</span>
                    <span className="sm:hidden">CA</span>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {periodFilter.includes('days') ? 'Par jour' : 
                     periodFilter.includes('quarter') ? 'Par semaine' : 
                     periodFilter.includes('year') ? 'Par mois' : 'Par jour'} (€)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-3">
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={stats.salesData}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="period"
                      tickLine={false}
                      tickMargin={6}
                      axisLine={false}
                      className="text-xs"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={6}
                      className="text-xs"
                      tickFormatter={(value) => `${value}€`}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent 
                        hideLabel 
                        formatter={(value, name) => [`${value}€`, 'CA']}
                      />}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="space-y-2 sm:space-y-3 p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-secondary/10 rounded-lg">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-secondary-foreground" />
                </div>
                <CardTitle className="text-base sm:text-xl">
                  <span className="hidden sm:inline">Produits Commandés</span>
                  <span className="sm:hidden">Top Produits</span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-3">
               <Table>
                <TableHeader>
                  <TableRow className="border-b">
                    <TableHead className="font-semibold text-xs sm:text-sm">Produit</TableHead>
                    <TableHead className="text-right font-semibold text-xs sm:text-sm">Quantité</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.topProductQuantities?.slice(0, 8).map((item, index) => (
                    <TableRow key={`${item.productName}-${index}`} className={index === stats.topProductQuantities.slice(0, 8).length - 1 ? 'border-b-0' : ''}>
                        <TableCell className="py-2 sm:py-4">
                        <div className="font-medium text-xs sm:text-sm">{item.productName}</div>
                        </TableCell>
                        <TableCell className="text-right py-2 sm:py-4 font-semibold text-xs sm:text-sm">{item.quantity}</TableCell>
                    </TableRow>
                  ))}
                  {(!stats.topProductQuantities || stats.topProductQuantities.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-4 text-muted-foreground">
                        Aucune donnée disponible
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Product Statistics by Payment Method */}
        <div className="mt-4 sm:mt-6">
          <Card className="border-0 shadow-lg">
            <CardHeader className="space-y-2 sm:space-y-3 p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <CardTitle className="text-base sm:text-xl">
                  Statistiques Produits par Moyen de Paiement
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-3">
              <Table>
                <TableHeader>
                  <TableRow className="border-b">
                    <TableHead className="font-semibold text-xs sm:text-sm">Produit</TableHead>
                    <TableHead className="font-semibold text-xs sm:text-sm">Paiement</TableHead>
                    <TableHead className="text-right font-semibold text-xs sm:text-sm">Quantité</TableHead>
                    <TableHead className="text-right font-semibold text-xs sm:text-sm">Revenus</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.productStats.map((stat, index) => (
                    <TableRow key={`${stat.productName}-${stat.paymentMethod}-${index}`} className={index === stats.productStats.length - 1 ? 'border-b-0' : ''}>
                      <TableCell className="py-2 sm:py-4">
                        <div className="font-medium text-xs sm:text-sm">{stat.productName}</div>
                      </TableCell>
                      <TableCell className="py-2 sm:py-4">
                        {getPaymentBadge(stat.paymentMethod)}
                      </TableCell>
                      <TableCell className="text-right py-2 sm:py-4 font-semibold text-xs sm:text-sm">{stat.quantity}</TableCell>
                      <TableCell className="text-right py-2 sm:py-4 font-semibold text-xs sm:text-sm">{stat.revenue.toFixed(2)} €</TableCell>
                    </TableRow>
                  ))}
                  {stats.productStats.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                        Aucune donnée disponible
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
  )
}
