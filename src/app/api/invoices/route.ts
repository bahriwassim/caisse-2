import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');

    let query = supabase
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
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: invoices, error } = await query
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      console.error('Erreur lors de la récupération des factures:', error);
      return NextResponse.json({ error: 'Impossible de récupérer les factures' }, { status: 500 });
    }

    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      invoices: invoices || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error: any) {
    console.error('Erreur API factures:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}