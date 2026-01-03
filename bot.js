require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, Events, Partials, REST, Routes, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error('❌ .env 파일에 DISCORD_TOKEN과 CLIENT_ID를 설정하세요.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Message, Partials.Channel]
});

const DATA_FILE = path.join(__dirname, 'data', 'book_counts.json');
if (!fs.existsSync(path.join(__dirname, 'data'))) fs.mkdirSync(path.join(__dirname, 'data'));

const bookList = {
  bitcoin: [
    '비트코인 01. 왜 그들만 부자가 되는가',
    '비트코인 02. 비트코인 스탠다드',
    '비트코인 03. 21가지 교훈',
    '비트코인 04. 피아트 스탠다드',
    '비트코인 05. 비트코인 낙관론',
    '비트코인 06. 레이어드 머니',
    '비트코인 07. 비트코인 디플로마',
    '비트코인 08. 비트코인 백서 해설',
    '비트코인 09. 비트코인 사용 가이드',
    '비트코인 10. 리얼 머니, 더 비트코인',
    '비트코인 11. 비트코인 블록사이즈 전쟁',
    '비트코인 12. 비트코인 핸드북'
  ],
  liberty: [
    '자유주의 01. 국가의 해부',
    '자유주의 02. 우리는 왜 매번',
    '자유주의 03. 세금의 세계사',
    '자유주의 04. 정부는 우리 화폐에',
    '자유주의 05. 경기변동 이론',
    '자유주의 06. 사이페딘 아모스 경제학',
    '자유주의 07. 백신의 배신',
    '자유주의 08. 정의된 자유',
    '자유주의 09. 새로운 자유를 찾아서',
    '자유주의 10. 민주주의: 실패한 신',
    '자유주의 11. 노예의 길',
    '자유주의 12. 자유의 윤리'
  ]
};

const allBookChannels = [...bookList.bitcoin, ...bookList.liberty];

const commands = [
  new SlashCommandBuilder().setName('독후감').setDescription('나의 독후감 통계를 확인합니다'),
  new SlashCommandBuilder().setName('초기화').setDescription('모든 채널의 기존 메시지를 스캔하여 등록합니다'),
  new SlashCommandBuilder().setName('채널목록').setDescription('독후감 채널 목록을 확인합니다')
].map(c => c.toJSON());

function loadCounts() {
  try { if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) {}
  return {};
}

function saveCounts(counts) {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(counts, null, 2)); } catch (e) {}
}

function getBookNumber(name) { const m = name.match(/(\d+)/); return m ? parseInt(m[1]) : null; }
function getCategory(name) { 
  if (bookList.bitcoin.includes(name)) return 'bitcoin';
  if (bookList.liberty.includes(name)) return 'liberty';
  return null;
}
function getReadBooks(userId, cat, counts) {
  if (!counts[userId]?.books) return [];
  return counts[userId].books.filter(b => getCategory(b) === cat).map(b => getBookNumber(b)).filter(n => n).sort((a,b) => a-b);
}
function getUnreadBooks(userId, cat, counts) {
  const read = getReadBooks(userId, cat, counts);
  return Array.from({length:12}, (_,i) => i+1).filter(n => !read.includes(n));
}

let bookCounts = loadCounts();

client.once(Events.ClientReady, async () => {
  console.log(`✅ ${client.user.tag} 봇이 준비되었습니다!`);
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    console.log('📝 슬래시 명령어 등록 중...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('✅ 슬래시 명령어 등록 완료!');
  } catch (e) { console.error('❌ 명령어 등록 오류:', e); }
  console.log(`📚 ${allBookChannels.length}개 채널 모니터링 중...`);
});

client.on(Events.MessageCreate, async (msg) => {
  if (msg.author.bot || !allBookChannels.includes(msg.channel.name)) return;
  const userId = msg.author.id, userName = msg.author.username, channelName = msg.channel.name;
  if (!bookCounts[userId]) bookCounts[userId] = { name: userName, books: [], messageIds: {} };
  if (!bookCounts[userId].messageIds) bookCounts[userId].messageIds = {};
  if (!bookCounts[userId].books.includes(channelName)) {
    bookCounts[userId].books.push(channelName);
    bookCounts[userId].messageIds[channelName] = msg.id;
    bookCounts[userId].name = userName;
    saveCounts(bookCounts);
    console.log(`✅ ${userName} - ${channelName} 등록`);
    await msg.react('✅');
  }
});

