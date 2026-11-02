import { getBalanceSummary } from '../../services/balance/index.js';
import { formatBalanceSummary } from '../../utils/format.js';
import logger from '../../utils/logger.js';

/**
 * Handler untuk perintah /saldo dan action_balance
 */
export async function balanceCommand(ctx) {
  try {
    const telegramId = BigInt(ctx.from.id);
    const data = await getBalanceSummary(telegramId);

    if (!data) {
      await ctx.reply('❌ Kamu belum terdaftar. Ketik /start untuk memulai.');
      return;
    }

    const message = formatBalanceSummary(data);
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Balance command error:', error);
    await ctx.reply('❌ Gagal mengambil data saldo. Silakan coba lagi.');
  }
}
