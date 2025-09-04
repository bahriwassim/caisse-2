"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ResetMenuButton() {
  const [isResetting, setIsResetting] = useState(false);
  const { toast } = useToast();

  const handleReset = async () => {
    setIsResetting(true);
    
    try {
      console.log('🔄 Réinitialisation du menu...');
      
      // 1. Supprimer tous les éléments du menu
      const { error: deleteError } = await supabase
        .from('menu_items')
        .delete()
        .neq('id', 'impossible-id'); // Supprimer tous les éléments

      if (deleteError) {
        console.error('Erreur suppression:', deleteError);
        throw new Error(deleteError.message);
      }

      console.log('✅ Tous les éléments supprimés');

      // 2. Insérer les nouveaux éléments avec la bonne image
      const initialItems = [
        {
          name: "JAMAICAN BOWL",
          description: "Jerk chicken wings / rice & peas / fried plantain / steamed cabbage",
          price: 15,
          category: "Bols",
          status: "available",
          image: "/images/jamaican-poke-bowl-08-683x1024.jpg",
          aiHint: "jamaican food"
        },
        {
          name: "PIZZA MARGARITA",
          description: "Sauce tomate, fior di latte",
          price: 10,
          category: "Plats principaux",
          status: "available",
          image: "/images/Pizza-margherita.jpg",
          aiHint: "margarita pizza"
        },
        {
          name: "PIZZA ALL POLLO",
          description: "(Poulet - Hallal) sauce tomate, fior di latte, poulet pané, aubergine, grand padano",
          price: 10,
          category: "Plats principaux",
          status: "available",
          image: "https://picsum.photos/600/400",
          aiHint: "chicken pizza"
        },
        {
          name: "PIZZA REGINA",
          description: "(Jambon - Non Hallal) Sauce tomate, fior di latte, jambon blanc, champignons",
          price: 10,
          category: "Plats principaux",
          status: "available",
          image: "https://picsum.photos/600/400",
          aiHint: "regina pizza"
        }
      ];

      const { error: insertError } = await supabase
        .from('menu_items')
        .insert(initialItems);

      if (insertError) {
        console.error('Erreur insertion:', insertError);
        throw new Error(insertError.message);
      }

      console.log('✅ Menu réinitialisé avec succès');

      toast({
        title: "Menu réinitialisé",
        description: "Le menu a été réinitialisé avec les bonnes images",
      });

    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de la réinitialisation",
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-red-50 border-red-200 text-red-700 hover:bg-red-100">
          <RefreshCw className="h-4 w-4" />
          Réinitialiser le Menu
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Réinitialiser le menu ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action va supprimer tous les éléments du menu et les recréer avec les bonnes images. 
            Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleReset}
            disabled={isResetting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isResetting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Réinitialisation...
              </>
            ) : (
              'Réinitialiser'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}