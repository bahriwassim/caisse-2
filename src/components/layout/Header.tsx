"use client"

import Link from "next/link";
import { Utensils } from "lucide-react";
import { useRestaurantDetails } from "@/hooks/use-restaurant-details";

export default function Header() {
  const { details, isLoading } = useRestaurantDetails();
  
  // Debug : loguer les informations
  console.log('Header - isLoading:', isLoading, 'details:', details);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex min-h-[4rem] max-w-screen-2xl items-center justify-between py-2">
        <Link href="/" className="flex items-center gap-2">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-4 w-24 bg-gray-200 animate-pulse rounded"></div>
            </div>
          ) : details?.logo ? (
            <div className="flex items-center gap-3">
              <img 
                src={details.logo} 
                alt={details.name || "Logo du restaurant"} 
                className="h-12 w-auto max-w-[150px] object-contain"
                style={{ maxHeight: '48px' }}
                onError={(e) => {
                  console.error('Erreur chargement logo:', e);
                  // Afficher le fallback si l'image ne se charge pas
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div className="hidden items-center gap-2">
                <Utensils className="h-6 w-6 text-primary" />
                <span className="font-bold text-lg font-headline">
                  {details?.name || "Caisse Events Lite"}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Utensils className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg font-headline">
                {details?.name || "Caisse Events Lite"}
              </span>
            </div>
          )}
        </Link>
      </div>
    </header>
  );
}
