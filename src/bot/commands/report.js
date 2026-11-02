import { getDailyReport, getWeeklyReport, getMonthlyReport } from '../../services/report/index.js';
import { getUser } from '../../services/user/index.js';
import { formatPeriodReport } from '../../utils/format.js';
import { reportMenuKeyboard } from '../keyboards/index.js';
import logger from '../../utils/logger.js';

/**
 * Handler untuk /laporan - menampilkan menu laporan
 */
export async function reportMenuCommand(ctx) {
  await ctx.reply(
    '📊 *Menu Laporan*\n\nPilih periode laporan:',
    { parse_mode: 'Markdown', ...reportMenuKeyboard() }
  );
}

/**
 * Handler untuk /hariini
 */
export async function dailyReportCommand(ctx) {
  try {
    const telegramId = BigInt(ctx.from.id);
    const user = await getUser(telegramId);
    if (!user) {
      await ctx.reply('❌ Kamu belum terdaftar. Ketik /start untuk memulai.');
      return;
    }

    const report = await getDailyReport(user.id);
    const message = formatPeriodReport(report);
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Daily report error:', error);
    await ctx.reply('❌ Gagal membuat laporan. Silakan coba lagi.');
  }
}

/**
 * Handler untuk /mingguini
 */
export async function weeklyReportCommand(ctx) {
  try {
    const telegramId = BigInt(ctx.from.id);
    const user = await getUser(telegramId);
    if (!user) {
      await ctx.reply('❌ Kamu belum terdaftar. Ketik /start untuk memulai.');
      return;
    }

    const report = await getWeeklyReport(user.id);
    const message = formatPeriodReport(report);
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Weekly report error:', error);
    await ctx.reply('❌ Gagal membuat laporan. Silakan coba lagi.');
  }
}

/**
 * Handler untuk /bulanini
 */
export async function monthlyReportCommand(ctx) {
  try {
    const telegramId = BigInt(ctx.from.id);
    const user = await getUser(telegramId);
    if (!user) {
      await ctx.reply('❌ Kamu belum terdaftar. Ketik /start untuk memulai.');
      return;
    }

    const report = await getMonthlyReport(user.id);
    const message = formatPeriodReport(report);
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Monthly report error:', error);
    await ctx.reply('❌ Gagal membuat laporan. Silakan coba lagi.');
  }
}
