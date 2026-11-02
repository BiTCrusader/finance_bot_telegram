import express from 'express';
import helmet from 'helmet';
import config from './config/index.js';
import { createBot } from './bot/index.js';
import { webhookSecretMiddleware } from './middleware/auth.js';
import { webhookRateLimiter, cronRateLimiter } from './middleware/rateLimiter.js';
import { cleanupOldUpdates } from './middleware/deduplication.js';
import { getDueReminders, markTriggered } from './services/reminder/index.js';
import { getUserById } from './services/user/index.js';
import prisma from './database/prisma.js';
import logger from './utils/logger.js';

async function main() {
  // Test database connection
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    process.exit(1);
  }

  // Create bot
  const bot = createBot();

  // Create Express app
  const app = express();

  // Security middleware
  app.use(helmet());

  // Health check endpoint
  app.get('/', (req, res) => {
    res.json({ status: 'ok', bot: 'Personal Finance Bot', timestamp: new Date().toISOString() });
  });

  app.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
  });

  // Cron endpoint untuk pengingat
  app.get('/cron/reminders', cronRateLimiter, async (req, res) => {
    // Verifikasi cron secret
    const secret = req.query.secret || req.headers['x-cron-secret'];
    if (secret !== config.cronSecret) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    try {
      const dueReminders = await getDueReminders();
      let sent = 0;

      for (const reminder of dueReminders) {
        try {
          const user = await getUserById(reminder.userId);
          if (user) {
            await bot.telegram.sendMessage(
              Number(user.telegramId),
              `⏰ *Pengingat: ${reminder.title}*\n\n${reminder.description || 'Waktunya mengelola keuanganmu!'}`,
              { parse_mode: 'Markdown' }
            );
            await markTriggered(reminder.id);
            sent++;
          }
        } catch (err) {
          logger.error(`Failed to send reminder ${reminder.id}:`, err);
        }
      }

      // Cleanup old update records
      await cleanupOldUpdates();

      res.json({ ok: true, remindersSent: sent });
    } catch (error) {
      logger.error('Cron reminders error:', error);
      res.status(500).json({ error: 'Internal error' });
    }
  });

  if (config.isProduction() && config.webhookUrl) {
    // Production: use webhook
    const webhookPath = `/webhook/${config.botToken.split(':')[0]}`;
    const fullWebhookUrl = `${config.webhookUrl}${webhookPath}`;

    // Webhook endpoint
    app.use(webhookPath, webhookRateLimiter, webhookSecretMiddleware);
    app.use(bot.webhookCallback(webhookPath, { secretToken: config.webhookSecret }));

    // Set webhook
    try {
      await bot.telegram.setWebhook(fullWebhookUrl, {
        secret_token: config.webhookSecret,
        drop_pending_updates: true,
      });
      logger.info(`Webhook set to: ${fullWebhookUrl}`);
    } catch (error) {
      logger.error('Failed to set webhook:', error);
    }

    // Set bot commands menu
    try {
      await bot.telegram.setMyCommands([
        { command: 'start', description: 'Mulai bot' },
        { command: 'menu', description: 'Menu utama' },
        { command: 'saldo', description: 'Cek saldo' },
        { command: 'hariini', description: 'Laporan hari ini' },
        { command: 'mingguini', description: 'Laporan minggu ini' },
        { command: 'bulanini', description: 'Laporan bulan ini' },
        { command: 'laporan', description: 'Menu laporan' },
        { command: 'riwayat', description: 'Riwayat transaksi' },
        { command: 'tabungan', description: 'Target tabungan' },
        { command: 'pengingat', description: 'Pengingat keuangan' },
        { command: 'export', description: 'Ekspor laporan' },
        { command: 'bantuan', description: 'Bantuan penggunaan' },
      ]);
      logger.info('Bot commands menu set');
    } catch (error) {
      logger.error('Failed to set bot commands:', error);
    }
  } else {
    // Development: use polling
    logger.info('Starting bot in polling mode (development)...');
    bot.launch({ dropPendingUpdates: true });
  }

  // Start Express server
  app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port}`);
    logger.info(`Environment: ${config.nodeEnv}`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    bot.stop(signal);
    await prisma.$disconnect();
    process.exit(0);
  };

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
