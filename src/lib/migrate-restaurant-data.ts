import { createOrUpdateRestaurantInfo } from './services/restaurantService';

/**
 * Migration des données restaurant depuis localStorage vers la base de données
 */
export async function migrateRestaurantDataFromLocalStorage() {
  try {
    // Vérifier s'il y a des données dans localStorage
    const savedDetails = localStorage.getItem('restaurantDetails');
    if (!savedDetails) {
      console.log('Aucune donnée restaurant trouvée dans localStorage');
      return { success: false, message: 'Aucune donnée à migrer' };
    }

    const details = JSON.parse(savedDetails);
    console.log('Données restaurant trouvées dans localStorage:', details);

    // Mapper les données au format de la base de données
    const restaurantInfo = {
      name: details.name || 'Mon Restaurant',
      address: details.address || '123 Rue de la République',
      city: details.city || 'Paris',
      postal_code: details.postalCode || '75001',
      country: 'France',
      phone: details.phone || null,
      email: details.email || null,
      website: details.website || null,
      logo_url: details.logo || null,
      siret: details.siretNumber || null,
      vat_number: details.vatNumber || details.fiscalNumber || null,
      legal_form: null, // Pas dans l'ancien format
      capital: null, // Pas dans l'ancien format
    };

    // Insérer/mettre à jour en base
    const result = await createOrUpdateRestaurantInfo(restaurantInfo);

    if (result) {
      console.log('✅ Migration réussie:', result);
      
      // Optionnel: supprimer les données localStorage après migration réussie
      // localStorage.removeItem('restaurantDetails');
      // console.log('Données localStorage supprimées après migration');

      return { 
        success: true, 
        message: 'Migration réussie vers la base de données',
        data: result 
      };
    } else {
      throw new Error('Échec de la migration');
    }

  } catch (error) {
    console.error('Erreur lors de la migration:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Erreur inconnue' 
    };
  }
}

/**
 * Composant utilitaire pour déclencher la migration depuis l'interface
 */
export const MigrationButton = () => {
  const handleMigrate = async () => {
    const result = await migrateRestaurantDataFromLocalStorage();
    
    if (result.success) {
      alert('Migration réussie ! Les données ont été transférées en base de données.');
      window.dispatchEvent(new Event('restaurantDetailsUpdated'));
    } else {
      alert(`Erreur de migration: ${result.message}`);
    }
  };

  return (
    <button
      onClick={handleMigrate}
      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
    >
      Migrer données localStorage → Base de données
    </button>
  );
};