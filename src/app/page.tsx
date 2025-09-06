"use client"

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Utensils, QrCode } from "lucide-react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import { useRestaurantDetails } from "@/hooks/use-restaurant-details";

export default function Home() {
  const { details, isLoading } = useRestaurantDetails();

  return (
    <div className="flex flex-col w-full">
      <Header />
      <main className="flex-grow flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-2xl text-center">
          <Card className="bg-card/80 backdrop-blur-sm">
            <CardContent className="p-8 sm:p-12 md:p-16">
              <div className="flex justify-center mb-6">
                {!isLoading && details?.logo ? (
                  <img 
                    src={details.logo} 
                    alt={details.name || "Logo du restaurant"} 
                    className="h-20 w-auto object-contain"
                  />
                ) : (
                  <div className="p-4 bg-primary rounded-full">
                    <Utensils className="h-10 w-10 text-primary-foreground" />
                  </div>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold font-headline text-foreground mb-4">
                Bienvenue sur {!isLoading && details?.name ? details.name : "Caisse Events Lite"}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8">
                Scannez le code QR sur votre table pour voir le menu et passer votre commande instantanément.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <div className="flex items-center justify-center p-6 border-4 border-dashed rounded-lg">
                  <QrCode className="h-20 w-20 text-foreground" />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <p className="font-semibold">Pas de code QR ?</p>
                  <Button asChild size="lg" className="shadow-lg">
                    <Link href="/table/1">Voir le menu de démo</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
