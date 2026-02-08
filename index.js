const {
  default: makeWASocket,
  useMultiFileAuthState
} = require('@whiskeysockets/baileys');

const db = require('./database');

function deliveryPoints(text) {
  if (!text) return 0;
  let points = 1;
  if (text.includes("طلب")) points += 3;
  if (text.includes("من") && text.includes("إلى")) points += 5;
  if (text.includes("تم") || text.includes("وصلت")) points += 10;
  if (text.match(/\d{9,}/)) points += 5;
  if (text.length < 4) points = 0;
  return points;
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const sock = makeWASocket({ auth: state, printQRInTerminal: true });
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const userId = msg.key.participant || msg.key.remoteJid;
    const name = msg.pushName || "مستخدم";
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    db.run(`INSERT OR IGNORE INTO users (id, name) VALUES (?, ?)`, [userId, name]);
    const points = deliveryPoints(text);

    db.run(
      `UPDATE users SET points = points + ?, messages = messages + 1 WHERE id = ?`,
      [points, userId]
    );

    if (["نقاطي", "كم علي"].includes(text)) {
      db.get(`SELECT points FROM users WHERE id = ?`, [userId], async (_, row) => {
        await sock.sendMessage(msg.key.remoteJid, { text: `⭐ نقاطك: ${row.points}` });
      });
    }

    if (["ترتيب", "مين الاول"].includes(text)) {
      db.all(
        `SELECT name, points FROM users ORDER BY points DESC LIMIT 5`,
        async (_, rows) => {
          let reply = "🏆 ترتيب السواقين:\n\n";
          rows.forEach((u, i) => reply += `${i + 1}- ${u.name} ⭐ ${u.points}\n`);
          await sock.sendMessage(msg.key.remoteJid, { text: reply });
        }
      );
    }
  });
}

startBot();
