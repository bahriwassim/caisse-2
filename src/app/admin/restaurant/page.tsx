"use client";

import { useState } from "react";
import { MobileThemeToggle } from "@/components/theme/ThemeToggle";
import RestaurantInfoForm from "@/components/admin/RestaurantInfoForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageIcon, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function RestaurantPage() {
  const [isFixingImages, setIsFixingImages] = useState(false);
  const { toast } = useToast();

  const fixImages = async () => {
    setIsFixingImages(true);
    try {
      const response = await fetch('/api/admin/fix-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la correction des images');
      }

      toast({
        title: "Images corrigées !",
        description: `${data.updated} image(s) mise(s) à jour avec succès.`,
        duration: 5000,
      });

      console.log("Images fix result:", data);
    } catch (error) {
      console.error('Erreur lors de la correction des images:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de corriger les images",
        duration: 5000,
      });
    } finally {
      setIsFixingImages(false);
    }
  };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between sm:block">
        <h1 className="font-headline text-xl sm:text-2xl">Paramètres du Restaurant</h1>
        <MobileThemeToggle />
      </div>

      {/* Bouton de correction des images */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Correction des Images
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Cliquez sur ce bouton pour corriger les images génériques (picsum.photos) 
            et les remplacer par les images locales appropriées.
          </p>
          <Button 
            onClick={fixImages}
            disabled={isFixingImages}
            className="w-full sm:w-auto"
          >
            {isFixingImages ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-2 h-4 w-4" />
            )}
            {isFixingImages ? 'Correction en cours...' : 'Corriger les Images'}
          </Button>
        </CardContent>
      </Card>

      <RestaurantInfoForm />
    </div>
  );
}