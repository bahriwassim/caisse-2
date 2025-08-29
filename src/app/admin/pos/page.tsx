
import type { MenuCategory } from "@/lib/types";
import MenuDisplay from "@/components/menu/MenuDisplay";
import { getMenu, seedDatabaseIfNeeded } from "@/lib/services/menuService";

// This becomes a server component to fetch data initially
export default async function PosPage() {
  await seedDatabaseIfNeeded(); // Ensure DB is seeded
  const menu = await getMenu();

  return (
     <div className="flex flex-col w-full h-full">
      <main className="flex-grow">
        <MenuDisplay menu={menu} tableId={"comptoir"} isPosMode={true} />
      </main>
    </div>
  );
}
