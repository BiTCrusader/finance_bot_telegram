import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';

/**
 * Rate limiter untuk webhook endpoint
 * Membatasi request per IP untuk mencegah abuse
 */
export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: 60, // maks 60 request per menit per IP
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded from IP: ${req.ip}`);
    res.status(429).json({ error: 'Too many requests, please try again later.' });
  },
});

/**
 * Rate limiter untuk cron endpoint
 */
export const cronRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Too many requests' },
});
