import { getUser, setInitialBalance } from '../../services/user/index.js';
import { createTransaction, getTransactionById, updateTransaction, deleteTransaction } from '../../services/transaction/index.js';
import { getBalance } from '../../services/balance/index.js';
import { aiService } from '../../services/ai/index.js';
import { processReceipt, formatReceiptResult } from '../../services/ocr/index.js';
import { createGoal, addContribution } from '../../services/savings/index.js';
import { createReminder } from '../../services/reminder/index.js';
import { formatRupiah, parseAmount, isValidAmount } from '../../utils/currency.js';
import { formatTransaction } from '../../utils/format.js';
import { parseDate, now } from '../../utils/date.js';
import { confirmTransactionKeyboard, ocrConfirmKeyboard, mainMenuKeyboard } from '../keyboards/index.js';
import { balanceCommand } from '../commands/balance.js';
import { historyCommand, transactionDetailCommand } from '../commands/history.js';
import { helpCommand } from '../commands/start.js';
import { dailyReportCommand, weeklyReportCommand, monthlyReportCommand } from '../commands/report.js';
import logger from '../../utils/logger.js';

// Session store sederhana (in-memory, akan hilang saat restart)
// Untuk production bisa diganti dengan Redis, tapi cukup untuk personal bot
const userSessions = new Map();

function getSession(telegramId) {
  return userSessions.get(String(telegramId)) || {};
}

function setSession(telegramId, data) {
  userSessions.set(String(telegramId), { ...getSession(telegramId), ...data });
}

function clearSession(telegramId) {
  userSessions.delete(String(telegramId));
}

/**
 * Handler utama untuk pesan teks
 */
