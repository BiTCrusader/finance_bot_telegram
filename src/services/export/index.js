import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { formatRupiah } from '../../utils/currency.js';
import { formatDate } from '../../utils/date.js';
import { CATEGORY_EMOJIS } from '../../config/constants.js';
import logger from '../../utils/logger.js';

/**
 * Generate a PDF report buffer from transaction data.
 * @param {object} data - Report data
 * @param {string} data.title - Report title
 * @param {string} data.periodLabel - Period label (e.g. "Januari 2026")
 * @param {Array} data.transactions - List of transactions
 * @param {object} data.summary - Summary totals { totalIncome, totalExpense, balance }
 * @param {Array} data.categoryBreakdown - Category breakdown [{ category, total, count }]
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function generatePDF(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Title
    doc.fontSize(18).text(data.title, { align: 'center' });
    doc.fontSize(12).text(data.periodLabel, { align: 'center' });
    doc.moveDown(2);

    // Summary
    doc.fontSize(14).text('Ringkasan', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Total Pemasukan: +${formatRupiah(data.summary.totalIncome)}`);
    doc.text(`Total Pengeluaran: -${formatRupiah(data.summary.totalExpense)}`);
    doc.text(`Saldo: ${formatRupiah(data.summary.balance)}`);
    doc.moveDown(1);

    // Category Breakdown
    if (data.categoryBreakdown && data.categoryBreakdown.length > 0) {
      doc.fontSize(14).text('Pengeluaran per Kategori', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11);
      for (const cat of data.categoryBreakdown) {
        doc.text(`  ${cat.category}: ${formatRupiah(cat.total)} (${cat.count} transaksi)`);
      }
      doc.moveDown(1);
    }

    // Transactions table
    if (data.transactions && data.transactions.length > 0) {
      doc.fontSize(14).text('Daftar Transaksi', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(9);

      const startX = 50;
      let y = doc.y;
      // Header
      doc.font('Helvetica-Bold');
      doc.text('Tanggal', startX, y, { width: 80 });
      doc.text('Keterangan', startX + 85, y, { width: 150 });
      doc.text('Kategori', startX + 240, y, { width: 80 });
      doc.text('Jenis', startX + 325, y, { width: 60 });
      doc.text('Nominal', startX + 390, y, { width: 100 });
      y += 15;
      doc.moveTo(startX, y).lineTo(startX + 490, y).stroke();
      y += 5;
      doc.font('Helvetica');

      for (const tx of data.transactions) {
        if (y > 750) {
          doc.addPage();
          y = 50;
        }
        const sign = tx.type === 'INCOME' ? '+' : '-';
        doc.text(formatDate(tx.transactionDate, 'DD/MM/YY'), startX, y, { width: 80 });
        doc.text(tx.description.slice(0, 25), startX + 85, y, { width: 150 });
        doc.text(tx.category, startX + 240, y, { width: 80 });
        doc.text(tx.type === 'INCOME' ? 'Masuk' : 'Keluar', startX + 325, y, { width: 60 });
        doc.text(sign + formatRupiah(tx.amount), startX + 390, y, { width: 100 });
        y += 15;
      }
    }

    doc.end();
  });
}

/**
 * Generate an Excel report buffer from transaction data.
 * @param {object} data - Report data (same structure as generatePDF)
 * @returns {Promise<Buffer>} Excel buffer
 */
export async function generateExcel(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Personal Finance Bot';
  workbook.created = new Date();

  // Sheet 1: Ringkasan
  const summarySheet = workbook.addWorksheet('Ringkasan');
  summarySheet.columns = [
    { header: 'Item', key: 'item', width: 30 },
    { header: 'Nilai', key: 'value', width: 25 },
  ];
  summarySheet.getRow(1).font = { bold: true };

  summarySheet.addRow({ item: 'Periode', value: data.periodLabel });
  summarySheet.addRow({ item: 'Total Pemasukan', value: formatRupiah(data.summary.totalIncome) });
  summarySheet.addRow({ item: 'Total Pengeluaran', value: formatRupiah(data.summary.totalExpense) });
  summarySheet.addRow({ item: 'Saldo', value: formatRupiah(data.summary.balance) });
  summarySheet.addRow({});

  if (data.categoryBreakdown && data.categoryBreakdown.length > 0) {
    summarySheet.addRow({ item: 'Kategori Pengeluaran', value: 'Jumlah' });
    summarySheet.getRow(summarySheet.rowCount).font = { bold: true };
    for (const cat of data.categoryBreakdown) {
      summarySheet.addRow({ item: `  ${cat.category}`, value: formatRupiah(cat.total) });
    }
  }

  // Sheet 2: Transaksi
  const txSheet = workbook.addWorksheet('Transaksi');
  txSheet.columns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: 'Tanggal', key: 'date', width: 15 },
    { header: 'Jenis', key: 'type', width: 12 },
    { header: 'Kategori', key: 'category', width: 15 },
    { header: 'Keterangan', key: 'description', width: 30 },
    { header: 'Nominal', key: 'amount', width: 20 },
  ];
  txSheet.getRow(1).font = { bold: true };

  if (data.transactions) {
    for (const tx of data.transactions) {
      txSheet.addRow({
        id: tx.id,
        date: formatDate(tx.transactionDate, 'DD/MM/YYYY'),
        type: tx.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran',
        category: tx.category,
        description: tx.description,
        amount: (tx.type === 'INCOME' ? '+' : '-') + formatRupiah(tx.amount),
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
