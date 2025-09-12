# Fonctionnalités d'Export de Données

## Vue d'ensemble

Le système d'export de données permet de télécharger les statistiques du restaurant au format PDF ou CSV directement depuis le tableau de bord administrateur.

## Fonctionnalités

### 1. Export PDF
- **Format professionnel** avec mise en page soignée
- **Statistiques principales** : chiffre d'affaires, nombre de commandes, clients, panier moyen
- **Tableau des commandes récentes** (20 dernières commandes)
- **Statistiques détaillées des produits** par moyen de paiement
- **Top produits** par quantité vendue
- **Couleurs et thème** adaptés au mode sombre/clair

### 2. Export CSV
- **Données brutes** pour analyse externe
- **Toutes les commandes** avec détails complets
- **Statistiques des produits** détaillées
- **Format compatible** avec Excel, Google Sheets, etc.
- **Encodage UTF-8** pour support des caractères spéciaux

### 3. Notifications Améliorées
- **Fond vert lisible** en mode sombre
- **Notifications d'export** avec indicateur de format (PDF/CSV)
- **Animations fluides** et barre de progression
- **Auto-fermeture** avec durée personnalisable

## Utilisation

### Depuis le Dashboard
1. Accédez au **Tableau de Bord** administrateur
2. Sélectionnez la **période** d'analyse souhaitée
3. Cliquez sur **"Exporter les données"**
4. Choisissez le **format** (PDF ou CSV)
5. Cochez/décochez **"Inclure les statistiques détaillées des produits"**
6. Cliquez sur **"Exporter les données"**

### Périodes Disponibles
- 7 derniers jours
- 15 derniers jours
- 30 derniers jours
- 60 derniers jours
- Mois en cours
- Mois dernier
- Trimestre en cours
- Dernier trimestre
- Année en cours
- Période personnalisée

## Structure des Fichiers

```
src/
├── lib/
│   └── export-utils.ts          # Utilitaires d'export (PDF/CSV)
├── app/api/export/
│   ├── pdf/route.ts             # API endpoint PDF
│   └── csv/route.ts             # API endpoint CSV
├── components/
│   ├── admin/
│   │   └── DataExport.tsx       # Composant d'export
│   └── ui/
│       └── export-notification.tsx  # Notifications d'export
└── hooks/
    └── use-export-notifications.tsx  # Hook de gestion des notifications
```

## API Endpoints

### POST /api/export/pdf
Génère un rapport PDF des statistiques.

**Body:**
```json
{
  "period": "30 derniers jours",
  "includeProductStats": true
}
```

**Response:** Fichier PDF en téléchargement

### POST /api/export/csv
Génère un rapport CSV des statistiques.

**Body:**
```json
{
  "period": "30 derniers jours", 
  "includeProductStats": true
}
```

**Response:** Fichier CSV en téléchargement

## Dépendances

- `jspdf` - Génération de PDF
- `jspdf-autotable` - Tableaux dans les PDF
- `papaparse` - Génération de CSV

## Personnalisation

### Couleurs des Notifications
Les couleurs des notifications peuvent être modifiées dans `src/components/ui/export-notification.tsx` :

```typescript
const typeStyles = {
  success: {
    bg: 'bg-green-50 border-green-200 dark:bg-green-900/40 dark:border-green-700',
    // ...
  }
};
```

### Format des PDF
Le format des PDF peut être personnalisé dans `src/lib/export-utils.ts` :

```typescript
// Configuration des couleurs
const colors = {
  primary: '#3B82F6',
  success: '#10B981',
  // ...
};
```

## Support

Pour toute question ou problème avec les fonctionnalités d'export, vérifiez :
1. Les logs de la console pour les erreurs
2. La connectivité à la base de données Supabase
3. Les permissions d'écriture dans le navigateur
