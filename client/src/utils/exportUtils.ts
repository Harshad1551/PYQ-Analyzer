import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FrequencyReportData } from '../types';

export function exportReportToPDF(report: FrequencyReportData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Document Title
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('PYQ Frequency Analysis Report', 40, 40);

  // Subject Header
  doc.setFontSize(13);
  doc.setTextColor(13, 148, 136); // teal-600
  const subjectLine = `SUBJECT: ${report.subject.name.toUpperCase()} ${report.subject.subjectCode ? `[${report.subject.subjectCode}]` : ''}`;
  doc.text(subjectLine, 40, 62);

  // Subtitle & Total Available Papers
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(`Total Available PYQ Papers: ${report.totalAvailablePapers}  |  Generated on: ${new Date().toLocaleDateString()}`, 40, 80);

  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(1);
  doc.line(40, 90, pageWidth - 40, 90);

  let currentY = 105;

  // Render each module table
  for (const mod of report.modules) {
    if (currentY > doc.internal.pageSize.getHeight() - 100) {
      doc.addPage();
      currentY = 40;
    }

    // Module Heading
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(`${mod.moduleName.toUpperCase()} (${mod.questions.length} Questions)`, 40, currentY);
    currentY += 8;

    const tableRows = mod.questions.map((q, idx) => {
      return [
        (idx + 1).toString(),
        q.canonicalQuestionText,
        q.marks || '—',
        `${q.repetitionCount}/${q.totalAvailablePapers}`,
        `${q.repetitionPercentage}%`
      ];
    });

    autoTable(doc, {
      startY: currentY,
      margin: { left: 40, right: 40 },
      head: [['#', 'Question', 'Marks', 'Repeated in', 'Frequency']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 118, 110], // teal-700
        textColor: 255,
        fontSize: 9.5,
        fontStyle: 'bold',
        halign: 'left'
      },
      styles: {
        fontSize: 9,
        cellPadding: 5,
        overflow: 'linebreak',
        textColor: [30, 41, 59]
      },
      columnStyles: {
        0: { cellWidth: 25, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 55, halign: 'center' },
        3: { cellWidth: 70, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: 60, halign: 'center', fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        // Highlight high repetition cells
        if (data.section === 'body' && (data.column.index === 3 || data.column.index === 4)) {
          const rowIdx = data.row.index;
          const q = mod.questions[rowIdx];
          if (q && q.repetitionPercentage >= 75) {
            data.cell.styles.textColor = [15, 118, 110];
            data.cell.styles.fillColor = [240, 253, 250];
          }
        }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 22;
  }

  // Save the PDF
  const safeSubject = report.subject.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`PYQ_Frequency_Report_${safeSubject}.pdf`);
}

export function exportReportToExcel(report: FrequencyReportData) {
  const rows: any[] = [];

  for (const mod of report.modules) {
    for (const q of mod.questions) {
      const papersList = q.occurrences.map(o => o.paperYear ? `${o.paperName} (${o.paperYear})` : o.paperName).join('; ');
      rows.push({
        'Subject': report.subject.name,
        'Subject Code': report.subject.subjectCode || 'N/A',
        'Module': mod.moduleName,
        'Question': q.canonicalQuestionText,
        'Marks': q.marks || 'N/A',
        'Repeated In': `${q.repetitionCount}/${q.totalAvailablePapers}`,
        'Repetition Count': q.repetitionCount,
        'Total Available Papers': q.totalAvailablePapers,
        'Repetition Percentage': `${q.repetitionPercentage}%`,
        'Appeared In Papers': papersList
      });
    }
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'PYQ Frequency Report');

  // Auto-fit column widths
  const maxProps = [
    { wch: 22 }, // Subject
    { wch: 14 }, // Code
    { wch: 28 }, // Module
    { wch: 60 }, // Question
    { wch: 14 }, // Marks
    { wch: 14 }, // Repeated in
    { wch: 16 }, // Repetition Count
    { wch: 22 }, // Total Available
    { wch: 20 }, // Percentage
    { wch: 45 }  // Papers
  ];
  worksheet['!cols'] = maxProps;

  const safeSubject = report.subject.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(workbook, `PYQ_Frequency_${safeSubject}.xlsx`);
}

export function exportReportToCSV(report: FrequencyReportData) {
  const rows: string[][] = [
    ['Subject', 'Subject Code', 'Module', 'Question', 'Marks', 'Repeated In', 'Repetition Count', 'Total Papers', 'Repetition %', 'Papers List']
  ];

  for (const mod of report.modules) {
    for (const q of mod.questions) {
      const papersList = q.occurrences.map(o => o.paperYear ? `${o.paperName} (${o.paperYear})` : o.paperName).join('; ');
      rows.push([
        `"${report.subject.name.replace(/"/g, '""')}"`,
        `"${(report.subject.subjectCode || '').replace(/"/g, '""')}"`,
        `"${mod.moduleName.replace(/"/g, '""')}"`,
        `"${q.canonicalQuestionText.replace(/"/g, '""')}"`,
        `"${(q.marks || 'N/A').replace(/"/g, '""')}"`,
        `"${q.repetitionCount}/${q.totalAvailablePapers}"`,
        `${q.repetitionCount}`,
        `${q.totalAvailablePapers}`,
        `"${q.repetitionPercentage}%"`,
        `"${papersList.replace(/"/g, '""')}"`
      ]);
    }
  }

  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  const safeSubject = report.subject.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  link.setAttribute('download', `PYQ_Frequency_${safeSubject}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
