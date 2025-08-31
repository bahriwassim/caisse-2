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
  ChevronRight,
  Check
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from "next/image";

interface QRCodeData {
  tableNumber: number;
  qrCodeUrl: string;
  url: string;
  selected?: boolean;
}

export default function QrGeneratorPage() {
  const [startTable, setStartTable] = useState(1);
  const [endTable, setEndTable] = useState(10);
  const [baseUrl, setBaseUrl] = useState("");
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentPreview, setCurrentPreview] = useState<number | null>(null);
  const [selectedQrCodes, setSelectedQrCodes] = useState<Set<number>>(new Set());
  const [qrCodesPerPage, setQrCodesPerPage] = useState(1);

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
    setSelectedQrCodes(new Set());
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
                <div class="table-subtitle">Scanne-moi pour passer une commande</div>
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
            <div style="font-size: 1.2rem; color: #6b7280; margin-bottom: 20px;">Scanne-moi pour passer une commande</div>
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

  const toggleQrSelection = (tableNumber: number) => {
    setSelectedQrCodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tableNumber)) {
        newSet.delete(tableNumber);
      } else {
        newSet.add(tableNumber);
      }
      return newSet;
    });
  };

  const toggleAllSelection = () => {
    if (selectedQrCodes.size === qrCodes.length) {
      setSelectedQrCodes(new Set());
    } else {
      setSelectedQrCodes(new Set(qrCodes.map(qr => qr.tableNumber)));
    }
  };

  const generateMultiQrPageHtml = (qrCodesForPage: QRCodeData[]) => {
    const gridClass = qrCodesPerPage === 1 ? 'single-qr' : 
                     qrCodesPerPage === 2 ? 'double-qr' : 
                     qrCodesPerPage === 4 ? 'quad-qr' : 
                     qrCodesPerPage === 6 ? 'six-qr' : 'eight-qr';
    
    return `
      <div class="page ${gridClass}">
        ${qrCodesForPage.map(qr => `
          <div class="qr-item">
            <div class="table-info">
              <div class="table-number">Table ${qr.tableNumber}</div>
              <div class="table-subtitle">Scanne-moi pour passer une commande</div>
            </div>
            <div class="qr-code">
              <img src="${qr.qrCodeUrl}" alt="QR Code pour table ${qr.tableNumber}" />
            </div>
            <div class="instructions">
              Placez ce QR code sur votre table
            </div>
          </div>
        `).join('')}
      </div>
    `;
  };

  const handlePrintSelected = () => {
    const selectedCodes = qrCodes.filter(qr => selectedQrCodes.has(qr.tableNumber));
    if (selectedCodes.length === 0) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const pages = [];
      for (let i = 0; i < selectedCodes.length; i += qrCodesPerPage) {
        const qrCodesForPage = selectedCodes.slice(i, i + qrCodesPerPage);
        pages.push(generateMultiQrPageHtml(qrCodesForPage));
      }
      
      const pagesHtml = pages.join('');
      
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Codes Sélectionnés</title>
            <style>
              @media print {
                body { margin: 0; }
                .page { 
                  width: 100vw; 
                  height: 100vh; 
                  display: grid;
                  gap: 10px;
                  padding: 20px;
                  box-sizing: border-box;
                  font-family: Arial, sans-serif;
                  page-break-after: always;
                }
                .page:last-child {
                  page-break-after: avoid;
                }
                .single-qr {
                  grid-template-columns: 1fr;
                  place-items: center;
                }
                .double-qr {
                  grid-template-columns: 1fr 1fr;
                  place-items: center;
                }
                .quad-qr {
                  grid-template-columns: 1fr 1fr;
                  grid-template-rows: 1fr 1fr;
                  place-items: center;
                }
                .six-qr {
                  grid-template-columns: 1fr 1fr;
                  grid-template-rows: 1fr 1fr 1fr;
                  place-items: center;
                }
                .eight-qr {
                  grid-template-columns: 1fr 1fr 1fr 1fr;
                  grid-template-rows: 1fr 1fr;
                  place-items: center;
                }
                .qr-item {
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  text-align: center;
                  max-width: 100%;
                  max-height: 100%;
                }
                .table-info {
                  margin-bottom: 8px;
                }
                .table-number {
                  font-size: ${qrCodesPerPage === 1 ? '2.5rem' : qrCodesPerPage <= 4 ? '1.5rem' : '1.2rem'};
                  font-weight: bold;
                  color: #1f2937;
                  margin-bottom: 4px;
                }
                .table-subtitle {
                  font-size: ${qrCodesPerPage === 1 ? '1rem' : qrCodesPerPage <= 4 ? '0.8rem' : '0.6rem'};
                  color: #6b7280;
                  margin-bottom: 8px;
                }
                .qr-code {
                  border: 2px solid #e5e7eb;
                  border-radius: 8px;
                  padding: ${qrCodesPerPage === 1 ? '20px' : qrCodesPerPage <= 4 ? '10px' : '5px'};
                  background: white;
                  margin-bottom: 8px;
                }
                .qr-code img {
                  width: ${qrCodesPerPage === 1 ? '250px' : qrCodesPerPage <= 4 ? '150px' : '100px'};
                  height: ${qrCodesPerPage === 1 ? '250px' : qrCodesPerPage <= 4 ? '150px' : '100px'};
                  display: block;
                }
                .instructions {
                  font-size: ${qrCodesPerPage === 1 ? '0.9rem' : qrCodesPerPage <= 4 ? '0.7rem' : '0.5rem'};
                  color: #6b7280;
                  text-align: center;
                }
              }
            </style>
          </head>
          <body>
            ${pagesHtml}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const downloadSelectedQRCodes = () => {
    const selectedCodes = qrCodes.filter(qr => selectedQrCodes.has(qr.tableNumber));
    selectedCodes.forEach(qr => {
      const link = document.createElement('a');
      link.href = qr.qrCodeUrl;
      link.download = `qr-code-table-${qr.tableNumber}-scanne-moi.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const downloadAllQRCodes = () => {
    qrCodes.forEach(qr => {
      const link = document.createElement('a');
      link.href = qr.qrCodeUrl;
      link.download = `qr-code-table-${qr.tableNumber}-scanne-moi.png`;
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
                  {selectedQrCodes.size > 0 && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="qr-per-page" className="text-sm font-medium">
                          QR codes par page
                        </Label>
                        <Select
                          value={qrCodesPerPage.toString()}
                          onValueChange={(value) => setQrCodesPerPage(parseInt(value))}
                        >
                          <SelectTrigger id="qr-per-page" className="w-full">
                            <SelectValue placeholder="Choisir..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 par page (Grand format)</SelectItem>
                            <SelectItem value="2">2 par page</SelectItem>
                            <SelectItem value="4">4 par page</SelectItem>
                            <SelectItem value="6">6 par page</SelectItem>
                            <SelectItem value="8">8 par page (Compact)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="text-xs text-muted-foreground text-center mb-2">
                        {Math.ceil(selectedQrCodes.size / qrCodesPerPage)} page{Math.ceil(selectedQrCodes.size / qrCodesPerPage) > 1 ? 's' : ''} à imprimer
                      </div>
                      <Button 
                        onClick={handlePrintSelected} 
                        variant="default" 
                        className="w-full"
                      >
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimer la sélection ({selectedQrCodes.size})
                      </Button>
                      <Button 
                        onClick={downloadSelectedQRCodes} 
                        variant="default" 
                        className="w-full"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Télécharger la sélection ({selectedQrCodes.size})
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Aperçu des QR Codes */}
          {qrCodes.length > 0 && (
            <div className="space-y-4">
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-semibold">Aperçu des QR Codes</h3>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={selectedQrCodes.size === qrCodes.length && qrCodes.length > 0}
                      onCheckedChange={toggleAllSelection}
                    />
                    <Label htmlFor="select-all" className="text-sm font-medium">
                      Tout sélectionner
                    </Label>
                    {selectedQrCodes.size > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {selectedQrCodes.size} sélectionné{selectedQrCodes.size > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
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
                      selectedQrCodes.has(qr.tableNumber) 
                        ? 'border-primary bg-primary/5 shadow-lg' 
                        : currentPreview === index 
                        ? 'border-primary shadow-lg' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="absolute top-2 right-2 z-10">
                      <Checkbox
                        checked={selectedQrCodes.has(qr.tableNumber)}
                        onCheckedChange={() => toggleQrSelection(qr.tableNumber)}
                        className="bg-white border-2 shadow-sm"
                      />
                    </div>
                    <CardHeader className="text-center pb-2">
                      <CardTitle className="text-xl text-primary">Table {qr.tableNumber}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-3">
                      <div className="text-sm text-muted-foreground font-medium">
                        Scanne-moi pour passer une commande
                      </div>
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
