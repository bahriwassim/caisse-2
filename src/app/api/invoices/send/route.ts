import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import nodemailer from 'nodemailer';

// Configuration Gmail pour un envoi fiable
function createGmailTransporter() {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER || 'your-email@gmail.com',
      pass: process.env.GMAIL_APP_PASSWORD || 'your-app-password'
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

// Configuration SMTP générique avec gestion d'erreur améliorée
function createSMTPTransporter() {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // STARTTLS
    auth: {
      user: process.env.SMTP_USER || process.env.GMAIL_USER,
      pass: process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
  });
}

export async function POST(req: NextRequest) {
  try {
    const { invoiceId, recipientEmail } = await req.json();

    if (!invoiceId || !recipientEmail) {
      return NextResponse.json({ 
        error: 'ID de facture et email destinataire requis' 
      }, { status: 400 });
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return NextResponse.json({ 
        error: 'Format d\'email invalide' 
      }, { status: 400 });
    }

    // Récupérer les données de la facture
    const { data: invoice, error: invoiceError } = await supabase
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
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 });
    }

    const htmlContent = generateInvoiceHTML(invoice);

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.GMAIL_USER || 'noreply@restaurant.com',
      to: recipientEmail,
      subject: `Facture ${invoice.invoice_number} - Restaurant`,
      html: htmlContent,
    };

    console.log('📤 Tentative d\'envoi d\'email vers:', recipientEmail);
    
    // Essayer d'abord Gmail si configuré
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      try {
        console.log('🔄 Tentative avec Gmail...');
        const gmailTransporter = createGmailTransporter();
        
        // Test de connexion
        await gmailTransporter.verify();
        
        const info = await gmailTransporter.sendMail(mailOptions);
        
        console.log('✅ Email envoyé via Gmail!');
        console.log('📧 Message ID:', info.messageId);
        
        // Marquer comme envoyé
        await updateInvoiceStatus(invoiceId, recipientEmail);
        
        return NextResponse.json({ 
          success: true, 
          message: 'Facture envoyée avec succès via Gmail',
          messageId: info.messageId
        });
        
      } catch (gmailError: any) {
        console.log('❌ Gmail échoué:', gmailError.message);
        // Continuer avec SMTP classique
      }
    }

    // Essayer SMTP classique
    try {
      console.log('🔄 Tentative avec SMTP...');
      const smtpTransporter = createSMTPTransporter();
      
      // Test de connexion avec timeout
      const verifyPromise = smtpTransporter.verify();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout de connexion SMTP')), 5000)
      );
      
      await Promise.race([verifyPromise, timeoutPromise]);
      
      const info = await smtpTransporter.sendMail(mailOptions);
      
      console.log('✅ Email envoyé via SMTP!');
      console.log('📧 Message ID:', info.messageId);
      
      // Marquer comme envoyé
      await updateInvoiceStatus(invoiceId, recipientEmail);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Facture envoyée avec succès',
        messageId: info.messageId
      });
      
    } catch (smtpError: any) {
      console.log('❌ SMTP échoué:', smtpError.message);
      
      // Mode fallback : sauvegarder pour envoi manuel
      console.log('🔄 Mode fallback: sauvegarde pour envoi manuel');
      
      // Marquer comme "prêt à envoyer" mais pas envoyé
      await supabase
        .from('invoices')
        .update({ 
          customer_email: recipientEmail,
          status: 'draft' // Garder en brouillon mais avec email
        })
        .eq('id', invoiceId);
      
      return NextResponse.json({ 
        success: false,
        error: 'Serveur d\'email temporairement indisponible',
        fallback: true,
        message: 'Facture sauvegardée. Vous pouvez la télécharger ou réessayer l\'envoi plus tard.'
      }, { status: 202 }); // 202 = Accepted but not processed
    }

  } catch (error: any) {
    console.error('❌ Erreur générale:', error);
    return NextResponse.json({ 
      error: 'Erreur interne du serveur',
      details: error.message 
    }, { status: 500 });
  }
}

async function updateInvoiceStatus(invoiceId: string, email: string) {
  await supabase
    .from('invoices')
    .update({ 
      sent_at: new Date().toISOString(),
      status: 'sent',
      customer_email: email
    })
    .eq('id', invoiceId);
}

function generateInvoiceHTML(invoice: any): string {
  const order = invoice.order;
  const items = order.order_items || [];

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .invoice-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        .items-table th { background-color: #f2f2f2; }
        .totals { margin-left: auto; width: 300px; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .final-total { font-weight: bold; font-size: 1.2em; border-top: 2px solid #333; padding-top: 10px; }
        .footer { margin-top: 50px; font-size: 12px; color: #666; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>FACTURE</h1>
        <h2>${invoice.invoice_number}</h2>
      </div>
      
      <div class="invoice-info">
        <div>
          <strong>Client:</strong><br>
          ${invoice.customer_name}<br>
          ${invoice.company_name ? `<strong>Société:</strong> ${invoice.company_name}<br>` : ''}
          ${invoice.vat_number ? `<strong>N° TVA:</strong> ${invoice.vat_number}<br>` : ''}
          Table ${order.table_id}
        </div>
        <div>
          <strong>Date:</strong> ${new Date(invoice.created_at).toLocaleDateString('fr-FR')}<br>
          <strong>Commande:</strong> ${order.short_id || order.id.substring(0, 6)}
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th>Article</th>
            <th>Prix unitaire HT</th>
            <th>Quantité</th>
            <th>Total HT</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item: any) => {
            const priceHT = item.price / (1 + invoice.tax_rate);
            const totalHT = priceHT * item.quantity;
            return `
              <tr>
                <td>${item.menu_item?.name || 'Article'}</td>
                <td>${priceHT.toFixed(2)} €</td>
                <td>${item.quantity}</td>
                <td>${totalHT.toFixed(2)} €</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div class="totals">
        <div class="total-row">
          <span>Sous-total HT:</span>
          <span>${invoice.subtotal_ht.toFixed(2)} €</span>
        </div>
        <div class="total-row">
          <span>TVA (${(invoice.tax_rate * 100).toFixed(0)}%):</span>
          <span>${invoice.tax_amount.toFixed(2)} €</span>
        </div>
        <div class="total-row final-total">
          <span>Total TTC:</span>
          <span>${invoice.total_ttc.toFixed(2)} €</span>
        </div>
      </div>

      <div class="footer">
        <p>Merci pour votre visite !</p>
        <p>Cette facture a été générée automatiquement.</p>
      </div>
    </body>
    </html>
  `;
}