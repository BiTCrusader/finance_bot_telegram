import { aiService } from '../ai/index.js';
import { formatRupiah } from '../../utils/currency.js';
import logger from '../../utils/logger.js';

/**
 * Process a receipt image using the AI service.
 * @param {Buffer} imageBuffer - The receipt image buffer
 * @returns {Promise<object>} Result object with success flag and data or error
 */
export async function processReceipt(imageBuffer) {
  try {
    const result = await aiService.processReceipt(imageBuffer);
    return { success: true, data: result };
  } catch (error) {
    logger.error('OCR processing failed:', error);
    return {
      success: false,
      error: error.message || 'Gagal memproses struk. Silakan coba lagi atau catat manual.',
    };
  }
}

/**
 * Format an OCR receipt result into a readable Telegram message.
 * @param {object} result - The result from processReceipt()
 * @returns {string} Formatted message string (Markdown)
 */
export function formatReceiptResult(result) {
  if (!result.success) {
    return `❌ ${result.error}`;
  }

  const data = result.data;
  const lines = ['🧾 *Hasil Scan Struk*', ''];

  if (data.storeName) lines.push(`🏪 Toko: ${data.storeName}`);
  if (data.date) lines.push(`📅 Tanggal: ${data.date}`);

  if (data.items && data.items.length > 0) {
    lines.push('', '📋 *Rincian:*');
    for (const item of data.items) {
      lines.push(`  - ${item.name}: ${formatRupiah(item.price)}`);
    }
  }

  if (data.total !== null && data.total !== undefined) {
    lines.push('', `💰 *Total: ${formatRupiah(data.total)}*`);
  } else {
    lines.push('', '⚠️ Total tidak terbaca dengan jelas.');
  }

  lines.push('', 'Ketik "ya" untuk menyimpan sebagai pengeluaran, atau "batal" untuk membatalkan.');

  return lines.join('\n');
}
