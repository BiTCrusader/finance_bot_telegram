import { getTransactions, getTransactionById } from '../../services/transaction/index.js';
import { getUser } from '../../services/user/index.js';
import { formatTransactionList, formatTransaction } from '../../utils/format.js';
import { historyPaginationKeyboard, editTransactionKeyboard } from '../keyboards/index.js';
import { TRANSACTIONS_PER_PAGE } from '../../config/constants.js';
import logger from '../../utils/logger.js';

/**
 * Handler untuk /riwayat
 */
export async function historyCommand(ctx, page = 1) {
  try {
    const telegramId = BigInt(ctx.from.id);
    const user = await getUser(telegramId);
    if (!user) {
      await ctx.reply('❌ Kamu belum terdaftar. Ketik /start untuk memulai.');
      return;
    }

    const result = await getTransactions(user.id, { page, limit: TRANSACTIONS_PER_PAGE });
    const message = formatTransactionList(result.transactions, result.page, result.totalPages);
    const keyboard = historyPaginationKeyboard(result.page, result.totalPages);

    // Jika dari callback, edit message. Jika dari command, kirim baru.
    if (ctx.callbackQuery) {
      try {
        await ctx.editMessageText(message, { parse_mode: 'Markdown', ...keyboard });
      } catch {
        await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
      }
    } else {
      await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
    }

    if (result.transactions.length > 0) {
      await ctx.reply(
        '💡 Ketik ID transaksi (contoh: #5) untuk melihat detail dan mengedit.',
      );
    }
  } catch (error) {
    logger.error('History command error:', error);
    await ctx.reply('❌ Gagal mengambil riwayat. Silakan coba lagi.');
  }
}

/**
 * Handler untuk melihat detail transaksi
 */
export async function transactionDetailCommand(ctx, txId) {
  try {
    const telegramId = BigInt(ctx.from.id);
    const user = await getUser(telegramId);
    if (!user) return;

    const tx = await getTransactionById(txId, user.id);
    if (!tx) {
      await ctx.reply('❌ Transaksi tidak ditemukan.');
      return;
    }

    const message = formatTransaction(tx);
    await ctx.reply(message, editTransactionKeyboard(txId));
  } catch (error) {
    logger.error('Transaction detail error:', error);
    await ctx.reply('❌ Gagal mengambil detail transaksi.');
  }
}
