import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Middleware untuk memverifikasi bahwa pengguna termasuk dalam daftar yang diizinkan
 */
export function authMiddleware() {
  return async (ctx, next) => {
    const telegramId = BigInt(ctx.from?.id || 0);

    if (!config.allowedTelegramIds.includes(telegramId)) {
      logger.warn(`Unauthorized access attempt from Telegram ID: ${telegramId}`);
      await ctx.reply('⛔ Maaf, Anda tidak memiliki akses ke bot ini.');
      return;
    }

    await next();
  };
}

/**
 * Middleware untuk verifikasi webhook secret token
 */
export function webhookSecretMiddleware(req, res, next) {
  const secretToken = req.headers['x-telegram-bot-api-secret-token'];

  if (config.webhookSecret && secretToken !== config.webhookSecret) {
    logger.warn('Invalid webhook secret token received');
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
}
