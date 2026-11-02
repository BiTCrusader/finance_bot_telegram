import { getUser } from '../../services/user/index.js';
import { getTransactionById, updateTransaction, deleteTransaction } from '../../services/transaction/index.js';
import { getBalance } from '../../services/balance/index.js';
import { getGoals, getGoalById, addContribution, deleteGoal } from '../../services/savings/index.js';
import { getDailyReport, getWeeklyReport, getMonthlyReport } from '../../services/report/index.js';
import { getReminders, deleteReminder } from '../../services/reminder/index.js';
import { formatTransaction, formatPeriodReport, formatSavingsGoal } from '../../utils/format.js';
import { formatRupiah } from '../../utils/currency.js';
import {
  mainMenuKeyboard, reportMenuKeyboard, editTransactionKeyboard,
  confirmDeleteKeyboard, historyPaginationKeyboard, expenseCategoryKeyboard,
  savingsMenuKeyboard, savingsDetailKeyboard, reminderMenuKeyboard,
  reminderTypeKeyboard, reminderFrequencyKeyboard, exportMenuKeyboard,
} from '../keyboards/index.js';
import { balanceCommand } from '../commands/balance.js';
import { historyCommand } from '../commands/history.js';
import { listSavingsGoals, savingsCommand } from '../commands/savings.js';
import { listReminders, reminderCommand } from '../commands/reminder.js';
import { sendPDFReport, sendExcelReport, exportCommand } from '../commands/export.js';
import { helpCommand } from '../commands/start.js';
import { setSession, clearSession } from './message.js';
import logger from '../../utils/logger.js';

/**
 * Setup semua callback query handlers
 */
