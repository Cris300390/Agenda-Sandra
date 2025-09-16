import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type PdfMonthSummary = {
  key: string;      // "YYYY-MM"
  label: string;    // "septiembre 2025"
  deuda: number;
  pagado: number;
  pendiente: number;
};

export type PdfMovement = {
  fecha: string;    // "16/09/2025"
  tipo: 'Deuda' | 'Pago';
  importe: string;  // "25,00 €"
  nota?: string;
};

export type PdfPayload = {
  alumno: string;
  mesActualLabel: string;
  totalsMes: { deuda: string; pagado: string; pendiente: string };
  movimientosMes: PdfMovement[];
  anteriores: PdfMonthSummary[];
};

export function exportarResumenPDF(data: PdfPayload) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });

  const title = `Resumen de pagos — ${data.alumno}`;
  const today = new Date().toLocaleString('es-ES');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, 40, 40);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado: ${today}`, 40, 58);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`Mes actual: ${data.mesActualLabel}`, 40, 88);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);

  autoTable(doc, {
    startY: 100,
    head: [['Deuda', 'Pagado', 'Pendiente']],
    body: [[data.totalsMes.deuda, data.totalsMes.pagado, data.totalsMes.pendiente]],
    styles: { halign: 'center' },
    headStyles: { fillColor: [233, 230, 252] }
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 16 : 160,
    head: [['Fecha', 'Tipo', 'Importe', 'Nota']],
    body: data.movimientosMes.map(m => [m.fecha, m.tipo, m.importe, m.nota ?? '']),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [245, 242, 255] },
    columnStyles: { 0: { cellWidth: 85 }, 1: { cellWidth: 60 }, 2: { cellWidth: 80 }, 3: { cellWidth: 'auto' } }
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 20 : undefined,
    head: [['Mes', 'Deuda', 'Pagado', 'Pendiente']],
    body: data.anteriores.map(a => [a.label, eur(a.deuda), eur(a.pagado), eur(a.pendiente)]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [233, 230, 252] }
  });

  const safeName = data.alumno.replace(/[^a-z0-9\-_. ]/gi, '_');
  doc.save(`Resumen_${safeName}.pdf`);
}

function eur(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n ?? 0);
}

