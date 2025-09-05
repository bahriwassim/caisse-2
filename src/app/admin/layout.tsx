
"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import AdminHeader from "@/components/layout/AdminHeader";
import { QrCode, ClipboardList, Utensils, LayoutDashboard, ShoppingCart, FileText, LogOut, Loader2, Building } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import type { Order } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdminAuth } from "@/hooks/use-admin-auth";
import { AdminLoginDialog } from "@/components/auth/AdminLoginDialog";
import { useActiveOrdersCount } from "@/hooks/use-active-orders-count";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { toast } = useToast();
  const { isAuthenticated, showLogin, login, logout, isLoading } = useAdminAuth();
  const activeOrdersCount = useActiveOrdersCount();

  useEffect(() => {
    const channel = supabase.channel('realtime-orders-toast')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'orders' }, 
        (payload) => {
          const newOrder = payload.new as Order;
          toast({
              title: "Nouvelle commande !",
              description: `La commande #${newOrder.short_id || newOrder.id.substring(0, 6)} pour ${newOrder.customer} vient d'arriver.`,
              action: (
                  <Link href="/admin/orders">
                      <Button variant="outline" size="sm">Voir</Button>
                  </Link>
              ),
              duration: 10000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  // Affichage du loader pendant la vérification
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Vérification des permissions...</p>
        </div>
      </div>
    );
  }

  // Affichage du dialog de connexion si non authentifié
  if (!isAuthenticated) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold">Interface Administration</h1>
            <p className="text-muted-foreground">Authentification requise pour accéder</p>
          </div>
        </div>
        <AdminLoginDialog open={showLogin} onLogin={login} />
      </>
    );
  }


  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full flex-col bg-background">
        {/* Top horizontal nav */}
        <header className="w-full border-b bg-background">
          <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-4">
              <AdminHeader />
            </div>
            <nav className="flex items-center gap-2">
              <Link href="/admin/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted/10">
                <LayoutDashboard />
                <span>Tableau de bord.</span>
              </Link>
              <Link href="/admin/pos" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted/10">
                <ShoppingCart />
                <span>Caisse</span>
              </Link>
              <Link href="/admin/menu-management" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted/10">
                <Utensils />
                <span>Gestion du Menu</span>
              </Link>
              <Link href="/admin/orders" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted/10 relative">
                <ClipboardList />
                <span>Commandes</span>
                {activeOrdersCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs font-bold bg-red-500 text-white animate-pulse"
                  >
                    {activeOrdersCount}
                  </Badge>
                )}
              </Link>
              <Link href="/admin/invoices" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted/10">
                <FileText />
                <span>Facturation Pro</span>
              </Link>
              <Link href="/admin/restaurant" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted/10">
                <Building />
                <span>Restaurant</span>
              </Link>
              <Link href="/admin/qr-generator" className="flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted/10">
                <QrCode />
                <span>Générateur de QR</span>
              </Link>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                <span>Déconnexion</span>
              </Button>
            </nav>
          </div>
        </header>

        <div className="flex flex-col sm:gap-0 sm:py-0 md:pl-4 lg:pl-4 transition-all duration-300 ease-in-out">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
            </header>
            <main className="grid flex-1 items-start gap-0 p-0 sm:px-0 sm:py-0 md:gap-0">
                {children}
            </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