export async function handleTextMessage(ctx) {
  try {
    const telegramId = BigInt(ctx.from.id);
    const text = ctx.message.text.trim();
    const user = await getUser(telegramId);

    if (!user) {
      await ctx.reply('❌ Kamu belum terdaftar. Ketik /start untuk memulai.');
      return;
    }

    // Cek apakah ada pending session (menunggu input dari user)
    const session = getSession(telegramId);

    // Handle pending edit operations
    if (session.pendingEdit) {
      await handlePendingEdit(ctx, user, session, text);
      return;
    }

    // Handle pending savings creation
    if (session.pendingSavingsName) {
      await handlePendingSavingsAmount(ctx, user, session, text);
      return;
    }

    // Handle pending savings contribution
    if (session.pendingSavingsContribution) {
      await handlePendingSavingsContribution(ctx, user, session, text);
      return;
    }

    // Handle pending reminder creation
    if (session.pendingReminderTitle) {
      await handlePendingReminderTime(ctx, user, session, text);
      return;
    }

    // Handle pending OCR confirmation
    if (session.pendingOCR) {
      await handleOCRConfirmation(ctx, user, session, text);
      return;
    }

    // Cek apakah user merujuk transaksi ID
    const txIdMatch = text.match(/^#(\d+)$/);
    if (txIdMatch) {
      await transactionDetailCommand(ctx, parseInt(txIdMatch[1]));
      return;
    }

    // Cek apakah user baru (belum set saldo awal)
    if (user.initialBalance === 0n) {
      await handleBalanceSetting(ctx, user, text);
      return;
    }

    // Deteksi intent menggunakan AI
    const intent = await aiService.detectIntent(text);
    logger.debug(`Detected intent: ${intent.intent} for text: "${text}"`);

    switch (intent.intent) {
      case 'balance_check':
        await balanceCommand(ctx);
        break;

      case 'balance_setting':
        await handleBalanceSetting(ctx, user, text);
        break;

      case 'transaction':
        await handleTransaction(ctx, user, text);
        break;

      case 'report':
        await dailyReportCommand(ctx);
        break;

      case 'savings':
        await handleSavingsIntent(ctx, user, text);
        break;

      case 'reminder':
        await handleReminderIntent(ctx, user, text);
        break;

      case 'analysis':
        await handleAnalysis(ctx, user, text);
        break;

      case 'greeting':
        await ctx.reply(
          `Halo ${ctx.from.first_name}! 👋 Ada yang bisa saya bantu hari ini?\n\nLangsung catat transaksi atau pilih menu di bawah.`,
          mainMenuKeyboard()
        );
        break;

      case 'help':
        await helpCommand(ctx);
        break;

      default:
        // Coba parse sebagai transaksi
        await handleTransaction(ctx, user, text);
        break;
    }
  } catch (error) {
    logger.error('Message handler error:', error);
    await ctx.reply('❌ Terjadi kesalahan. Silakan coba lagi.');
  }
}

/**
 * Handle pengaturan saldo awal
 */
async function handleBalanceSetting(ctx, user, text) {
  const telegramId = BigInt(ctx.from.id);
  const parsed = await aiService.parseBalanceSetting(text);

  if (parsed.amount && isValidAmount(parsed.amount)) {
    await setInitialBalance(telegramId, parsed.amount);
    await ctx.reply(
      `✅ Saldo awal berhasil diatur!\n\n💰 Saldo awal: ${formatRupiah(parsed.amount)}\n\nSekarang kamu bisa langsung mencatat transaksi.\nContoh: "Beli makan siang 20 ribu"`,
      mainMenuKeyboard()
    );
  } else if (parsed.isBalanceSetting) {
    await ctx.reply('🤔 Maaf, saya tidak bisa mendeteksi nominalnya. Coba ketik ulang dengan angka yang jelas.\n\nContoh: "Saldo awal 2 juta" atau "5500000"');
  } else {
    // Cek apakah ada angka saja
    const amount = parseAmount(text);
    if (amount && isValidAmount(amount)) {
      await setInitialBalance(telegramId, amount);
      await ctx.reply(
        `✅ Saldo awal berhasil diatur!\n\n💰 Saldo awal: ${formatRupiah(amount)}\n\nSekarang kamu bisa langsung mencatat transaksi.`,
        mainMenuKeyboard()
      );
    } else {
      await ctx.reply('🤔 Saya belum bisa memahami pesanmu. Silakan masukkan saldo awal kamu.\n\nContoh: "Saldo awal 2 juta" atau "5.500.000"');
    }
  }
}

/**
 * Handle pencatatan transaksi
 */
async function handleTransaction(ctx, user, text) {
  const parsed = await aiService.parseTransaction(text);

  if (!parsed || !parsed.amount) {
    await ctx.reply(
      '🤔 Saya tidak bisa mendeteksi transaksi dari pesan kamu.\n\n' +
      'Coba ketik dengan format yang lebih jelas:\n' +
      '• "Beli makan siang 20 ribu"\n' +
      '• "Gaji bulan ini 3 juta"\n' +
      '• "Bayar listrik 200.000"'
    );
    return;
  }

  if (!isValidAmount(parsed.amount)) {
    await ctx.reply('❌ Nominal tidak valid. Pastikan nominal antara Rp1 sampai Rp999.999.999.999.');
    return;
  }

  const transactionDate = parsed.date ? parseDate(parsed.date) : new Date();

  // Simpan transaksi
  const tx = await createTransaction(user.id, {
    type: parsed.type,
    amount: parsed.amount,
    category: parsed.category,
    description: parsed.description,
    transactionDate: transactionDate || new Date(),
  });

  // Ambil saldo terbaru
  const balanceData = await getBalance(user.id);

  const typeLabel = tx.type === 'INCOME' ? '📥 Pemasukan' : '📤 Pengeluaran';
  const sign = tx.type === 'INCOME' ? '+' : '-';
  const emoji = tx.type === 'INCOME' ? '✅' : '✅';

  await ctx.reply(
    `${emoji} Transaksi berhasil dicatat!\n\n` +
    `${typeLabel}\n` +
    `📁 Kategori: ${parsed.category}\n` +
    `📝 Keterangan: ${parsed.description}\n` +
    `💵 Nominal: ${sign}${formatRupiah(parsed.amount)}\n\n` +
    `💰 Saldo sekarang: ${formatRupiah(balanceData.currentBalance)}\n\n` +
    `🆔 ID: #${tx.id}`
  );
}

/**
 * Handle intent tabungan dari pesan teks
 */
async function handleSavingsIntent(ctx, user, text) {
  const lower = text.toLowerCase();
  const amount = parseAmount(text);

  // "Buat target tabungan laptop 8 juta"
  if (lower.includes('buat') || lower.includes('target') || lower.includes('ingin menabung')) {
    // Coba ekstrak nama dan target
    const nameMatch = text.match(/(?:tabungan|target)\s+(.+?)\s+(\d[\d.,]*\s*(?:rb|ribu|jt|juta|m\b|miliar)?)/i);
    if (nameMatch && amount) {
      const name = nameMatch[1].trim();
      const goal = await createGoal(user.id, name, amount);
      await ctx.reply(
        `✅ Target tabungan berhasil dibuat!\n\n🎯 ${goal.name}\n💰 Target: ${formatRupiah(amount)}\n\nGunakan /tabungan untuk mengelola target.`
      );
      return;
    }

    // Minta nama target
    setSession(ctx.from.id, { pendingSavingsName: true, pendingSavingsAmount: amount });
    await ctx.reply('📝 Berapa target tabunganmu dan untuk apa?\n\nContoh: "Laptop 8 juta" atau "Liburan 5000000"');
    return;
  }

  // "Tambahkan tabungan 100rb ke target laptop"
  if (lower.includes('tambah') && amount) {
    setSession(ctx.from.id, { pendingSavingsContribution: true, contributionAmount: amount });
    await ctx.reply('🎯 Ke target tabungan mana? Ketik nama target atau gunakan /tabungan untuk melihat daftar.');
    return;
  }

  // Default: tampilkan menu tabungan
  const { savingsCommand } = await import('../commands/savings.js');
  await savingsCommand(ctx);
}

/**
 * Handle pending savings amount
 */
async function handlePendingSavingsAmount(ctx, user, session, text) {
  const amount = parseAmount(text);
  const nameMatch = text.match(/^(.+?)\s+(\d[\d.,]*\s*(?:rb|ribu|jt|juta|m\b)?)/i);

  let name = text;
  let targetAmount = session.pendingSavingsAmount || amount;

  if (nameMatch) {
    name = nameMatch[1].trim();
    targetAmount = parseAmount(nameMatch[2]) || targetAmount;
  }

  if (!targetAmount || !isValidAmount(targetAmount)) {
    await ctx.reply('🤔 Berapa target nominalnya? Contoh: "Laptop 8 juta"');
    return;
  }

  if (!name || name.length < 2) {
    name = 'Target Tabungan';
  }

  const goal = await createGoal(user.id, name, targetAmount);
  clearSession(ctx.from.id);
  await ctx.reply(
    `✅ Target tabungan berhasil dibuat!\n\n🎯 ${goal.name}\n💰 Target: ${formatRupiah(targetAmount)}\n\nGunakan /tabungan untuk menambah dana.`
  );
}

/**
 * Handle pending savings contribution
 */
async function handlePendingSavingsContribution(ctx, user, session, text) {
  // Simplified: just acknowledge for now - more complex matching could use AI
  clearSession(ctx.from.id);
  await ctx.reply('💡 Untuk menambah dana tabungan, gunakan menu /tabungan dan pilih target yang ingin ditambah dananya.');
}

/**
 * Handle intent pengingat
 */
async function handleReminderIntent(ctx, user, text) {
  const lower = text.toLowerCase();

  // "Hapus pengingat 5"
  const deleteMatch = lower.match(/hapus\s+pengingat\s+(\d+)/);
  if (deleteMatch) {
    const { deleteReminder: delReminder } = await import('../../services/reminder/index.js');
    const deleted = await delReminder(parseInt(deleteMatch[1]), user.id);
    if (deleted) {
      await ctx.reply('✅ Pengingat berhasil dihapus.');
    } else {
      await ctx.reply('❌ Pengingat tidak ditemukan.');
    }
    return;
  }

  // Deteksi pembuatan pengingat
  if (lower.includes('ingatkan') || lower.includes('buat pengingat') || lower.includes('reminder')) {
    setSession(ctx.from.id, { pendingReminderTitle: true });
    await ctx.reply(
      '⏰ Buat pengingat baru.\n\n' +
      'Ketik judul dan jam pengingat.\n\n' +
      'Contoh:\n' +
      '• "Catat pengeluaran jam 21:00"\n' +
      '• "Bayar listrik jam 09:00 tanggal 20"\n' +
      '• "Menabung jam 19:30"'
    );
    return;
  }

  // Default: tampilkan menu pengingat
  const { reminderCommand } = await import('../commands/reminder.js');
  await reminderCommand(ctx);
}

/**
 * Handle pending reminder time input
 */
async function handlePendingReminderTime(ctx, user, session, text) {
  const timeMatch = text.match(/(?:jam\s+)?(\d{1,2})[:.:](\d{2})/);
  const dayMatch = text.match(/tanggal\s+(\d{1,2})/);

  if (!timeMatch) {
    await ctx.reply('🤔 Saya tidak mendeteksi waktu. Ketik dengan format: "Judul jam HH:MM"\n\nContoh: "Catat pengeluaran jam 21:00"');
    return;
  }

  const hour = parseInt(timeMatch[1]);
  const minute = parseInt(timeMatch[2]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    await ctx.reply('❌ Jam tidak valid. Gunakan format 24 jam (00:00 - 23:59).');
    return;
  }

  // Extract title (everything before "jam")
  let title = text.replace(/jam\s+\d{1,2}[:.]\d{2}/i, '').replace(/tanggal\s+\d{1,2}/i, '').trim();
  if (!title || title.length < 2) title = 'Pengingat Keuangan';

  const type = dayMatch ? 'MONTHLY' : 'DAILY';
  const dayOfMonth = dayMatch ? parseInt(dayMatch[1]) : null;

  const reminder = await createReminder(user.id, {
    type,
    title,
    description: `Pengingat: ${title}`,
    hour,
    minute,
    dayOfMonth,
  });

  clearSession(ctx.from.id);

  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const freqLabel = type === 'DAILY' ? 'setiap hari' : `setiap tanggal ${dayOfMonth}`;
  await ctx.reply(
    `✅ Pengingat berhasil dibuat!\n\n⏰ ${title}\n📅 ${freqLabel} pukul ${timeStr} WITA\n\nGunakan /pengingat untuk mengelola pengingat.`
  );
}

/**
 * Handle konfirmasi OCR
 */
async function handleOCRConfirmation(ctx, user, session, text) {
  const lower = text.toLowerCase().trim();

  if (lower === 'ya' || lower === 'simpan' || lower === 'ok') {
    const ocrData = session.pendingOCR;
    if (ocrData && ocrData.total) {
      const tx = await createTransaction(user.id, {
        type: 'EXPENSE',
        amount: ocrData.total,
        category: 'belanja',
        description: ocrData.storeName || 'Pembelian (scan struk)',
        transactionDate: ocrData.date ? parseDate(ocrData.date) : new Date(),
      });

      const balanceData = await getBalance(user.id);
      clearSession(ctx.from.id);

      await ctx.reply(
        `✅ Transaksi dari struk berhasil dicatat!\n\n📤 Pengeluaran\n📁 Kategori: Belanja\n📝 Keterangan: ${ocrData.storeName || 'Pembelian'}\n💵 Nominal: -${formatRupiah(ocrData.total)}\n\n💰 Saldo sekarang: ${formatRupiah(balanceData.currentBalance)}`
      );
    } else {
      clearSession(ctx.from.id);
      await ctx.reply('❌ Data struk tidak lengkap. Silakan kirim ulang foto struk atau catat manual.');
    }
  } else if (lower === 'batal' || lower === 'tidak') {
    clearSession(ctx.from.id);
    await ctx.reply('❌ Transaksi dari struk dibatalkan.');
  } else {
    await ctx.reply('Ketik "ya" untuk menyimpan atau "batal" untuk membatalkan.');
  }
}

/**
 * Handle pertanyaan analisis AI
 */
async function handleAnalysis(ctx, user, text) {
  try {
    await ctx.reply('🤖 Menganalisis data keuanganmu...');

    const balanceData = await getBalance(user.id);

    // Ambil transaksi bulan ini untuk konteks
    const { startOfThisMonth, endOfThisMonth } = await import('../../utils/date.js');
    const { getTransactionsByDateRange, getCategoryBreakdown } = await import('../../services/transaction/index.js');

    const transactions = await getTransactionsByDateRange(
      user.id,
      startOfThisMonth().toDate(),
      endOfThisMonth().toDate()
    );

    const categoryBreakdown = await getCategoryBreakdown(
      user.id,
      startOfThisMonth().toDate(),
      endOfThisMonth().toDate()
    );

    const financialData = {
      saldoAwal: Number(balanceData.initialBalance),
      totalPemasukan: Number(balanceData.totalIncome),
      totalPengeluaran: Number(balanceData.totalExpense),
      saldoSekarang: Number(balanceData.currentBalance),
      transaksiBulanIni: transactions.map(tx => ({
        jenis: tx.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran',
        kategori: tx.category,
        keterangan: tx.description,
        nominal: Number(tx.amount),
        tanggal: tx.transactionDate.toISOString().split('T')[0],
      })),
      pengeluaranPerKategori: categoryBreakdown.map(c => ({
        kategori: c.category,
        total: Number(c.total),
        jumlahTransaksi: c.count,
      })),
    };

    const analysis = await aiService.generateAnalysis(text, financialData);
    await ctx.reply(`🤖 ${analysis}`);
  } catch (error) {
    logger.error('Analysis error:', error);
    await ctx.reply('❌ Gagal menganalisis data. Silakan coba lagi nanti.');
  }
}

/**
 * Handle pending edit operations
 */
async function handlePendingEdit(ctx, user, session, text) {
  const { editField, editTxId } = session.pendingEdit;

  try {
    let updateData = {};

    switch (editField) {
      case 'amount': {
        const amount = parseAmount(text);
        if (!amount || !isValidAmount(amount)) {
          await ctx.reply('❌ Nominal tidak valid. Masukkan nominal yang benar.');
          return;
        }
        updateData.amount = amount;
        break;
      }
      case 'description':
        updateData.description = text.trim();
        break;
      case 'date': {
        const date = parseDate(text);
        if (!date) {
          await ctx.reply('❌ Format tanggal tidak valid. Contoh: "2024-01-15" atau "15/01/2024"');
          return;
        }
        updateData.transactionDate = date;
        break;
      }
      default:
        clearSession(ctx.from.id);
        await ctx.reply('❌ Operasi edit tidak valid.');
        return;
    }

    const updated = await updateTransaction(editTxId, user.id, updateData);
    clearSession(ctx.from.id);

    if (updated) {
      await ctx.reply(`✅ Transaksi #${editTxId} berhasil diperbarui!\n\n${formatTransaction(updated)}`);
    } else {
      await ctx.reply('❌ Gagal memperbarui transaksi. Pastikan ID transaksi benar.');
    }
  } catch (error) {
    logger.error('Edit handler error:', error);
    clearSession(ctx.from.id);
    await ctx.reply('❌ Gagal memperbarui transaksi.');
  }
}

/**
 * Handler untuk foto (scan struk)
 */
export async function handlePhoto(ctx) {
  try {
    const telegramId = BigInt(ctx.from.id);
    const user = await getUser(telegramId);
    if (!user) {
      await ctx.reply('❌ Kamu belum terdaftar. Ketik /start untuk memulai.');
      return;
    }

    await ctx.reply('🔍 Memproses foto struk...');

    // Ambil foto resolusi tertinggi
    const photos = ctx.message.photo;
    const photo = photos[photos.length - 1];
    const file = await ctx.telegram.getFile(photo.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${ctx.botInfo ? ctx.telegram.token : ''}/` + file.file_path;

    // Download file
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error('Failed to download photo');
    const buffer = Buffer.from(await response.arrayBuffer());

    const result = await processReceipt(buffer);
    const message = formatReceiptResult(result);

    if (result.success && result.data.total) {
      setSession(telegramId, { pendingOCR: result.data });
    }

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Photo handler error:', error);
    await ctx.reply('❌ Gagal memproses foto. Pastikan foto jelas dan coba lagi, atau catat transaksi secara manual.');
  }
}

// Export session functions for callback handlers
export { getSession, setSession, clearSession };
