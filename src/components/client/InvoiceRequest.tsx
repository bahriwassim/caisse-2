"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Clock, Building, Hash, Mail } from "lucide-react";
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
  const enhancedToast = useEnhancedToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

      if (sendData.fallback) {
        enhancedToast.warning(
          "Facture générée mais envoi temporairement indisponible", 
          `Votre facture ${generateData.invoice.invoice_number} a été générée. ${sendData.message}`,
          { duration: 8000 }
        );
        // Ouvrir la facture en PDF comme fallback
        window.open(`/api/invoices/${generateData.invoice.id}/pdf`, '_blank');
      } else {
        enhancedToast.success(
          "Facture envoyée avec succès !", 
          `Votre facture ${generateData.invoice.invoice_number} a été envoyée à ${formData.email}`,
          { duration: 6000 }
        );
      }

      // Fermer le dialog et réinitialiser
      setIsOpen(false);
      onDialogOpenChange?.(false);
      resetDialog();

    } catch (error: any) {
      enhancedToast.error(
        "Erreur lors de la demande de facture",
        error.message || "Une erreur inattendue s'est produite"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetDialog = () => {
    setFormData({ email: '', companyName: '', vatNumber: '' });
    setInvoiceType("detailed");
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onDialogOpenChange?.(open);
    if (!open) {
      resetDialog();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <FileText className="mr-2 h-4 w-4" />
          Demander facture
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Demande de facture
          </DialogTitle>
        </DialogHeader>
        
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Commande #{order.short_id || order.id.substring(0, 6)}</CardTitle>
            <CardDescription>
              Table {order.table_id} • {order.total.toFixed(2)} €
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Type de facture</Label>
                <Select value={invoiceType} onValueChange={(value: "detailed" | "simple") => setInvoiceType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="detailed">Facture détaillée</SelectItem>
                    <SelectItem value="simple">Facture simplifiée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
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
                  <Label htmlFor="companyName" className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Nom de l'entreprise (optionnel)
                  </Label>
                  <Input
                    id="companyName"
                    placeholder="Nom de votre entreprise"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="vatNumber" className="flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Numéro de TVA (optionnel)
                  </Label>
                  <Input
                    id="vatNumber"
                    placeholder="FR12345678901"
                    value={formData.vatNumber}
                    onChange={(e) => handleInputChange('vatNumber', e.target.value)}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => handleOpenChange(false)}>
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
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Envoyer facture
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}