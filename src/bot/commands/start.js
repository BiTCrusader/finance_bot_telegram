import { findOrCreateUser, getUser } from '../../services/user/index.js';
import { mainMenuKeyboard } from '../keyboards/index.js';
import logger from '../../utils/logger.js';

/**
 * Handler untuk perintah /start
 */
export async function startCommand(ctx) {
  try {
    const telegramId = BigInt(ctx.from.id);
    const firstName = ctx.from.first_name || '';
    const lastName = ctx.from.last_name || '';
    const username = ctx.from.username || '';

    const user = await findOrCreateUser(telegramId, firstName, lastName, username);

    if (user.initialBalance === 0n) {
      // User baru, minta saldo awal
      await ctx.reply(
        `Halo ${firstName}! 👋\n\n` +
        `Selamat datang di *Asisten Keuangan Pribadi*! 🤖💰\n\n` +
        `Saya akan membantu kamu mencatat dan mengelola keuangan sehari-hari.\n\n` +
        `Untuk memulai, berapa saldo awal kamu saat ini?\n\n` +
        `Contoh:\n` +
        `• "Saldo awal saya 2 juta"\n` +
        `• "Uang saya sekarang 5.500.000"\n` +
        `• "Mulai dengan saldo 1.000.000"`,
        { parse_mode: 'Markdown' }
      );
    } else {
      // User lama
      await ctx.reply(
        `Halo kembali, ${firstName}! 👋\n\n` +
        `Ada yang bisa saya bantu hari ini? Langsung catat transaksi atau pilih menu di bawah.`,
        mainMenuKeyboard()
      );
    }
  } catch (error) {
    logger.error('Start command error:', error);
    await ctx.reply('❌ Terjadi kesalahan. Silakan coba lagi.');
  }
}

/**
 * Handler untuk perintah /menu
 */
export async function menuCommand(ctx) {
  await ctx.reply(
    '📱 *Menu Utama*\n\nPilih menu atau langsung kirim pesan untuk mencatat transaksi.',
    { parse_mode: 'Markdown', ...mainMenuKeyboard() }
  );
}

/**
 * Handler untuk perintah /bantuan
 */
export async function helpCommand(ctx) {
  const helpText = [
    '❓ *Panduan Penggunaan Bot*',
    '',
    '📝 *Mencatat Transaksi:*',
    'Cukup ketik dengan bahasa sehari-hari:',
    '• "Beli makan siang 20 ribu"',
    '• "Gaji bulan ini 3 juta"',
    '• "Bayar listrik 200 ribu"',
    '',
    '💰 *Perintah Tersedia:*',
    '/start - Mulai bot',
    '/menu - Menu utama',
    '/saldo - Cek saldo',
    '/hariini - Laporan hari ini',
    '/mingguini - Laporan minggu ini',
    '/bulanini - Laporan bulan ini',
    '/laporan - Menu laporan',
    '/riwayat - Riwayat transaksi',
    '/tabungan - Target tabungan',
    '/pengingat - Pengingat keuangan',
    '/export - Ekspor laporan',
    '/bantuan - Bantuan',
    '',
    '🧾 *Scan Struk:*',
    'Kirim foto struk pembayaran, dan AI akan membacanya.',
    '',
    '🤖 *Tanya AI:*',
    'Tanya apa saja tentang keuanganmu:',
    '• "Pengeluaran terbesar bulan ini?"',
    '• "Berapa pengeluaran makanan saya?"',
  ].join('\n');

  await ctx.reply(helpText, { parse_mode: 'Markdown' });
}
