
import { supabase } from "@/lib/supabase";
import type { MenuCategory, MenuItem } from "@/lib/types";


export const seedDatabaseIfNeeded = async () => {
    const { data, count } = await supabase.from('menu_items').select('*', { count: 'exact', head: true });

    if (count === 0) {
        console.log("Menu is empty. Seeding database...");
       
        const initialItems: Omit<MenuItem, 'id' | 'created_at'>[] = [
            {
                name: "JAMAICAN BOWL",
                description: "Jerk chicken wings / rice & peas / fried plantain / steamed cabbage",
                price: 15,
                category: "Bols",
                status: "available",
                image: "https://picsum.photos/600/400",
                aiHint: "jamaican food"
            },
            {
                name: "PIZZA MARGARITA",
                description: "Sauce tomate, fior di latte",
                price: 10,
                category: "Plats principaux",
                status: "available",
                image: "https://picsum.photos/600/400",
                aiHint: "margarita pizza"
            },
            {
                name: "PIZZA ALL POLLO",
                description: "(Poulet - Hallal) sauce tomate, fior di latte, poulet pané, aubergine, grand padano",
                price: 10,
                category: "Plats principaux",
                status: "available",
                image: "https://picsum.photos/600/400",
                aiHint: "chicken pizza"
            },
             {
                name: "PIZZA REGINA",
                description: "(Jambon - Non Hallal) Sauce tomate, fior di latte, jambon blanc, champignons",
                price: 10,
                category: "Plats principaux",
                status: "available",
                image: "https://picsum.photos/600/400",
                aiHint: "regina pizza"
            }
        ];

        const { error } = await supabase.from('menu_items').insert(initialItems);
        if (error) {
            console.error("Error seeding database:", error);
        } else {
            console.log("Database seeded successfully.");
        }
    }
}


const getMenuItems = async (): Promise<MenuItem[]> => {
    const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('name', { ascending: true });
        
    if (error) {
        console.error("Error fetching menu items:", error);
        return [];
    }
    return data;
}

export const getMenu = async (): Promise<MenuCategory[]> => {
    const allItems = await getMenuItems();

    const categoriesMap: { [key: string]: MenuItem[] } = allItems.reduce((acc, item) => {
        const category = item.category || "Autres";
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(item);
        return acc;
    }, {} as { [key: string]: MenuItem[] });

    const categoryOrder = ["Entrées", "Bols", "Plats principaux", "Desserts", "Boissons"];

    const sortedCategories: MenuCategory[] = categoryOrder
        .filter(catName => categoriesMap[catName]) 
        .map(catName => ({
            id: catName.toLowerCase().replace(/\s+/g, "-"),
            name: catName,
            items: categoriesMap[catName]
        }));
        
    Object.keys(categoriesMap).forEach(catName => {
        if (!categoryOrder.includes(catName)) {
            sortedCategories.push({
                id: catName.toLowerCase().replace(/\s+/g, "-"),
                name: catName,
                items: categoriesMap[catName]
            });
        }
    });

    return sortedCategories;
};
