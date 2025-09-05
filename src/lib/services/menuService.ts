import { supabase } from "@/lib/supabase";
import type { MenuCategory, MenuItem } from "@/lib/types";

// Fonction pour forcer la mise à jour du JAMAICAN BOWL
export const forceUpdateJamaicanBowl = async () => {
    console.log("🔄 Mise à jour forcée du JAMAICAN BOWL...");
    
    const jamaicanBowlData = {
        name: "JAMAICAN BOWL",
        description: "Jerk chicken wings / rice & peas / fried plantain / steamed cabbage",
        price: 15,
        category: "Bols",
        status: "available",
        image: "/images/jamaican-poke-bowl-08-683x1024.jpg",
        aiHint: "jamaican food"
    };

    try {
        // Vérifier si le produit existe déjà
        const { data: existingItem, error: fetchError } = await supabase
            .from('menu_items')
            .select('*')
            .eq('name', 'JAMAICAN BOWL')
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error("Erreur lors de la recherche:", fetchError);
            return { success: false, error: fetchError.message };
        }

        if (existingItem) {
            // Mettre à jour le produit existant
            console.log("📝 Produit trouvé, mise à jour...");
            const { data, error } = await supabase
                .from('menu_items')
                .update(jamaicanBowlData)
                .eq('name', 'JAMAICAN BOWL')
                .select();
            
            if (error) {
                console.error("Erreur mise à jour:", error);
                return { success: false, error: error.message };
            }
            
            console.log("✅ JAMAICAN BOWL mis à jour:", data);
            return { success: true, action: 'updated', data };
        } else {
            // Créer le produit
            console.log("➕ Création du JAMAICAN BOWL...");
            const { data, error } = await supabase
                .from('menu_items')
                .insert(jamaicanBowlData)
                .select();
            
            if (error) {
                console.error("Erreur création:", error);
                return { success: false, error: error.message };
            }
            
            console.log("✅ JAMAICAN BOWL créé:", data);
            return { success: true, action: 'created', data };
        }
    } catch (error) {
        console.error("Erreur inattendue:", error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Erreur inconnue' 
        };
    }
};

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
                image: "/images/jamaican-poke-bowl-08-683x1024.jpg",
                aiHint: "jamaican food"
            },
            {
                name: "PIZZA MARGARITA",
                description: "Sauce tomate, fior di latte",
                price: 10,
                category: "Plats principaux",
                status: "available",
                image: "/images/Pizza-margherita.jpg",
                aiHint: "margarita pizza"
            },
            {
                name: "PIZZA ALL POLLO",
                description: "(Poulet - Hallal) sauce tomate, fior di latte, poulet pané, aubergine, grand padano",
                price: 10,
                category: "Plats principaux",
                status: "available",
                image: "/images/Pizza-margherita.jpg",
                aiHint: "chicken pizza"
            },
             {
                name: "PIZZA REGINA",
                description: "(Jambon - Non Hallal) Sauce tomate, fior di latte, jambon blanc, champignons",
                price: 10,
                category: "Plats principaux",
                status: "available",
                image: "/images/Pizza-margherita.jpg",
                aiHint: "regina pizza"
            }
        ];

        const { error } = await supabase.from('menu_items').insert(initialItems);
        if (error) {
            console.error("Error seeding database:", error);
        } else {
            console.log("Database seeded successfully.");
        }
    } else {
        console.log(`Menu already has ${count} items. Checking JAMAICAN BOWL...`);
        // Forcer la mise à jour du JAMAICAN BOWL même si la DB n'est pas vide
        await forceUpdateJamaicanBowl();
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