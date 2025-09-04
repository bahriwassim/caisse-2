import { useState, useEffect } from 'react';

interface RestaurantDetails {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  email: string;
  website?: string;
  description?: string;
  vatNumber: string;
  fiscalNumber: string;
  siretNumber?: string;
  logo?: string;
}

export function useRestaurantDetails() {
  const [details, setDetails] = useState<RestaurantDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDetails = () => {
      try {
        const savedDetails = localStorage.getItem('restaurantDetails');
        if (savedDetails) {
          const parsed = JSON.parse(savedDetails);
          console.log('Restaurant details loaded:', parsed);
          setDetails(parsed);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des détails restaurant:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Charger immédiatement au montage
    loadDetails();

    // Écouter les changements dans le localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'restaurantDetails') {
        loadDetails();
      }
    };

    // Écouter l'événement personnalisé pour les changements dans la même fenêtre
    const handleCustomUpdate = () => {
      loadDetails();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('restaurantDetailsUpdated', handleCustomUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('restaurantDetailsUpdated', handleCustomUpdate);
    };
  }, []);

  return { details, isLoading };
}