require('dotenv').config();
const express = require('express');
const path = require('path');
const bot = require('./bot');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post('/api/claim-reward', (req, res) => {
  const { user_id, amount, taps } = req.body;

  if (!user_id || !amount) {
    return res.json({ success: false, error: 'Invalid data' });
  }

  console.log(`✅ Reward claimed: User ${user_id} earned ${amount} TON (${taps} taps)`);

  res.json({
    success: true,
    message: 'Reward claimed successfully',
    amount: amount
  });
});

app.get('/game', (req, res) => {
  res.sendFile(path.join(__dirname, 'game.html'));
});

app.get('/', (req, res) => {
  res.send('<h1>TON Bot Server Running OK</h1>');
});

app.listen(PORT, () => {
  console.log('Web server started on http://localhost:' + PORT);
});

bot.launch(() => {
  console.log('Bot started successfully!');
  console.log('Bot is listening for messages...');
});

process.once('SIGINT', () => {
  console.log('Bot stopped');
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  console.log('Bot stopped');
  bot.stop('SIGTERM');
});
