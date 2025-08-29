# Caisse 2 - Système de Gestion de Restaurant

Application moderne de gestion de restaurant avec interface client et administration.

## 🚀 Fonctionnalités

### Interface Client
- **Menu interactif** avec photos réalistes des plats
- **Système de panier** avancé
- **Paiement Stripe** intégré
- **Suivi de commande** en temps réel
- **Interface responsive** pour tous les appareils

### Administration
- **Dashboard moderne** avec statistiques en temps réel
- **Gestion des commandes** avec notifications
- **Générateur de QR codes** en séquence pour les tables
- **Gestion du menu** (ajout, modification, suppression)
- **Système de notifications** temps réel
- **Interface POS** pour la caisse

## 🛠️ Installation

### Prérequis
- Node.js 18+ 
- npm ou yarn
- Compte Supabase
- Compte Stripe (optionnel)

### 1. Cloner le projet
```bash
git clone <repository-url>
cd caisse-2-main
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configuration des variables d'environnement

Créer un fichier `.env.local` à la racine du projet :

```env
# Supabase Configuration (OBLIGATOIRE)
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_clé_anon_supabase

# Stripe Configuration (optionnel pour les tests)
STRIPE_SECRET_KEY=votre_clé_secrète_stripe
```

### 4. Configuration de la base de données

1. Créer un projet Supabase
2. Exécuter le script SQL dans `schema.sql` dans l'éditeur SQL de Supabase
3. Désactiver RLS (Row Level Security) ou configurer les politiques appropriées

### 5. Lancer l'application
```bash
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

## 📱 Utilisation

### Pour les clients
1. Scannez le QR code de votre table
2. Parcourez le menu et ajoutez des plats au panier
3. Validez votre commande et payez
4. Suivez le statut de votre commande en temps réel

### Pour l'administration
1. Accédez à `/admin` avec vos identifiants
2. Utilisez le dashboard pour surveiller l'activité
3. Gérez les commandes depuis la page "Commandes"
4. Générez des QR codes pour vos tables
5. Modifiez le menu selon vos besoins

## 🔧 Configuration avancée

### Notifications
- Les notifications navigateur sont activées par défaut
- Vous pouvez les désactiver depuis l'interface d'administration
- L'auto-refresh se fait toutes les 30 secondes

### QR Codes
- Génération en séquence de tables (ex: table 1 à 20)
- Impression individuelle ou en lot
- Téléchargement en format PNG

### Images des plats
- Le système utilise des images réalistes basées sur le nom et la catégorie
- Placez vos propres images dans le dossier `public/images/`
- Structure recommandée :
  ```
  public/images/
  ├── entrees/
  ├── plats/
  ├── desserts/
  └── boissons/
  ```

## 🚨 Résolution des problèmes

### Erreur "Supabase URL and anon key are required"
- Vérifiez que votre fichier `.env.local` existe
- Assurez-vous que les variables sont correctement définies
- Redémarrez le serveur de développement

### Erreur de connexion à la base de données
- Vérifiez que RLS est désactivé dans Supabase
- Ou configurez des politiques appropriées
- Vérifiez que votre projet Supabase est actif

### Images ne s'affichent pas
- Vérifiez que les images existent dans le dossier `public/images/`
- Utilisez des formats supportés (JPG, PNG, WebP)
- Vérifiez les permissions des fichiers

## 📁 Structure du projet

```
src/
├── app/                    # Pages Next.js 13+
│   ├── admin/             # Interface d'administration
│   ├── table/             # Interface client par table
│   └── api/               # API routes
├── components/             # Composants React
│   ├── admin/             # Composants admin
│   ├── cart/              # Composants panier
│   ├── layout/            # Composants de mise en page
│   ├── menu/              # Composants menu
│   └── ui/                # Composants UI réutilisables
├── hooks/                  # Hooks React personnalisés
├── lib/                    # Utilitaires et services
└── types/                  # Types TypeScript
```

## 🎨 Personnalisation

### Thème
- L'application utilise Tailwind CSS
- Modifiez `tailwind.config.ts` pour personnaliser les couleurs
- Les composants UI sont basés sur shadcn/ui

### Menu
- Modifiez `src/lib/services/menuService.ts` pour changer la logique du menu
- Ajoutez de nouvelles catégories dans les types
- Personnalisez l'affichage dans `MenuItemCard.tsx`

## 📊 Statistiques et métriques

Le dashboard affiche :
- Revenu total
- Nombre de commandes
- Nombre de clients
- Commandes en attente
- Graphique des ventes mensuelles
- Dernières commandes

## 🔒 Sécurité

- Authentification Supabase
- Politiques RLS configurables
- Validation des données côté serveur
- Protection CSRF intégrée

## 📈 Performance

- Optimisation des images Next.js
- Lazy loading des composants
- Mise en cache intelligente
- Optimisations React 18

## 🤝 Contribution

1. Fork le projet
2. Créez une branche feature (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🆘 Support

Pour toute question ou problème :
- Ouvrez une issue sur GitHub
- Consultez la documentation Supabase
- Vérifiez les logs de la console

---

**Développé avec ❤️ pour les restaurants modernes**
