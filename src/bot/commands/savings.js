import { getGoals, createGoal, getGoalById, addContribution, deleteGoal, getGoalProgress } from '../../services/savings/index.js';
import { getUser } from '../../services/user/index.js';
import { formatSavingsGoal } from '../../utils/format.js';
import { formatRupiah } from '../../utils/currency.js';
import { savingsMenuKeyboard, savingsDetailKeyboard } from '../keyboards/index.js';
import logger from '../../utils/logger.js';

/**
 * Handler untuk /tabungan
 */
export async function savingsCommand(ctx) {
  await ctx.reply(
    '🎯 *Target Tabungan*\n\nKelola target tabunganmu di sini.',
    { parse_mode: 'Markdown', ...savingsMenuKeyboard() }
  );
}

/**
 * Tampilkan daftar target tabungan
 */
export async function listSavingsGoals(ctx) {
  try {
    const telegramId = BigInt(ctx.from.id);
    const user = await getUser(telegramId);
    if (!user) return;

    const goals = await getGoals(user.id);

    if (goals.length === 0) {
      const msg = '📭 Belum ada target tabungan.\n\nKetik pesan seperti:\n"Buat target tabungan laptop 8 juta"';
      if (ctx.callbackQuery) {
        try { await ctx.editMessageText(msg, savingsMenuKeyboard()); } catch { await ctx.reply(msg, savingsMenuKeyboard()); }
      } else {
        await ctx.reply(msg, savingsMenuKeyboard());
      }
      return;
    }

    const lines = ['🎯 *Daftar Target Tabungan*', ''];
    for (const goal of goals) {
      const totalSaved = goal.contributions.reduce((sum, c) => sum + c.amount, 0n);
      lines.push(formatSavingsGoal(goal, totalSaved));
      lines.push('');
    }

    const message = lines.join('\n');
    if (ctx.callbackQuery) {
      try { await ctx.editMessageText(message, { parse_mode: 'Markdown', ...savingsMenuKeyboard() }); }
      catch { await ctx.reply(message, { parse_mode: 'Markdown', ...savingsMenuKeyboard() }); }
    } else {
      await ctx.reply(message, { parse_mode: 'Markdown', ...savingsMenuKeyboard() });
    }

    // Show detail buttons for each goal
    for (const goal of goals) {
      await ctx.reply(
        `🎯 ${goal.name}`,
        savingsDetailKeyboard(goal.id)
      );
    }
  } catch (error) {
    logger.error('List savings error:', error);
    await ctx.reply('❌ Gagal mengambil data tabungan.');
  }
}
