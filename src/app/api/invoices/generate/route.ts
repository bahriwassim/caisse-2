import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { FullOrder, Invoice } from '@/lib/types';

// Tentative d'import du client admin avec gestion d'erreur
let supabaseAdmin: any;
try {
  const { supabaseAdmin: adminClient } = require('@/lib/supabase-admin');
  supabaseAdmin = adminClient;
} catch (error) {
  console.warn('Service role key non configurée, utilisation du client standard');
  supabaseAdmin = null;
}

export async function POST(req: NextRequest) {
  try {
    const { orderId, customerEmail, companyName, vatNumber } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: 'ID de commande requis' }, { status: 400 });
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          menu_item:menu_items(*)
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });
    }

    const fullOrder = order as FullOrder;
    
    // Choisir le client à utiliser
    const client = supabaseAdmin || supabase;

    // Vérifier si la table invoices existe en tentant une requête simple
    try {
      const { data: existingInvoice, error: checkError } = await client
        .from('invoices')
        .select('id')
        .eq('order_id', orderId)
        .limit(1)
        .maybeSingle();

      if (checkError && checkError.message?.includes('relation "invoices" does not exist')) {
        return NextResponse.json({ 
          error: 'Table invoices non trouvée. Veuillez exécuter le script SQL supabase_invoices_table.sql dans Supabase SQL Editor.' 
        }, { status: 500 });
      }

      if (existingInvoice) {
        return NextResponse.json({ error: 'Une facture existe déjà pour cette commande' }, { status: 409 });
      }
    } catch (tableError: any) {
      console.error('Erreur de vérification table invoices:', tableError);
      return NextResponse.json({ 
        error: 'Problème avec la base de données. Vérifiez que la table invoices existe.' 
      }, { status: 500 });
    }

    const TAX_RATE = 0.10; // 10% TVA
    const totalTTC = fullOrder.total;
    const subtotalHT = totalTTC / (1 + TAX_RATE);
    const taxAmount = totalTTC - subtotalHT;

    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    const invoiceData = {
      invoice_number: invoiceNumber,
      order_id: orderId,
      customer_name: fullOrder.customer,
      customer_email: customerEmail || null,
      company_name: companyName || null,
      vat_number: vatNumber || null,
      subtotal_ht: Number(subtotalHT.toFixed(2)),
      tax_amount: Number(taxAmount.toFixed(2)),
      total_ttc: totalTTC,
      tax_rate: TAX_RATE,
      created_at: new Date().toISOString(),
      sent_at: null,
      status: 'draft'
    };

    const { data: invoice, error: invoiceError } = await client
      .from('invoices')
      .insert(invoiceData)
      .select()
      .single();

    if (invoiceError) {
      console.error('Erreur lors de la création de la facture:', invoiceError);
      return NextResponse.json({ error: 'Impossible de créer la facture' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      invoice,
      message: 'Facture générée avec succès'
    });

  } catch (error: any) {
    console.error('Erreur API génération facture:', error);
    
    // Message d'erreur plus détaillé
    let errorMessage = error.message;
    if (error.message?.includes('relation "invoices" does not exist')) {
      errorMessage = 'Table invoices non trouvée. Veuillez exécuter le script SQL supabase_invoices_table.sql dans Supabase.';
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }, { status: 500 });
  }
}