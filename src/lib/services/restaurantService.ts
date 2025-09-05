import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type RestaurantInfo = Database['public']['Tables']['restaurant_info']['Row'];
type RestaurantInfoInsert = Database['public']['Tables']['restaurant_info']['Insert'];
type RestaurantInfoUpdate = Database['public']['Tables']['restaurant_info']['Update'];

export const getRestaurantInfo = async (): Promise<RestaurantInfo | null> => {
  try {
    const { data, error } = await supabase
      .from('restaurant_info')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error("Error fetching restaurant info:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Unexpected error fetching restaurant info:", error);
    return null;
  }
};

export const createOrUpdateRestaurantInfo = async (info: RestaurantInfoInsert): Promise<RestaurantInfo | null> => {
  try {
    // Vérifier s'il y a déjà des informations restaurant
    const existing = await getRestaurantInfo();

    if (existing) {
      // Mettre à jour les informations existantes
      const { data, error } = await supabase
        .from('restaurant_info')
        .update({
          ...info,
          updated_at: new Date().toISOString()
        } as RestaurantInfoUpdate)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating restaurant info:", error);
        return null;
      }

      return data;
    } else {
      // Créer de nouvelles informations
      const { data, error } = await supabase
        .from('restaurant_info')
        .insert({
          ...info,
          country: info.country || 'France',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating restaurant info:", error);
        return null;
      }

      return data;
    }
  } catch (error) {
    console.error("Unexpected error creating/updating restaurant info:", error);
    return null;
  }
};

export const initializeDefaultRestaurantInfo = async (): Promise<RestaurantInfo | null> => {
  const existing = await getRestaurantInfo();
  if (existing) {
    return existing;
  }

  const defaultInfo: RestaurantInfoInsert = {
    name: "Mon Restaurant",
    address: "123 Rue de la République",
    city: "Paris",
    postal_code: "75001",
    country: "France",
    phone: "+33 1 23 45 67 89",
    email: "contact@monrestaurant.fr",
    siret: "12345678901234",
    legal_form: "SARL",
    capital: "10000€"
  };

  return await createOrUpdateRestaurantInfo(defaultInfo);
};