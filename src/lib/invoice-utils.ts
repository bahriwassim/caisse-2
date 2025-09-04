/**
 * Calcule le nombre de repas pour une facture simple basé sur le total
 * @param total - Le montant total TTC
 * @returns Un objet avec le nombre et la description formatée
 */
export function calculateMeals(total: number) {
  if (total <= 50) {
    return { count: 1, description: "1 Repas" };
  } else {
    return { count: 2, description: "2 Repas" };
  }
}

/**
 * Formate l'affichage d'un nombre de repas
 * @param count - Le nombre de repas
 * @returns La description formatée
 */
export function formatMealsDescription(count: number) {
  return `${count} Repas`;
}