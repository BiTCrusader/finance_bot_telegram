import { Markup } from 'telegraf';

/**
 * Menu utama bot
 */
export function mainMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('💰 Cek Saldo', 'action_balance'),
      Markup.button.callback('📊 Laporan', 'action_reports'),
    ],
    [
      Markup.button.callback('📋 Riwayat', 'action_history'),
      Markup.button.callback('🎯 Tabungan', 'action_savings'),
    ],
    [
      Markup.button.callback('⏰ Pengingat', 'action_reminders'),
      Markup.button.callback('📤 Ekspor', 'action_export'),
    ],
    [
      Markup.button.callback('❓ Bantuan', 'action_help'),
    ],
  ]);
}

/**
 * Keyboard laporan
 */
export function reportMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📅 Hari Ini', 'report_daily'),
      Markup.button.callback('📆 Minggu Ini', 'report_weekly'),
    ],
    [
      Markup.button.callback('🗓️ Bulan Ini', 'report_monthly'),
    ],
    [
      Markup.button.callback('⬅️ Kembali', 'action_main_menu'),
    ],
  ]);
}

/**
 * Keyboard konfirmasi transaksi
 */
export function confirmTransactionKeyboard(txId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Benar', `confirm_tx_${txId}`),
      Markup.button.callback('❌ Batalkan', `cancel_tx_${txId}`),
    ],
  ]);
}

/**
 * Keyboard edit transaksi
 */
export function editTransactionKeyboard(txId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✏️ Edit Nominal', `edit_amount_${txId}`),
      Markup.button.callback('📁 Edit Kategori', `edit_category_${txId}`),
    ],
    [
      Markup.button.callback('📝 Edit Keterangan', `edit_desc_${txId}`),
      Markup.button.callback('📅 Edit Tanggal', `edit_date_${txId}`),
    ],
    [
      Markup.button.callback('🗑️ Hapus Transaksi', `delete_tx_${txId}`),
    ],
    [
      Markup.button.callback('⬅️ Kembali', 'action_history'),
    ],
  ]);
}

/**
 * Keyboard konfirmasi hapus
 */
export function confirmDeleteKeyboard(txId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Ya, Hapus', `confirm_delete_${txId}`),
      Markup.button.callback('❌ Batal', `cancel_delete_${txId}`),
    ],
  ]);
}

/**
 * Keyboard pagination riwayat
 */
export function historyPaginationKeyboard(page, totalPages) {
  const buttons = [];
  const navRow = [];

  if (page > 1) {
    navRow.push(Markup.button.callback('⬅️ Sebelumnya', `history_page_${page - 1}`));
  }
  if (page < totalPages) {
    navRow.push(Markup.button.callback('Selanjutnya ➡️', `history_page_${page + 1}`));
  }

  if (navRow.length > 0) {
    buttons.push(navRow);
  }

  buttons.push([Markup.button.callback('⬅️ Menu Utama', 'action_main_menu')]);

  return Markup.inlineKeyboard(buttons);
}

/**
 * Keyboard tabungan
 */
export function savingsMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📋 Lihat Target', 'savings_list'),
      Markup.button.callback('➕ Buat Target', 'savings_create'),
    ],
    [
      Markup.button.callback('⬅️ Kembali', 'action_main_menu'),
    ],
  ]);
}

/**
 * Keyboard detail tabungan
 */
export function savingsDetailKeyboard(goalId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('💰 Tambah Dana', `savings_add_${goalId}`),
      Markup.button.callback('🗑️ Hapus', `savings_delete_${goalId}`),
    ],
    [
      Markup.button.callback('⬅️ Kembali', 'savings_list'),
    ],
  ]);
}

/**
 * Keyboard pengingat
 */
export function reminderMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📋 Lihat Pengingat', 'reminder_list'),
      Markup.button.callback('➕ Buat Pengingat', 'reminder_create'),
    ],
    [
      Markup.button.callback('⬅️ Kembali', 'action_main_menu'),
    ],
  ]);
}

/**
 * Keyboard tipe pengingat
 */
export function reminderTypeKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📝 Catat Pengeluaran', 'reminder_type_expense'),
      Markup.button.callback('💳 Bayar Tagihan', 'reminder_type_bill'),
    ],
    [
      Markup.button.callback('💰 Menabung', 'reminder_type_savings'),
    ],
    [
      Markup.button.callback('⬅️ Kembali', 'action_reminders'),
    ],
  ]);
}

/**
 * Keyboard frekuensi pengingat
 */
export function reminderFrequencyKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📅 Harian', 'reminder_freq_daily'),
      Markup.button.callback('🗓️ Bulanan', 'reminder_freq_monthly'),
    ],
    [
      Markup.button.callback('⬅️ Kembali', 'action_reminders'),
    ],
  ]);
}

/**
 * Keyboard ekspor
 */
export function exportMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📄 PDF Hari Ini', 'export_pdf_daily'),
      Markup.button.callback('📊 Excel Hari Ini', 'export_excel_daily'),
    ],
    [
      Markup.button.callback('📄 PDF Bulan Ini', 'export_pdf_monthly'),
      Markup.button.callback('📊 Excel Bulan Ini', 'export_excel_monthly'),
    ],
    [
      Markup.button.callback('📄 PDF Riwayat', 'export_pdf_history'),
      Markup.button.callback('📊 Excel Riwayat', 'export_excel_history'),
    ],
    [
      Markup.button.callback('⬅️ Kembali', 'action_main_menu'),
    ],
  ]);
}

/**
 * Keyboard pilihan kategori pengeluaran
 */
export function expenseCategoryKeyboard(txId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🍽️ Makanan', `setcat_${txId}_makanan`),
      Markup.button.callback('🚗 Transportasi', `setcat_${txId}_transportasi`),
    ],
    [
      Markup.button.callback('📚 Pendidikan', `setcat_${txId}_pendidikan`),
      Markup.button.callback('🎮 Hiburan', `setcat_${txId}_hiburan`),
    ],
    [
      Markup.button.callback('📋 Tagihan', `setcat_${txId}_tagihan`),
      Markup.button.callback('🏥 Kesehatan', `setcat_${txId}_kesehatan`),
    ],
    [
      Markup.button.callback('🛒 Belanja', `setcat_${txId}_belanja`),
      Markup.button.callback('📦 Lain-lain', `setcat_${txId}_lain-lain`),
    ],
  ]);
}

/**
 * Keyboard konfirmasi OCR
 */
export function ocrConfirmKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Simpan', 'ocr_confirm'),
      Markup.button.callback('❌ Batal', 'ocr_cancel'),
    ],
  ]);
}
