import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    console.log("🔄 Mise à jour des images picsum.photos...");
    
    // 1. Trouver tous les éléments avec des images picsum.photos
    const { data: itemsWithPicsumImages, error: fetchError } = await supabase
      .from('menu_items')
      .select('*')
      .like('image', '%picsum.photos%');
    
    if (fetchError) {
      console.error("Erreur lors de la recherche:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!itemsWithPicsumImages || itemsWithPicsumImages.length === 0) {
      return NextResponse.json({ 
        message: "Aucun élément avec des images picsum.photos trouvé.",
        updated: 0 
      });
    }

    console.log(`📋 ${itemsWithPicsumImages.length} éléments trouvés avec des images picsum.photos`);

    // 2. Mapping des nouvelles images par nom de produit
    const imageMapping: { [key: string]: string } = {
      "PIZZA MARGARITA": "/images/Pizza-margherita.jpg",
      "PIZZA MARGHERITA": "/images/Pizza-margherita.jpg", // Variation d'orthographe
      "PIZZA ALL POLLO": "/images/Pizza-margherita.jpg", 
      "PIZZA REGINA": "/images/Pizza-margherita.jpg",
      "JAMAICAN BOWL": "/images/jamaican-poke-bowl-08-683x1024.jpg"
    };

    // 3. Mettre à jour chaque élément
    const updatePromises = itemsWithPicsumImages.map(async (item) => {
      const newImage = imageMapping[item.name.toUpperCase()] || "/images/Pizza-margherita.jpg";
      
      console.log(`🔄 Mise à jour de "${item.name}": ${item.image} → ${newImage}`);
      
      const { error } = await supabase
        .from('menu_items')
        .update({ image: newImage })
        .eq('id', item.id);
      
      if (error) {
        console.error(`❌ Erreur pour "${item.name}":`, error);
        return { success: false, item: item.name, error: error.message };
      }
      
      console.log(`✅ "${item.name}" mis à jour avec succès`);
      return { success: true, item: item.name, oldImage: item.image, newImage };
    });

    const results = await Promise.all(updatePromises);
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`✅ ${successful.length} éléments mis à jour avec succès`);
    if (failed.length > 0) {
      console.log(`❌ ${failed.length} éléments ont échoué`);
    }

    return NextResponse.json({
      message: `Images mises à jour avec succès!`,
      updated: successful.length,
      failed: failed.length,
      details: {
        successful: successful.map(r => ({ item: r.item, newImage: r.newImage })),
        failed: failed.map(r => ({ item: r.item, error: r.error }))
      }
    });

  } catch (error) {
    console.error("❌ Erreur inattendue:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur inconnue' }, 
      { status: 500 }
    );
  }
}