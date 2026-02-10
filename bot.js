const { Telegraf, Markup } = require('telegraf');
const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const db = new Database(process.env.DATABASE_PATH || './bot.db');

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT,
    balance REAL DEFAULT 0,
    level INTEGER DEFAULT 1,
    joined_date DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    amount REAL,
    type TEXT,
    date DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Start command
bot.start((ctx) => {
  const userId = ctx.from.id;
  const username = ctx.from.username || ctx.from.first_name;
  
  const stmt = db.prepare('INSERT OR IGNORE INTO users (id, username) VALUES (?, ?)');
  stmt.run(userId, username);
  
  ctx.reply(
    `سلام ${username}! 👋\n\nبه بوت TON خوش آمدید!\n\nدستورات:\n/balance - موجودی شما\n/play - بازی کنید\n/help - کمک`,
    Markup.inlineKeyboard([
      [Markup.button.webApp('🎮 Play Now', `https://ton-bot-1-dmcx.onrender.com/game`)],
      [Markup.button.url('📱 TON Wallet', 'https://ton.org')]
    ])
  );
});

// Balance command
bot.command('balance', (ctx) => {
  const userId = ctx.from.id;
  const stmt = db.prepare('SELECT balance FROM users WHERE id = ?');
  const result = stmt.get(userId);
  const balance = result ? result.balance : 0;
  
  ctx.reply(`💰 موجودی شما: ${balance} TON`);
});

// Help command
bot.command('help', (ctx) => {
  ctx.reply(
    `📖 راهنما:\n\n` +
    `/start - شروع\n` +
    `/balance - موجودی\n` +
    `/play - بازی\n` +
    `/stats - آمار\n` +
    `/withdraw - برداشت`
  );
});

// Stats command
bot.command('stats', (ctx) => {
  const userId = ctx.from.id;
  const stmt = db.prepare('SELECT balance, level FROM users WHERE id = ?');
  const result = stmt.get(userId);
  
  if (!result) {
    ctx.reply('اطلاعات یافت نشد');
    return;
  }
  
  ctx.reply(
    `📊 آمار شما:\n\n` +
    `💰 موجودی: ${result.balance} TON\n` +
    `📈 سطح: ${result.level}`
  );
});

// Play command
bot.command('play', (ctx) => {
  ctx.reply(
    '🎮 برای بازی کردن روی دکمه زیر کلیک کنید:',
    Markup.inlineKeyboard([
      [Markup.button.webApp('🎮 بازی کنید', `https://ton-bot-1-dmcx.onrender.com/game`)]
    ])
  );
});

// Handle web app data
bot.on('web_app_data', async (ctx) => {
  const data = JSON.parse(ctx.webAppData.data);
  const userId = ctx.from.id;
  
  if (data.type === 'game_score') {
    const amount = data.score / 1000; // Convert to TON
    
    // Update balance
    const updateStmt = db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?');
    updateStmt.run(amount, userId);
    
    // Log transaction
    const txStmt = db.prepare('INSERT INTO transactions (user_id, amount, type) VALUES (?, ?, ?)');
    txStmt.run(userId, amount, 'game_reward');
    
    ctx.reply(`🎉 تبریک! شما ${amount} TON برنده شدید!`);
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.error('Error:', err);
  ctx.reply('❌ خطایی رخ داد. لطفا دوباره سعی کنید.');
});

// Start bot
bot.launch();
console.log('✅ بوت شروع شد!');

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
