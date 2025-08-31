"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { useEnhancedToast } from "@/hooks/use-enhanced-toast";
import { 
  Play, 
  Pause, 
  Settings, 
  Lock, 
  AlertTriangle,
  CheckCircle 
} from "lucide-react";

interface SystemStatus {
  ordersEnabled: boolean;
  pausedAt: string | null;
  pausedReason: string;
}

export default function SystemStatusControl() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    ordersEnabled: true,
    pausedAt: null,
    pausedReason: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'pause' | 'activate' | null>(null);
  const { toast } = useToast();
  const enhancedToast = useEnhancedToast();

  // Fetch current system status
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/system/status');
      if (response.ok) {
        const status = await response.json();
        setSystemStatus(status);
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

  const handleStatusChange = async () => {
    if (!pendingAction || !password) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/system/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: pendingAction,
          password: password
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSystemStatus(data.status);
        enhancedToast.success("Succès", data.message, { duration: 3000, position: 'top-left' });
        setIsDialogOpen(false);
        setPassword('');
        setPendingAction(null);
      } else {
        enhancedToast.error("Erreur", data.error || "Une erreur est survenue", { position: 'top-left' });
      }
    } catch (error) {
      enhancedToast.error("Erreur", "Impossible de modifier le statut du système", { position: 'top-left' });
    } finally {
      setIsLoading(false);
    }
  };

  const openDialog = (action: 'pause' | 'activate') => {
    setPendingAction(action);
    setPassword('');
    setIsDialogOpen(true);
  };

  return (
    <div className="flex items-center gap-3">
      {/* Status indicator */}
      <div className="flex items-center gap-2">
        <Badge 
          variant={systemStatus.ordersEnabled ? "default" : "destructive"}
          className={systemStatus.ordersEnabled 
            ? "bg-green-600 text-white" 
            : "bg-red-600 text-white"
          }
        >
          {systemStatus.ordersEnabled ? (
            <>
              <CheckCircle className="mr-1 h-3 w-3" />
              Commandes Actives
            </>
          ) : (
            <>
              <AlertTriangle className="mr-1 h-3 w-3" />
              Commandes en Pause
            </>
          )}
        </Badge>
        {systemStatus.pausedAt && (
          <span className="text-xs text-muted-foreground">
            Depuis {new Date(systemStatus.pausedAt).toLocaleTimeString('fr-FR')}
          </span>
        )}
      </div>

      {/* Control buttons */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <div className="flex gap-1">
          {systemStatus.ordersEnabled ? (
            <DialogTrigger asChild>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => openDialog('pause')}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Pause className="mr-1 h-4 w-4" />
                Mettre en Pause
              </Button>
            </DialogTrigger>
          ) : (
            <DialogTrigger asChild>
              <Button 
                variant="default" 
                size="sm"
                onClick={() => openDialog('activate')}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="mr-1 h-4 w-4" />
                Réactiver
              </Button>
            </DialogTrigger>
          )}
        </div>

        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              {pendingAction === 'pause' ? 'Mettre en pause' : 'Réactiver'} les commandes
            </DialogTitle>
            <DialogDescription>
              {pendingAction === 'pause' 
                ? 'Les clients verront un message les informant que les commandes sont temporairement suspendues.'
                : 'Les clients pourront à nouveau passer des commandes normalement.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="password">Mot de passe de sécurité</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Entrez le mot de passe"
                onKeyDown={(e) => e.key === 'Enter' && handleStatusChange()}
              />
              <span className="text-xs text-muted-foreground">
                Saisir le code de sécurité pour confirmer l'action
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
              onClick={handleStatusChange}
              disabled={isLoading || !password}
              className={pendingAction === 'pause' 
                ? "bg-orange-600 hover:bg-orange-700" 
                : "bg-green-600 hover:bg-green-700"
              }
            >
              {isLoading ? "..." : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}