import { jsPDF } from 'jspdf';
import { PinfabbReport } from '@/types/pinfabb';

export function generatePinfabbReportPdf(report: PinfabbReport): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Colors
  const headerBgColor: [number, number, number] = [51, 51, 51]; // Dark grey
  const headerTextColor: [number, number, number] = [255, 255, 255]; // White
  const borderColor: [number, number, number] = [0, 0, 0]; // Black
  const lightGrey: [number, number, number] = [245, 245, 245];

  // Helper: Draw a cell with border
  const drawCell = (
    x: number,
    yPos: number,
    w: number,
    h: number,
    text: string,
    options: {
      bold?: boolean;
      fontSize?: number;
      align?: 'left' | 'center' | 'right';
      bgColor?: [number, number, number];
      textColor?: [number, number, number];
      noBorder?: boolean;
    } = {}
  ) => {
    const { bold = false, fontSize = 9, align = 'left', bgColor, textColor, noBorder = false } = options;

    // Background
    if (bgColor) {
      doc.setFillColor(...bgColor);
      doc.rect(x, yPos, w, h, 'F');
    }

    // Border
    if (!noBorder) {
      doc.setDrawColor(...borderColor);
      doc.setLineWidth(0.3);
      doc.rect(x, yPos, w, h);
    }

    // Text
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...(textColor || [0, 0, 0]));

    let textX = x + 2;
    if (align === 'center') textX = x + w / 2;
    if (align === 'right') textX = x + w - 2;

    doc.text(text, textX, yPos + h / 2 + 1, {
      align,
      baseline: 'middle',
    });
  };

  // Helper: Section header with dark background
  const drawSectionHeader = (yPos: number, title: string, height: number = 7) => {
    drawCell(margin, yPos, contentWidth, height, title, {
      bold: true,
      fontSize: 10,
      bgColor: headerBgColor,
      textColor: headerTextColor,
    });
    return height;
  };

  // ============ HEADER SECTION ============
  // Logo area
  const logoHeight = 20;
  doc.setFillColor(...lightGrey);
  doc.rect(margin, y, 60, logoHeight, 'F');
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, 60, logoHeight);

  // Logo text
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('pinfabb', margin + 5, y + 8);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('ship stabilization & energy', margin + 5, y + 13);

  // Contact info box
  const contactWidth = contentWidth - 60;
  doc.rect(margin + 60, y, contactWidth, logoHeight);
  doc.setFontSize(8);
  const contactX = margin + 65;
  doc.text('T: +39 010881426', contactX, y + 6);
  doc.text('E: info@pinfabb.com', contactX, y + 11);
  doc.text('W: www.pinfabb.com', contactX, y + 16);

  y += logoHeight;

  // ============ REPORT INFO ROW ============
  const infoRowHeight = 10;
  const col1Width = contentWidth * 0.25;
  const col2Width = contentWidth * 0.25;
  const col3Width = contentWidth * 0.35;
  const col4Width = contentWidth * 0.15;

  // Report N°
  drawCell(margin, y, col1Width / 2, infoRowHeight, 'REPORT N°:', { bold: true, fontSize: 8 });
  drawCell(margin + col1Width / 2, y, col1Width / 2, infoRowHeight, report.reportNumber || '-', { fontSize: 9 });

  // Date
  drawCell(margin + col1Width, y, col2Width / 2, infoRowHeight, 'DATE:', { bold: true, fontSize: 8 });
  drawCell(margin + col1Width + col2Width / 2, y, col2Width / 2, infoRowHeight, report.date || '-', { fontSize: 9 });

  // Order N°
  drawCell(margin + col1Width + col2Width, y, col3Width * 0.4, infoRowHeight, 'ORDER N°:', { bold: true, fontSize: 8 });
  drawCell(margin + col1Width + col2Width + col3Width * 0.4, y, col3Width * 0.6, infoRowHeight, report.orderNumber || '-', { fontSize: 9 });

  // Page
  drawCell(margin + col1Width + col2Width + col3Width, y, col4Width / 2, infoRowHeight, 'PAGE:', { bold: true, fontSize: 8 });
  drawCell(margin + col1Width + col2Width + col3Width + col4Width / 2, y, col4Width / 2, infoRowHeight, report.page || '1', { fontSize: 9 });

  y += infoRowHeight;

  // ============ SHIP INFO ROW ============
  const shipRowHeight = 10;
  const shipCol1 = contentWidth * 0.45;
  const shipCol2 = contentWidth * 0.30;
  const shipCol3 = contentWidth * 0.25;

  // Ship
  drawCell(margin, y, 15, shipRowHeight, 'SHIP:', { bold: true, fontSize: 9 });
  drawCell(margin + 15, y, shipCol1 - 15, shipRowHeight, report.shipName || '-', { fontSize: 10, bold: true });

  // IMO
  drawCell(margin + shipCol1, y, 20, shipRowHeight, 'IMO No.:', { bold: true, fontSize: 9 });
  drawCell(margin + shipCol1 + 20, y, shipCol2 - 20, shipRowHeight, report.imoNumber || '-', { fontSize: 10 });

  // Flag
  drawCell(margin + shipCol1 + shipCol2, y, 15, shipRowHeight, 'FLAG:', { bold: true, fontSize: 9 });
  drawCell(margin + shipCol1 + shipCol2 + 15, y, shipCol3 - 15, shipRowHeight, report.flag || '-', { fontSize: 10 });

  y += shipRowHeight;

  // ============ STABILIZATION PLANT ============
  const plantHeight = 7;
  drawSectionHeader(y, 'STAB. PLANT');
  y += plantHeight;

  const plantContentHeight = 8;
  drawCell(margin, y, contentWidth, plantContentHeight, report.stabilizationPlant || 'PINFABB Stabilizers', { fontSize: 9 });
  y += plantContentHeight;

  // ============ WORKING TIME SECTION ============
  drawSectionHeader(y, 'WORKING TIME');
  y += 7;

  // Working time headers
  const workHeaderHeight = 7;
  const workCols = [
    { width: contentWidth * 0.20, label: 'PORT' },
    { width: contentWidth * 0.15, label: 'N° OF TECH.' },
    { width: contentWidth * 0.30, label: 'ON (date)' },
    { width: contentWidth * 0.175, label: 'O/TIME h' },
    { width: contentWidth * 0.175, label: 'NIGHT h' },
  ];

  let xPos = margin;
  workCols.forEach((col) => {
    drawCell(xPos, y, col.width, workHeaderHeight, col.label, {
      bold: true,
      fontSize: 8,
      align: 'center',
      bgColor: lightGrey,
    });
    xPos += col.width;
  });
  y += workHeaderHeight;

  // Working time values
  const workValueHeight = 8;
  const dateRange = report.dateStart && report.dateEnd
    ? `${report.dateStart} - ${report.dateEnd}`
    : report.dateStart || '-';

  const workValues = [
    report.port || '-',
    String(report.numberOfTechnicians || 1),
    dateRange,
    report.overtimeHours ? String(report.overtimeHours) : '-',
    report.nightHours ? String(report.nightHours) : '-',
  ];

  xPos = margin;
  workCols.forEach((col, i) => {
    drawCell(xPos, y, col.width, workValueHeight, workValues[i], { fontSize: 9, align: 'center' });
    xPos += col.width;
  });
  y += workValueHeight;

  // ============ SPARE PARTS SECTION ============
  drawSectionHeader(y, 'SPARE PARTS');
  y += 7;

  const sparePartsText = report.spareParts || 'None';
  const sparePartsLines = doc.splitTextToSize(sparePartsText, contentWidth - 4);
  const sparePartsHeight = Math.max(12, sparePartsLines.length * 5 + 4);

  doc.setDrawColor(...borderColor);
  doc.rect(margin, y, contentWidth, sparePartsHeight);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(sparePartsLines, margin + 2, y + 5);
  y += sparePartsHeight;

  // ============ SERVICE REPORT SECTION ============
  drawSectionHeader(y, 'SERVICE REPORT');
  y += 7;

  const serviceText = report.serviceReport || '-';
  const serviceLines = doc.splitTextToSize(serviceText, contentWidth - 4);
  const lineHeight = 5;

  // Calculate available space before signatures (need ~35mm for signatures)
  const signatureSpace = 40;
  const availableHeight = pageHeight - y - signatureSpace - margin;
  const neededHeight = serviceLines.length * lineHeight + 6;

  let serviceBoxHeight: number;

  if (neededHeight <= availableHeight) {
    // Fits on current page
    serviceBoxHeight = Math.max(50, neededHeight);
    doc.setDrawColor(...borderColor);
    doc.rect(margin, y, contentWidth, serviceBoxHeight);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(serviceLines, margin + 2, y + 5);
    y += serviceBoxHeight;
  } else {
    // Need multiple pages
    let remainingLines = [...serviceLines];
    let firstPage = true;

    while (remainingLines.length > 0) {
      const currentAvailable = firstPage ? availableHeight : pageHeight - margin * 2 - signatureSpace;
      const linesPerPage = Math.floor(currentAvailable / lineHeight);
      const pageLinesCount = Math.min(linesPerPage, remainingLines.length);
      const pageLines = remainingLines.slice(0, pageLinesCount);
      remainingLines = remainingLines.slice(pageLinesCount);

      const boxHeight = pageLinesCount * lineHeight + 6;
      doc.setDrawColor(...borderColor);
      doc.rect(margin, y, contentWidth, boxHeight);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(pageLines, margin + 2, y + 5);

      if (remainingLines.length > 0) {
        doc.addPage();
        y = margin;
        firstPage = false;
      } else {
        y += boxHeight;
      }
    }
  }

  // ============ SIGNATURES SECTION ============
  // Check if we need a new page for signatures
  if (y > pageHeight - signatureSpace) {
    doc.addPage();
    y = margin;
  }

  const sigRowHeight = 8;
  const halfWidth = contentWidth / 2;

  // Signature headers
  drawCell(margin, y, halfWidth, sigRowHeight, 'Chief Engineer Sign.', {
    bold: true,
    fontSize: 10,
    bgColor: headerBgColor,
    textColor: headerTextColor,
  });
  drawCell(margin + halfWidth, y, halfWidth, sigRowHeight, 'Service Engineer Sign.', {
    bold: true,
    fontSize: 10,
    bgColor: headerBgColor,
    textColor: headerTextColor,
  });
  y += sigRowHeight;

  // Name row
  const nameHeight = 10;
  drawCell(margin, y, 20, nameHeight, 'Name:', { bold: true, fontSize: 9 });
  drawCell(margin + 20, y, halfWidth - 20, nameHeight, report.chiefEngineerName || '________________', { fontSize: 9 });
  drawCell(margin + halfWidth, y, 20, nameHeight, 'Name:', { bold: true, fontSize: 9 });
  drawCell(margin + halfWidth + 20, y, halfWidth - 20, nameHeight, report.serviceEngineerName || '________________', { fontSize: 9 });
  y += nameHeight;

  // Date row
  const dateHeight = 10;
  drawCell(margin, y, 20, dateHeight, 'Date:', { bold: true, fontSize: 9 });
  drawCell(margin + 20, y, halfWidth - 20, dateHeight, report.chiefEngineerDate || '________________', { fontSize: 9 });
  drawCell(margin + halfWidth, y, 20, dateHeight, 'Date:', { bold: true, fontSize: 9 });
  drawCell(margin + halfWidth + 20, y, halfWidth - 20, dateHeight, report.serviceEngineerDate || '________________', { fontSize: 9 });

  // Download
  const filename = report.reportNumber
    ? `PINFABB_Report_${report.reportNumber}.pdf`
    : `PINFABB_Report_${new Date().toISOString().split('T')[0]}.pdf`;

  doc.save(filename);
}
