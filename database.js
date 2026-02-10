const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || './bot-data.json';

// ساختار داده
let db = {
  users: [],
  rewards: [],
  traffic_logs: []
};

// بارگذاری داده‌های موجود
const loadDatabase = () => {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      db = JSON.parse(data);
      console.log('✅ Database loaded');
    } else {
      saveDatabase();
      console.log('✅ Database initialized');
    }
  } catch (err) {
    console.error('Database load error:', err);
  }
};

// ذخیرهٔ داده‌ها
const saveDatabase = () => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('Database save error:', err);
  }
};

// کاربران
const getUser = (telegramId, callback) => {
  const user = db.users.find(u => u.telegram_id === telegramId);
  callback(null, user);
};

const createUser = (telegramId, username, language, callback) => {
  const newUser = {
    id: db.users.length + 1,
    telegram_id: telegramId,
    username: username,
    language: language,
    ton_address: null,
    consent_agreed: 0,
    consent_date: null,
    created_at: new Date().toISOString()
  };
  db.users.push(newUser);
  saveDatabase();
  callback(null);
};

const updateUserTonAddress = (telegramId, tonAddress, callback) => {
  const user = db.users.find(u => u.telegram_id === telegramId);
  if (user) {
    user.ton_address = tonAddress;
    saveDatabase();
    callback(null);
  } else {
    callback(new Error('User not found'));
  }
};

const updateConsent = (telegramId, agreed, callback) => {
  const user = db.users.find(u => u.telegram_id === telegramId);
  if (user) {
    user.consent_agreed = agreed ? 1 : 0;
    user.consent_date = new Date().toISOString();
    saveDatabase();
    callback(null);
  } else {
    callback(new Error('User not found'));
  }
};

const addReward = (telegramId, taskId, amount, callback) => {
  const newReward = {
    id: db.rewards.length + 1,
    telegram_id: telegramId,
    task_id: taskId,
    amount: amount,
    status: 'pending',
    created_at: new Date().toISOString()
  };
  db.rewards.push(newReward);
  saveDatabase();
  callback(null);
};

const getUserRewards = (telegramId, callback) => {
  const total = db.rewards
    .filter(r => r.telegram_id === telegramId && r.status === 'completed')
    .reduce((sum, r) => sum + r.amount, 0);
  callback(null, [{ total }]);
};

const getPendingRewards = (telegramId, callback) => {
  const total = db.rewards
    .filter(r => r.telegram_id === telegramId && r.status === 'pending')
    .reduce((sum, r) => sum + r.amount, 0);
  callback(null, [{ total }]);
};

const getAllUsers = (callback) => {
  callback(null, db.users);
};

loadDatabase();

module.exports = {
  getUser,
  createUser,
  updateUserTonAddress,
  updateConsent,
  addReward,
  getUserRewards,
  getPendingRewards,
  getAllUsers
};
