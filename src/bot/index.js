import { Telegraf } from 'telegraf';
import config from '../config/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { deduplicationMiddleware } from '../middleware/deduplication.js';
import { startCommand, menuCommand, helpCommand } from './commands/start.js';
import { balanceCommand } from './commands/balance.js';
import { reportMenuCommand, dailyReportCommand, weeklyReportCommand, monthlyReportCommand } from './commands/report.js';
import { historyCommand } from './commands/history.js';
import { savingsCommand } from './commands/savings.js';
import { reminderCommand } from './commands/reminder.js';
import { exportCommand } from './commands/export.js';
import { handleTextMessage, handlePhoto } from './handlers/message.js';
import { setupCallbackHandlers } from './handlers/callback.js';
import logger from '../utils/logger.js';

/**
 * Membuat dan mengkonfigurasi instance bot Telegram
 */
export function createBot() {
  const bot = new Telegraf(config.botToken);

  // Global error handler
  bot.catch((err, ctx) => {
    logger.error(`Bot error for ${ctx.updateType}:`, err);
    ctx.reply('❌ Terjadi kesalahan internal. Silakan coba lagi.').catch(() => {});
  });

  // Middleware
  bot.use(deduplicationMiddleware());
  bot.use(authMiddleware());

  // Commands
  bot.command('start', startCommand);
  bot.command('menu', menuCommand);
  bot.command('bantuan', helpCommand);
  bot.command('help', helpCommand);
  bot.command('saldo', balanceCommand);
  bot.command('laporan', reportMenuCommand);
  bot.command('hariini', dailyReportCommand);
  bot.command('mingguini', weeklyReportCommand);
  bot.command('bulanini', monthlyReportCommand);
  bot.command('riwayat', (ctx) => historyCommand(ctx, 1));
  bot.command('tabungan', savingsCommand);
  bot.command('pengingat', reminderCommand);
  bot.command('export', exportCommand);

  // Callback query handlers
  setupCallbackHandlers(bot);

  // Photo handler (OCR)
  bot.on('photo', handlePhoto);

  // Text message handler (catch-all, harus terakhir)
  bot.on('text', handleTextMessage);

  logger.info('Bot configured successfully');
  return bot;
}
