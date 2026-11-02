import { formatRupiah } from './currency.js';
import { formatDate, formatDateTime } from './date.js';
import { CATEGORY_EMOJIS } from '../config/constants.js';

/**
 * Format transaksi untuk ditampilkan di Telegram
 */
export function formatTransaction(tx) {
  const emoji = CATEGORY_EMOJIS[tx.category] || '📦';
  const typeLabel = tx.type === 'INCOME' ? '📥 Pemasukan' : '📤 Pengeluaran';
  const sign = tx.type === 'INCOME' ? '+' : '-';

  return [
    `${typeLabel}`,
    `${emoji} Kategori: ${capitalize(tx.category)}`,
    `📝 Keterangan: ${tx.description}`,
    `💵 Nominal: ${sign}${formatRupiah(tx.amount)}`,
    `📅 Tanggal: ${formatDate(tx.transactionDate)}`,
    `🆔 ID: #${tx.id}`,
  ].join('\n');
}

/**
 * Format ringkasan saldo
 */
export function formatBalanceSummary(data) {
  return [
    '💰 *Ringkasan Saldo*',
    '',
    `🏦 Saldo Awal: ${formatRupiah(data.initialBalance)}`,
    `📥 Total Pemasukan: +${formatRupiah(data.totalIncome)}`,
    `📤 Total Pengeluaran: -${formatRupiah(data.totalExpense)}`,
    '',
    `💵 *Saldo Sekarang: ${formatRupiah(data.currentBalance)}*`,
  ].join('\n');
}

/**
 * Format laporan periode
 */
export function formatPeriodReport(data) {
  const lines = [
    `📊 *Laporan ${data.periodLabel}*`,
    '',
    `📥 Pemasukan: +${formatRupiah(data.totalIncome)}`,
    `📤 Pengeluaran: -${formatRupiah(data.totalExpense)}`,
    `📊 Selisih: ${formatRupiah(data.totalIncome - data.totalExpense)}`,
    `💵 Saldo Akhir: ${formatRupiah(data.currentBalance)}`,
  ];

  if (data.categoryBreakdown && data.categoryBreakdown.length > 0) {
    lines.push('', '📋 *Pengeluaran per Kategori:*');
    for (const cat of data.categoryBreakdown) {
      const emoji = CATEGORY_EMOJIS[cat.category] || '📦';
      lines.push(`  ${emoji} ${capitalize(cat.category)}: ${formatRupiah(cat.total)}`);
    }
  }

  if (data.comparison) {
    lines.push('', '📈 *Perbandingan Periode Sebelumnya:*');
    const diff = data.totalExpense - data.comparison.totalExpense;
    if (diff > 0n) {
      lines.push(`  ⬆️ Pengeluaran naik ${formatRupiah(diff)}`);
    } else if (diff < 0n) {
      lines.push(`  ⬇️ Pengeluaran turun ${formatRupiah(-diff)}`);
    } else {
      lines.push(`  ➡️ Pengeluaran sama dengan periode lalu`);
    }
  }

  return lines.join('\n');
}

/**
 * Format daftar transaksi untuk riwayat
 */
export function formatTransactionList(transactions, page, totalPages) {
  if (transactions.length === 0) {
    return '📭 Belum ada transaksi yang tercatat.';
  }

  const lines = [`📋 *Riwayat Transaksi* (Hal. ${page}/${totalPages})`, ''];

  for (const tx of transactions) {
    const emoji = tx.type === 'INCOME' ? '📥' : '📤';
    const sign = tx.type === 'INCOME' ? '+' : '-';
    const catEmoji = CATEGORY_EMOJIS[tx.category] || '📦';
    lines.push(
      `${emoji} #${tx.id} | ${formatDate(tx.transactionDate, 'DD/MM/YY')}`,
      `   ${catEmoji} ${tx.description}`,
      `   ${sign}${formatRupiah(tx.amount)}`,
      ''
    );
  }

  return lines.join('\n');
}

/**
 * Format target tabungan
 */
export function formatSavingsGoal(goal, totalSaved) {
  const saved = BigInt(totalSaved);
  const target = BigInt(goal.targetAmount);
  const remaining = target - saved;
  const percentage = target > 0n ? Number((saved * 100n) / target) : 0;
  const progressBar = createProgressBar(percentage);

  return [
    `🎯 *${goal.name}*`,
    '',
    `💰 Target: ${formatRupiah(target)}`,
    `💵 Terkumpul: ${formatRupiah(saved)}`,
    `📊 Sisa: ${formatRupiah(remaining > 0n ? remaining : 0n)}`,
    `${progressBar} ${percentage}%`,
    '',
    goal.isCompleted ? '✅ Target tercapai!' : '',
  ].filter(Boolean).join('\n');
}

/**
 * Buat progress bar visual
 */
function createProgressBar(percentage, length = 10) {
  const filled = Math.round((percentage / 100) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Capitalize first letter
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Escape karakter Markdown untuk Telegram
 */
export function escapeMarkdown(text) {
  if (!text) return '';
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}
