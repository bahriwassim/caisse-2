"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEnhancedToast } from "@/hooks/use-enhanced-toast";
import { 
  Settings2, 
  Lock, 
  CreditCard,
  Coins
} from "lucide-react";

interface PaymentMethods {
  cash: boolean;
  card: boolean;
}

interface SystemStatus {
  ordersEnabled: boolean;
  pausedAt: string | null;
  pausedReason: string;
  paymentMethods: PaymentMethods;
}

export default function PaymentMethodsControl() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    ordersEnabled: true,
    pausedAt: null,
    pausedReason: '',
    paymentMethods: {
      cash: true,
      card: true
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tempPaymentMethods, setTempPaymentMethods] = useState<PaymentMethods>({
    cash: true,
    card: true
  });
  const enhancedToast = useEnhancedToast();

  // Fetch current system status
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/system/status');
      if (response.ok) {
        const status = await response.json();
        setSystemStatus(status);
        setTempPaymentMethods(status.paymentMethods);
      }
    } catch (error) {
      console.error('Error fetching system status:', error);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll status every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handlePaymentMethodsUpdate = async () => {
    if (!password) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/system/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updatePaymentMethods',
          password: password,
          paymentMethods: tempPaymentMethods
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSystemStatus(data.status);
        enhancedToast.success("Succès", "Méthodes de paiement mises à jour", { duration: 3000, position: 'top-left' });
        setIsDialogOpen(false);
        setPassword('');
      } else {
        enhancedToast.error("Erreur", data.error || "Une erreur est survenue", { position: 'top-left' });
      }
    } catch (error) {
      enhancedToast.error("Erreur", "Impossible de modifier les méthodes de paiement", { position: 'top-left' });
    } finally {
      setIsLoading(false);
    }
  };

  const openDialog = () => {
    setTempPaymentMethods(systemStatus.paymentMethods);
    setPassword('');
    setIsDialogOpen(true);
  };

  const handleSwitchChange = (method: keyof PaymentMethods, value: boolean) => {
    setTempPaymentMethods(prev => ({
      ...prev,
      [method]: value
    }));
  };

  const getPaymentMethodsLabel = () => {
    const { cash, card } = systemStatus.paymentMethods;
    if (cash && card) return "Espèces + Carte";
    if (cash && !card) return "Espèces uniquement";
    if (!cash && card) return "Carte uniquement";
    return "Aucune méthode";
  };

  return (
    <div className="flex items-center gap-3">
      {/* Payment methods indicator */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="flex items-center gap-1">
          {systemStatus.paymentMethods.cash && <Coins className="h-3 w-3" />}
          {systemStatus.paymentMethods.card && <CreditCard className="h-3 w-3" />}
          {getPaymentMethodsLabel()}
        </Badge>
      </div>

      {/* Control button */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            onClick={openDialog}
          >
            <Settings2 className="mr-1 h-4 w-4" />
            Paiements
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Configurer les méthodes de paiement
            </DialogTitle>
            <DialogDescription>
              Activez ou désactivez les méthodes de paiement disponibles pour les clients.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-green-600" />
                  <Label htmlFor="cash-switch">Paiement en espèces</Label>
                </div>
                <Switch
                  id="cash-switch"
                  checked={tempPaymentMethods.cash}
                  onCheckedChange={(value) => handleSwitchChange('cash', value)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <Label htmlFor="card-switch">Paiement par carte</Label>
                </div>
                <Switch
                  id="card-switch"
                  checked={tempPaymentMethods.card}
                  onCheckedChange={(value) => handleSwitchChange('card', value)}
                />
              </div>
            </div>

            <div className="grid gap-2 pt-4 border-t">
              <Label htmlFor="password">Mot de passe de sécurité</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Entrez le mot de passe"
                onKeyDown={(e) => e.key === 'Enter' && handlePaymentMethodsUpdate()}
              />
              <span className="text-xs text-muted-foreground">
                Saisir le code de sécurité pour confirmer les modifications
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button 
              onClick={handlePaymentMethodsUpdate}
              disabled={isLoading || !password}
            >
              {isLoading ? "..." : "Appliquer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}