export function setupCallbackHandlers(bot) {
  // Main menu actions
  bot.action('action_main_menu', async (ctx) => {
    await ctx.answerCbQuery();
    try {
      await ctx.editMessageText(
        '📱 *Menu Utama*\n\nPilih menu atau langsung kirim pesan untuk mencatat transaksi.',
        { parse_mode: 'Markdown', ...mainMenuKeyboard() }
      );
    } catch {
      await ctx.reply(
        '📱 *Menu Utama*\n\nPilih menu atau langsung kirim pesan untuk mencatat transaksi.',
        { parse_mode: 'Markdown', ...mainMenuKeyboard() }
      );
    }
  });

  bot.action('action_balance', async (ctx) => {
    await ctx.answerCbQuery();
    await balanceCommand(ctx);
  });

  bot.action('action_reports', async (ctx) => {
    await ctx.answerCbQuery();
    try {
      await ctx.editMessageText(
        '📊 *Menu Laporan*\n\nPilih periode laporan:',
        { parse_mode: 'Markdown', ...reportMenuKeyboard() }
      );
    } catch {
      await ctx.reply('📊 *Menu Laporan*\n\nPilih periode laporan:', { parse_mode: 'Markdown', ...reportMenuKeyboard() });
    }
  });

  bot.action('action_history', async (ctx) => {
    await ctx.answerCbQuery();
    await historyCommand(ctx, 1);
  });

  bot.action('action_savings', async (ctx) => {
    await ctx.answerCbQuery();
    try {
      await ctx.editMessageText(
        '🎯 *Target Tabungan*\n\nKelola target tabunganmu.',
        { parse_mode: 'Markdown', ...savingsMenuKeyboard() }
      );
    } catch {
      await savingsCommand(ctx);
    }
  });

  bot.action('action_reminders', async (ctx) => {
    await ctx.answerCbQuery();
    try {
      await ctx.editMessageText(
        '⏰ *Pengingat Keuangan*\n\nKelola pengingat keuanganmu.',
        { parse_mode: 'Markdown', ...reminderMenuKeyboard() }
      );
    } catch {
      await reminderCommand(ctx);
    }
  });

  bot.action('action_export', async (ctx) => {
    await ctx.answerCbQuery();
    try {
      await ctx.editMessageText(
        '📤 *Ekspor Laporan*\n\nPilih format dan periode:',
        { parse_mode: 'Markdown', ...exportMenuKeyboard() }
      );
    } catch {
      await exportCommand(ctx);
    }
  });

  bot.action('action_help', async (ctx) => {
    await ctx.answerCbQuery();
    await helpCommand(ctx);
  });

  // Report actions
  bot.action('report_daily', async (ctx) => {
    await ctx.answerCbQuery();
    try {
      const telegramId = BigInt(ctx.from.id);
      const user = await getUser(telegramId);
      if (!user) return;
      const report = await getDailyReport(user.id);
      const message = formatPeriodReport(report);
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      logger.error('Daily report callback error:', error);
      await ctx.reply('❌ Gagal membuat laporan.');
    }
  });

  bot.action('report_weekly', async (ctx) => {
    await ctx.answerCbQuery();
    try {
      const telegramId = BigInt(ctx.from.id);
      const user = await getUser(telegramId);
      if (!user) return;
      const report = await getWeeklyReport(user.id);
      const message = formatPeriodReport(report);
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      logger.error('Weekly report callback error:', error);
      await ctx.reply('❌ Gagal membuat laporan.');
    }
  });

  bot.action('report_monthly', async (ctx) => {
    await ctx.answerCbQuery();
    try {
      const telegramId = BigInt(ctx.from.id);
      const user = await getUser(telegramId);
      if (!user) return;
      const report = await getMonthlyReport(user.id);
      const message = formatPeriodReport(report);
      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      logger.error('Monthly report callback error:', error);
      await ctx.reply('❌ Gagal membuat laporan.');
    }
  });

  // History pagination
  bot.action(/^history_page_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const page = parseInt(ctx.match[1]);
    await historyCommand(ctx, page);
  });

  // Transaction edit actions
  bot.action(/^edit_amount_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const txId = parseInt(ctx.match[1]);
    setSession(ctx.from.id, { pendingEdit: { editField: 'amount', editTxId: txId } });
    await ctx.reply(`✏️ Masukkan nominal baru untuk transaksi #${txId}:\n\nContoh: "50000" atau "50 ribu"`);
  });

  bot.action(/^edit_category_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const txId = parseInt(ctx.match[1]);
    await ctx.reply(`📁 Pilih kategori baru untuk transaksi #${txId}:`, expenseCategoryKeyboard(txId));
  });

  bot.action(/^edit_desc_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const txId = parseInt(ctx.match[1]);
    setSession(ctx.from.id, { pendingEdit: { editField: 'description', editTxId: txId } });
    await ctx.reply(`📝 Masukkan keterangan baru untuk transaksi #${txId}:`);
  });

  bot.action(/^edit_date_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const txId = parseInt(ctx.match[1]);
    setSession(ctx.from.id, { pendingEdit: { editField: 'date', editTxId: txId } });
    await ctx.reply(`📅 Masukkan tanggal baru untuk transaksi #${txId}:\n\nFormat: YYYY-MM-DD atau DD/MM/YYYY`);
  });

  // Category selection
  bot.action(/^setcat_(\d+)_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const txId = parseInt(ctx.match[1]);
    const category = ctx.match[2];
    try {
      const telegramId = BigInt(ctx.from.id);
      const user = await getUser(telegramId);
      if (!user) return;
      const updated = await updateTransaction(txId, user.id, { category });
      if (updated) {
        await ctx.reply(`✅ Kategori transaksi #${txId} diubah ke "${category}".`);
      } else {
        await ctx.reply('❌ Gagal mengubah kategori.');
      }
    } catch (error) {
      logger.error('Category update error:', error);
      await ctx.reply('❌ Gagal mengubah kategori.');
    }
  });

  // Delete transaction
  bot.action(/^delete_tx_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const txId = parseInt(ctx.match[1]);
    await ctx.reply(
      `⚠️ Yakin ingin menghapus transaksi #${txId}?`,
      confirmDeleteKeyboard(txId)
    );
  });

  bot.action(/^confirm_delete_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const txId = parseInt(ctx.match[1]);
    try {
      const telegramId = BigInt(ctx.from.id);
      const user = await getUser(telegramId);
      if (!user) return;
      const deleted = await deleteTransaction(txId, user.id);
      if (deleted) {
        const balanceData = await getBalance(user.id);
        await ctx.editMessageText(
          `✅ Transaksi #${txId} berhasil dihapus.\n\n💰 Saldo sekarang: ${formatRupiah(balanceData.currentBalance)}`
        );
      } else {
        await ctx.editMessageText('❌ Gagal menghapus transaksi.');
      }
    } catch (error) {
      logger.error('Delete transaction error:', error);
      await ctx.reply('❌ Gagal menghapus transaksi.');
    }
  });

  bot.action(/^cancel_delete_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText('❌ Penghapusan dibatalkan.');
  });

  // Savings actions
  bot.action('savings_list', async (ctx) => {
    await ctx.answerCbQuery();
    await listSavingsGoals(ctx);
  });

  bot.action('savings_create', async (ctx) => {
    await ctx.answerCbQuery();
    setSession(ctx.from.id, { pendingSavingsName: true });
    await ctx.reply('📝 Ketik nama dan target tabunganmu.\n\nContoh: "Laptop 8 juta" atau "Liburan 5000000"');
  });

  bot.action(/^savings_add_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const goalId = parseInt(ctx.match[1]);
    setSession(ctx.from.id, { pendingSavingsContribution: true, contributionGoalId: goalId });
    await ctx.reply('💰 Berapa yang ingin kamu tambahkan?\n\nContoh: "100 ribu" atau "500000"');
  });

  // Handle savings contribution amount
  bot.on('text', async (ctx, next) => {
    const session = getSessionForCallback(ctx.from.id);
    if (session && session.pendingSavingsContribution && session.contributionGoalId) {
      const { parseAmount, isValidAmount } = await import('../../utils/currency.js');
      const amount = parseAmount(ctx.message.text);
      if (!amount || !isValidAmount(amount)) {
        await ctx.reply('❌ Nominal tidak valid. Coba lagi.');
        return;
      }
      try {
        const telegramId = BigInt(ctx.from.id);
        const user = await getUser(telegramId);
        if (!user) return;
        const result = await addContribution(session.contributionGoalId, user.id, amount, ctx.message.text);
        clearSession(ctx.from.id);
        if (result) {
          await ctx.reply(`✅ Berhasil menambahkan ${formatRupiah(amount)} ke tabungan!`);
        }
      } catch (error) {
        logger.error('Savings contribution error:', error);
        clearSession(ctx.from.id);
        await ctx.reply('❌ Gagal menambahkan dana.');
      }
      return;
    }
    await next();
  });

  bot.action(/^savings_delete_(\d+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const goalId = parseInt(ctx.match[1]);
    try {
      const telegramId = BigInt(ctx.from.id);
      const user = await getUser(telegramId);
      if (!user) return;
      await deleteGoal(goalId, user.id);
      await ctx.reply('✅ Target tabungan berhasil dihapus.');
    } catch (error) {
      logger.error('Delete savings error:', error);
      await ctx.reply('❌ Gagal menghapus target tabungan.');
    }
  });

  // Reminder actions
  bot.action('reminder_list', async (ctx) => {
    await ctx.answerCbQuery();
    await listReminders(ctx);
  });

  bot.action('reminder_create', async (ctx) => {
    await ctx.answerCbQuery();
    setSession(ctx.from.id, { pendingReminderTitle: true });
    await ctx.reply(
      '⏰ Buat pengingat baru.\n\nKetik judul dan jam pengingat.\n\nContoh:\n• "Catat pengeluaran jam 21:00"\n• "Bayar listrik jam 09:00 tanggal 20"'
    );
  });

  // Export actions
  bot.action('export_pdf_daily', async (ctx) => {
    await ctx.answerCbQuery();
    await sendPDFReport(ctx, 'daily');
  });

  bot.action('export_excel_daily', async (ctx) => {
    await ctx.answerCbQuery();
    await sendExcelReport(ctx, 'daily');
  });

  bot.action('export_pdf_monthly', async (ctx) => {
    await ctx.answerCbQuery();
    await sendPDFReport(ctx, 'monthly');
  });

  bot.action('export_excel_monthly', async (ctx) => {
    await ctx.answerCbQuery();
    await sendExcelReport(ctx, 'monthly');
  });

  bot.action('export_pdf_history', async (ctx) => {
    await ctx.answerCbQuery();
    await sendPDFReport(ctx, 'history');
  });

  bot.action('export_excel_history', async (ctx) => {
    await ctx.answerCbQuery();
    await sendExcelReport(ctx, 'history');
  });

  // OCR confirm/cancel
  bot.action('ocr_confirm', async (ctx) => {
    await ctx.answerCbQuery();
    // Handled by text message handler
    await ctx.reply('Ketik "ya" untuk konfirmasi.');
  });

  bot.action('ocr_cancel', async (ctx) => {
    await ctx.answerCbQuery();
    clearSession(ctx.from.id);
    await ctx.reply('❌ Scan struk dibatalkan.');
  });
}

// Re-implement session access to avoid circular dependency with message.js
// This uses the same Map that message.js uses via the shared export
import { getSession } from './message.js';

function getSessionForCallback(telegramId) {
  return getSession(telegramId);
}
