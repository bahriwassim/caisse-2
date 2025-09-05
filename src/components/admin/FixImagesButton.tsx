"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function FixImagesButton({ className }: { className?: string }) {
  const [isFixing, setIsFixing] = useState(false);
  const { toast } = useToast();

  const fixImages = async () => {
    setIsFixing(true);
    try {
      console.log("🔄 Démarrage de la correction des images...");
      
      const response = await fetch('/api/admin/fix-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log("📊 Résultat de la correction:", data);

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la correction des images');
      }

      toast({
        title: "✅ Images corrigées !",
        description: `${data.updated} image(s) mise(s) à jour. ${data.failed > 0 ? `${data.failed} échec(s).` : ''}`,
        duration: 6000,
      });

      // Force reload de la page après 2 secondes pour voir les nouvelles images
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('❌ Erreur lors de la correction des images:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de corriger les images",
        duration: 5000,
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Button 
      onClick={fixImages}
      disabled={isFixing}
      variant="outline"
      size="sm"
      className={className}
    >
      {isFixing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Correction...
        </>
      ) : (
        <>
          <ImageIcon className="mr-2 h-4 w-4" />
          Fix Images
        </>
      )}
    </Button>
  );
}