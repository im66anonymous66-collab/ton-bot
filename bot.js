require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const {
  getUser,
  createUser,
  updateUserTonAddress,
  updateConsent,
  getUserRewards,
  getPendingRewards
} = require('./database');
const translations = require('./translations');

const bot = new Telegraf(process.env.BOT_TOKEN);
const userLanguages = {};
const userStates = {};

const t = (key, lang = 'en', vars = {}) => {
  let text = translations[lang]?.[key] || translations['en'][key] || key;
  Object.keys(vars).forEach(varKey => {
    text = text.replace(`{${varKey}}`, vars[varKey]);
  });
  return text;
};

bot.start((ctx) => {
  const telegramId = ctx.from.id;
  const username = ctx.from.username || 'user';

  getUser(telegramId, (err, user) => {
    if (!user) {
      createUser(telegramId, username, 'en', (err) => {
        if (err) console.error('Create user error:', err);
      });
    }

    ctx.reply(
      t('welcome', 'en'),
      Markup.inlineKeyboard([
        [Markup.button.callback(t('persian', 'en'), 'lang_fa')],
        [Markup.button.callback(t('english', 'en'), 'lang_en')]
      ])
    );
  });
});

bot.action('lang_fa', (ctx) => {
  userLanguages[ctx.from.id] = 'fa';
  ctx.answerCbQuery();
  ctx.editMessageText(t('consent_title', 'fa'));
  ctx.reply(
    t('consent_text', 'fa'),
    Markup.inlineKeyboard([
      [Markup.button.callback('✅ موافقم', 'consent_agree_fa')]
    ])
  );
});

bot.action('lang_en', (ctx) => {
  userLanguages[ctx.from.id] = 'en';
  ctx.answerCbQuery();
  ctx.editMessageText(t('consent_title', 'en'));
  ctx.reply(
    t('consent_text', 'en'),
    Markup.inlineKeyboard([
      [Markup.button.callback('✅ I Agree', 'consent_agree_en')]
    ])
  );
});

bot.action('consent_agree_fa', (ctx) => {
  const telegramId = ctx.from.id;
  const lang = 'fa';
  updateConsent(telegramId, true, (err) => {
    if (err) {
      ctx.reply(t('error', lang));
      return;
    }
    ctx.answerCbQuery();
    ctx.reply(t('agreed', lang));
    showMainMenu(ctx, lang);
  });
});

bot.action('consent_agree_en', (ctx) => {
  const telegramId = ctx.from.id;
  const lang = 'en';
  updateConsent(telegramId, true, (err) => {
    if (err) {
      ctx.reply(t('error', lang));
      return;
    }
    ctx.answerCbQuery();
    ctx.reply(t('agreed', lang));
    showMainMenu(ctx, lang);
  });
});

const showMainMenu = (ctx, lang) => {
  ctx.reply(
    t('main_menu', lang),
    Markup.keyboard([
      [t('profile', lang), t('tasks', lang)],
      [t('withdraw', lang), t('help', lang)],
      ['🎮 Play Game']
    ])
      .oneTime()
      .resize()
  );
};

bot.hears(RegExp(`^(${t('profile', 'en')}|${t('profile', 'fa')})$`), (ctx) => {
  const telegramId = ctx.from.id;
  const lang = userLanguages[telegramId] || 'en';

  getUser(telegramId, (err, user) => {
    if (err || !user) {
      ctx.reply(t('error', lang));
      return;
    }

    getUserRewards(telegramId, (err, completed) => {
      getPendingRewards(telegramId, (err, pending) => {
        const tonAddress = user.ton_address || t('no_address', lang);
        const completedAmount = completed?.[0]?.total || 0;
        const pendingAmount = pending?.[0]?.total || 0;
        const consent = user.consent_agreed ? '✅' : '❌';

        ctx.reply(
          t('profile_text', lang, {
            address: tonAddress.substring(0, 20) + '...',
            rewards: completedAmount.toFixed(2),
            pending: pendingAmount.toFixed(2),
            consent: consent
          })
        );

        if (!user.ton_address) {
          ctx.reply(t('set_address', lang));
          userStates[telegramId] = 'waiting_address';
        }
      });
    });
  });
});

bot.hears(RegExp(`^(${t('tasks', 'en')}|${t('tasks', 'fa')})$`), (ctx) => {
  const telegramId = ctx.from.id;
  const lang = userLanguages[telegramId] || 'en';

  ctx.reply(t('tasks_list', lang));
});

bot.hears(RegExp(`^(${t('help', 'en')}|${t('help', 'fa')})$`), (ctx) => {
  const telegramId = ctx.from.id;
  const lang = userLanguages[telegramId] || 'en';

  ctx.reply(t('help_text', lang));
});

bot.hears(RegExp(`^(${t('withdraw', 'en')}|${t('withdraw', 'fa')})$`), (ctx) => {
  const telegramId = ctx.from.id;
  const lang = userLanguages[telegramId] || 'en';

  getUser(telegramId, (err, user) => {
    if (!user || !user.ton_address) {
      ctx.reply(t('set_address', lang));
      userStates[telegramId] = 'waiting_address';
      return;
    }

    getUserRewards(telegramId, (err, rewardData) => {
      const balance = rewardData?.[0]?.total || 0;

      if (balance < 0.5) {
        ctx.reply(t('insufficient_balance', lang));
      } else {
        ctx.reply(
          t('withdraw_info', lang, {
            balance: balance.toFixed(2)
          }),
          Markup.inlineKeyboard([
            [Markup.button.callback('✅ Confirm', 'withdraw_confirm')],
            [Markup.button.callback('❌ Cancel', 'withdraw_cancel')]
          ])
        );
      }
    });
  });
});

bot.action('withdraw_confirm', (ctx) => {
  const telegramId = ctx.from.id;
  const lang = userLanguages[telegramId] || 'en';
  ctx.answerCbQuery();
  ctx.reply(t('withdraw_success', lang, { txid: 'TXN_' + Date.now() }));
});

bot.action('withdraw_cancel', (ctx) => {
  const telegramId = ctx.from.id;
  const lang = userLanguages[telegramId] || 'en';
  ctx.answerCbQuery();
  showMainMenu(ctx, lang);
});

bot.hears('🎮 Play Game', (ctx) => {
  const telegramId = ctx.from.id;
  const lang = userLanguages[telegramId] || 'en';

  ctx.reply(
    '🎮 Click to play the game!',
    Markup.inlineKeyboard([
      [Markup.button.webApp('🎮 Play Now', `http://localhost:3000/game`)]
    ])
  );
});

bot.on('text', (ctx) => {
  const text = ctx.message.text.trim();
  const telegramId = ctx.from.id;
  const lang = userLanguages[telegramId] || 'en';

  if (userStates[telegramId] === 'waiting_address') {
    if (text.match(/^(UQ|EQ)[A-Za-z0-9_-]{46}$/)) {
      updateUserTonAddress(telegramId, text, (err) => {
        if (err) {
          ctx.reply(t('invalid_address', lang));
        } else {
          ctx.reply(t('address_saved', lang));
          userStates[telegramId] = null;
          showMainMenu(ctx, lang);
        }
      });
    } else {
      ctx.reply(t('invalid_address', lang));
    }
  } else {
    ctx.reply(t('main_menu', lang));
  }
});

bot.catch((err, ctx) => {
  console.error('Bot error:', err);
});

module.exports = bot;