client.on(Events.InteractionCreate, async (i) => {
  if (!i.isChatInputCommand()) return;
  const { commandName, user } = i;

  if (commandName === '독후감') {
    const br = getReadBooks(user.id, 'bitcoin', bookCounts), lr = getReadBooks(user.id, 'liberty', bookCounts);
    const bu = getUnreadBooks(user.id, 'bitcoin', bookCounts), lu = getUnreadBooks(user.id, 'liberty', bookCounts);
    const embed = new EmbedBuilder().setColor(0xF7931A).setTitle('📖 나의 독후감 통계').setDescription(`${user.username}님의 독서 현황`)
      .addFields(
        { name: '₿ 비트코인', value: `✅ 완독: ${br.length}/12권\n📖 읽은 책: ${br.join(', ') || '없음'}\n📝 안 읽은 책: ${bu.join(', ') || '모두 완독!'}`, inline: false },
        { name: '🗽 자유주의', value: `✅ 완독: ${lr.length}/12권\n📖 읽은 책: ${lr.join(', ') || '없음'}\n📝 안 읽은 책: ${lu.join(', ') || '모두 완독!'}`, inline: false }
      ).setTimestamp();
    await i.reply({ embeds: [embed], flags: 64 });
  }

  else if (commandName === '초기화') {
    await i.reply({ content: '🔄 스캔 중...', flags: 64 });
    let cnt = 0, ch = 0;
    for (const cn of allBookChannels) {
      const channel = i.guild.channels.cache.find(c => c.name === cn);
      if (!channel) continue;
      ch++;
      try {
        let lastId;
        while (true) {
          const opts = { limit: 100 }; if (lastId) opts.before = lastId;
          const msgs = await channel.messages.fetch(opts);
          if (msgs.size === 0) break;
          for (const [mid, m] of msgs) {
            if (m.author.bot) continue;
            const uid = m.author.id, un = m.author.username;
            if (!bookCounts[uid]) bookCounts[uid] = { name: un, books: [], messageIds: {} };
            if (!bookCounts[uid].messageIds) bookCounts[uid].messageIds = {};
            if (!bookCounts[uid].books.includes(cn)) {
              bookCounts[uid].books.push(cn);
              bookCounts[uid].messageIds[cn] = mid;
              bookCounts[uid].name = un;
              cnt++;
            }
          }
          lastId = msgs.last().id;
        }
      } catch (e) {}
      if (ch % 5 === 0) await i.editReply(`🔄 ${ch}/${allBookChannels.length} 채널`);
    }
    saveCounts(bookCounts);
    await i.editReply(`✅ 완료! ${cnt}개 등록 (${ch}개 채널)`);
  }

  else if (commandName === '채널목록') {
    const embed = new EmbedBuilder().setColor(0xF7931A).setTitle('📋 독후감 채널 목록')
      .addFields(
        { name: '₿ 비트코인 (12권)', value: bookList.bitcoin.join('\n'), inline: false },
        { name: '🗽 자유주의 (12권)', value: bookList.liberty.join('\n'), inline: false }
      );
    await i.reply({ embeds: [embed], flags: 64 });
  }
});

client.on(Events.MessageDelete, async (msg) => {
  const mid = msg.id, cn = msg.channel?.name;
  if (!cn || !allBookChannels.includes(cn)) return;
  for (const [uid, data] of Object.entries(bookCounts)) {
    if (data.messageIds?.[cn] === mid) {
      const idx = data.books.indexOf(cn);
      if (idx > -1) data.books.splice(idx, 1);
      delete data.messageIds[cn];
      saveCounts(bookCounts);
      console.log(`🗑️ ${data.name} - ${cn} 삭제`);
      break;
    }
  }
});

client.on(Events.Error, e => console.error('Discord 오류:', e));
process.on('unhandledRejection', e => console.error('Promise 오류:', e));
client.login(TOKEN);