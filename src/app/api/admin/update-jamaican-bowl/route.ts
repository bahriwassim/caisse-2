import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    console.log('=== Mise à jour image JAMAICAN BOWL ===');
    
    // Vérifier si le produit existe
    const { data: existingItems, error: fetchError } = await supabase
      .from('menu_items')
      .select('*')
      .eq('name', 'JAMAICAN BOWL');

    if (fetchError) {
      console.error('Erreur lors de la recherche du produit:', fetchError);
      return NextResponse.json({ 
        success: false, 
        error: fetchError.message 
      }, { status: 500 });
    }

    if (!existingItems || existingItems.length === 0) {
      console.log('Aucun produit "JAMAICAN BOWL" trouvé');
      return NextResponse.json({ 
        success: false, 
        message: 'Produit "JAMAICAN BOWL" non trouvé dans la base de données' 
      }, { status: 404 });
    }

    console.log('Produit trouvé:', existingItems[0]);

    // Mettre à jour l'image
    const { data: updatedData, error: updateError } = await supabase
      .from('menu_items')
      .update({
        image: '/images/jamaican-poke-bowl-08-683x1024.jpg'
      })
      .eq('name', 'JAMAICAN BOWL')
      .select();

    if (updateError) {
      console.error('Erreur lors de la mise à jour:', updateError);
      return NextResponse.json({ 
        success: false, 
        error: updateError.message 
      }, { status: 500 });
    }

    console.log('Mise à jour réussie:', updatedData);

    return NextResponse.json({ 
      success: true, 
      message: 'Image du JAMAICAN BOWL mise à jour avec succès',
      before: existingItems[0],
      after: updatedData[0]
    });

  } catch (error) {
    console.error('Erreur inattendue:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // Vérifier l'état actuel
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('name', 'JAMAICAN BOWL');

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: data || [],
      message: data && data.length > 0 ? 'Produit trouvé' : 'Produit non trouvé'
    });

  } catch (error) {
    console.error('Erreur inattendue:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    }, { status: 500 });
  }
}