import 'dotenv/config';

const BOT_TOKEN = process.env.BOT_TOKEN;

async function getWebhookInfo() {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`);
  const data = await response.json();
  console.log('Webhook info:', JSON.stringify(data, null, 2));
}

getWebhookInfo();
