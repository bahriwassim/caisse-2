"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Mail, Download, Calculator, Clock, Eye, CheckCircle } from "lucide-react";
import { useEnhancedToast } from "@/hooks/use-enhanced-toast";
import type { FullOrder, Invoice } from "@/lib/types";

interface InvoiceGeneratorProps {
  order: FullOrder;
  onInvoiceGenerated?: (invoice: Invoice) => void;
}

export function InvoiceGenerator({ order, onInvoiceGenerated }: InvoiceGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customerEmail, setCustomerEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [existingInvoice, setExistingInvoice] = useState<Invoice | null>(null);
  const [generatedInvoice, setGeneratedInvoice] = useState<Invoice | null>(null);
  const [invoiceType, setInvoiceType] = useState<"detailed" | "simple">("detailed");
  const enhancedToast = useEnhancedToast();

  const TAX_RATE = 0.10;
  const FISCAL_NUMBER = "FR123456789012"; // Remplacez par votre matricule fiscal
  const totalTTC = order.total;
  const subtotalHT = totalTTC / (1 + TAX_RATE);
  const taxAmount = totalTTC - subtotalHT;

  // Calcul du nombre de repas pour facture simple
  const calculateMeals = (total: number) => {
    if (total <= 50) {
      return { count: 1, description: "Repas" };
    } else {
      return { count: 2, description: "Repas" };
    }
  };

  // Fonction pour vérifier si une facture existe déjà
  const checkExistingInvoice = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/invoices/by-order/${order.id}`);
      const data = await response.json();
      
      if (response.ok && data.invoice) {
        setExistingInvoice(data.invoice);
        setGeneratedInvoice(data.invoice);
        // Pré-remplir les champs si la facture existe
        setCustomerEmail(data.invoice.customer_email || "");
        setCompanyName(data.invoice.company_name || "");
        setVatNumber(data.invoice.vat_number || "");
        setInvoiceType(data.invoice.invoice_type || "detailed");
      } else {
        setExistingInvoice(null);
        setGeneratedInvoice(null);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de facture:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Vérifier au montage du composant
  useEffect(() => {
    checkExistingInvoice();
  }, [order.id]);

  const generateInvoice = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/invoices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          customerEmail: customerEmail || null,
          companyName: companyName || null,
          vatNumber: vatNumber || null,
          invoiceType: invoiceType
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la génération');
      }

      setGeneratedInvoice(data.invoice);
      onInvoiceGenerated?.(data.invoice);
      
      enhancedToast.success(
        "Facture générée", 
        `Facture ${data.invoice.invoice_number} créée avec succès`,
        { duration: 5000 }
      );

    } catch (error: any) {
      enhancedToast.error(
        "Erreur",
        error.message || "Impossible de générer la facture"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const sendInvoiceByEmail = async () => {
    if (!generatedInvoice || !customerEmail.trim()) {
      enhancedToast.warning("Email requis", "Veuillez saisir une adresse email");
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch('/api/invoices/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: generatedInvoice.id,
          recipientEmail: customerEmail
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'envoi');
      }

      enhancedToast.success(
        "Facture envoyée", 
        `Facture envoyée avec succès à ${customerEmail}`,
        { duration: 5000 }
      );

      setIsOpen(false);
      setGeneratedInvoice(null);
      setCustomerEmail("");

    } catch (error: any) {
      enhancedToast.error(
        "Erreur d'envoi",
        error.message || "Impossible d'envoyer la facture"
      );
    } finally {
      setIsSending(false);
    }
  };

  // Détermine l'apparence du bouton selon l'état de la facture
  const getButtonAppearance = () => {
    if (isLoading) {
      return {
        icon: <Clock className="h-4 w-4 animate-spin" />,
        text: "Vérification...",
        variant: "outline" as const,
        className: "gap-2"
      };
    }
    
    if (existingInvoice) {
      return {
        icon: <CheckCircle className="h-4 w-4" />,
        text: `Facture ${existingInvoice.invoice_number}`,
        variant: "default" as const,
        className: "gap-2 bg-green-600 hover:bg-green-700 text-white"
      };
    }
    
    return {
      icon: <FileText className="h-4 w-4" />,
      text: "Générer Facture",
      variant: "outline" as const,
      className: "gap-2"
    };
  };

  const buttonProps = getButtonAppearance();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={buttonProps.variant} 
          size="sm" 
          className={buttonProps.className}
          disabled={isLoading}
        >
          {buttonProps.icon}
          {buttonProps.text}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {existingInvoice ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                Facture {existingInvoice.invoice_number} - Commande #{order.short_id || order.id.substring(0, 6)}
              </>
            ) : (
              <>
                <FileText className="h-5 w-5" />
                Facturation Pro - Commande #{order.short_id || order.id.substring(0, 6)}
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Aperçu de la commande */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Détails de la commande</CardTitle>
              <CardDescription>
                Client: {order.customer} • Table {order.table_id} • {new Date(order.created_at).toLocaleDateString('fr-FR')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Articles */}
              <div className="space-y-2">
                <h4 className="font-medium">Articles commandés:</h4>
                {order.order_items?.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <div className="flex-1">
                      <span className="font-medium">{item.menu_item?.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">×{item.quantity}</span>
                    </div>
                    <span className="font-medium">{(item.price * item.quantity).toFixed(2)} €</span>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Calculs TVA */}
              <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Détail TVA (10%)
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Sous-total HT:</span>
                    <div className="font-medium">{subtotalHT.toFixed(2)} €</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">TVA (10%):</span>
                    <div className="font-medium">{taxAmount.toFixed(2)} €</div>
                  </div>
                  <div className="col-span-2 border-t pt-2">
                    <span className="text-muted-foreground">Total TTC:</span>
                    <div className="font-bold text-lg">{totalTTC.toFixed(2)} €</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions de facturation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Génération de facture</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invoice-type">Type de facture</Label>
                <Select 
                  value={invoiceType} 
                  onValueChange={(value: "detailed" | "simple") => setInvoiceType(value)}
                  disabled={!!existingInvoice}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir le type de facture" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="detailed">
                      Facture détaillée - Tous les articles
                    </SelectItem>
                    <SelectItem value="simple">
                      Facture simple - {calculateMeals(totalTTC).count} repas (≤50€ = 1 repas, >50€ = 2 repas)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer-email">Email client</Label>
                  <Input
                    id="customer-email"
                    type="email"
                    placeholder="client@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    disabled={!!existingInvoice}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="company-name">Nom de société (optionnel)</Label>
                  <Input
                    id="company-name"
                    type="text"
                    placeholder="Entreprise SARL"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={!!existingInvoice}
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="vat-number">Numéro de TVA (optionnel)</Label>
                  <Input
                    id="vat-number"
                    type="text"
                    placeholder="FR12345678901"
                    value={vatNumber}
                    onChange={(e) => setVatNumber(e.target.value)}
                    disabled={!!existingInvoice}
                  />
                  <p className="text-xs text-muted-foreground">
                    Format : FR suivi de 11 chiffres
                  </p>
                </div>
              </div>

              {existingInvoice && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-blue-900">
                        Facture existante trouvée
                      </p>
                      <p className="text-sm text-blue-700 mt-1">
                        Cette commande possède déjà la facture <strong>{existingInvoice.invoice_number}</strong> 
                        créée le {new Date(existingInvoice.created_at).toLocaleString('fr-FR')}.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!existingInvoice && !generatedInvoice ? (
                <Button 
                  onClick={generateInvoice} 
                  disabled={isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Générer la facture
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-green-900">
                          Facture générée: {generatedInvoice.invoice_number}
                        </p>
                        <p className="text-sm text-green-700">
                          {new Date(generatedInvoice.created_at).toLocaleString('fr-FR')}
                        </p>
                        {(generatedInvoice.company_name || generatedInvoice.vat_number) && (
                          <div className="mt-2 text-sm text-green-700">
                            {generatedInvoice.company_name && (
                              <p><strong>Société:</strong> {generatedInvoice.company_name}</p>
                            )}
                            {generatedInvoice.vat_number && (
                              <p><strong>N° TVA:</strong> {generatedInvoice.vat_number}</p>
                            )}
                          </div>
                        )}
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-800 ml-3">
                        {generatedInvoice.status === 'draft' ? 'Brouillon' : 
                         generatedInvoice.status === 'sent' ? 'Envoyée' : 'Payée'}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    <Button 
                      onClick={sendInvoiceByEmail}
                      disabled={isSending || !customerEmail.trim()}
                      variant={customerEmail.trim() ? "default" : "secondary"}
                      className="w-full"
                    >
                      {isSending ? (
                        <>
                          <Clock className="mr-2 h-4 w-4 animate-spin" />
                          Envoi...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          {existingInvoice?.status === 'sent' ? 'Renvoyer' : 'Envoyer'}
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.open(`/admin/invoices`, '_blank')}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Visualiser
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.print()}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Imprimer
                    </Button>
                  </div>

                  {!customerEmail.trim() && (
                    <p className="text-xs text-orange-600 text-center">
                      ⚠️ Saisissez un email pour activer l'envoi
                    </p>
                  )}

                  {existingInvoice && (
                    <div className="text-xs text-muted-foreground text-center">
                      💡 Vous pouvez aussi consulter cette facture dans la section 
                      <button 
                        onClick={() => window.open('/admin/invoices', '_blank')}
                        className="text-blue-600 hover:underline ml-1"
                      >
                        Gestion des Factures
                      </button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}