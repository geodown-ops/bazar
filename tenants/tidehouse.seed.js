// First-run database for the 潮裡小木屋 (TIDE HOUSE) demo tenant.
// Copy and section order follow the 潮汐 homepage design. Demo bookings are
// generated relative to today so the room calendar always has something on it.
function ymd(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(base, n) {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

const img = name => `assets/${name}.jpg`;

module.exports = function seed() {
  const rooms = [
    {
      id: 'double', name: '潮汐雙人房', tag: '海景', desc: '退潮時從陽台就能看見整片潮間帶',
      intro: '面西的落地窗，傍晚四點後整間房會變成金色。退潮時從陽台就能走到潮間帶。',
      size: '6 坪', bed: '一大床', maxGuests: 2, units: 3,
      priceWeekday: 3200, priceHoliday: 4000,
      amenities: ['獨立衛浴', '海景陽台', '冷氣', '吹風機', '浴巾與盥洗用品', 'Wi-Fi'],
      images: [img('room_tide_double_full'), img('room_tide_double_detail'), img('room_tide_double_bath')]
    },
    {
      id: 'attic', name: '白屋閣樓', tag: '閣樓', desc: '斜屋頂天窗，躺著看星空',
      intro: '斜屋頂開了一扇大天窗，晴朗的夜晚關燈就能看見銀河。適合兩人安靜度假。',
      size: '5 坪', bed: '一大床', maxGuests: 2, units: 1,
      priceWeekday: 4200, priceHoliday: 5200,
      amenities: ['獨立衛浴', '天窗', '冷氣', '藍牙喇叭', '浴巾與盥洗用品', 'Wi-Fi'],
      images: [img('room_tide_attic_full'), img('room_tide_attic_detail'), img('room_tide_attic_bath')]
    },
    {
      id: 'family', name: '礁岸四人房', tag: '家庭', desc: '兩張雙人床，適合帶孩子來浮潛',
      intro: '兩張雙人床與寬敞的沖洗區，浮潛回來直接沖掉沙子。一樓出門就是礁岸步道。',
      size: '9 坪', bed: '兩大床', maxGuests: 4, units: 2,
      priceWeekday: 5400, priceHoliday: 6600,
      amenities: ['獨立衛浴', '戶外沖洗區', '冷氣', '冰箱', '兒童備品', 'Wi-Fi'],
      images: [img('room_tide_family_full'), img('room_tide_family_detail'), img('room_tide_family_bath')]
    },
    {
      id: 'suite', name: '潮間套房', tag: '套房', desc: '附客廳與餐桌，兩面大窗看礁岸',
      intro: '獨立客廳與六人餐桌，兩面大窗看出去是整片礁岸。適合家族或好友包下來慢慢住。',
      size: '12 坪', bed: '一大床＋沙發床', maxGuests: 4, units: 1,
      priceWeekday: 6200, priceHoliday: 7600,
      amenities: ['獨立衛浴', '客廳與餐桌', '雙面海景', '冷氣', '咖啡機', 'Wi-Fi'],
      images: [img('room_tide_suite_full'), img('room_tide_suite_bed'), img('room_tide_suite_detail'), img('room_tide_suite_bath')]
    }
  ];

  const siteConfig = {
    brand: {
      name: '潮裡小木屋', en: 'TIDE HOUSE', year: '2019',
      side: '跟著潮汐作息的白色小屋',
      heroSub: '小琉球 · 白浪裡深息·冷水中放情',
      address: '屏東縣琉球鄉（示範地址）', phone: '08-000-0000（示範）',
      colors: { d: '#14343A', p: '#2F6E72', t: '#DCE9E4', bg: '#EEF0EA', on: '#F3F6F2' }
    },
    hero: [img('hero_tide'), img('hero_sh2_morning'), img('hero_sh3_noon')],
    band: img('band_tide'),
    sections: {
      roomsE: '我們的房型 · 海潮木屋', roomsH: '這一晚被引力托起，我們在一段潮汐中沉浮',
      actsE: '在白屋附近 · 從東昇游到晚霞', actsH: '走入海礁，風輕水暖過一天',
      spacesE: '公共空間 · 餐廳與酒吧', spacesH: '白天在長桌吃早餐，夜裡在吧台看海',
      guideE: '島嶼玩法 · 靜鬆參茶與和揮灑汗水', guideH: '大洋小島日記由你隨興開展'
    },
    feature: { roomId: 'double', incl: ['早餐', '浮潛裝備', '機車接駁'] },
    rooms,
    acts: [
      { img: img('act_sup'), name: '立槳 SUP', desc: '清晨風平浪靜，從白屋下方的小灣出發，划在珊瑚礁上方。', time: '07:00 · 2 小時' },
      { img: img('act_bike'), name: '海岸單車', desc: '沿環島公路騎一圈約十二公里，民宿免費借單車。', time: '全天 · 自由行程' },
      { img: img('act_tea'), name: '草地下午茶', desc: '在礁岩草地擺上折疊椅和白桌布，配手作點心看海。', time: '15:00 · 住客限定' },
      { img: img('act_snorkel'), name: '淺灘浮潛', desc: '退潮時的淺水灣最適合第一次下水，教練陪你戴好面鏡。', time: '依潮汐 · 含裝備' }
    ],
    spaces: [
      { imgs: [img('space_tide_haisheng_1b'), img('space_tide_haisheng_2b')], name: '海昇', en: 'HAI SHENG', mark: 'sun',
        desc: '長橡木餐桌對著退潮的礁岸，早餐有在地漁獲、島上水果和現烤麵包。', time: '07:30 – 10:00 · 住客早餐' },
      { imgs: [img('space_tide_yueyin_1b'), img('space_tide_yueyin_2')], name: '月引', en: 'YUE YIN', mark: 'moon',
        desc: '石灰華吧台面向海上最後一道晚霞，調酒用小琉球的芒果和洛神。', time: '18:00 – 23:00 · 住客與訪客' }
    ],
    reviews: [
      { tag: '海景', text: '老闆每天把潮汐表寫在白板上，我們照著時間去看海龜，真的看到了。', who: '林小姐' },
      { tag: '閣樓', text: '閣樓的天窗太美，整晚都捨不得睡。', who: 'Kevin' },
      { tag: '家庭', text: '孩子最喜歡早上的潮間帶導覽，房間乾淨又安靜。', who: '陳先生' }
    ],
    guide: [
      { name: '蛤板灣退潮', desc: '每天兩次乾潮，民宿提供免費的潮間帶導覽。' },
      { name: '海龜浮潛', desc: '步行五分鐘到下水點，裝備可向櫃檯借。' },
      { name: '山豬溝夜觀', desc: '跟著解說員看陸蟹與夜行生物。' }
    ],
    // Generic add-ons: price × count, computed server-side
    addons: [
      { id: 'ferry', name: '東港來回船票', price: 430, unit: '人' },
      { id: 'sup', name: '立槳 SUP', price: 1200, unit: '人' },
      { id: 'snorkel', name: '淺灘浮潛（含裝備）', price: 800, unit: '人' },
      { id: 'tea', name: '草地下午茶', price: 450, unit: '人' },
      { id: 'scooter', name: '機車租借', price: 400, unit: '台·天' }
    ],
    rules: {
      checkin: '入住 15:00 後，退房 11:00 前。',
      cancel: '入住 14 天前取消全額退款；7–13 天前退 50%；7 天內恕不退款。颱風停航可免費改期。',
      payment: '銀行：示範銀行（000）琉球分行\n帳號：0000-0000-0000\n戶名：潮裡小木屋（示範）\n請於訂房後 24 小時內完成匯款，並告知帳號末五碼。'
    }
  };

  // Demo bookings around today (fictional guests)
  const today = new Date(ymd(new Date()) + 'T00:00:00Z');
  const priceOf = id => rooms.find(r => r.id === id).priceWeekday;
  const demo = [
    ['林〇〇', '0912000001', 'double', 0, 2, 'Paid'],
    ['陳〇〇', '0912000002', 'double', 0, 1, 'Paid'],
    ['黃〇〇', '0912000003', 'attic', 0, 3, 'Paid'],
    ['張〇〇', '0912000004', 'family', -2, 2, 'Completed'],
    ['吳〇〇', '0912000005', 'family', 2, 2, 'Paid'],
    ['蔡〇〇', '0912000006', 'suite', 4, 2, 'Paid'],
    ['許〇〇', '0912000007', 'double', 3, 2, 'Paid'],
    ['周〇〇', '0912000008', 'double', 3, 1, 'Paid'],
    ['鄭〇〇', '0912000009', 'double', 3, 1, 'Paid'],
    ['王〇〇', '0912000010', 'attic', 8, 2, 'Paid'],
    ['李〇〇', '0912000011', 'family', 9, 2, 'Paid'],
    ['謝〇〇', '0912000012', 'family', 9, 1, 'Paid']
  ].map(([name, phone, roomType, offset, nights, status], i) => {
    const roomPrice = priceOf(roomType) * nights;
    return {
      id: 'TH' + String(26100100 + i),
      name, phone, email: '', roomType,
      roomName: rooms.find(r => r.id === roomType).name,
      checkIn: ymd(addDays(today, offset)), checkOut: ymd(addDays(today, offset + nights)),
      nights, adults: 2, kids: 0, isSummer: false, isHolidayPackage: false,
      packages: {}, packageDetails: [], roomPrice, packagePrice: 0,
      promoCode: '', discount: 0, totalPrice: roomPrice,
      paymentStatus: status, note: '示範訂單',
      createdAt: addDays(today, offset - 10).toISOString()
    };
  });

  return {
    bookings: demo,
    settings: { adminPassword: 'tide888', paymentMethods: 'both' },
    inventory: {},
    promoCodes: [{
      code: 'TIDE300', type: 'amount', value: 300, maxUses: 0, expiresAt: '',
      note: '示範優惠碼', enabled: true, usedCount: 0, redemptions: [],
      createdAt: new Date().toISOString()
    }],
    siteConfig
  };
};
