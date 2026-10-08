// Tenant registry for Yutis Host. Each B&B gets its own path (basePath),
// its own JSON database and admin login. bazar keeps its original paths
// (/bzzar for pages, /api for APIs) so its behavior is unchanged; every other
// tenant serves pages and APIs under its own slug, e.g. /tidehouse/api/...
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;

const tenants = {
  bazar: {
    slug: 'bazar',
    basePath: '/bzzar',
    apiPrefix: '',
    publicDir: path.join(ROOT, 'public'),
    dbPath: path.join(ROOT, 'db.json'),
    name: 'bazar花園',
    tradeName: '芭扎民宿',
    adminToken: 'bazar-admin-super-token-12345',
    defaultPassword: 'bazar888',
    weekendDays: [0, 5, 6], // Fri/Sat/Sun nights are holiday-priced
    holdMinutes: 0,          // no inventory: pending bookings never hold rooms
    domains: [],
    email: {
      header: '🌴 bazar花園 芭扎民宿',
      headerBg: 'linear-gradient(135deg,#3a8a50,#1e4d2b)',
      subjectTag: '【bazar花園】',
      intro: '我們已成功收到您的款項，房間已為您保留完成！民宿主人將會儘快與您電話聯繫確認交通船班資訊。',
      footer: '芭扎民宿 bazar花園｜屏東縣琉球鄉｜電話：0975-080-788',
      fallbackEmail: 'guest@bazar.idv.tw'
    }
  },
  tidehouse: {
    slug: 'tidehouse',
    idPrefix: 'TH',
    basePath: '/tidehouse',
    apiPrefix: '/tidehouse',
    publicDir: path.join(ROOT, 'public-tidehouse'),
    dbPath: path.join(ROOT, 'data', 'tidehouse.db.json'),
    name: '潮裡小木屋',
    tradeName: '潮裡小木屋',
    // Issued fresh on each server start; a restart signs the admin out.
    adminToken: 'tidehouse-' + crypto.randomBytes(16).toString('hex'),
    defaultPassword: 'tide888',
    weekendDays: [5, 6],     // Fri/Sat nights are holiday-priced
    holdMinutes: 30,         // unpaid card bookings hold the room for 30 min
    transferHoldMinutes: 24 * 60, // bank-transfer bookings hold for 24 h
    domains: ['tidehouse.localhost'], // custom-domain pointing (Host header)
    email: {
      header: 'TIDE HOUSE 潮裡小木屋',
      headerBg: 'linear-gradient(135deg,#2F6E72,#14343A)',
      subjectTag: '【潮裡小木屋】',
      intro: '我們已收到您的款項，房間已為您保留。入住前一天會再傳簡訊提醒潮汐時間與交通方式。',
      footer: '潮裡小木屋 TIDE HOUSE｜屏東縣琉球鄉（示範地址）｜訂房專線 08-000-0000（示範）',
      fallbackEmail: 'guest@tidehouse.example'
    },
    seed: () => require('./tenants/tidehouse.seed')()
  }
};

module.exports = tenants;
