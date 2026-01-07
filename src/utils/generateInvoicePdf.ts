import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { Invoice, defaultCompanyInfo, CompanyInfo } from '@/types';

export function generateInvoicePdf(invoice: Invoice, companyInfo?: CompanyInfo): Blob {
  const company = companyInfo || defaultCompanyInfo;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Helper to add text
  const addText = (text: string, x: number, yPos: number, options?: { fontSize?: number; fontStyle?: 'normal' | 'bold'; align?: 'left' | 'center' | 'right'; maxWidth?: number }) => {
    const fontSize = options?.fontSize || 10;
    const fontStyle = options?.fontStyle || 'normal';
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    
    let xPos = x;
    if (options?.align === 'right') {
      xPos = pageWidth - margin;
    } else if (options?.align === 'center') {
      xPos = pageWidth / 2;
    }
    
    if (options?.maxWidth) {
      doc.text(text, xPos, yPos, { maxWidth: options.maxWidth, align: options?.align || 'left' });
    } else {
      doc.text(text, xPos, yPos, { align: options?.align || 'left' });
    }
  };

  // Header - Company Info
  doc.setFillColor(59, 130, 246); // primary blue
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  addText(company.name, margin, 15, { fontSize: 18, fontStyle: 'bold' });
  addText(company.address, margin, 22, { fontSize: 9 });
  
  // Invoice Number
  addText('INVOICE', pageWidth - margin, 12, { fontSize: 10, align: 'right' });
  addText(`N° ${invoice.invoiceNumber}`, pageWidth - margin, 20, { fontSize: 14, fontStyle: 'bold', align: 'right' });
  
  doc.setTextColor(0, 0, 0);
  y = 50;

  // Client Info Section
  doc.setFillColor(245, 247, 250);
  doc.rect(margin, y - 5, contentWidth / 2 - 5, 40, 'F');
  
  addText('BILL TO:', margin + 5, y, { fontSize: 8, fontStyle: 'bold' });
  y += 6;
  addText(invoice.clientName, margin + 5, y, { fontSize: 11, fontStyle: 'bold' });
  y += 5;
  
  // Split address into lines
  const addressLines = invoice.clientAddress.split(',').map(s => s.trim());
  addressLines.forEach(line => {
    addText(line, margin + 5, y, { fontSize: 9 });
    y += 4;
  });
  
  if (invoice.clientVat) {
    addText(`VAT: ${invoice.clientVat}`, margin + 5, y, { fontSize: 9 });
  }

  // Invoice Details (right side)
  const detailsX = pageWidth / 2 + 5;
  let detailsY = 45;
  
  doc.setFillColor(245, 247, 250);
  doc.rect(detailsX, detailsY - 5, contentWidth / 2 - 5, 40, 'F');
  
  addText('Invoice Date:', detailsX + 5, detailsY, { fontSize: 9 });
  addText(format(new Date(invoice.invoiceDate), 'dd/MM/yyyy'), detailsX + 45, detailsY, { fontSize: 9, fontStyle: 'bold' });
  detailsY += 6;
  
  addText('Due Date:', detailsX + 5, detailsY, { fontSize: 9 });
  addText(format(new Date(invoice.dueDate), 'dd/MM/yyyy'), detailsX + 45, detailsY, { fontSize: 9, fontStyle: 'bold' });
  detailsY += 6;
  
  addText('Project:', detailsX + 5, detailsY, { fontSize: 9 });
  addText(invoice.projectName || '-', detailsX + 45, detailsY, { fontSize: 9, fontStyle: 'bold', maxWidth: 60 });
  detailsY += 6;
  
  addText('Payment Terms:', detailsX + 5, detailsY, { fontSize: 9 });
  addText(invoice.paymentTerms || '-', detailsX + 45, detailsY, { fontSize: 8, maxWidth: 60 });

  y = 95;

  // Items Table Header
  doc.setFillColor(59, 130, 246);
  doc.rect(margin, y, contentWidth, 8, 'F');
  
  doc.setTextColor(255, 255, 255);
  addText('QTY', margin + 3, y + 5.5, { fontSize: 8, fontStyle: 'bold' });
  addText('DESCRIPTION', margin + 25, y + 5.5, { fontSize: 8, fontStyle: 'bold' });
  addText('UNIT PRICE', pageWidth - margin - 50, y + 5.5, { fontSize: 8, fontStyle: 'bold' });
  addText('AMOUNT', pageWidth - margin - 3, y + 5.5, { fontSize: 8, fontStyle: 'bold', align: 'right' });
  
  doc.setTextColor(0, 0, 0);
  y += 12;

  // Items
  invoice.items.forEach((item, index) => {
    const isEven = index % 2 === 0;
    if (isEven) {
      doc.setFillColor(250, 250, 252);
      doc.rect(margin, y - 4, contentWidth, 12, 'F');
    }
    
    addText(item.quantity.toString(), margin + 3, y + 2, { fontSize: 9 });
    
    // Handle long descriptions
    const maxDescWidth = 90;
    const description = item.description || '-';
    if (doc.getTextWidth(description) > maxDescWidth) {
      doc.setFontSize(8);
      doc.text(description, margin + 25, y + 2, { maxWidth: maxDescWidth });
    } else {
      addText(description, margin + 25, y + 2, { fontSize: 9 });
    }
    
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR',
      }).format(amount);
    };
    
    addText(formatCurrency(item.unitPrice), pageWidth - margin - 50, y + 2, { fontSize: 9 });
    addText(formatCurrency(item.amount), pageWidth - margin - 3, y + 2, { fontSize: 9, align: 'right' });
    
    y += 12;
  });

  // Line separator
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Totals section
  const totalsX = pageWidth - margin - 80;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };
  
  if (invoice.paidAmount > 0) {
    addText('Subtotal:', totalsX, y, { fontSize: 9 });
    addText(formatCurrency(invoice.totalAmount), pageWidth - margin, y, { fontSize: 9, align: 'right' });
    y += 6;
    
    addText('Paid:', totalsX, y, { fontSize: 9 });
    addText(`- ${formatCurrency(invoice.paidAmount)}`, pageWidth - margin, y, { fontSize: 9, align: 'right' });
    y += 8;
    
    doc.setFillColor(59, 130, 246);
    doc.rect(totalsX - 5, y - 4, 85, 10, 'F');
    doc.setTextColor(255, 255, 255);
    addText('AMOUNT DUE:', totalsX, y + 2, { fontSize: 10, fontStyle: 'bold' });
    addText(formatCurrency(invoice.remainingAmount), pageWidth - margin, y + 2, { fontSize: 10, fontStyle: 'bold', align: 'right' });
  } else {
    doc.setFillColor(59, 130, 246);
    doc.rect(totalsX - 5, y - 4, 85, 10, 'F');
    doc.setTextColor(255, 255, 255);
    addText('TOTAL:', totalsX, y + 2, { fontSize: 10, fontStyle: 'bold' });
    addText(formatCurrency(invoice.totalAmount), pageWidth - margin, y + 2, { fontSize: 10, fontStyle: 'bold', align: 'right' });
  }
  
  doc.setTextColor(0, 0, 0);
  y += 20;

  // Bank Details
  doc.setFillColor(245, 247, 250);
  doc.rect(margin, y, contentWidth, 35, 'F');
  
  addText('BANK DETAILS', margin + 5, y + 6, { fontSize: 9, fontStyle: 'bold' });
  y += 12;
  
  addText(`IBAN: ${company.iban}`, margin + 5, y, { fontSize: 9 });
  y += 5;
  addText(`BIC/SWIFT: ${company.bic}`, margin + 5, y, { fontSize: 9 });
  y += 5;
  addText(`Bank Address: ${company.bankAddress}`, margin + 5, y, { fontSize: 8, maxWidth: contentWidth - 10 });

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setDrawColor(59, 130, 246);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  addText('Thank you for your business!', pageWidth / 2, footerY, { fontSize: 9, align: 'center' });

  // Return as Blob
  return doc.output('blob');
}

// Legacy function for backward compatibility - downloads the PDF
export function downloadInvoicePdf(invoice: Invoice, companyInfo?: CompanyInfo): void {
  const blob = generateInvoicePdf(invoice, companyInfo);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Invoice_${invoice.invoiceNumber.replace('/', '-')}_${invoice.clientName.replace(/\s+/g, '_')}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
