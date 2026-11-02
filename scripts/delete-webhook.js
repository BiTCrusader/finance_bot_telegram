import 'dotenv/config';

const BOT_TOKEN = process.env.BOT_TOKEN;

async function deleteWebhook() {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ drop_pending_updates: true }),
  });

  const data = await response.json();
  console.log('Delete webhook result:', JSON.stringify(data, null, 2));
}

deleteWebhook();
