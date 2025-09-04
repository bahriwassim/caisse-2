import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id;

    // Récupérer la facture
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
    }

    // Récupérer les détails de la commande
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          menu_item:menu_items(*)
        )
      `)
      .eq('id', invoice.order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });
    }

    // Générer le HTML de la facture
    const restaurantDetails = invoice.restaurant_details || {};
    const invoiceHtml = generateInvoiceHTML(invoice, order, restaurantDetails);

    // Pour la démo, on retourne un PDF simple (en production, utiliser puppeteer ou jsPDF)
    const pdfBuffer = Buffer.from(`
%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 100
>>
stream
BT
/F1 12 Tf
72 720 Td
(Facture ${invoice.invoice_number}) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000079 00000 n 
0000000173 00000 n 
0000000301 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
456
%%EOF
    `);

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="facture-${invoice.invoice_number}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Erreur génération PDF:', error);
    return NextResponse.json({ error: 'Erreur lors de la génération du PDF' }, { status: 500 });
  }
}

function generateInvoiceHTML(invoice: any, order: any, restaurantDetails: any) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Facture ${invoice.invoice_number}</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { text-align: center; margin-bottom: 40px; }
            .restaurant-info { margin-bottom: 30px; }
            .invoice-details { margin-bottom: 30px; }
            .items-table { width: 100%; border-collapse: collapse; }
            .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .totals { margin-top: 20px; text-align: right; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>${restaurantDetails?.name || 'Restaurant'}</h1>
            <p><em>Logo: ${restaurantDetails?.hasLogo ? 'Oui' : 'Non'}</em></p>
        </div>
        
        <div class="restaurant-info">
            <h3>Informations du restaurant</h3>
            <p>${restaurantDetails?.address || ''}</p>
            <p>${restaurantDetails?.city || ''} ${restaurantDetails?.postalCode || ''}</p>
            <p>Tél: ${restaurantDetails?.phone || ''}</p>
            <p>Email: ${restaurantDetails?.email || ''}</p>
            <p>N° Fiscal: ${restaurantDetails?.fiscalNumber || ''}</p>
        </div>

        <div class="invoice-details">
            <h2>Facture ${invoice.invoice_number}</h2>
            <p>Date: ${new Date(invoice.created_at).toLocaleDateString('fr-FR')}</p>
            <p>Client: ${invoice.customer_name}</p>
            ${invoice.company_name ? `<p>Société: ${invoice.company_name}</p>` : ''}
            ${invoice.customer_email ? `<p>Email: ${invoice.customer_email}</p>` : ''}
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th>Article</th>
                    <th>Quantité</th>
                    <th>Prix unitaire</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${order.order_items.map((item: any) => `
                    <tr>
                        <td>${item.menu_item?.name || 'Article'}</td>
                        <td>${item.quantity}</td>
                        <td>${item.price.toFixed(2)} €</td>
                        <td>${(item.price * item.quantity).toFixed(2)} €</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="totals">
            <p>Sous-total HT: ${invoice.subtotal_ht.toFixed(2)} €</p>
            <p>TVA (${(invoice.tax_rate * 100).toFixed(0)}%): ${invoice.tax_amount.toFixed(2)} €</p>
            <h3>Total TTC: ${invoice.total_ttc.toFixed(2)} €</h3>
        </div>
    </body>
    </html>
  `;
}