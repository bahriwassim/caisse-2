"use client"

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Mail, Clock, Building, Hash } from "lucide-react";
import { useEnhancedToast } from "@/hooks/use-enhanced-toast";
import type { Order } from "@/lib/types";

interface InvoiceRequestProps {
  order: Order;
  className?: string;
  onDialogOpenChange?: (open: boolean) => void;
}

export function InvoiceRequest({ order, className, onDialogOpenChange }: InvoiceRequestProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    companyName: '',
    vatNumber: ''
  });
  const [invoiceType, setInvoiceType] = useState<"detailed" | "simple">("detailed");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogKey, setDialogKey] = useState(0); // Force re-render key
  const enhancedToast = useEnhancedToast();

  // Empêcher la fermeture brutale lors des re-renders
  const [wasOpen, setWasOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(isOpen);

  // Maintenir la référence de l'état d'ouverture
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Protéger contre les re-renders du composant parent
  useEffect(() => {
    if (isOpenRef.current) {
      // Si le dialog était ouvert et que le composant se re-render, le maintenir ouvert
      const timer = setTimeout(() => {
        if (isOpenRef.current && !isOpen) {
          setIsOpen(true);
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [order.id]); // Surveille les changements du order qui pourraient causer un re-render

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!formData.email.trim()) {
      enhancedToast.warning("Email requis", "Veuillez saisir votre adresse email");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Générer la facture avec les informations de société
      const generateResponse = await fetch('/api/invoices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          customerEmail: formData.email,
          companyName: formData.companyName || null,
          vatNumber: formData.vatNumber || null,
          invoiceType: invoiceType
        })
      });

      const generateData = await generateResponse.json();

      if (!generateResponse.ok) {
        throw new Error(generateData.error || 'Erreur lors de la génération');
      }

      // Envoyer la facture par email
      const sendResponse = await fetch('/api/invoices/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: generateData.invoice.id,
          recipientEmail: formData.email
        })
      });

      const sendData = await sendResponse.json();

      if (!sendResponse.ok) {
        throw new Error(sendData.error || 'Erreur lors de l\'envoi');
      }

      enhancedToast.success(
        "Facture envoyée !",
        `Votre facture ${generateData.invoice.invoice_number} a été envoyée à ${formData.email}`,
        { duration: 6000 }
      );

      // Fermer le dialog sans réinitialiser (sera fait dans handleDialogOpenChange)
      setIsOpen(false);
      setWasOpen(false);
      onDialogOpenChange?.(false);

    } catch (error: any) {
      enhancedToast.error(
        "Erreur",
        error.message || "Impossible de traiter votre demande de facture"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const TAX_RATE = 0.10;
  const totalTTC = order.total;
  const subtotalHT = totalTTC / (1 + TAX_RATE);
  const taxAmount = totalTTC - subtotalHT;

  // Calcul du nombre de repas pour facture simple
  const calculateMeals = (total: number) => {
    if (total <= 50) {
      return { count: 1, description: "1 Repas" };
    } else {
      return { count: 2, description: "2 Repas" };
    }
  };

  const meals = calculateMeals(totalTTC);

  const handleDialogOpenChange = (open: boolean) => {
    console.log('Dialog open change:', open, 'was open:', wasOpen);
    
    // Si le dialog était ouvert et qu'on essaie de le fermer de force, on l'empêche
    if (wasOpen && !open && (isSubmitting || formData.email.trim())) {
      console.log('Preventing forced close - form has data or is submitting');
      return;
    }
    
    setIsOpen(open);
    setWasOpen(open);
    onDialogOpenChange?.(open);
    
    if (!open) {
      // Reset form seulement lors de fermeture intentionnelle
      setFormData({ email: '', companyName: '', vatNumber: '' });
      setDialogKey(prev => prev + 1);
    }
  };

  return (
    <Dialog key={dialogKey} open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button 
          type="button"
          variant="outline" 
          className={`gap-2 ${className}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDialogOpenChange(true);
          }}
        >
          <FileText className="h-4 w-4" />
          Demander une facture
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Demande de facture
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Récapitulatif commande */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Récapitulatif de votre commande</CardTitle>
              <CardDescription className="text-sm">
                Commande #{order.short_id || order.id.substring(0, 6)} • {new Date(order.created_at).toLocaleDateString('fr-FR')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Client:</span>
                  <div className="font-medium">{order.customer}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Table:</span>
                  <div className="font-medium">{order.table_id}</div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2 bg-gray-50 p-3 rounded-lg text-sm">
                <h4 className="font-medium">Détail TVA (10%)</h4>
                <div className="grid grid-cols-2 gap-2">
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
                    <div className="font-bold text-base">{totalTTC.toFixed(2)} €</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Type de facture */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Type de facture</CardTitle>
              <CardDescription className="text-sm">
                Choisissez le niveau de détail souhaité pour votre facture
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="invoice-type">Type de facture</Label>
                <Select 
                  value={invoiceType} 
                  onValueChange={(value: "detailed" | "simple") => setInvoiceType(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir le type de facture" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="detailed">
                      Facture détaillée - Tous les articles commandés
                    </SelectItem>
                    <SelectItem value="simple">
                      Facture simple - {meals.count} repas (≤50€ = 1 repas, >50€ = 2 repas)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Formulaire de demande */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Informations de facturation</CardTitle>
              <CardDescription className="text-sm">
                Remplissez ces informations pour recevoir votre facture
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Adresse email *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre-email@exemple.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company" className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Nom de l'entreprise (optionnel)
                  </Label>
                  <Input
                    id="company"
                    type="text"
                    placeholder="Votre entreprise SARL"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vat" className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Numéro de TVA (optionnel)
                  </Label>
                  <Input
                    id="vat"
                    type="text"
                    placeholder="FR12345678901"
                    value={formData.vatNumber}
                    onChange={(e) => handleInputChange('vatNumber', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Format : FR suivi de 11 chiffres
                  </p>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setWasOpen(false);
                      setIsOpen(false);
                      onDialogOpenChange?.(false);
                    }}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit"
                    disabled={isSubmitting || !formData.email.trim()}
                    className="flex-1"
                  >
                    {isSubmitting ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        Envoi...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Envoyer la facture
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Votre facture sera générée et envoyée immédiatement à l'adresse indiquée
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}