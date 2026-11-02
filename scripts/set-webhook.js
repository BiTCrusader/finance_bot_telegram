import 'dotenv/config';

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

if (!BOT_TOKEN || !WEBHOOK_URL) {
  console.error('BOT_TOKEN and WEBHOOK_URL are required');
  process.exit(1);
}

const webhookPath = `/webhook/${BOT_TOKEN.split(':')[0]}`;
const fullUrl = `${WEBHOOK_URL}${webhookPath}`;

async function setWebhook() {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: fullUrl,
      secret_token: WEBHOOK_SECRET || undefined,
      drop_pending_updates: true,
      allowed_updates: ['message', 'callback_query'],
    }),
  });

  const data = await response.json();
  console.log('Set webhook result:', JSON.stringify(data, null, 2));
  console.log('Webhook URL:', fullUrl);
}

setWebhook();
