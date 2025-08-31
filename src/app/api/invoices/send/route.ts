import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import nodemailer from 'nodemailer';

// Configuration de l'envoi d'email avec fallback vers un compte de test
function createTransporter() {
  // Mode simulation (aucun email n'est envoyé)
  if (process.env.EMAIL_MODE === 'simulate') {
    console.warn('Mode simulation email - aucun email ne sera envoyé');
    return nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true
    });
  }

  // En mode développement ou si les variables d'environnement ne sont pas configurées
  if (process.env.NODE_ENV === 'development' || !process.env.SMTP_HOST) {
    console.warn('Mode test email - utilisation de Ethereal Email (compte de test)');
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal.pass'
      }
    });
  }

  // Configuration production avec gestion des certificats SSL
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'mail.startindev.fr.fo',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_PORT === '465', // true pour le port 465, false pour les autres
    auth: {
      user: process.env.SMTP_USER || 'noreply@startindev.fr.fo',
      pass: process.env.SMTP_PASS || 'wl?)nlbcP!i}',
    },
    // Options pour les problèmes de certificat SSL
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production' ? false : false, // Plus permissif en dev
      ciphers: 'SSLv3'
    }
  });
}

const transporter = createTransporter();

export async function POST(req: NextRequest) {
  try {
    const { invoiceId, recipientEmail } = await req.json();

    if (!invoiceId || !recipientEmail) {
      return NextResponse.json({ 
        error: 'ID de facture et email destinataire requis' 
      }, { status: 400 });
    }

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
      from: process.env.SMTP_FROM || 'noreply@startindev.fr.fo',
      to: recipientEmail,
      subject: `Facture ${invoice.invoice_number} - Restaurant`,
      html: htmlContent,
    };

    console.log('Tentative d\'envoi d\'email vers:', recipientEmail);
    
    try {
      const info = await transporter.sendMail(mailOptions);
      
      if (process.env.EMAIL_MODE === 'simulate') {
        console.log('📧 Email simulé avec succès vers:', recipientEmail);
        console.log('📄 Contenu HTML de la facture généré');
      } else {
        console.log('Email envoyé avec succès:', info.messageId);
        
        // En mode test, log l'URL de prévisualisation
        if (process.env.NODE_ENV === 'development' && info.getTestMessageUrl) {
          console.log('URL de prévisualisation:', info.getTestMessageUrl(info));
        }
      }
    } catch (emailError: any) {
      console.error('Erreur détaillée d\'envoi d\'email:', {
        message: emailError.message,
        code: emailError.code,
        command: emailError.command,
        response: emailError.response
      });
      
      // Retourner une erreur spécifique pour les problèmes d'email
      throw new Error(`Erreur d'envoi d'email: ${emailError.message}`);
    }

    await supabase
      .from('invoices')
      .update({ 
        sent_at: new Date().toISOString(),
        status: 'sent',
        customer_email: recipientEmail
      })
      .eq('id', invoiceId);

    return NextResponse.json({ 
      success: true, 
      message: 'Facture envoyée avec succès' 
    });

  } catch (error: any) {
    console.error('Erreur envoi facture:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
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

      <div style="margin-top: 50px; font-size: 12px; color: #666;">
        <p>Merci pour votre visite !</p>
        <p>Cette facture a été générée automatiquement.</p>
      </div>
    </body>
    </html>
  `;
}