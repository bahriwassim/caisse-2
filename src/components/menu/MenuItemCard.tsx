
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Star, Clock } from "lucide-react";
import type { MenuItem } from "@/lib/types";

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
}

export default function MenuItemCard({ item, onAddToCart }: MenuItemCardProps) {
  const isOutOfStock = item.status === "out_of_stock";

  // Images plus réalistes pour chaque catégorie
  const getRealisticImage = (itemName: string, category: string) => {
    const name = itemName.toLowerCase();
    
    // Images réalistes pour les entrées
    if (category === 'entrees') {
      if (name.includes('salade') || name.includes('salade')) return '/images/entrees/salade.jpg';
      if (name.includes('soupe') || name.includes('velouté')) return '/images/entrees/soupe.jpg';
      if (name.includes('terrine') || name.includes('pâté')) return '/images/entrees/terrine.jpg';
      if (name.includes('foie') || name.includes('gras')) return '/images/entrees/foie-gras.jpg';
      return '/images/entrees/entree-generique.jpg';
    }
    
    // Images réalistes pour les plats
    if (category === 'plats') {
      if (name.includes('steak') || name.includes('bœuf')) return '/images/plats/steak.jpg';
      if (name.includes('poulet') || name.includes('volaille')) return '/images/plats/poulet.jpg';
      if (name.includes('poisson') || name.includes('saumon')) return '/images/plats/poisson.jpg';
      if (name.includes('agneau') || name.includes('mouton')) return '/images/plats/agneau.jpg';
      if (name.includes('pasta') || name.includes('pâtes')) return '/images/plats/pasta.jpg';
      return '/images/plats/plat-generique.jpg';
    }
    
    // Images réalistes pour les desserts
    if (category === 'desserts') {
      if (name.includes('chocolat') || name.includes('mousse')) return '/images/desserts/chocolat.jpg';
      if (name.includes('tarte') || name.includes('tarte')) return '/images/desserts/tarte.jpg';
      if (name.includes('crème') || name.includes('brûlée')) return '/images/desserts/creme-brulee.jpg';
      if (name.includes('fruit') || name.includes('fruit')) return '/images/desserts/fruit.jpg';
      return '/images/desserts/dessert-generique.jpg';
    }
    
    // Images réalistes pour les boissons
    if (category === 'boissons') {
      if (name.includes('vin') || name.includes('rouge')) return '/images/boissons/vin-rouge.jpg';
      if (name.includes('champagne') || name.includes('mousseux')) return '/images/boissons/champagne.jpg';
      if (name.includes('cocktail') || name.includes('mojito')) return '/images/boissons/cocktail.jpg';
      if (name.includes('café') || name.includes('expresso')) return '/images/boissons/cafe.jpg';
      return '/images/boissons/boisson-generique.jpg';
    }
    
    return item.image || '/images/default-food.jpg';
  };

  const imageUrl = getRealisticImage(item.name, item.category || 'plats');

  return (
    <Card className="group flex flex-col h-full overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-white dark:bg-gray-900 rounded-xl">
      <CardHeader className="p-0 relative">
        <div className="relative h-56 w-full overflow-hidden">
          <Image
            src={imageUrl}
            alt={item.name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {/* Overlay avec gradient subtil */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Badge de statut */}
          {isOutOfStock && (
             <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
               <Badge variant="destructive" className="text-lg px-4 py-2">En rupture</Badge>
             </div>
          )}
          
          {/* Badge de popularité */}
          {Math.random() > 0.7 && (
            <div className="absolute top-3 right-3 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              <Star className="h-3 w-3 fill-current" />
              Populaire
            </div>
          )}
          
          {/* Badge de préparation */}
          {Math.random() > 0.8 && (
            <div className="absolute top-3 left-3 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {Math.floor(Math.random() * 10) + 15} min
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-5 flex-grow space-y-3">
        <CardTitle className="font-headline text-xl mb-2 text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors duration-300">
          {item.name}
        </CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
          {item.description}
        </CardDescription>
        
        {/* Tags supplémentaires */}
        <div className="flex flex-wrap gap-2 pt-2">
          {item.dietary && (
            <Badge variant="secondary" className="text-xs">
              {item.dietary}
            </Badge>
          )}
          {item.spiceLevel && (
            <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
              🌶️ {item.spiceLevel}
            </Badge>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="p-5 pt-0 flex justify-between items-center">
        <div className="flex flex-col">
          <p className="text-2xl font-bold text-primary">
            {item.price.toFixed(2)} €
          </p>
          {item.originalPrice && item.originalPrice > item.price && (
            <p className="text-sm text-gray-500 line-through">
              {item.originalPrice.toFixed(2)} €
            </p>
          )}
        </div>
        <Button
          onClick={() => onAddToCart(item)}
          disabled={isOutOfStock}
          aria-label={`Ajouter ${item.name} au panier`}
          className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlusCircle className="mr-2 h-4 w-4" /> 
          Ajouter
        </Button>
      </CardFooter>
    </Card>
  );
}
