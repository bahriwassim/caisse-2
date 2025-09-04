
import type { MenuCategory } from "@/lib/types";
import MenuDisplay from "@/components/menu/MenuDisplay";
import SystemStatusControl from "@/components/admin/SystemStatusControl";
import PaymentMethodsControl from "@/components/admin/PaymentMethodsControl";
import { getMenu, seedDatabaseIfNeeded } from "@/lib/services/menuService";
import { Card, CardHeader } from "@/components/ui/card";

// This becomes a server component to fetch data initially
export default async function PosPage() {
  await seedDatabaseIfNeeded(); // Ensure DB is seeded
  const menu = await getMenu();

  return (
     <div className="flex flex-col w-full h-full">
      {/* System Status Control Header */}
      <Card className="m-2 sm:m-4 mb-0 border-0 shadow-sm">
        <CardHeader className="pb-3 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
            <div className="flex-1">
              <h2 className="text-base sm:text-lg font-semibold">Contrôle du Système</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Gérez l'état des commandes en ligne et les méthodes de paiement</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <PaymentMethodsControl />
              <SystemStatusControl />
            </div>
          </div>
        </CardHeader>
      </Card>

      <main className="flex-grow">
        <MenuDisplay menu={menu} tableId={"comptoir"} isPosMode={true} />
      </main>
    </div>
  );
}
