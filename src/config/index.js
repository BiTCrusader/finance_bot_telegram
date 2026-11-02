import 'dotenv/config';

const requiredEnvVars = ['BOT_TOKEN', 'DATABASE_URL', 'GEMINI_API_KEY', 'ALLOWED_TELEGRAM_IDS'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`ERROR: Environment variable ${envVar} is required but not set.`);
    process.exit(1);
  }
}

const config = {
  // Telegram
  botToken: process.env.BOT_TOKEN,
  webhookSecret: process.env.WEBHOOK_SECRET || 'default-secret-change-me',
  webhookUrl: process.env.WEBHOOK_URL || '',

  // Database
  databaseUrl: process.env.DATABASE_URL,

  // AI
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',

  // Access Control
  allowedTelegramIds: (process.env.ALLOWED_TELEGRAM_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean)
    .map(BigInt),

  // App
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  timezone: process.env.TZ || 'Asia/Makassar',

  // Cron
  cronSecret: process.env.CRON_SECRET || 'default-cron-secret',

  isDevelopment() {
    return this.nodeEnv === 'development';
  },

  isProduction() {
    return this.nodeEnv === 'production';
  },
};

export default config;
