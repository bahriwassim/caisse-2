"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  QrCode, 
  Printer, 
  Download, 
  Settings, 
  Table as TableIcon,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import Image from "next/image";

interface QRCodeData {
  tableNumber: number;
  qrCodeUrl: string;
  url: string;
}

export default function QrGeneratorPage() {
  const [startTable, setStartTable] = useState(1);
  const [endTable, setEndTable] = useState(10);
  const [baseUrl, setBaseUrl] = useState("");
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPreview, setCurrentPreview] = useState<number | null>(null);

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const generateQrCodes = async () => {
    if (!baseUrl || startTable > endTable) return;
    
    setIsGenerating(true);
    const newQrCodes: QRCodeData[] = [];
    
    for (let i = startTable; i <= endTable; i++) {
      const url = `${baseUrl}/table/${i}`;
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}&format=png&margin=10`;
      
      newQrCodes.push({
        tableNumber: i,
        qrCodeUrl: qrApiUrl,
        url: url
      });
    }
    
    setQrCodes(newQrCodes);
    setIsGenerating(false);
  };

  const handlePrintSingle = (tableNumber: number) => {
    const qrCode = qrCodes.find(qr => qr.tableNumber === tableNumber);
    if (!qrCode) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - Table ${tableNumber}</title>
            <style>
              @media print {
                body { margin: 0; }
                .print-container { 
                  display: flex; 
                  flex-direction: column; 
                  align-items: center; 
                  justify-content: center; 
                  height: 100vh; 
                  font-family: Arial, sans-serif;
                }
                .table-info {
                  text-align: center;
                  margin-bottom: 20px;
                }
                .table-number {
                  font-size: 3rem;
                  font-weight: bold;
                  color: #1f2937;
                  margin-bottom: 10px;
                }
                .table-subtitle {
                  font-size: 1.2rem;
                  color: #6b7280;
                  margin-bottom: 20px;
                }
                .qr-code {
                  border: 2px solid #e5e7eb;
                  border-radius: 8px;
                  padding: 20px;
                  background: white;
                }
                .instructions {
                  margin-top: 20px;
                  text-align: center;
                  font-size: 0.9rem;
                  color: #6b7280;
                }
              }
            </style>
          </head>
          <body>
            <div class="print-container">
              <div class="table-info">
                <div class="table-number">Table ${tableNumber}</div>
                <div class="table-subtitle">Scannez pour commander</div>
              </div>
              <div class="qr-code">
                <img src="${qrCode.qrCodeUrl}" alt="QR Code pour table ${tableNumber}" width="250" height="250" />
              </div>
              <div class="instructions">
                Placez ce QR code sur votre table pour permettre aux clients de commander
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handlePrintAll = () => {
    if (qrCodes.length === 0) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const qrCodesHtml = qrCodes.map(qr => `
        <div style="page-break-after: always; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: Arial, sans-serif;">
          <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size: 3rem; font-weight: bold; color: #1f2937; margin-bottom: 10px;">Table ${qr.tableNumber}</div>
            <div style="font-size: 1.2rem; color: #6b7280; margin-bottom: 20px;">Scannez pour commander</div>
          </div>
          <div style="border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; background: white;">
            <img src="${qr.qrCodeUrl}" alt="QR Code pour table ${qr.tableNumber}" width="250" height="250" />
          </div>
          <div style="margin-top: 20px; text-align: center; font-size: 0.9rem; color: #6b7280;">
            Placez ce QR code sur votre table pour permettre aux clients de commander
          </div>
        </div>
      `).join('');
      
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Codes - Tables ${startTable} à ${endTable}</title>
            <style>
              @media print {
                body { margin: 0; }
              }
            </style>
          </head>
          <body>
            ${qrCodesHtml}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const downloadAllQRCodes = () => {
    qrCodes.forEach(qr => {
      const link = document.createElement('a');
      link.href = qr.qrCodeUrl;
      link.download = `qr-code-table-${qr.tableNumber}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const nextPreview = () => {
    if (currentPreview === null) setCurrentPreview(0);
    else if (currentPreview < qrCodes.length - 1) setCurrentPreview(currentPreview + 1);
  };

  const prevPreview = () => {
    if (currentPreview === null) setCurrentPreview(0);
    else if (currentPreview > 0) setCurrentPreview(currentPreview - 1);
  };

  return (
    <div className="space-y-6 p-6">
      <Card className="border-0 shadow-lg">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <QrCode className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Générateur de QR Codes</CardTitle>
          </div>
          <CardDescription className="text-base">
            Générez et imprimez des codes QR pour vos tables en séquence.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configuration */}
          <div className="grid md:grid-cols-2 gap-6 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="space-y-4">
              <div>
                <Label htmlFor="start-table" className="text-sm font-semibold">Table de début</Label>
                <Input
                  id="start-table"
                  type="number"
                  value={startTable}
                  onChange={(e) => setStartTable(parseInt(e.target.value) || 1)}
                  min="1"
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="end-table" className="text-sm font-semibold">Table de fin</Label>
                <Input
                  id="end-table"
                  type="number"
                  value={endTable}
                  onChange={(e) => setEndTable(parseInt(e.target.value) || 1)}
                  min={startTable}
                  className="mt-2"
                />
              </div>
              <div className="pt-2">
                <Badge variant="secondary" className="text-sm">
                  <TableIcon className="h-3 w-3 mr-1" />
                  {endTable - startTable + 1} tables à générer
                </Badge>
              </div>
            </div>
            
            <div className="space-y-4">
              <Button 
                onClick={generateQrCodes} 
                disabled={isGenerating || startTable > endTable}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Génération...
                  </>
                ) : (
                  <>
                    <QrCode className="mr-2 h-4 w-4" />
                    Générer les QR Codes
                  </>
                )}
              </Button>
              
              {qrCodes.length > 0 && (
                <div className="space-y-2">
                  <Button 
                    onClick={handlePrintAll} 
                    variant="outline" 
                    className="w-full"
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimer tous les QR Codes
                  </Button>
                  <Button 
                    onClick={downloadAllQRCodes} 
                    variant="outline" 
                    className="w-full"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Télécharger tous les QR Codes
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Aperçu des QR Codes */}
          {qrCodes.length > 0 && (
            <div className="space-y-4">
              <Separator />
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Aperçu des QR Codes</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={prevPreview}
                    disabled={currentPreview === null || currentPreview === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {currentPreview !== null ? `${currentPreview + 1} / ${qrCodes.length}` : 'Aperçu'}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={nextPreview}
                    disabled={currentPreview === null || currentPreview === qrCodes.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {qrCodes.map((qr, index) => (
                  <Card 
                    key={qr.tableNumber} 
                    className={`relative overflow-hidden border-2 transition-all duration-200 ${
                      currentPreview === index ? 'border-primary shadow-lg' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <CardHeader className="text-center pb-2">
                      <CardTitle className="text-xl text-primary">Table {qr.tableNumber}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-3">
                      <div className="mx-auto w-48 h-48 relative">
                        <Image
                          src={qr.qrCodeUrl}
                          alt={`QR Code pour la table ${qr.tableNumber}`}
                          fill
                          className="object-contain"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground break-all">{qr.url}</p>
                      <Button 
                        onClick={() => handlePrintSingle(qr.tableNumber)}
                        variant="outline" 
                        size="sm"
                        className="w-full"
                      >
                        <Printer className="mr-2 h-3 w-3" />
                        Imprimer
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
