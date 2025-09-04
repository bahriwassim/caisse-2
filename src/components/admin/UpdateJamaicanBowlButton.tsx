"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { forceUpdateJamaicanBowl } from "@/lib/services/menuService";

export function UpdateJamaicanBowlButton() {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleUpdate = async () => {
    setIsUpdating(true);
    
    try {
      console.log('=== Début mise à jour JAMAICAN BOWL ===');
      
      const result = await forceUpdateJamaicanBowl();
      console.log('Résultat:', result);

      if (result.success) {
        toast({
          title: "Succès",
          description: `JAMAICAN BOWL ${result.action === 'updated' ? 'mis à jour' : 'créé'} avec succès`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.error || "Échec de la mise à jour",
        });
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Button
      onClick={handleUpdate}
      disabled={isUpdating}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {isUpdating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ImageIcon className="h-4 w-4" />
      )}
      {isUpdating ? "Mise à jour..." : "Mettre à jour image JAMAICAN BOWL"}
    </Button>
  );
}