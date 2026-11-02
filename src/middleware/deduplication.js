import prisma from '../database/prisma.js';
import logger from '../utils/logger.js';

/**
 * Middleware untuk mencegah pemrosesan update Telegram yang sama dua kali.
 * Ini mencegah transaksi ganda jika Telegram mengirim ulang webhook.
 */
export function deduplicationMiddleware() {
  return async (ctx, next) => {
    const updateId = ctx.update?.update_id;
    if (!updateId) {
      await next();
      return;
    }

    try {
      // Cek apakah update sudah pernah diproses
      const existing = await prisma.processedTelegramUpdate.findUnique({
        where: { updateId: BigInt(updateId) },
      });

      if (existing) {
        logger.debug(`Duplicate update_id ${updateId}, skipping.`);
        return; // Jangan proses ulang
      }

      // Tandai update sebagai sudah diproses
      await prisma.processedTelegramUpdate.create({
        data: { updateId: BigInt(updateId) },
      });

      await next();
    } catch (error) {
      // Jika error karena unique constraint (race condition), skip
      if (error.code === 'P2002') {
        logger.debug(`Race condition on update_id ${updateId}, skipping.`);
        return;
      }
      logger.error('Deduplication middleware error:', error);
      await next(); // Lanjutkan meski ada error lain
    }
  };
}

/**
 * Bersihkan record update lama (lebih dari 24 jam)
 * Dipanggil secara berkala oleh cron
 */
export async function cleanupOldUpdates() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const result = await prisma.processedTelegramUpdate.deleteMany({
    where: { processedAt: { lt: cutoff } },
  });
  if (result.count > 0) {
    logger.info(`Cleaned up ${result.count} old processed updates.`);
  }
}
