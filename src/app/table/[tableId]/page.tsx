
import type { MenuCategory } from "@/lib/types";
import MenuDisplay from "@/components/menu/MenuDisplay";
import Header from "@/components/layout/Header";
import { getMenu, seedDatabaseIfNeeded } from "@/lib/services/menuService";
import { ClientSoundWrapper } from "@/components/ClientSoundWrapper";

// This becomes a server component to fetch data initially
export default async function TablePage({ params }: { params: { tableId: string } }) {
  const tableId = params.tableId;
  await seedDatabaseIfNeeded(); // Ensure DB is seeded
  const menu = await getMenu();

  return (
    <ClientSoundWrapper>
      <div className="flex flex-col w-full h-full">
        <Header />
        <main className="flex-grow">
          <MenuDisplay menu={menu} tableId={tableId} />
        </main>
      </div>
    </ClientSoundWrapper>
  );
}
