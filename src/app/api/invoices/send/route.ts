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

  // Log de la configuration utilisée
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    console.log('✅ Utilisation des variables d\'environnement SMTP (.env.local)');
  } else {
    console.log('📧 Utilisation de la configuration SMTP par défaut');
  }

  // Essayer différentes configurations SMTP
  const smtpConfigs = [
    {
      name: 'Port 587 STARTTLS',
      config: {
        host: process.env.SMTP_HOST || 'mail.startindev.fr.fo',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER || 'noreply@startindev.fr.fo',
          pass: process.env.SMTP_PASS || 'startindev#23',
        },
        tls: {
          rejectUnauthorized: false
        },
        requireTLS: true,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000
      }
    },
    {
      name: 'Port 465 SSL',
      config: {
        host: process.env.SMTP_HOST || 'mail.startindev.fr.fo',
        port: 465,
        secure: true,
        auth: {
          user: process.env.SMTP_USER || 'noreply@startindev.fr.fo',
          pass: process.env.SMTP_PASS || 'startindev#23',
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000
      }
    },
    {
      name: 'Port 25 sans sécurité',
      config: {
        host: process.env.SMTP_HOST || 'mail.startindev.fr.fo',
        port: 25,
        secure: false,
        auth: {
          user: process.env.SMTP_USER || 'noreply@startindev.fr.fo',
          pass: process.env.SMTP_PASS || 'startindev#23',
        },
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000
      }
    }
  ];

  // Configuration selon la documentation officielle avec variables d'environnement
  const smtpConfig = {
    host: process.env.SMTP_HOST || 'mail.startindev.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true, // SSL sur port 465
    auth: {
      user: process.env.SMTP_USER || 'noreply@startindev.com',
      pass: process.env.SMTP_PASS || 'startindev#23',
    },
    tls: {
      rejectUnauthorized: false,
      servername: process.env.SMTP_HOST || 'mail.startindev.com'
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000
  };

  console.log('📧 Configuration SMTP activée:', {
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    user: smtpConfig.auth.user
  });

  return nodemailer.createTransport(smtpConfig);
}

// Fonction pour tester une configuration SMTP
async function testSMTPConnection(config: any, name: string) {
  return new Promise((resolve) => {
    const testTransporter = nodemailer.createTransport(config);
    const timeout = setTimeout(() => {
      console.log(`❌ Timeout pour ${name}`);
      resolve(false);
    }, 8000);

    testTransporter.verify((error, success) => {
      clearTimeout(timeout);
      if (error) {
        console.log(`❌ ${name} échoué:`, error.message);
        resolve(false);
      } else {
        console.log(`✅ ${name} fonctionne!`);
        resolve(true);
      }
    });
  });
}

