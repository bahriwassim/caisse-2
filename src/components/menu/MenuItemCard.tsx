
import Image from "next/image";
import { useState, useEffect } from "react";
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
  const [isPopular, setIsPopular] = useState(false);
  const [showPrepTime, setShowPrepTime] = useState(false);
  const [prepTime, setPrepTime] = useState(15);
  const [mounted, setMounted] = useState(false);

  // Utilise l'image Pizza-margherita.jpg pour tous les produits
  const getProductImage = () => {
    return '/images/Pizza-margherita.jpg';
  };

  const imageUrl = getProductImage();

  useEffect(() => {
    setMounted(true);
    // Generate random values only on client side after mounting
    setIsPopular(Math.random() > 0.7);
    setShowPrepTime(Math.random() > 0.8);
    setPrepTime(Math.floor(Math.random() * 10) + 15);
  }, []);

  return (
    <Card className="group flex flex-col h-full overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-white dark:bg-gray-900 rounded-xl">
      <CardHeader className="p-0 relative">
        <div className="relative h-40 sm:h-48 lg:h-56 w-full overflow-hidden">
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
          {mounted && isPopular && (
            <div className="absolute top-3 right-3 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              <Star className="h-3 w-3 fill-current" />
              Populaire
            </div>
          )}
          
          {/* Badge de préparation */}
          {mounted && showPrepTime && (
            <div className="absolute top-3 left-3 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {prepTime} min
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-3 sm:p-4 lg:p-5 flex-grow space-y-2 sm:space-y-3">
        <CardTitle className="font-headline text-lg sm:text-xl mb-1 sm:mb-2 text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors duration-300 line-clamp-2">
          {item.name}
        </CardTitle>
        <CardDescription className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm leading-relaxed line-clamp-3">
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
      
      <CardFooter className="p-3 sm:p-4 lg:p-5 pt-0 flex justify-between items-center">
        <div className="flex flex-col">
          <p className="text-xl sm:text-2xl font-bold text-primary">
            {item.price.toFixed(2)} €
          </p>
          {item.originalPrice && item.originalPrice > item.price && (
            <p className="text-xs sm:text-sm text-gray-500 line-through">
              {item.originalPrice.toFixed(2)} €
            </p>
          )}
        </div>
        <Button
          onClick={() => onAddToCart(item)}
          disabled={isOutOfStock}
          aria-label={`Ajouter ${item.name} au panier`}
          className="bg-primary hover:bg-primary/90 text-white px-3 sm:px-4 lg:px-6 py-2 rounded-lg font-semibold transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          <PlusCircle className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" /> 
          <span className="hidden sm:inline">Ajouter</span>
          <span className="sm:hidden">+</span>
        </Button>
      </CardFooter>
    </Card>
  );
}
