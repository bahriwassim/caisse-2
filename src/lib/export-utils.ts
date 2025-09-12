// Import dynamique pour éviter les erreurs côté serveur
let jsPDF: any;
let Papa: any;

// Fonction pour charger jsPDF de manière asynchrone
const loadJsPDF = async () => {
  if (typeof window !== 'undefined') {
    const { default: jsPDFModule } = await import('jspdf');
    await import('jspdf-autotable');
    jsPDF = jsPDFModule;
  }
};

// Fonction pour charger Papa Parse de manière asynchrone
const loadPapa = async () => {
  if (typeof window !== 'undefined') {
    const { default: PapaModule } = await import('papaparse');
    Papa = PapaModule;
  }
};
import type { Order, PaymentMethod } from './types';

export interface ExportData {
  orders: Order[];
  period: string;
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  productStats: {
    productName: string;
    paymentMethod: PaymentMethod;
    quantity: number;
    revenue: number;
  }[];
  topProductQuantities: {
    productName: string;
    quantity: number;
  }[];
}

export interface ExportOptions {
  format: 'pdf' | 'csv';
  period: string;
  includeCharts?: boolean;
  includeProductStats?: boolean;
}

export class DataExporter {
  static async exportToPDF(data: ExportData, options: ExportOptions): Promise<Blob> {
    // Charger jsPDF si pas encore fait
    if (!jsPDF) {
      await loadJsPDF();
    }
    
    if (!jsPDF) {
      throw new Error('jsPDF not available in server environment');
    }
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Configuration des couleurs
    const colors = {
      primary: '#3B82F6',
      secondary: '#6B7280',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      light: '#F9FAFB',
      dark: '#1F2937'
    };

    // En-tête du document
    doc.setFontSize(20);
    doc.setTextColor(colors.primary);
    doc.text('Rapport de Statistiques', 20, 30);
    
    doc.setFontSize(12);
    doc.setTextColor(colors.secondary);
    doc.text(`Période: ${data.period}`, 20, 45);
    doc.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, 20, 55);

    // Statistiques principales
    doc.setFontSize(16);
    doc.setTextColor(colors.dark);
    doc.text('Statistiques Principales', 20, 75);

    const statsData = [
      ['Métrique', 'Valeur'],
      ['Chiffre d\'affaires total', `${data.totalRevenue.toFixed(2)} €`],
      ['Nombre de commandes', data.totalOrders.toString()],
      ['Nombre de clients', data.totalCustomers.toString()],
      ['Panier moyen', data.totalOrders > 0 ? `${(data.totalRevenue / data.totalOrders).toFixed(2)} €` : '0 €']
    ];

    (doc as any).autoTable({
      head: [statsData[0]],
      body: statsData.slice(1),
      startY: 85,
      theme: 'grid',
      headStyles: {
        fillColor: colors.primary,
        textColor: '#FFFFFF',
        fontSize: 12,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 11,
        textColor: colors.dark
      },
      alternateRowStyles: {
        fillColor: colors.light
      }
    });

    // Tableau des commandes récentes
    if (data.orders.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.setTextColor(colors.dark);
      doc.text('Commandes Récentes', 20, 30);

      const ordersData = data.orders.slice(0, 20).map(order => [
        order.id.substring(0, 8) + '...',
        order.status,
        order.payment_method,
        `${order.total.toFixed(2)} €`,
        new Date(order.created_at).toLocaleDateString('fr-FR')
      ]);

      (doc as any).autoTable({
        head: [['ID', 'Statut', 'Paiement', 'Total', 'Date']],
        body: ordersData,
        startY: 40,
        theme: 'grid',
        headStyles: {
          fillColor: colors.primary,
          textColor: '#FFFFFF',
          fontSize: 12,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 10,
          textColor: colors.dark
        },
        alternateRowStyles: {
          fillColor: colors.light
        }
      });
    }

