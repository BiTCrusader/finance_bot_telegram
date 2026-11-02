import { getReminders, createReminder, deleteReminder } from '../../services/reminder/index.js';
import { getUser } from '../../services/user/index.js';
import { reminderMenuKeyboard } from '../keyboards/index.js';
import logger from '../../utils/logger.js';

/**
 * Handler untuk /pengingat
 */
export async function reminderCommand(ctx) {
  await ctx.reply(
    '⏰ *Pengingat Keuangan*\n\nKelola pengingat keuanganmu.',
    { parse_mode: 'Markdown', ...reminderMenuKeyboard() }
  );
}

/**
 * Tampilkan daftar pengingat
 */
export async function listReminders(ctx) {
  try {
    const telegramId = BigInt(ctx.from.id);
    const user = await getUser(telegramId);
    if (!user) return;

    const reminders = await getReminders(user.id);

    if (reminders.length === 0) {
      const msg = '📭 Belum ada pengingat aktif.\n\nBuat pengingat baru dengan tombol di bawah.';
      if (ctx.callbackQuery) {
        try { await ctx.editMessageText(msg, reminderMenuKeyboard()); } catch { await ctx.reply(msg, reminderMenuKeyboard()); }
      } else {
        await ctx.reply(msg, reminderMenuKeyboard());
      }
      return;
    }

    const lines = ['⏰ *Daftar Pengingat*', ''];
    for (const r of reminders) {
      const timeStr = `${String(r.cronHour).padStart(2, '0')}:${String(r.cronMinute).padStart(2, '0')}`;
      const freqLabel = r.type === 'DAILY' ? 'Setiap hari' : `Setiap tanggal ${r.cronDayOfMonth}`;
      lines.push(
        `📌 *${r.title}*`,
        `  ⏰ ${timeStr} WITA | ${freqLabel}`,
        `  📝 ${r.description || '-'}`,
        `  🆔 ID: ${r.id}`,
        ''
      );
    }

    lines.push('💡 Untuk menghapus pengingat, ketik: "hapus pengingat ID"');

    const message = lines.join('\n');
    if (ctx.callbackQuery) {
      try { await ctx.editMessageText(message, { parse_mode: 'Markdown', ...reminderMenuKeyboard() }); }
      catch { await ctx.reply(message, { parse_mode: 'Markdown', ...reminderMenuKeyboard() }); }
    } else {
      await ctx.reply(message, { parse_mode: 'Markdown', ...reminderMenuKeyboard() });
    }
  } catch (error) {
    logger.error('List reminders error:', error);
    await ctx.reply('❌ Gagal mengambil data pengingat.');
  }
}