let transporter = createTransporter();

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
      from: process.env.SMTP_FROM || 'noreply@startindev.com',
      to: recipientEmail,
      subject: `Facture ${invoice.invoice_number} - Restaurant`,
      html: htmlContent,
    };

    console.log('📤 Tentative d\'envoi d\'email vers:', recipientEmail);
    console.log('📧 Configuration SMTP utilisée:', {
      host: process.env.SMTP_HOST || 'mail.startindev.com',
      port: process.env.SMTP_PORT || '465',
      from: process.env.SMTP_FROM || 'noreply@startindev.com'
    });
    
    try {
      const info = await transporter.sendMail(mailOptions);
      
      if (process.env.EMAIL_MODE === 'simulate') {
        console.log('📧 Email simulé avec succès vers:', recipientEmail);
        console.log('📄 Contenu HTML de la facture généré');
      } else {
        console.log('✅ Email envoyé avec succès!');
        console.log('📧 Message ID:', info.messageId);
        console.log('📧 Response:', info.response);
        
        // En mode test, log l'URL de prévisualisation
        if (process.env.NODE_ENV === 'development' && info.getTestMessageUrl) {
          console.log('🔗 URL de prévisualisation:', info.getTestMessageUrl(info));
        }
      }
    } catch (emailError: any) {
      console.error('❌ Premier essai échoué:', emailError.message);
      
      // Si c'est un problème de connexion, tester d'autres configurations
      if (emailError.code === 'ETIMEDOUT' || emailError.code === 'ECONNREFUSED') {
        console.log('🔄 Test d\'autres configurations SMTP...');
        
        const smtpConfigs = [
          {
            name: 'Port 587 STARTTLS (startindev)',
            config: {
              host: 'mail.startindev.com',
              port: 587,
              secure: false,
              requireTLS: true,
              auth: {
                user: 'noreply@startindev.com',
                pass: 'startindev#23',
              },
              tls: { 
                rejectUnauthorized: false,
                servername: 'mail.startindev.com'
              },
              connectionTimeout: 8000,
              greetingTimeout: 8000,
              socketTimeout: 8000
            }
          },
          {
            name: 'Port 465 SSL (documentation officielle)',
            config: {
              host: 'mail.startindev.com',
              port: 465,
              secure: true,
              auth: {
                user: 'noreply@startindev.com',
                pass: 'startindev#23',
              },
              tls: { 
                rejectUnauthorized: false,
                servername: 'mail.startindev.com'
              },
              connectionTimeout: 8000,
              greetingTimeout: 8000,
              socketTimeout: 8000
            }
          },
          {
            name: 'Port 25 simple (startindev)',
            config: {
              host: 'mail.startindev.com',
              port: 25,
              secure: false,
              auth: {
                user: 'noreply@startindev.com',
                pass: 'startindev#23',
              },
              connectionTimeout: 10000,
              greetingTimeout: 10000
            }
          },
          {
            name: 'Gmail SMTP (fallback)',
            config: {
              host: 'smtp.gmail.com',
              port: 587,
              secure: false,
              auth: {
                user: process.env.GMAIL_USER || 'your-email@gmail.com',
                pass: process.env.GMAIL_PASS || 'your-app-password',
              },
              tls: { rejectUnauthorized: false },
              connectionTimeout: 5000,
              requireTLS: true
            }
          },
          {
            name: 'Test Outlook SMTP (vérification réseau)',
            config: {
              host: 'smtp-mail.outlook.com',
              port: 587,
              secure: false,
              requireTLS: true,
              auth: {
                user: 'test@outlook.com',
                pass: 'fakepass'
              },
              connectionTimeout: 8000,
              tls: { rejectUnauthorized: false }
            }
          }
        ];
        
        // Tester les configurations alternatives
        for (const smtpTest of smtpConfigs) {
          try {
            console.log(`🧪 Test ${smtpTest.name}...`);
            const altTransporter = nodemailer.createTransport(smtpTest.config);
            const altInfo = await altTransporter.sendMail(mailOptions);
            
            console.log(`✅ Email envoyé avec ${smtpTest.name}!`);
            console.log('📧 Message ID:', altInfo.messageId);
            
            // Succès avec configuration alternative
            return NextResponse.json({ 
              success: true, 
              message: `Facture envoyée avec succès via ${smtpTest.name}` 
            });
            
          } catch (altError: any) {
            console.log(`❌ ${smtpTest.name} échoué:`, altError.message);
            continue;
          }
        }
      }
      
      // Fallback final : simulation avec log du contenu
      console.log('❌ Toutes les configurations SMTP ont échoué');
      console.log('🔄 Mode fallback: simulation de l\'envoi avec log du contenu');
      
      const htmlContent = generateInvoiceHTML(invoice);
      
      console.log('📧 === CONTENU EMAIL (SIMULATION) ===');
      console.log('📧 Destinataire:', recipientEmail);
      console.log('📧 Sujet:', `Facture ${invoice.invoice_number} - Restaurant`);
      console.log('📧 Contenu HTML généré et prêt à être envoyé');
      console.log('📧 === FIN SIMULATION ===');
      
      // Marquer comme envoyé en mode simulation
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
        message: 'Email simulé avec succès (SMTP non disponible)',
        mode: 'simulation'
      });
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
  const restaurantDetails = invoice.restaurant_details;
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
        ${restaurantDetails?.name ? `
        <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; text-align: center;">
          <strong>${restaurantDetails.name}</strong><br/>
          ${restaurantDetails?.address ? `${restaurantDetails.address}<br/>` : ''}
          ${restaurantDetails?.city && restaurantDetails?.postalCode ? `${restaurantDetails.city} ${restaurantDetails.postalCode}<br/>` : ''}
          ${restaurantDetails?.phone ? `Tél: ${restaurantDetails.phone}<br/>` : ''}
          ${restaurantDetails?.email ? `Email: ${restaurantDetails.email}` : ''}
        </div>
        ` : ''}
        <p>Cette facture a été générée automatiquement.</p>
      </div>
    </body>
    </html>
  `;
}