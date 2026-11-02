import { getUser } from '../../services/user/index.js';
import { getDailyReport, getMonthlyReport } from '../../services/report/index.js';
import { getTransactionsByDateRange } from '../../services/transaction/index.js';
import { generatePDF, generateExcel } from '../../services/export/index.js';
import { getBalance } from '../../services/balance/index.js';
import { exportMenuKeyboard } from '../keyboards/index.js';
import { startOfToday, endOfToday, startOfThisMonth, endOfThisMonth, formatDate } from '../../utils/date.js';
import logger from '../../utils/logger.js';

/**
 * Handler untuk /export
 */
export async function exportCommand(ctx) {
  await ctx.reply(
    '📤 *Ekspor Laporan*\n\nPilih format dan periode:',
    { parse_mode: 'Markdown', ...exportMenuKeyboard() }
  );
}

/**
 * Generate dan kirim file PDF
 */
export async function sendPDFReport(ctx, period) {
  try {
    const telegramId = BigInt(ctx.from.id);
    const user = await getUser(telegramId);
    if (!user) return;

    await ctx.reply('⏳ Membuat laporan PDF...');

    let reportData;
    let filename;

    if (period === 'daily') {
      reportData = await getDailyReport(user.id);
      filename = `laporan-harian-${formatDate(new Date(), 'YYYY-MM-DD')}.pdf`;
    } else if (period === 'monthly') {
      reportData = await getMonthlyReport(user.id);
      filename = `laporan-bulanan-${formatDate(new Date(), 'YYYY-MM')}.pdf`;
    } else {
      // History - all transactions
      const transactions = await getTransactionsByDateRange(
        user.id,
        new Date('2020-01-01'),
        new Date()
      );
      const balanceData = await getBalance(user.id);
      reportData = {
        periodLabel: 'Semua Riwayat',
        totalIncome: balanceData.totalIncome,
        totalExpense: balanceData.totalExpense,
        currentBalance: balanceData.currentBalance,
        categoryBreakdown: [],
        transactions,
      };
      filename = `riwayat-transaksi-${formatDate(new Date(), 'YYYY-MM-DD')}.pdf`;
    }

    const pdfData = {
      title: 'Laporan Keuangan Pribadi',
      periodLabel: reportData.periodLabel,
      transactions: reportData.transactions || [],
      summary: {
        totalIncome: reportData.totalIncome,
        totalExpense: reportData.totalExpense,
        balance: reportData.currentBalance,
      },
      categoryBreakdown: reportData.categoryBreakdown || [],
    };

    const buffer = await generatePDF(pdfData);

    await ctx.replyWithDocument({
      source: buffer,
      filename,
    }, {
      caption: `📄 ${pdfData.title} - ${reportData.periodLabel}`,
    });
  } catch (error) {
    logger.error('PDF export error:', error);
    await ctx.reply('❌ Gagal membuat PDF. Silakan coba lagi.');
  }
}

/**
 * Generate dan kirim file Excel
 */
export async function sendExcelReport(ctx, period) {
  try {
    const telegramId = BigInt(ctx.from.id);
    const user = await getUser(telegramId);
    if (!user) return;

    await ctx.reply('⏳ Membuat laporan Excel...');

    let reportData;
    let filename;

    if (period === 'daily') {
      reportData = await getDailyReport(user.id);
      filename = `laporan-harian-${formatDate(new Date(), 'YYYY-MM-DD')}.xlsx`;
    } else if (period === 'monthly') {
      reportData = await getMonthlyReport(user.id);
      filename = `laporan-bulanan-${formatDate(new Date(), 'YYYY-MM')}.xlsx`;
    } else {
      const transactions = await getTransactionsByDateRange(
        user.id,
        new Date('2020-01-01'),
        new Date()
      );
      const balanceData = await getBalance(user.id);
      reportData = {
        periodLabel: 'Semua Riwayat',
        totalIncome: balanceData.totalIncome,
        totalExpense: balanceData.totalExpense,
        currentBalance: balanceData.currentBalance,
        categoryBreakdown: [],
        transactions,
      };
      filename = `riwayat-transaksi-${formatDate(new Date(), 'YYYY-MM-DD')}.xlsx`;
    }

    const excelData = {
      title: 'Laporan Keuangan Pribadi',
      periodLabel: reportData.periodLabel,
      transactions: reportData.transactions || [],
      summary: {
        totalIncome: reportData.totalIncome,
        totalExpense: reportData.totalExpense,
        balance: reportData.currentBalance,
      },
      categoryBreakdown: reportData.categoryBreakdown || [],
    };

    const buffer = await generateExcel(excelData);

    await ctx.replyWithDocument({
      source: buffer,
      filename,
    }, {
      caption: `📊 Laporan Keuangan - ${reportData.periodLabel}`,
    });
  } catch (error) {
    logger.error('Excel export error:', error);
    await ctx.reply('❌ Gagal membuat Excel. Silakan coba lagi.');
  }
}
