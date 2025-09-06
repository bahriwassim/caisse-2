"use client"

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Mail, 
  Printer, 
  Eye, 
  Search, 
  Filter,
  RefreshCw,
  Calendar,
  Euro
} from "lucide-react";
import { MobileThemeToggle } from "@/components/theme/ThemeToggle";
import { useEnhancedToast } from "@/hooks/use-enhanced-toast";
import { useConditionalRefreshPause } from "@/hooks/use-global-refresh-pause";
import { useRestaurantDetails } from "@/hooks/use-restaurant-details";
import { supabase } from "@/lib/supabase";
import type { FullInvoice, InvoiceStatus } from "@/lib/types";
import { parseISO } from 'date-fns';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<FullInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedInvoice, setSelectedInvoice] = useState<FullInvoice | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });
  
  const enhancedToast = useEnhancedToast();
  const { pauseWhileActive } = useConditionalRefreshPause();
  const { details: restaurantDetails } = useRestaurantDetails();

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const { data: invoicesData, error } = await supabase
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

      if (error) {
        throw error;
      }

      setInvoices(invoicesData || []);
    } catch (error: any) {
      console.error('Erreur lors du chargement des factures:', error);
      enhancedToast.error("Erreur", "Impossible de charger les factures");
    } finally {
      setLoading(false);
    }
  }, [enhancedToast]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const filterInvoices = (invoices: FullInvoice[]) => {
    let filtered = invoices;

    // Filtre par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter);
    }

    // Filtre par recherche
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(invoice => 
        invoice.invoice_number.toLowerCase().includes(query) ||
        invoice.customer_name.toLowerCase().includes(query) ||
        invoice.order?.short_id?.toLowerCase().includes(query) ||
        invoice.customer_email?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const sendInvoiceByEmail = async (invoice: FullInvoice, email?: string) => {
    if (!email && !invoice.customer_email) {
      enhancedToast.warning("Email requis", "Aucune adresse email disponible");
      return;
    }

    try {
      const response = await fetch('/api/invoices/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.id,
          recipientEmail: email || invoice.customer_email
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'envoi');
      }

      enhancedToast.success(
        "Facture envoyée", 
        `Facture ${invoice.invoice_number} envoyée avec succès`,
        { duration: 5000 }
      );

      fetchInvoices(); // Refresh pour mettre à jour le statut

    } catch (error: any) {
      enhancedToast.error("Erreur d'envoi", error.message);
    }
  };

  const downloadInvoicePDF = async (invoice: FullInvoice) => {
    try {
      // Générer le contenu HTML de la facture
      const invoiceHtml = generateInvoiceHTML(invoice);
      
      // Créer une nouvelle fenêtre avec le contenu de la facture
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Impossible d\'ouvrir la fenêtre d\'impression. Veuillez autoriser les pop-ups.');
      }
      
      printWindow.document.write(invoiceHtml);
      printWindow.document.close();
      
      // Attendre que le contenu soit chargé puis déclencher l'impression PDF
      printWindow.onload = () => {
        // Petit délai pour s'assurer que le contenu est bien rendu
        setTimeout(() => {
          printWindow.print();
          // La fenêtre se fermera automatiquement après l'impression
        }, 500);
      };
      
      enhancedToast.success(
        "PDF généré",
        `La fenêtre d'impression PDF pour la facture ${invoice.invoice_number} s'ouvre`,
        { duration: 6000 }
      );
      
    } catch (error: any) {
      enhancedToast.error(
        "Erreur de téléchargement PDF",
        error.message || "Impossible de générer le PDF"
      );
    }
  };

  const generateInvoiceHTML = (invoice: FullInvoice) => {
    const FISCAL_NUMBER = "FR123456789012";
    const items = invoice.order?.order_items || [];
    
    // Calcul du nombre de repas pour facture simple
    const calculateMeals = (total: number) => {
      if (total <= 50) {
        return { count: 1, description: "1 Repas" };
      } else {
        return { count: 2, description: "2 Repas" };
      }
    };
    
    const meals = calculateMeals(invoice.total_ttc);
    const type = invoice.invoice_type || 'detailed';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Justificatif de paiement - ${invoice.invoice_number}</title>
        <style>
          @media print {
            @page {
              margin: 0.5cm;
              size: 80mm auto;
            }
            body {
              -webkit-print-color-adjust: exact;
              color-adjust: exact;
              margin: 0;
              padding: 0;
            }
          }
          body { 
            font-family: 'Courier New', monospace; 
            width: 300px;
            margin: 0 auto; 
            padding: 10px; 
            line-height: 1.3;
            font-size: 12px;
            background: #fff;
          }
          .ticket-header { 
            text-align: center; 
            margin-bottom: 15px; 
            border-bottom: 1px dashed #333;
            padding-bottom: 10px;
          }
          .ticket-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .ticket-info { 
            text-align: center;
            margin-bottom: 15px; 
            font-size: 11px;
          }
          .customer-info {
            margin-bottom: 15px;
            border-bottom: 1px dashed #333;
            padding-bottom: 10px;
          }
          .items-section { 
            margin-bottom: 15px; 
          }
          .item-line {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            align-items: flex-start;
          }
          .item-name {
            flex: 1;
            padding-right: 5px;
            word-wrap: break-word;
          }
          .item-price {
            white-space: nowrap;
            font-weight: bold;
          }
          .quantity-line {
            font-size: 10px;
            color: #666;
            margin-left: 10px;
            margin-bottom: 5px;
          }
          .totals-section { 
            border-top: 1px dashed #333;
            padding-top: 10px;
            margin-bottom: 15px;
          }
          .total-line { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 3px; 
            font-size: 11px;
          }
          .final-total { 
            font-weight: bold; 
            font-size: 14px; 
            border-top: 1px solid #333; 
            padding-top: 5px; 
            margin-top: 5px;
          }
          .footer {
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px dashed #333;
            font-size: 10px;
            text-align: center;
            color: #666;
          }
          .separator {
            text-align: center;
            margin: 10px 0;
            font-size: 10px;
          }
        </style>
        <script>
          window.addEventListener('afterprint', function() {
            window.close();
          });
        </script>
      </head>
      <body>
        <div class="ticket-header">
          <div class="ticket-title">Justificatif de paiement</div>
          <div>Ticket N° ${invoice.invoice_number}</div>
        </div>
        
        <div class="ticket-info">
          <div><strong>Date:</strong> ${new Date(invoice.created_at).toLocaleString('fr-FR')}</div>
          <div><strong>Table:</strong> ${invoice.order?.table_id || 'N/A'}</div>
          <div><strong>Commande:</strong> ${invoice.order?.short_id || invoice.order?.id?.substring(0, 6) || 'N/A'}</div>
        </div>
        
        <div class="customer-info">
          <div><strong>Client:</strong> ${invoice.customer_name}</div>
          ${invoice.company_name ? `<div><strong>Société:</strong> ${invoice.company_name}</div>` : ''}
          ${invoice.customer_email ? `<div><strong>Email:</strong> ${invoice.customer_email}</div>` : ''}
          ${invoice.vat_number ? `<div><strong>N° TVA:</strong> ${invoice.vat_number}</div>` : ''}
        </div>

        <div class="items-section">
          <div style="font-weight: bold; margin-bottom: 8px;">Articles:</div>
          ${type === "simple" ? `
            <div class="item-line">
              <span class="item-name">${meals.description}</span>
              <span class="item-price">${invoice.total_ttc.toFixed(2)} €</span>
            </div>
            <div class="quantity-line">${meals.count}x ${(invoice.total_ttc / meals.count).toFixed(2)} €</div>
          ` : items.map((item: any) => {
            const totalItem = item.price * item.quantity;
            return `
              <div class="item-line">
                <span class="item-name">${item.menu_item?.name || 'Article'}</span>
                <span class="item-price">${totalItem.toFixed(2)} €</span>
              </div>
            `;
          }).join('')}
        </div>

        <div class="totals-section">
          <div class="total-line">
            <span>Sous-total HT:</span>
            <span>${invoice.subtotal_ht.toFixed(2)} €</span>
          </div>
          <div class="total-line">
            <span>TVA (${(invoice.tax_rate * 100).toFixed(0)}%):</span>
            <span>${invoice.tax_amount.toFixed(2)} €</span>
          </div>
          <div class="total-line final-total">
            <span>TOTAL TTC:</span>
            <span>${invoice.total_ttc.toFixed(2)} €</span>
          </div>
        </div>

        <div class="separator">
          ===============================
        </div>

        <div class="footer">
          <div><strong>Merci pour votre visite !</strong></div>
          ${invoice.restaurant_details ? `
          <div style="margin-top: 10px; text-align: center; border-top: 1px solid #ddd; padding-top: 10px;">
            <div><strong>${invoice.restaurant_details.name || ''}</strong></div>
            ${invoice.restaurant_details.address ? `<div>${invoice.restaurant_details.address}</div>` : ''}
            ${invoice.restaurant_details.city && invoice.restaurant_details.postalCode ? `<div>${invoice.restaurant_details.city} ${invoice.restaurant_details.postalCode}</div>` : ''}
            ${invoice.restaurant_details.phone ? `<div>Tél: ${invoice.restaurant_details.phone}</div>` : ''}
            ${invoice.restaurant_details.email ? `<div>Email: ${invoice.restaurant_details.email}</div>` : ''}
          </div>
          ` : ''}
          <div style="margin-top: 5px;">Matricule Fiscal: ${FISCAL_NUMBER}</div>
          <div style="margin-top: 5px;">Imprimé le ${new Date().toLocaleString('fr-FR')}</div>
        </div>
      </body>
      </html>
    `;
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Brouillon</Badge>;
      case "sent":
        return <Badge variant="default" className="bg-blue-500">Envoyée</Badge>;
      case "paid":
        return <Badge variant="default" className="bg-green-600">Payée</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const InvoiceDetailsModal = () => {
    if (!selectedInvoice) return null;

    const order = selectedInvoice.order;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white dark:bg-gray-900 border-b p-4 flex justify-between items-center">
            <h3 className="text-lg font-semibold">Détails Facture {selectedInvoice.invoice_number}</h3>
            <Button variant="ghost" size="lg" onClick={() => {
              setShowDetails(false);
              pauseWhileActive(false);
            }} className="text-3xl font-bold hover:bg-red-100 dark:hover:bg-red-900/20 h-12 w-12 p-0">×</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* En-tête facture */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">INFORMATIONS CLIENT</h4>
                <div className="space-y-1">
                  <p className="font-semibold">{selectedInvoice.customer_name}</p>
                  {selectedInvoice.customer_email && (
                    <p className="text-sm text-muted-foreground">{selectedInvoice.customer_email}</p>
                  )}
                  {selectedInvoice.company_name && (
                    <p className="text-sm text-muted-foreground"><strong>Société:</strong> {selectedInvoice.company_name}</p>
                  )}
                  {selectedInvoice.vat_number && (
                    <p className="text-sm text-muted-foreground"><strong>N° TVA:</strong> {selectedInvoice.vat_number}</p>
                  )}
                  {order && <p className="text-sm text-muted-foreground">Table {order.table_id}</p>}
                </div>
              </div>
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">DÉTAILS FACTURE</h4>
                <div className="space-y-1">
                  <p><span className="text-muted-foreground">Numéro:</span> {selectedInvoice.invoice_number}</p>
                  <p><span className="text-muted-foreground">Date:</span> {parseISO(selectedInvoice.created_at).toLocaleDateString('fr-FR')}</p>
                  <div><span className="text-muted-foreground">Statut:</span> {getStatusBadge(selectedInvoice.status)}</div>
                  {selectedInvoice.sent_at && (
                    <p><span className="text-muted-foreground">Envoyée le:</span> {parseISO(selectedInvoice.sent_at).toLocaleDateString('fr-FR')}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Articles facturés */}
            {order?.order_items && (
              <div>
                <h4 className="font-medium mb-3">Articles facturés</h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Article</TableHead>
                        <TableHead className="text-right">Prix HT</TableHead>
                        <TableHead className="text-right">Qté</TableHead>
                        <TableHead className="text-right">Total HT</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.order_items.map((item, index) => {
                        const priceHT = item.price / (1 + selectedInvoice.tax_rate);
                        const totalHT = priceHT * item.quantity;
                        return (
                          <TableRow key={index}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.menu_item?.name}</div>
                                <div className="text-sm text-muted-foreground">{item.menu_item?.description}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{priceHT.toFixed(2)} €</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right font-medium">{totalHT.toFixed(2)} €</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Totaux */}
            <div className="border-t pt-4">
              <div className="max-w-sm ml-auto space-y-2">
                <div className="flex justify-between">
                  <span>Sous-total HT:</span>
                  <span>{selectedInvoice.subtotal_ht.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span>TVA ({(selectedInvoice.tax_rate * 100).toFixed(0)}%):</span>
                  <span>{selectedInvoice.tax_amount.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total TTC:</span>
                  <span>{selectedInvoice.total_ttc.toFixed(2)} €</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button 
                onClick={() => sendInvoiceByEmail(selectedInvoice)}
                disabled={!selectedInvoice.customer_email}
                className="flex-1"
              >
                <Mail className="mr-2 h-4 w-4" />
                {selectedInvoice.status === 'sent' ? 'Renvoyer' : 'Envoyer'} par email
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => downloadInvoicePDF(selectedInvoice)}
              >
                <Printer className="mr-2 h-4 w-4" />
                Imprimer facture
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const filteredInvoices = filterInvoices(invoices);

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <Card className="border-0 shadow-lg">
        <CardHeader className="space-y-3 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between sm:block">
                  <CardTitle className="text-lg sm:text-xl lg:text-2xl">Facturation Pro</CardTitle>
                  <MobileThemeToggle />
                </div>
                <CardDescription className="text-xs sm:text-sm lg:text-base hidden sm:block">
                  Gestion et consultation des factures avec TVA détaillée
                </CardDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button onClick={fetchInvoices} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Actualiser</span>
              </Button>
            </div>
          </div>
          
          {/* Filtres */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Input
                  type="text"
                  placeholder="Rechercher facture, client..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-[250px]"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous statuts</SelectItem>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="sent">Envoyées</SelectItem>
                    <SelectItem value="paid">Payées</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="text-xs sm:text-sm text-muted-foreground text-center lg:text-right">
              {filteredInvoices.length} facture{filteredInvoices.length > 1 ? 's' : ''} / {invoices.length} total
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground">Chargement des factures...</p>
              </div>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' 
                  ? "Aucune facture ne correspond à vos critères"
                  : "Aucune facture générée pour le moment"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Numéro</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="hidden md:table-cell">Commande</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Total TTC</TableHead>
                    <TableHead className="hidden lg:table-cell">Date</TableHead>
                    <TableHead className="w-[160px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow 
                      key={invoice.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-900/50 cursor-pointer"
                      onClick={() => {
                        setSelectedInvoice(invoice);
                        setShowDetails(true);
                        pauseWhileActive(true);
                      }}
                    >
                      <TableCell className="font-medium text-xs sm:text-sm">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-xs sm:text-sm">{invoice.customer_name}</div>
                          {invoice.customer_email && (
                            <div className="text-xs text-muted-foreground">{invoice.customer_email}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs">
                        {invoice.order?.short_id || invoice.order?.id.substring(0, 6) || 'N/A'}
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {invoice.total_ttc.toFixed(2)} €
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs">
                        {parseISO(invoice.created_at).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedInvoice(invoice);
                              setShowDetails(true);
                              pauseWhileActive(true);
                            }}
                          >
                            <Eye className="h-3 w-3 sm:mr-1" />
                            <span className="hidden sm:inline">Voir</span>
                          </Button>
                          {invoice.customer_email && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                sendInvoiceByEmail(invoice);
                              }}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                              <Mail className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {showDetails && <InvoiceDetailsModal />}
    </div>
  );
}