import { useState, useEffect } from 'react';
import { getRestaurantInfo } from '@/lib/services/restaurantService';
import type { Database } from '@/lib/database.types';

type RestaurantInfo = Database['public']['Tables']['restaurant_info']['Row'];

interface RestaurantDetails {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  email: string;
  website?: string;
  vatNumber: string;
  fiscalNumber: string; // Mappé depuis vat_number si disponible
  siretNumber?: string;
  logo?: string;
  hasLogo?: boolean;
}

export function useRestaurantDetails() {
  const [details, setDetails] = useState<RestaurantDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDetailsFromDatabase = async () => {
    try {
      const restaurantInfo = await getRestaurantInfo();
      
      if (restaurantInfo) {
        // Convertir les données de la base vers le format attendu
        const mappedDetails: RestaurantDetails = {
          name: restaurantInfo.name,
          address: restaurantInfo.address,
          city: restaurantInfo.city,
          postalCode: restaurantInfo.postal_code,
          phone: restaurantInfo.phone || '',
          email: restaurantInfo.email || '',
          website: restaurantInfo.website || '',
          vatNumber: restaurantInfo.vat_number || '',
          fiscalNumber: restaurantInfo.vat_number || 'FR123456789012', // Fallback
          siretNumber: restaurantInfo.siret || '',
          logo: restaurantInfo.logo_url || '',
          hasLogo: !!restaurantInfo.logo_url,
        };
        
        setDetails(mappedDetails);
      } else {
        // Fallback vers localStorage si rien en base
        const savedDetails = localStorage.getItem('restaurantDetails');
        if (savedDetails) {
          const parsed = JSON.parse(savedDetails);
          setDetails(parsed);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des détails restaurant:', error);
      // Fallback vers localStorage en cas d'erreur
      try {
        const savedDetails = localStorage.getItem('restaurantDetails');
        if (savedDetails) {
          const parsed = JSON.parse(savedDetails);
          setDetails(parsed);
        }
      } catch (localStorageError) {
        console.error('Erreur localStorage:', localStorageError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDetailsFromDatabase();

    // Écouter l'événement personnalisé pour les changements
    const handleCustomUpdate = () => {
      loadDetailsFromDatabase();
    };

    window.addEventListener('restaurantDetailsUpdated', handleCustomUpdate);
    
    return () => {
      window.removeEventListener('restaurantDetailsUpdated', handleCustomUpdate);
    };
  }, []);

  return { details, isLoading, refresh: loadDetailsFromDatabase };
}