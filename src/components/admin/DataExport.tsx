"use client";

import { useState } from "react";
import { Download, FileText, Table, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useExportNotifications } from "@/hooks/use-export-notifications";
import { ClientDataExporter } from "@/lib/client-export-utils";

interface DataExportProps {
  period: string;
  onExportComplete?: () => void;
}

export function DataExport({ period, onExportComplete }: DataExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');
  const [includeProductStats, setIncludeProductStats] = useState(true);
  const { showSuccess, showError, showInfo } = useExportNotifications();

  const handleExport = async () => {
    setIsExporting(true);
    showInfo("Export en cours", `Génération du rapport ${exportFormat.toUpperCase()}...`, exportFormat);
    
    try {
      // Récupérer les données depuis l'API
      const response = await fetch('/api/export/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          period,
          includeProductStats
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des données');
      }

      const exportData = await response.json();

      // Générer le fichier côté client
      if (exportFormat === 'pdf') {
        try {
          await ClientDataExporter.exportToPDF(exportData);
        } catch (pdfError) {
          console.error('PDF generation error:', pdfError);
          throw new Error('Erreur lors de la génération du PDF. Vérifiez que votre navigateur supporte cette fonctionnalité.');
        }
      } else {
        try {
          await ClientDataExporter.exportToCSV(exportData);
        } catch (csvError) {
          console.error('CSV generation error:', csvError);
          throw new Error('Erreur lors de la génération du CSV.');
        }
      }

      showSuccess(
        "Export réussi", 
        `Le rapport ${exportFormat.toUpperCase()} a été téléchargé avec succès`, 
        exportFormat
      );

      onExportComplete?.();

    } catch (error) {
      console.error('Export error:', error);
      showError(
        "Erreur d'export", 
        "Une erreur est survenue lors de l'export des données"
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export des Données
        </CardTitle>
        <CardDescription>
          Téléchargez vos statistiques au format PDF ou CSV
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="format">Format d'export</Label>
            <Select value={exportFormat} onValueChange={(value: 'pdf' | 'csv') => setExportFormat(value)}>
              <SelectTrigger id="format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    PDF
                  </div>
                </SelectItem>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <Table className="h-4 w-4" />
                    CSV
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Période sélectionnée</Label>
            <div className="p-3 bg-muted rounded-md">
              <span className="text-sm font-medium">{period}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="product-stats"
            checked={includeProductStats}
            onCheckedChange={(checked) => setIncludeProductStats(checked as boolean)}
          />
          <Label htmlFor="product-stats" className="text-sm">
            Inclure les statistiques détaillées des produits
          </Label>
        </div>

        <Button 
          onClick={handleExport} 
          disabled={isExporting}
          className="w-full"
        >
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {exportFormat === 'pdf' ? 'Génération du PDF...' : 'Génération du CSV...'}
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Exporter les données
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground">
          <p>• Le PDF inclut des graphiques et une mise en forme professionnelle</p>
          <p>• Le CSV contient toutes les données brutes pour analyse externe</p>
        </div>
      </CardContent>
    </Card>
  );
}
