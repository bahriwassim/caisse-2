import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json({ error: 'ID de commande requis' }, { status: 400 });
    }

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        order:orders (
          *,
          order_items (
            *,
            menu_item:menu_items(*)
          )
        )
      `)
      .eq('order_id', orderId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Aucune facture trouvée
        return NextResponse.json({ invoice: null });
      }
      throw error;
    }

    return NextResponse.json({ invoice });

  } catch (error: any) {
    console.error('Erreur API récupération facture:', error);
    return NextResponse.json({ 
      error: error.message || 'Erreur lors de la récupération de la facture'
    }, { status: 500 });
  }
}