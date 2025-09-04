"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Mail, Clock, Building, Hash, Calculator, ArrowLeft } from "lucide-react";
import { useEnhancedToast } from "@/hooks/use-enhanced-toast";
import { supabase } from "@/lib/supabase";
import type { FullOrder } from "@/lib/types";

interface InvoiceRequestPageProps {
  params: Promise<{ orderId: string }>;
}

export default function InvoiceRequestPage({ params }: InvoiceRequestPageProps) {
  const router = useRouter();
  const [order, setOrder] = useState<FullOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    companyName: '',
    vatNumber: ''
  });
  const [invoiceType, setInvoiceType] = useState<"detailed" | "simple">("detailed");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const enhancedToast = useEnhancedToast();

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const resolvedParams = await params;
        const { data: orderData, error } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (
              *,
              menu_item:menu_items(*)
            )
          `)
          .eq('id', resolvedParams.orderId)
          .single();

        if (error || !orderData) {
          throw new Error('Commande introuvable');
        }

        // Vérifier que la commande est bien livrée
        if (orderData.status !== 'delivered') {
          throw new Error('La facture ne peut être générée que pour une commande livrée');
        }

        setOrder(orderData as FullOrder);
      } catch (error: any) {
        console.error('Erreur lors du chargement de la commande:', error);
        enhancedToast.error("Erreur", error.message || "Impossible de charger la commande");
        // Rediriger vers la table après 3 secondes
        setTimeout(() => {
          router.push(`/table/${orderData?.table_id || '1'}`);
        }, 3000);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [params, enhancedToast, router]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email.trim()) {
      enhancedToast.warning("Email requis", "Veuillez saisir votre adresse email");
      return;
    }

    if (!order) {
      enhancedToast.error("Erreur", "Commande introuvable");
      return;
    }

    setIsSubmitting(true);
    
    try {
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
        { duration: 8000 }
      );

      // Rediriger vers la table après 3 secondes
      setTimeout(() => {
        router.push(`/table/${order.table_id}`);
      }, 3000);

    } catch (error: any) {
      enhancedToast.error(
        "Erreur",
        error.message || "Impossible de traiter votre demande de facture"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoBack = () => {
    if (order) {
      router.push(`/table/${order.table_id}`);
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Chargement de votre commande...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto" />
              <div>
                <h2 className="text-lg font-semibold">Commande introuvable</h2>
                <p className="text-muted-foreground text-sm mt-2">
                  Redirection en cours...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* En-tête avec bouton retour */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Demande de facture
            </h1>
            <p className="text-muted-foreground text-sm">
              Générez et recevez votre facture par email
            </p>
          </div>
        </div>

        {/* Récapitulatif commande */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Récapitulatif de votre commande</CardTitle>
            <CardDescription>
              Commande #{order.short_id || order.id.substring(0, 6)} • {new Date(order.created_at).toLocaleDateString('fr-FR')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <div className="space-y-3 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="font-medium flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Détail TVA (10%)
              </h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
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

        {/* Type de facture */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Type de facture</CardTitle>
            <CardDescription>
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
          <CardHeader>
            <CardTitle className="text-lg">Informations de facturation</CardTitle>
            <CardDescription>
              Remplissez ces informations pour recevoir votre facture
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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
                  className="w-full"
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
                  className="w-full"
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
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Format : FR suivi de 11 chiffres
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoBack}
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
    </div>
  );
}