    // Statistiques des produits
    if (options.includeProductStats && data.productStats.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.setTextColor(colors.dark);
      doc.text('Statistiques des Produits', 20, 30);

      const productData = data.productStats.map(stat => [
        stat.productName,
        stat.paymentMethod,
        stat.quantity.toString(),
        `${stat.revenue.toFixed(2)} €`
      ]);

      (doc as any).autoTable({
        head: [['Produit', 'Moyen de Paiement', 'Quantité', 'Revenus']],
        body: productData,
        startY: 40,
        theme: 'grid',
        headStyles: {
          fillColor: colors.success,
          textColor: '#FFFFFF',
          fontSize: 12,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 10,
          textColor: colors.dark
        },
        alternateRowStyles: {
          fillColor: colors.light
        }
      });
    }

    // Top produits par quantité
    if (data.topProductQuantities.length > 0) {
      const currentY = (doc as any).lastAutoTable.finalY || 40;
      const newY = currentY + 20;
      
      doc.setFontSize(14);
      doc.setTextColor(colors.dark);
      doc.text('Top Produits par Quantité', 20, newY);

      const topProductsData = data.topProductQuantities.map(item => [
        item.productName,
        item.quantity.toString()
      ]);

      (doc as any).autoTable({
        head: [['Produit', 'Quantité Vendue']],
        body: topProductsData,
        startY: newY + 10,
        theme: 'grid',
        headStyles: {
          fillColor: colors.warning,
          textColor: '#FFFFFF',
          fontSize: 12,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 10,
          textColor: colors.dark
        },
        alternateRowStyles: {
          fillColor: colors.light
        }
      });
    }

    return doc.output('blob');
  }

  static async exportToCSV(data: ExportData, options: ExportOptions): Promise<Blob> {
    // Charger Papa Parse si pas encore fait
    if (!Papa) {
      await loadPapa();
    }
    
    if (!Papa) {
      throw new Error('Papa Parse not available in server environment');
    }
    
    const csvData: any[] = [];

    // Métadonnées
    csvData.push(['Rapport de Statistiques']);
    csvData.push(['Période', data.period]);
    csvData.push(['Généré le', new Date().toLocaleDateString('fr-FR')]);
    csvData.push([]);

    // Statistiques principales
    csvData.push(['Statistiques Principales']);
    csvData.push(['Métrique', 'Valeur']);
    csvData.push(['Chiffre d\'affaires total', `${data.totalRevenue.toFixed(2)} €`]);
    csvData.push(['Nombre de commandes', data.totalOrders.toString()]);
    csvData.push(['Nombre de clients', data.totalCustomers.toString()]);
    csvData.push(['Panier moyen', data.totalOrders > 0 ? `${(data.totalRevenue / data.totalOrders).toFixed(2)} €` : '0 €']);
    csvData.push([]);

    // Commandes
    if (data.orders.length > 0) {
      csvData.push(['Commandes']);
      csvData.push(['ID', 'Statut', 'Moyen de Paiement', 'Total', 'Date de Création', 'Table', 'Client']);
      
      data.orders.forEach(order => {
        csvData.push([
          order.id,
          order.status,
          order.payment_method,
          order.total.toFixed(2),
          new Date(order.created_at).toLocaleString('fr-FR'),
          order.table_id?.toString() || 'N/A',
          order.customer || 'N/A'
        ]);
      });
      csvData.push([]);
    }

    // Statistiques des produits
    if (options.includeProductStats && data.productStats.length > 0) {
      csvData.push(['Statistiques des Produits']);
      csvData.push(['Produit', 'Moyen de Paiement', 'Quantité', 'Revenus']);
      
      data.productStats.forEach(stat => {
        csvData.push([
          stat.productName,
          stat.paymentMethod,
          stat.quantity.toString(),
          stat.revenue.toFixed(2)
        ]);
      });
      csvData.push([]);
    }

    // Top produits par quantité
    if (data.topProductQuantities.length > 0) {
      csvData.push(['Top Produits par Quantité']);
      csvData.push(['Produit', 'Quantité Vendue']);
      
      data.topProductQuantities.forEach(item => {
        csvData.push([
          item.productName,
          item.quantity.toString()
        ]);
      });
    }

    const csv = Papa.unparse(csvData);
    return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  }

  static downloadFile(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
