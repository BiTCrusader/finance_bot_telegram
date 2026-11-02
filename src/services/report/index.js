import {
  getTransactionsByDateRange as getTransactionsInRange,
  getCategoryBreakdown,
} from '../transaction/index.js';
import { getBalance } from '../balance/index.js';

// Alias for clarity in report context
const getCurrentBalance = async (userId) => {
  const data = await getBalance(userId);
  return data.currentBalance;
};
import {
  startOfToday,
  endOfToday,
  startOfThisWeek,
  endOfThisWeek,
  startOfThisMonth,
  endOfThisMonth,
  startOfLastMonth,
  endOfLastMonth,
  formatDate,
  dayjs,
} from '../../utils/date.js';
import logger from '../../utils/logger.js';

/**
 * Hitung total pemasukan dan pengeluaran dari array transaksi.
 * tx.amount adalah BigInt.
 */
function calculateTotals(transactions) {
  let totalIncome = 0n;
  let totalExpense = 0n;

  for (const tx of transactions) {
    if (tx.type === 'INCOME') {
      totalIncome += tx.amount;
    } else if (tx.type === 'EXPENSE') {
      totalExpense += tx.amount;
    }
  }

  return { totalIncome, totalExpense };
}

/**
 * Laporan harian — transaksi hari ini.
 */
export async function getDailyReport(userId) {
  try {
    const start = startOfToday().toDate();
    const end = endOfToday().toDate();

    const [transactions, categoryBreakdown, currentBalance] = await Promise.all([
      getTransactionsInRange(userId, start, end),
      getCategoryBreakdown(userId, start, end),
      getCurrentBalance(userId),
    ]);

    const { totalIncome, totalExpense } = calculateTotals(transactions);
    const periodLabel = `Hari Ini (${formatDate(start, 'DD MMMM YYYY')})`;

    return {
      periodLabel,
      totalIncome,
      totalExpense,
      currentBalance,
      categoryBreakdown,
      transactions,
    };
  } catch (error) {
    logger.error(`Gagal membuat laporan harian: ${error.message}`);
    throw error;
  }
}

/**
 * Laporan mingguan — Senin s.d. Minggu minggu ini,
 * beserta perbandingan minggu sebelumnya.
 */
export async function getWeeklyReport(userId) {
  try {
    const start = startOfThisWeek().toDate();
    const end = endOfThisWeek().toDate();

    // Periode minggu lalu
    const lastWeekStart = dayjs(start).subtract(7, 'day').toDate();
    const lastWeekEnd = dayjs(end).subtract(7, 'day').toDate();

    const [
      transactions,
      categoryBreakdown,
      currentBalance,
      lastWeekTransactions,
    ] = await Promise.all([
      getTransactionsInRange(userId, start, end),
      getCategoryBreakdown(userId, start, end),
      getCurrentBalance(userId),
      getTransactionsInRange(userId, lastWeekStart, lastWeekEnd),
    ]);

    const { totalIncome, totalExpense } = calculateTotals(transactions);
    const {
      totalIncome: lastWeekIncome,
      totalExpense: lastWeekExpense,
    } = calculateTotals(lastWeekTransactions);

    const periodLabel = `Minggu Ini (${formatDate(start, 'DD MMM')} - ${formatDate(end, 'DD MMM YYYY')})`;

    return {
      periodLabel,
      totalIncome,
      totalExpense,
      currentBalance,
      categoryBreakdown,
      transactions,
      comparison: {
        periodLabel: `Minggu Lalu (${formatDate(lastWeekStart, 'DD MMM')} - ${formatDate(lastWeekEnd, 'DD MMM YYYY')})`,
        totalIncome: lastWeekIncome,
        totalExpense: lastWeekExpense,
        incomeChange: totalIncome - lastWeekIncome,
        expenseChange: totalExpense - lastWeekExpense,
      },
    };
  } catch (error) {
    logger.error(`Gagal membuat laporan mingguan: ${error.message}`);
    throw error;
  }
}

/**
 * Laporan bulanan — bulan berjalan,
 * beserta perbandingan bulan sebelumnya.
 */
export async function getMonthlyReport(userId) {
  try {
    const start = startOfThisMonth().toDate();
    const end = endOfThisMonth().toDate();

    const lastMonthStart = startOfLastMonth().toDate();
    const lastMonthEnd = endOfLastMonth().toDate();

    const [
      transactions,
      categoryBreakdown,
      currentBalance,
      lastMonthTransactions,
    ] = await Promise.all([
      getTransactionsInRange(userId, start, end),
      getCategoryBreakdown(userId, start, end),
      getCurrentBalance(userId),
      getTransactionsInRange(userId, lastMonthStart, lastMonthEnd),
    ]);

    const { totalIncome, totalExpense } = calculateTotals(transactions);
    const {
      totalIncome: lastMonthIncome,
      totalExpense: lastMonthExpense,
    } = calculateTotals(lastMonthTransactions);

    const periodLabel = `Bulan Ini (${formatDate(start, 'MMMM YYYY')})`;

    return {
      periodLabel,
      totalIncome,
      totalExpense,
      currentBalance,
      categoryBreakdown,
      transactions,
      comparison: {
        periodLabel: `Bulan Lalu (${formatDate(lastMonthStart, 'MMMM YYYY')})`,
        totalIncome: lastMonthIncome,
        totalExpense: lastMonthExpense,
        incomeChange: totalIncome - lastMonthIncome,
        expenseChange: totalExpense - lastMonthExpense,
      },
    };
  } catch (error) {
    logger.error(`Gagal membuat laporan bulanan: ${error.message}`);
    throw error;
  }
}

/**
 * Laporan rentang tanggal kustom.
 */
export async function getCustomReport(userId, startDate, endDate) {
  try {
    const start = dayjs(startDate).startOf('day').toDate();
    const end = dayjs(endDate).endOf('day').toDate();

    const [transactions, categoryBreakdown, currentBalance] = await Promise.all([
      getTransactionsInRange(userId, start, end),
      getCategoryBreakdown(userId, start, end),
      getCurrentBalance(userId),
    ]);

    const { totalIncome, totalExpense } = calculateTotals(transactions);
    const periodLabel = `${formatDate(start, 'DD MMMM YYYY')} - ${formatDate(end, 'DD MMMM YYYY')}`;

    return {
      periodLabel,
      totalIncome,
      totalExpense,
      currentBalance,
      categoryBreakdown,
      transactions,
    };
  } catch (error) {
    logger.error(`Gagal membuat laporan kustom: ${error.message}`);
    throw error;
  }
}
