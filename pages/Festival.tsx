import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Flame, Beef, Camera, BookOpen, Globe, Smartphone, Mic, Store, Gift,
  Users, Award, Bell, Coins, Ticket, QrCode,
  ChevronDown, FileText, CreditCard, Rocket,
  Sparkles, Star, ArrowRight, CheckCircle2, MessageSquare,
  Mail, MapPinned, Megaphone, Newspaper, Heart, TrendingUp,
  Instagram, ExternalLink,
  Building2, Plane, Share2, Utensils,
  Gamepad2, Target, MapPin
} from 'lucide-react';

// ====== 共用動畫設定 ======
// 注意：initial 與 visible 都是 opacity:1，避免 whileInView + StrictMode 偶發卡住導致內容隱藏。
// 只用 y-translate 製造輕微 slide-up 效果，若 IntersectionObserver 觸發失敗也不影響內容顯示。
const fadeUp = {
  hidden: { opacity: 1, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } }
};

const stagger = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

// ====== 平滑捲動 ======
const scrollTo = (id: string) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// ====== 報名入口（站內網頁報名表，HashRouter 路由）======
const APPLY_FORM_URL = '#/festival/apply';

// ====== Mini Header (活潑風格) ======
const FestivalHeader: React.FC = () => (
  <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/80 border-b border-amber-100 shadow-sm">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 grid place-items-center text-white font-black text-lg shadow-md">
          食
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold text-gray-900">食在力量</div>
          <div className="text-[10px] text-orange-600 font-semibold tracking-wider">燒肉祭・火鍋祭</div>
        </div>
      </div>
      <a
        href={APPLY_FORM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="px-4 sm:px-5 py-2 rounded-full bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-bold shadow-lg shadow-orange-200 hover:shadow-xl hover:scale-105 transition-all"
      >
        立即報名
      </a>
    </div>
  </header>
);

// ====== Hero ======
const Hero: React.FC = () => (
  <section className="relative min-h-screen pt-20 flex items-center overflow-hidden">
    {/* 食物照片背景 */}
    <div
      className="absolute inset-0 z-0"
      style={{
        backgroundImage: 'url(/festival/bg-hero.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    />
    {/* 淡遮罩 — 食物紋理仍是主角，只讓白字浮得出來 */}
    <div className="absolute inset-0 z-[1] bg-black/20" />
    <div className="absolute inset-0 z-[1] bg-gradient-to-br from-red-800/35 via-red-600/20 to-orange-500/15" />

    {/* 模糊裝飾色塊 */}
    <div className="absolute inset-0 overflow-hidden z-[2]">
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-yellow-300/30 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-red-400/40 blur-3xl" />
      <div className="absolute top-1/3 left-1/2 w-80 h-80 rounded-full bg-orange-300/20 blur-3xl" />
    </div>

    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 grid lg:grid-cols-2 gap-12 items-center">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="text-white"
      >
        <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/35 backdrop-blur-md border border-white/30 text-sm font-semibold mb-6">
          <Sparkles size={16} className="text-yellow-200" /> 全台餐飲業者 獨家整合行銷祭典
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="text-5xl sm:text-6xl lg:text-7xl font-black leading-tight mb-4"
          style={{ textShadow: '0 4px 24px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.5)' }}
        >
          <span className="inline-block">燒肉祭</span>
          <span className="inline-block mx-2 sm:mx-3 text-yellow-200">×</span>
          <span className="inline-block">火鍋祭</span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="text-xl sm:text-2xl text-white mb-8 leading-relaxed"
          style={{ textShadow: '0 2px 12px rgba(0,0,0,0.55)' }}
        >
          一場專為餐飲品牌打造的<br className="sm:hidden" />
          <span className="font-bold text-yellow-200">流量・會員・銷售</span>整合祭典
        </motion.p>

        <motion.div variants={fadeUp} className="flex flex-wrap gap-3 mb-8">
          {[
            { label: '上架費 專案優惠價', value: 'NT$3,000', note: '原價 NT$9,000', icon: Ticket },
            { label: '優惠券價值', value: 'NT$20,000', icon: Gift },
            { label: '行銷總價值', value: 'NT$100,000+', icon: TrendingUp }
          ].map((s) => (
            <div key={s.label} className="px-4 py-3 rounded-2xl bg-black/35 backdrop-blur-md border border-white/25">
              <div className="flex items-center gap-1.5 text-yellow-200 text-xs font-semibold mb-1">
                <s.icon size={14} /> {s.label}
              </div>
              <div className="text-xl sm:text-2xl font-black" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                {s.value}
              </div>
              {(s as { note?: string }).note && (
                <div className="text-[11px] text-white/60 line-through leading-tight">{(s as { note?: string }).note}</div>
              )}
            </div>
          ))}
        </motion.div>

        <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
          <a
            href={APPLY_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-7 py-3.5 rounded-full bg-white text-red-600 font-bold shadow-xl hover:scale-105 transition-all inline-flex items-center gap-2"
          >
            立即報名合作 <ArrowRight size={18} />
          </a>
          <button
            onClick={() => scrollTo('event-intro')}
            className="px-7 py-3.5 rounded-full bg-white/15 backdrop-blur border-2 border-white/40 text-white font-bold hover:bg-white/25 transition-all"
          >
            了解活動方案
          </button>
        </motion.div>

        {/* 美食探險隊長・麻吉貓（隊長報到） */}
        <motion.div variants={fadeUp} className="mt-8 inline-flex items-center gap-4 sm:gap-5">
          <img
            src={MASCOT.wave}
            alt="美食探險隊長 麻吉貓"
            className="w-28 sm:w-32 lg:w-36 flex-shrink-0 drop-shadow-2xl"
          />
          <div>
            <div
              className="text-xs sm:text-sm text-yellow-200 font-bold tracking-[0.3em] mb-1"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}
            >
              ✨ 本屆活動大使
            </div>
            <div
              className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-tight"
              style={{ textShadow: '0 2px 12px rgba(0,0,0,0.7), 0 0 24px rgba(0,0,0,0.5)' }}
            >
              美食探險隊長
            </div>
            <div
              className="text-base sm:text-lg lg:text-xl font-bold text-yellow-200 mt-0.5"
              style={{ textShadow: '0 2px 10px rgba(0,0,0,0.6)' }}
            >
              麻吉貓 Maji
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* 右側：火鍋燒肉 emoji 動畫卡片 */}
      <motion.div
        initial={{ opacity: 1, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="hidden lg:block relative"
      >
        <div className="grid grid-cols-2 gap-4">
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="aspect-square rounded-3xl overflow-hidden relative shadow-2xl border-2 border-white/30"
          >
            <img src="/festival/card-hotpot.jpg" alt="火鍋祭" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-white text-center">
              <div className="font-black text-2xl mb-0.5" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>火鍋祭</div>
              <div className="text-xs text-yellow-200 tracking-wider">10/1 – 11/30</div>
            </div>
          </motion.div>
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            className="aspect-square rounded-3xl overflow-hidden relative shadow-2xl border-2 border-white/30 mt-8"
          >
            <img src="/festival/card-yakiniku.jpg" alt="燒肉祭" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-white text-center">
              <div className="font-black text-2xl mb-0.5" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>燒肉祭</div>
              <div className="text-xs text-yellow-200 tracking-wider">8/1 – 9/30</div>
            </div>
          </motion.div>
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="aspect-square rounded-3xl bg-white/15 backdrop-blur border border-white/30 grid place-items-center shadow-2xl -mt-4"
          >
            <div className="text-center text-white">
              <div className="text-6xl mb-2">📱</div>
              <div className="font-bold text-lg">會員 APP</div>
              <div className="text-xs text-yellow-200 mt-1">集點・兌換</div>
            </div>
          </motion.div>
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
            className="aspect-square rounded-3xl bg-white/15 backdrop-blur border border-white/30 grid place-items-center shadow-2xl"
          >
            <div className="text-center text-white">
              <div className="text-6xl mb-2">🎁</div>
              <div className="font-bold text-lg">iPhone 17</div>
              <div className="text-xs text-yellow-200 mt-1">大獎抽獎</div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>

    {/* 下方波浪 */}
    <div className="absolute bottom-0 left-0 right-0 z-10">
      <svg viewBox="0 0 1440 100" className="w-full h-12 sm:h-20" preserveAspectRatio="none">
        <path d="M0,40 C360,100 1080,0 1440,40 L1440,100 L0,100 Z" fill="white" />
      </svg>
    </div>
  </section>
);

// ====== Mascot 角色資料（探險隊版） ======
const MASCOT = {
  jump: '/festival/mascot-explorer-jump.png',  // 跳躍 + 愛心，最有元氣
  dance: '/festival/mascot-explorer-dance.png', // 跳舞舉手
  eat: '/festival/mascot-explorer-eat.png',    // 站著吃東西
  love: '/festival/mascot-explorer-love.png',  // 害羞愛心
  gift: '/festival/mascot-explorer-gift.png',  // 從禮物盒探頭
  wave: '/festival/mascot-explorer-wave.png',  // 揮手
  rest: '/festival/mascot-explorer-rest.png'   // 趴著休息
};

// ====== 啟動記者會 ======
const LaunchEvent: React.FC = () => (
  <section className="relative py-14 sm:py-20 overflow-hidden bg-gray-950">
    {/* 背景裝飾 */}
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-32 left-1/4 w-96 h-96 rounded-full bg-red-600/20 blur-3xl" />
      <div className="absolute -bottom-32 right-1/4 w-96 h-96 rounded-full bg-orange-500/15 blur-3xl" />
    </div>

    <div className="relative max-w-5xl mx-auto px-4 sm:px-6 z-10">
      <motion.div
        initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
        className="text-center mb-10"
      >
        <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 text-xs font-bold mb-4 tracking-widest">
          <Flame size={13} /> 即將登場
        </motion.div>
        <motion.h2 variants={fadeUp} className="text-3xl sm:text-5xl font-black text-white mb-3 tracking-tight">
          7 月 8 日・啟動記者會
        </motion.h2>
        <motion.p variants={fadeUp} className="text-gray-400 text-base sm:text-lg">
          燒肉祭 × 火鍋祭 正式宣告開跑，誠摯邀請合作品牌共同出席
        </motion.p>
      </motion.div>

      {/* 時程卡片 */}
      <motion.div
        initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-10"
      >
        {/* 11:00 記者會 */}
        <motion.div variants={fadeUp} className="relative rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur p-7 group hover:border-orange-500/50 transition-all">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 grid place-items-center flex-shrink-0 shadow-lg shadow-orange-900/40">
              <Newspaper size={26} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="text-orange-400 font-black text-xl">11:00</div>
                <span className="text-orange-400/60 font-bold">–</span>
                <div className="text-orange-400 font-black text-xl">11:45</div>
              </div>
              <div className="text-white font-black text-2xl mb-2">記者會</div>
              <p className="text-gray-400 text-sm leading-relaxed mb-3">
                宣布燒肉祭 × 火鍋祭正式啟動，媒體聯訪、品牌代表致詞，現場曝光協會年度合作品牌陣容。
              </p>
              <div className="flex items-start gap-2 text-gray-300 text-sm">
                <MapPin size={16} className="text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">88號樂章</div>
                  <div className="text-gray-400">臺北市內湖區湖元里民善街 88 號 5 樓</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 13:00 產業論壇 */}
        <motion.div variants={fadeUp} className="relative rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur p-7 group hover:border-red-500/50 transition-all">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 grid place-items-center flex-shrink-0 shadow-lg shadow-red-900/40">
              <Mic size={26} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="text-red-400 font-black text-xl">13:00</div>
                <span className="text-red-400/60 font-bold">–</span>
                <div className="text-red-400 font-black text-xl">17:00</div>
              </div>
              <div className="text-white font-black text-2xl mb-2">產業論壇</div>
              <p className="text-gray-400 text-sm leading-relaxed mb-3">
                餐飲產業趨勢分享、整合行銷實戰案例解析，與各合作品牌深度交流，共同開創新客流。
              </p>
              <div className="flex items-start gap-2 text-gray-300 text-sm mb-4">
                <MapPin size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">88號樂章</div>
                  <div className="text-gray-400">臺北市內湖區湖元里民善街 88 號 5 樓</div>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Megaphone size={16} className="text-red-400" />
                  <span className="text-white font-bold text-sm">論壇焦點亮點</span>
                </div>
                <ul className="space-y-2">
                  {[
                    { brand: '一鷺炭火燒鳥工房', name: '劉士綱' },
                    { brand: '千葉集團', name: '呂秀春' },
                    { brand: '桂冠食品', name: '陳玉翎' },
                    { brand: '天帷企管', name: '林剛羽' },
                  ].map((s) => (
                    <li key={s.brand} className="flex items-center gap-2 text-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                      <span className="text-white font-semibold">{s.brand}</span>
                      <span className="text-gray-500 flex-shrink-0">·</span>
                      <span className="text-gray-300 flex-shrink-0 whitespace-nowrap">{s.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* 品牌方邀請 CTA */}
      <motion.div
        initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
        className="rounded-3xl border border-dashed border-orange-500/50 bg-orange-500/5 p-7 sm:p-10 text-center"
      >
        <div className="flex justify-center mb-4">
          <img src={MASCOT.jump} alt="麻吉貓" className="w-20 drop-shadow-xl" />
        </div>
        <h3 className="text-white font-black text-xl sm:text-2xl mb-2">合作品牌方・誠摯邀請出席 🎉</h3>
        <p className="text-gray-400 text-sm sm:text-base mb-6 max-w-xl mx-auto leading-relaxed">
          現有及有意向的合作餐廳，歡迎帶著您的夥伴一同出席。當天可與協會專員面對面洽談，確認合作細節。
        </p>
        <a
          href={APPLY_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-black text-base shadow-xl shadow-orange-900/30 hover:scale-105 transition-all"
        >
          填寫報名表・確認出席 <ArrowRight size={18} />
        </a>
      </motion.div>
    </div>
  </section>
);

// ====== 1. 協會介紹 ======
const AssociationIntro: React.FC = () => (
  <section id="association" className="relative py-20 sm:py-28 bg-white overflow-hidden">
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        variants={stagger}
        className="grid lg:grid-cols-2 gap-12 items-center"
      >
        <motion.div variants={fadeUp}>
          <div className="flex items-center gap-3 mb-4">
            <img
              src={MASCOT.wave}
              alt="麻吉貓"
              className="w-28 sm:w-36 flex-shrink-0"
            />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
              <Heart size={14} /> 關於我們
            </div>
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-6 leading-tight">
            食在力量<br />
            <span className="bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">
              連結產業，創造共好
            </span>
          </h2>
          <div className="space-y-4 text-gray-700 text-lg leading-relaxed">
            <p>
              <strong className="text-gray-900">食在力量美食產業交流協會</strong> 由全台餐飲業菁英共同發起，
              整合品牌、食材、媒體、數位、金流等資源，協助餐廳擺脫單打獨鬥。
            </p>
            <p>
              我們不只是個協會，更是您的 <strong className="text-orange-600">產業共好平台</strong>──
              辦活動、做行銷、串通路、養會員、抽大獎，讓每一間合作餐廳都被看見。
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-8">
            {[
              { value: '2,500+', label: '社群人數' },
              { value: '100+', label: '合作品牌' },
              { value: '30+', label: '年度活動' }
            ].map((s) => (
              <div key={s.label} className="text-center p-4 rounded-2xl bg-amber-50 border border-amber-100">
                <div className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">
                  {s.value}
                </div>
                <div className="text-xs text-gray-600 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* 協會年度活動類型 */}
          <div className="mt-6">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-6 h-px bg-orange-300" /> 協會年度活動類型
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { icon: Users, label: '產業論壇' },
                { icon: Utensils, label: '美食探店' },
                { icon: Building2, label: '企業參訪' },
                { icon: Share2, label: '主題通路分享會' },
                { icon: Plane, label: '國際市場分享會' }
              ].map((a) => (
                <div
                  key={a.label}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 text-sm font-semibold text-orange-700 hover:shadow-sm transition-shadow"
                >
                  <a.icon size={14} />
                  {a.label}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="relative">
          <div className="aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
            <img
              src="/festival/association-forum.jpg"
              alt="食在力量 2026 年度產業論壇大合照"
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* 底部漸層讓「食在力量」立體字 + 標題更突出 */}
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />
            {/* 照片資訊 caption */}
            <div className="absolute bottom-3 left-4 text-white text-xs font-semibold tracking-wide drop-shadow-lg">
              2026 ・ 食在力量年度產業論壇
            </div>
          </div>
          {/* 浮動裝飾卡 */}
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute -top-6 -right-6 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-3 border border-red-100"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center text-white">
              <Users size={24} />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">2,500+ 會員</div>
              <div className="text-xs text-gray-500">產業精英社群</div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  </section>
);

// ====== 1.5 認識活動大使「麻吉貓」 ======
const MascotIntro: React.FC = () => (
  <section id="mascot" className="relative py-20 sm:py-28 overflow-hidden bg-gradient-to-b from-amber-50 via-pink-50 to-orange-50">
    {/* 背景裝飾愛心 + 圓點 */}
    <div className="absolute inset-0 pointer-events-none opacity-50">
      <div className="absolute top-10 left-10 text-pink-200 text-4xl select-none">♥</div>
      <div className="absolute top-32 right-20 text-amber-200 text-5xl select-none">★</div>
      <div className="absolute bottom-20 left-1/4 text-rose-200 text-3xl select-none">♥</div>
      <div className="absolute top-1/2 right-1/3 text-yellow-200 text-4xl select-none">✦</div>
      <div className="absolute bottom-32 right-12 text-pink-200 text-5xl select-none">♥</div>
    </div>

    <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
      {/* 主視覺：左文字、右大貓 */}
      <div className="grid lg:grid-cols-[1fr_auto] gap-8 lg:gap-12 items-center">
        <motion.div
          initial={{ x: -30 }}
          whileInView={{ x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100 text-pink-700 text-xs font-bold mb-4">
            <Sparkles size={14} /> 本屆活動大使・獨家加持
          </div>
          <h2 className="text-4xl sm:text-6xl font-black text-gray-900 mb-3 leading-tight">
            美食探險隊長
            <br />
            <span className="bg-gradient-to-r from-red-600 via-pink-500 to-orange-500 bg-clip-text text-transparent">
              麻吉貓 Maji
            </span>
          </h2>
          <p className="text-gray-700 text-lg leading-relaxed mb-6">
            這次燒肉祭 × 火鍋祭由全台最萌的<strong className="text-pink-600">麻吉貓 IP</strong>擔任活動大使，
            帶著消費者一路探索 <strong>100+ 合作餐廳</strong>，
            集點、領券、抽 iPhone — 把吃飯變成一場可愛的<strong className="text-orange-600">美食探險</strong>。
          </p>

          {/* 3 個能力標籤 */}
          <div className="flex flex-wrap gap-2">
            {[
              { icon: '🍖', text: '帶你探索 100+ 餐廳' },
              { icon: '🎫', text: '收集點數兌換好康' },
              { icon: '🎁', text: '大獎抽獎驚喜不斷' }
            ].map((t) => (
              <div key={t.text} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border-2 border-pink-200 text-sm font-bold text-gray-800 shadow-sm">
                <span className="text-base">{t.icon}</span> {t.text}
              </div>
            ))}
          </div>
        </motion.div>

        {/* 右側大跳躍貓 — 不做 opacity 動畫避免 whileInView 卡住變半透明 */}
        <motion.div
          initial={{ scale: 0.7 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative flex-shrink-0 mx-auto"
        >
          {/* 後方光暈 */}
          <div className="absolute inset-0 bg-gradient-to-br from-pink-300/40 via-amber-200/30 to-orange-300/40 blur-3xl rounded-full" />
          <img
            src={MASCOT.jump}
            alt="麻吉貓"
            className="relative w-56 sm:w-72 lg:w-80"
          />
        </motion.div>
      </div>

      {/* 下方：6 種表情/動作展示 — 不做 opacity 動畫 */}
      <motion.div
        initial={{ y: 20 }}
        whileInView={{ y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-12 sm:mt-16"
      >
        <div className="text-xs font-bold tracking-[0.3em] uppercase text-pink-600 mb-4 text-center">
          ── 多種表情・每場景都陪你 ──
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { src: MASCOT.dance, label: '招呼' },
            { src: MASCOT.eat, label: '吃飯' },
            { src: MASCOT.love, label: '心動' },
            { src: MASCOT.gift, label: '驚喜' },
            { src: MASCOT.rest, label: '滿足' },
            { src: MASCOT.wave, label: '出發' }
          ].map((m, i) => (
            <motion.div
              key={m.label}
              whileHover={{ y: -6, scale: 1.05 }}
              className="aspect-square bg-white rounded-2xl shadow-md p-3 flex flex-col items-center justify-center border-2 border-pink-100 hover:border-pink-300 transition-colors"
            >
              <img src={m.src} alt={m.label} className="w-full max-h-16 sm:max-h-20 object-contain" />
              <div className="text-[10px] sm:text-xs font-bold text-pink-700 mt-1">{m.label}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  </section>
);

// ====== 2. 活動介紹 (七大曝光矩陣 + 五階段旅程) ======
const exposureItems = [
  { icon: Camera, title: '網紅 IG 圖文曝光', desc: '提供 2 個網紅曝光，內容授權 1 年使用（可加價升級短影音或增加數量）', color: 'from-pink-500 to-rose-500' },
  { icon: BookOpen, title: '托可生活誌專訪', desc: '托可生活誌專欄深度內容報導與曝光', color: 'from-purple-500 to-pink-500' },
  { icon: Globe, title: '官網品牌牆', desc: '食在力量官網品牌牆推薦，外加超過 2,500 人的產業社群曝光', color: 'from-blue-500 to-cyan-500' },
  { icon: Smartphone, title: 'App 品牌牆', desc: '食在力量專屬 App 品牌牆推薦，數位會員直接導流', color: 'from-emerald-500 to-teal-500' },
  { icon: Mic, title: '新聞稿大量曝光', desc: '結合記者會創造極大媒體聲量，全台媒體露出', color: 'from-amber-500 to-orange-500' },
  { icon: Store, title: '實體宣傳物', desc: '提供專屬櫃檯立牌與合作餐廳貼紙，現場感再加分', color: 'from-red-500 to-orange-500' },
  { icon: Gift, title: '贊助商食材', desc: '提供餐廳做限時加購優惠或招待，增加客單價或顧客滿意度', color: 'from-yellow-500 to-amber-500' }
];

const journeyStages = [
  {
    no: '01',
    title: '流量來源',
    subtitle: '引爆品牌聲量',
    color: 'from-red-500 to-rose-600',
    items: [
      { icon: Newspaper, title: '多元媒體佈局引流', desc: '大量媒體新聞稿、托可生活誌專欄、食在力量官網品牌牆，提升市場地位', stat: '2,500+', statUnit: '人', statLabel: '產業社群' },
      { icon: Megaphone, title: '社群與口碑擴散', desc: 'KOL/KOC 圖文短影音 × 演算法社群廣告，吸引目標客群', stat: '300+', statUnit: '篇', statLabel: 'KOL 圖文短影音' },
      { icon: QrCode, title: '線下場景導流', desc: '餐廳現場 QR Code 立牌/海報，引導累積點數與抽獎', stat: '20,000+', statUnit: '人', statLabel: 'LINE 會員' }
    ]
  },
  {
    no: '02',
    title: '參加方式',
    subtitle: '數位會員留存',
    color: 'from-orange-500 to-amber-600',
    items: [
      { icon: Smartphone, title: '下載 APP 與加 LINE 好友', desc: '建立食在力量 C 端會員池' },
      { icon: Gift, title: '首次註冊激勵', desc: '加入好友即贈 100 點（可用於優惠券兌換）' }
    ]
  },
  {
    no: '03',
    title: '輕鬆集點',
    subtitle: '邊玩邊累積・餐廳零負擔',
    color: 'from-amber-500 to-yellow-600',
    items: [
      { icon: MessageSquare, title: '加 LINE 好友', desc: '加入官方 LINE 好友即贈點數' },
      { icon: Smartphone, title: '下載 APP', desc: '完成 APP 註冊登入即累積點數' },
      { icon: Share2, title: '推薦好友', desc: '推薦朋友加入活動，雙方都拿點' },
      { icon: Gamepad2, title: '玩小遊戲', desc: 'APP 內限定小遊戲，邊玩邊集點' }
    ]
  },
  {
    no: '04',
    title: '點數兌換',
    subtitle: '激勵回流與大獎請因',
    color: 'from-emerald-500 to-teal-600',
    items: [
      { icon: Ticket, title: '各品牌優惠券兌換', desc: '兌換合作餐廳餐券、餐飲體驗券等實體贈品' },
      { icon: Award, title: '高價值獎項抽獎', desc: 'iPhone 17 與 iPhone 17 Pro 抽獎券，引爆活動熱度' }
    ]
  },
  {
    no: '05',
    title: '推播溝通',
    subtitle: '持續經營與提題',
    color: 'from-blue-500 to-indigo-600',
    items: [
      { icon: Bell, title: '自動化推播提醒', desc: 'APP/LINE 系統提醒消費者使用快到期的優惠券' },
      { icon: MessageSquare, title: '兌換與抽獎進度通知', desc: '主動推播點數可兌換、活動週期循環經營' }
    ]
  }
];

const EventIntro: React.FC = () => (
  <section id="event-intro" className="relative py-20 sm:py-28 bg-gradient-to-b from-amber-50 to-orange-50 overflow-hidden">
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      {/* 標題 */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={stagger}
        className="text-center mb-16"
      >
        <img
          src={MASCOT.jump}
          alt="麻吉貓"
          className="mx-auto w-48 sm:w-56 mb-4"
        />
        <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold mb-4">
          <Flame size={14} /> 活動方案
        </motion.div>
        <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-black text-gray-900 mb-4">
          七大曝光矩陣
        </motion.h2>
        <motion.p variants={fadeUp} className="text-gray-600 text-lg max-w-2xl mx-auto">
          火鍋祭 / 燒肉祭 獨家合作餐廳專屬資源，
          <br className="hidden sm:block" />
          <strong className="text-orange-600">上架費 <span className="line-through text-orange-400 font-normal">NT$9,000</span> 專案優惠價 NT$3,000 + NT$20,000 優惠券 可獲得：</strong>
        </motion.p>
      </motion.div>

      {/* 七大曝光卡片 */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        variants={stagger}
        className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        {exposureItems.map((it, i) => (
          <motion.div
            key={it.title}
            variants={fadeUp}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            className={`relative p-6 rounded-3xl bg-white shadow-lg hover:shadow-2xl transition-all border border-orange-100 overflow-hidden group ${
              i === 6 ? 'sm:col-span-2 lg:col-span-1' : ''
            }`}
          >
            <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${it.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${it.color} grid place-items-center text-white shadow-md mb-4`}>
              <it.icon size={28} />
            </div>
            <div className="text-xs font-bold text-orange-500 mb-1">No.{(i + 1).toString().padStart(2, '0')}</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{it.title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{it.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);

const MarketingRoadmap: React.FC = () => (
  <section id="marketing-roadmap" className="relative py-20 sm:py-28 bg-gradient-to-b from-amber-50 to-orange-50 overflow-hidden">
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      {/* 五階段導客旅程 */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={stagger}
      >
        <motion.div variants={fadeUp} className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold mb-4">
            <Rocket size={14} /> 行銷導客旅程
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-3">
            五階段行銷藍圖
          </h2>
          <p className="text-gray-600 text-lg">
            從流量、會員、消費、回流到再行銷，<strong className="text-red-600">完整閉環</strong>
          </p>
        </motion.div>

        <div className="space-y-5">
          {journeyStages.map((stage, idx) => (
            <motion.div
              key={stage.no}
              variants={fadeUp}
              className="relative bg-white rounded-3xl shadow-lg p-6 sm:p-8 border border-orange-100"
            >
              <div className="grid lg:grid-cols-[200px_1fr] gap-6 items-start">
                <div>
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${stage.color} mb-2`}>
                    階段 {stage.no}
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 leading-tight">{stage.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{stage.subtitle}</p>
                </div>
                <div className={`grid gap-3 ${
                  stage.items.length === 4 ? 'md:grid-cols-2 lg:grid-cols-4' :
                  stage.items.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'
                }`}>
                  {stage.items.map((item) => {
                    // optional stat (only some items have it)
                    const stat = (item as { stat?: string }).stat;
                    const statUnit = (item as { statUnit?: string }).statUnit;
                    const statLabel = (item as { statLabel?: string }).statLabel;
                    return (
                      <div key={item.title} className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-orange-100 relative">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stage.color} grid place-items-center text-white flex-shrink-0`}>
                            <item.icon size={20} />
                          </div>
                          {stat && (
                            <div className="text-right">
                              <div className="flex items-baseline justify-end gap-1 leading-none">
                                <span className={`text-2xl sm:text-[28px] font-black bg-gradient-to-br ${stage.color} bg-clip-text text-transparent`}>
                                  {stat}
                                </span>
                                {statUnit && (
                                  <span className="text-sm font-bold text-gray-500/80">
                                    {statUnit}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-600 font-bold mt-1">{statLabel}</div>
                            </div>
                          )}
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm mb-1">{item.title}</h4>
                        <p className="text-xs text-gray-600 leading-relaxed">{item.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              {idx < journeyStages.length - 1 && (
                <div className="hidden lg:flex absolute -bottom-4 left-1/2 -translate-x-1/2 z-10">
                  <div className="w-8 h-8 rounded-full bg-white border-2 border-orange-300 grid place-items-center shadow">
                    <ChevronDown size={18} className="text-orange-500" />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* 價值總結 */}
        <motion.div
          variants={fadeUp}
          className="mt-12 relative rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* 背景燒肉照片 */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'url(/festival/bg-section.jpg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
          {/* 淡遮罩 — 跟 Hero 一致，食物紋理為主 */}
          <div className="absolute inset-0 bg-black/25" />
          <div className="absolute inset-0 bg-gradient-to-r from-red-800/40 via-red-600/25 to-orange-500/20" />

          {/* 內容 */}
          <div className="relative p-8 sm:p-12 text-white text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/35 backdrop-blur-md border border-white/25 text-xs font-bold mb-4">
              <Sparkles size={14} className="text-yellow-200" /> 價值換算
            </div>
            <h3 className="text-2xl sm:text-4xl font-black mb-1" style={{ textShadow: '0 2px 16px rgba(0,0,0,0.55), 0 0 32px rgba(0,0,0,0.3)' }}>
              上架費專案優惠價 NT$3,000 + NT$20,000 優惠券
            </h3>
            <div className="text-white/70 text-base sm:text-lg mb-3 line-through" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>上架費原價 NT$9,000</div>
            <div className="text-yellow-200 text-2xl sm:text-3xl mb-3" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>換得</div>
            <h3 className="text-3xl sm:text-5xl font-black mb-4" style={{ textShadow: '0 4px 24px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.5)' }}>
              總價值超過 NT$100,000+
            </h3>
            <p className="text-white text-lg" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
              整合行銷流量・營運工具
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  </section>
);

// ====== 2.2 八大曝光管道（觸及力） ======
const exposureChannels = [
  { icon: Camera, stat: '300篇+', sub: '網紅圖文 / 影音', title: '網紅開箱矩陣', desc: '每個品牌配置 2 位網紅開箱，下半年大量曝光燒肉祭 / 火鍋祭', color: 'from-pink-500 to-rose-500' },
  { icon: Mic, stat: '30家+', sub: '線上媒體', title: '啟動記者會', desc: '7/8 燒肉祭 / 火鍋祭啟動記者會，串聯大量線上媒體報導', color: 'from-amber-500 to-orange-500' },
  { icon: Globe, stat: '官網·FB·IG', sub: '協會自媒體', title: '食在力量官方社群', desc: '協會官方網站與 FB / IG 社群同步露出', color: 'from-blue-500 to-cyan-500' },
  { icon: Users, stat: '2,500人+', sub: '精準 B 端', title: '產業老闆群組', desc: '食在力量美食產業老闆社群，直接觸及決策者', color: 'from-red-500 to-orange-500' },
  { icon: BookOpen, stat: '100萬+/月', sub: '瀏覽量', title: '托可生活誌', desc: '托可生活誌官網與 FB / IG，每月百萬級流量曝光', color: 'from-purple-500 to-pink-500' },
  { icon: Star, stat: '5,000名+', sub: '網紅資料庫', title: '呼叫KOL 私域', desc: '呼叫KOL 平台逾五千名網紅私域擴散', color: 'from-fuchsia-500 to-purple-500' },
  { icon: Building2, stat: '10,000名+', sub: '私域名單', title: '寶興盛人力派遣', desc: '寶興盛人力派遣逾萬名私域名單同步觸及', color: 'from-teal-500 to-emerald-500' },
  { icon: Share2, stat: '獎勵機制', sub: '社群裂變', title: '消費者互動分享', desc: '搭配點數 / 抽獎獎勵，驅動消費者自主分享擴散', color: 'from-indigo-500 to-blue-500' },
];

const ExposureChannels: React.FC = () => (
  <section id="exposure-reach" className="relative py-20 sm:py-28 bg-gradient-to-b from-white to-amber-50 overflow-hidden">
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-14">
        <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold mb-4">
          <Megaphone size={14} /> 全方位曝光
        </motion.div>
        <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-black text-gray-900 mb-4">
          8 大曝光管道・全面引爆聲量
        </motion.h2>
        <motion.p variants={fadeUp} className="text-gray-600 text-lg max-w-2xl mx-auto">
          下半年燒肉祭 / 火鍋祭，從 <strong className="text-orange-600">B 端產業</strong> 到 <strong className="text-orange-600">C 端消費者</strong>、從主流媒體到私域名單，多管齊下觸及百萬級受眾。
        </motion.p>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        variants={stagger}
        className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        {exposureChannels.map((c) => (
          <motion.div
            key={c.title}
            variants={fadeUp}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            className="relative p-6 rounded-3xl bg-white shadow-lg hover:shadow-2xl transition-all border border-orange-100 overflow-hidden group"
          >
            <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${c.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${c.color} grid place-items-center text-white shadow-md mb-4`}>
              <c.icon size={28} />
            </div>
            <div className={`text-2xl sm:text-3xl font-black bg-gradient-to-br ${c.color} bg-clip-text text-transparent leading-none`}>{c.stat}</div>
            <div className="text-xs text-gray-400 font-bold mt-1 mb-2">{c.sub}</div>
            <h3 className="text-base font-bold text-gray-900 mb-1">{c.title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{c.desc}</p>
          </motion.div>
        ))}
      </motion.div>

      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="mt-10 flex justify-center">
        <div className="inline-flex flex-wrap items-center justify-center gap-x-6 gap-y-2 px-6 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 text-white font-bold shadow-xl text-center">
          <span>私域名單合計 <span className="text-yellow-200">17,500+</span></span>
          <span className="hidden sm:inline opacity-40">|</span>
          <span>網紅內容 <span className="text-yellow-200">300篇+</span></span>
          <span className="hidden sm:inline opacity-40">|</span>
          <span>合作媒體月流量 <span className="text-yellow-200">100萬+</span></span>
        </div>
      </motion.div>
    </div>
  </section>
);

// ====== 2.5 品牌牆（參加活動的合作餐廳） ======
type BrandEntry = { name: string; category: string; logo?: string };

const yakinikuBrands: BrandEntry[] = [
  { name: '屋馬燒肉', category: '燒肉名店', logo: '/festival/brand-umma.png' },
  { name: '尚屋韓式烤肉', category: '韓式烤肉', logo: '/festival/brand-sangok.jpg' },
  { name: '燒肉眾', category: '燒肉名店', logo: '/festival/brand-sioumazang.jpg' },
  { name: '榮次郎', category: '燒肉名店', logo: '/festival/brand-eijiro.jpg' },
  { name: '鹿兒島', category: '日式燒肉', logo: '/festival/brand-kagoshima.jpg' },
  { name: '狸小路燒肉', category: '日式燒肉', logo: '/festival/brand-tanukikoji.png' },
  { name: '延香炭食', category: '炭火燒肉', logo: '/festival/brand-yanxiang.jpg' },
  { name: '老井極上燒肉', category: '極上和牛', logo: '/festival/brand-laojin.png' },
  { name: '一鷺燒肉', category: '日式燒肉', logo: '/festival/brand-ichiro.jpg' },
  { name: '焦糖楓', category: '燒肉名店', logo: '/festival/brand-maple.jpg' },
  { name: '烤烤豬', category: '日式燒肉', logo: '/festival/brand-kaokao.jpg' },
  { name: '炭伙居酒屋', category: '燒肉名店', logo: '/festival/brand-tankaho.jpg' },
  { name: '純水燒肉', category: '燒肉名店', logo: '/festival/brand-chunshui.jpg' },
  { name: '一頭牛日式燒肉', category: '日式燒肉', logo: '/festival/brand-yitouniu.png' },
  { name: 'Char Char Steak & Bar', category: '牛排酒吧', logo: '/festival/brand-charchar.jpg' },
  { name: '燒肉smile', category: '日式燒肉', logo: '/festival/brand-smile.jpeg' },
  { name: '大河屋', category: '日式燒肉', logo: '/festival/brand-dahewu.png' },
  { name: '八色烤肉mini', category: '韓式烤肉', logo: '/festival/brand-basei.png' },
  { name: '精誠壹山燒肉', category: '燒肉名店', logo: '/festival/brand-yishan.jpeg' },
  { name: '脂本燒肉', category: '燒肉名店', logo: '/festival/brand-zhiben.jpeg' },
  { name: '知火熟成燒肉', category: '熟成燒肉', logo: '/festival/燒肉logo/知火熟成燒肉logo.jpg' },
  // ─── 移至最後 ───
  { name: '燒肉來1喀', category: '燒肉名店', logo: '/festival/brand-laika.jpg' }
];

// 火鍋品牌：logo 放入 public/festival/火鍋logo/ 後加到此陣列
const hotpotBrands: BrandEntry[] = [
  { name: '千葉火鍋', category: '涮涮鍋', logo: '/festival/brand-chiba.webp' },
  { name: '雞湯大叔', category: '雞湯鍋', logo: '/festival/brand-jitangdashu.jpg' },
  { name: '撈王', category: '養生鍋', logo: '/festival/brand-laowang.jpeg' },
  { name: '賴山嶼', category: '鍋物', logo: '/festival/brand-laishanyu.jpeg' },
  { name: '築間幸福鍋物', category: '精緻鍋物', logo: '/festival/brand-zhujian.jpg' },
  { name: '二本松涮涮屋', category: '涮涮鍋', logo: '/festival/brand-nihonmatsu.jpg' },
  { name: '橋山壽喜燒', category: '壽喜燒', logo: '/festival/brand-hashiyama.jpg' },
  { name: '祇園禪院壽喜燒', category: '壽喜燒', logo: '/festival/brand-gion.jpg' },
  { name: '馫麻辣', category: '麻辣鍋', logo: '/festival/brand-xunmala.jpg' },
  { name: '川鳳港式麻辣雞煲火鍋', category: '港式火鍋', logo: '/festival/brand-chuanfeng.jpg' },
  { name: '百味釜精緻鍋物', category: '精緻鍋物', logo: '/festival/brand-baiweiku.jpg' },
  { name: '老東家重慶麻辣鍋', category: '麻辣鍋', logo: '/festival/brand-laodongja.jpg' },
  { name: '草原風蒙古火鍋', category: '蒙古火鍋', logo: '/festival/brand-caoyuan.jpg' },
  { name: '米釉鍋物', category: '精緻鍋物', logo: '/festival/brand-miyou.jpg' },
  { name: '潮牛殿', category: '潮汕鍋物', logo: '/festival/brand-chaoniudian.jpg' },
  { name: '聚食釜', category: '精緻鍋物', logo: '/festival/brand-jushifu.jpg' },
  { name: '老井麻神', category: '鍋物', logo: '/festival/brand-laojin-mashen.jpg' },
  { name: '尚石苑', category: '精緻鍋物', logo: '/festival/brand-shangshiyuan.jpg' },
  { name: '徐泰山汕頭火鍋', category: '汕頭鍋物', logo: '/festival/brand-xutaishan.png' },
  { name: '今之旬', category: '鍋物', logo: '/festival/brand-jinzhixun.png' },
  { name: '百年土種蔘雞湯', category: '雞湯鍋', logo: '/festival/brand-bainian.png' },
  { name: '鍋泰暖', category: '鍋物', logo: '/festival/brand-guotainan.png' },
  { name: '聰明鍋', category: '鍋物', logo: '/festival/火鍋logo/聰明鍋logo.jpeg' },
  { name: '李鐵柱', category: '麻辣燙', logo: '/festival/火鍋logo/李鐵柱logo.jpeg' },
  { name: '蘇記嘀兜雞', category: '雞煲', logo: '/festival/火鍋logo/蘇記嘀兜雞logo.jpeg' }
];

const BrandGrid: React.FC<{ brands: BrandEntry[]; showCta?: boolean }> = ({ brands, showCta }) => (
  <motion.div
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, margin: '-50px' }}
    variants={stagger}
    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4"
  >
    {brands.map((b) => (
      <motion.div
        key={b.name}
        variants={fadeUp}
        whileHover={{ y: -4 }}
        className="aspect-square rounded-2xl bg-white shadow-md hover:shadow-xl transition-all border border-orange-100 overflow-hidden group flex flex-col"
      >
        {b.logo ? (
          <div className="w-full h-full grid place-items-center bg-gray-50/30 overflow-hidden">
            <img src={b.logo} alt={`${b.name} logo`} className="w-full h-full object-contain group-hover:scale-105 transition-transform" loading="lazy" />
          </div>
        ) : (
          <div className="h-full grid place-items-center p-5 text-center">
            <div className="text-xl sm:text-2xl font-black text-gray-900 group-hover:bg-gradient-to-r group-hover:from-red-600 group-hover:to-orange-500 group-hover:bg-clip-text group-hover:text-transparent transition-all">
              {b.name}
            </div>
          </div>
        )}
      </motion.div>
    ))}

    {showCta && (
      /* 「下一個是您嗎」CTA 卡片 — 麻吉貓加持 */
      <motion.a
        variants={fadeUp}
        href={APPLY_FORM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="aspect-square rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-dashed border-orange-300 grid place-items-center p-5 hover:border-orange-500 hover:bg-orange-100/50 transition-all group relative overflow-hidden cursor-pointer"
      >
        <img
          src={MASCOT.gift}
          alt="麻吉貓在禮物盒"
          className="absolute -bottom-2 -right-2 w-20 opacity-90 group-hover:scale-110 group-hover:rotate-6 transition-transform"
        />
        <div className="text-center relative z-10">
          <div className="text-base font-bold text-orange-700">您的品牌</div>
          <div className="text-xs text-orange-600 mt-0.5">下一個就是你 →</div>
          <div className="text-[10px] text-pink-600 mt-1 font-semibold">麻吉貓在等你 ♥</div>
        </div>
      </motion.a>
    )}
  </motion.div>
);

const BrandWall: React.FC = () => (
  <section id="brand-wall" className="py-20 sm:py-28 bg-white">
    <div className="max-w-7xl mx-auto px-4 sm:px-6">

      {/* ─── 區塊標題 ─── */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={stagger}
        className="text-center mb-14"
      >
        <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold mb-4">
          <Store size={14} /> 已加入合作餐廳
        </motion.div>
        <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-black text-gray-900 mb-4">
          品牌牆
        </motion.h2>
        <motion.p variants={fadeUp} className="text-gray-600 text-lg max-w-2xl mx-auto">
          與我們<strong className="text-orange-600">攜手共創流量</strong>的餐飲品牌
        </motion.p>
      </motion.div>

      {/* ─── 燒肉品牌 ─── */}
      <div className="mb-14">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">🥩</span>
          <h3 className="text-2xl sm:text-3xl font-black text-gray-800">燒肉品牌</h3>
          <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
            {yakinikuBrands.length} 間
          </span>
        </div>
        <BrandGrid brands={yakinikuBrands} showCta={false} />
      </div>

      {/* ─── 分隔線 ─── */}
      <div className="border-t border-dashed border-gray-200 my-10" />

      {/* ─── 火鍋品牌 ─── */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">🍲</span>
          <h3 className="text-2xl sm:text-3xl font-black text-gray-800">火鍋品牌</h3>
          {hotpotBrands.length > 0 && (
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
              {hotpotBrands.length} 間
            </span>
          )}
        </div>

        {hotpotBrands.length > 0 ? (
          <BrandGrid brands={hotpotBrands} showCta={true} />
        ) : (
          /* 空狀態：即將公布 + CTA */
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4"
          >
            {/* 3 個「即將加入」佔位卡 */}
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="aspect-square rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 border border-dashed border-blue-200 grid place-items-center"
              >
                <div className="text-center px-3">
                  <div className="text-2xl mb-1">❄️</div>
                  <div className="text-xs font-bold text-blue-400">即將加入</div>
                </div>
              </motion.div>
            ))}
            {/* CTA 卡 */}
            <motion.a
              variants={fadeUp}
              href={APPLY_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="aspect-square rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-dashed border-orange-300 grid place-items-center p-5 hover:border-orange-500 hover:bg-orange-100/50 transition-all group relative overflow-hidden cursor-pointer"
            >
              <img
                src={MASCOT.gift}
                alt="麻吉貓在禮物盒"
                className="absolute -bottom-2 -right-2 w-20 opacity-90 group-hover:scale-110 group-hover:rotate-6 transition-transform"
              />
              <div className="text-center relative z-10">
                <div className="text-base font-bold text-orange-700">您的品牌</div>
                <div className="text-xs text-orange-600 mt-0.5">下一個就是你 →</div>
                <div className="text-[10px] text-pink-600 mt-1 font-semibold">麻吉貓在等你 ♥</div>
              </div>
            </motion.a>
          </motion.div>
        )}
      </div>

    </div>
  </section>
);

// ====== 2.6 主辦・協辦・贊助 ======
const credits = {
  organizer: [
    { name: '食在力量美食產業交流協會', role: '產業共好平台', icon: Award, color: 'from-red-600 to-orange-500', logo: '/festival/logo-foodpower.jpg' }
  ],
  coOrganizer: [
    { name: '托可生活誌', role: '媒體深度報導', icon: BookOpen, color: 'from-purple-500 to-pink-500', logo: '/festival/logo-talkace.jpg' },
    { name: '呼叫KOL', role: '網紅媒合平台', icon: Camera, color: 'from-pink-500 to-rose-500', logo: '/festival/logo-callkol.png' },
    { name: 'Mobile.Cards', role: 'APP 技術夥伴', icon: Smartphone, color: 'from-emerald-500 to-teal-500', logo: '/festival/logo-mobilecards.png' },
    { name: 'Oddle', role: '餐廳營收成長系統', icon: Store, color: 'from-orange-500 to-amber-500', logo: '/festival/協辦單位-oddle.png' },
    { name: '可可食集', role: '餐飲訂供貨平台', icon: Utensils, color: 'from-teal-500 to-cyan-500', logo: '/festival/協辦單位-可可食集logo.jpg' }
  ],
  sponsor: [
    // 顯示順序依主辦方指定
    { name: '桂冠食品', role: '食材贊助', icon: Gift, color: 'from-amber-500 to-orange-500', logo: '/festival/logo-laurel.png' },
    { name: '南橋讚岐烏龍麵', role: '麵品贊助', icon: Gift, color: 'from-orange-500 to-red-500', logo: '/festival/logo-nanqiao.jpeg' },
    { name: '鮮乳坊', role: '乳品贊助', icon: Gift, color: 'from-sky-500 to-blue-500', logo: '/festival/logo-xianrufang.jpeg' },
    { name: '金色三麥', role: '飲品贊助', icon: Gift, color: 'from-amber-500 to-yellow-500', logo: '/festival/贊助商-金色三麥logo.jpg' },
    { name: '大苑子', role: '飲品贊助', icon: Gift, color: 'from-lime-500 to-green-500', logo: '/festival/logo-dayuanzi.jpg' },
    { name: '春一枝', role: '冰品贊助', icon: Gift, color: 'from-rose-500 to-pink-500', logo: '/festival/logo-chunyizhi.png' },
    { name: '福德生活', role: '食材贊助', icon: Gift, color: 'from-yellow-500 to-amber-500', logo: '/festival/logo-fude.jpg' },
    { name: '龜甲萬', role: '調味贊助', icon: Gift, color: 'from-red-500 to-orange-500', logo: '/festival/贊助商-龜甲萬.png' },
    { name: '黑蜜豬', role: '食材贊助', icon: Gift, color: 'from-stone-500 to-amber-600', logo: '/festival/贊助商-黑蜜豬logo.jpg' },
    { name: '根島生態蝦', role: '海鮮贊助', icon: Gift, color: 'from-teal-500 to-emerald-500', logo: '/festival/贊助商-根島生態蝦logo.jpg' },
    { name: '史偉莎', role: '用品贊助', icon: Gift, color: 'from-cyan-500 to-blue-500', logo: '/festival/logo-shiweisha.jpg' },
    { name: '兔兔酒', role: '酒品贊助', icon: Gift, color: 'from-pink-400 to-rose-400', logo: '/festival/贊助商-兔兔酒logo.jpg' }
  ]
};

interface PartnerCardProps {
  name: string;
  role: string;
  icon: typeof Award;
  color: string;
  logo?: string;
  large?: boolean;
}

const PartnerCard: React.FC<PartnerCardProps> = ({ name, role, icon: Icon, color, logo, large }) => (
  <motion.div
    variants={fadeUp}
    whileHover={{ y: -4 }}
    className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all border border-amber-100 overflow-hidden"
  >
    <div className={`h-1.5 bg-gradient-to-r ${color}`} />
    <div className={`p-5 sm:p-6 flex ${large ? 'flex-col sm:flex-row sm:items-center' : 'flex-col'} gap-4`}>
      {logo ? (
        // 真實 logo：白底 + border + 留 padding 確保任何顏色背景的 logo 都好看
        <div className={`${large ? 'w-20 h-20 sm:w-24 sm:h-24' : 'w-16 h-16 sm:w-20 sm:h-20'} rounded-xl bg-white border border-gray-200 grid place-items-center flex-shrink-0 overflow-hidden shadow-sm`}>
          <img src={logo} alt={`${name} logo`} className="w-full h-full object-contain p-1.5" loading="lazy" />
        </div>
      ) : (
        // fallback：用 icon
        <div className={`${large ? 'w-14 h-14 sm:w-16 sm:h-16' : 'w-12 h-12'} rounded-xl bg-gradient-to-br ${color} grid place-items-center text-white shadow-md flex-shrink-0`}>
          <Icon size={large ? 28 : 22} />
        </div>
      )}
      <div>
        <div className={`${large ? 'text-xl sm:text-2xl' : 'text-lg'} font-black text-gray-900 leading-tight`}>{name}</div>
        <div className="text-sm text-gray-500 mt-0.5">{role}</div>
      </div>
    </div>
  </motion.div>
);

const RoleBlock: React.FC<{
  title: string;
  titleEn: string;
  items: { name: string; role: string; icon: typeof Award; color: string; logo?: string }[];
  cols: string;
  large?: boolean;
  note?: string;
}> = ({ title, titleEn, items, cols, large, note }) => (
  <motion.div
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, margin: '-30px' }}
    variants={stagger}
  >
    <motion.div variants={fadeUp} className="flex flex-wrap items-baseline justify-center sm:justify-start gap-x-3 gap-y-1 mb-4">
      <div className="w-8 h-px bg-gradient-to-r from-transparent to-amber-400 hidden sm:block" />
      <div className="inline-flex items-baseline gap-2">
        <span className="text-base sm:text-lg font-black text-amber-700 tracking-widest">{title}</span>
        <span className="text-[10px] font-bold tracking-[0.3em] text-amber-500 uppercase">{titleEn}</span>
      </div>
      <div className="w-8 h-px bg-gradient-to-l from-transparent to-amber-400 hidden sm:block" />
      {note && <span className="text-[11px] sm:text-xs text-gray-400 font-normal">{note}</span>}
    </motion.div>
    <div className={`grid ${cols} gap-4`}>
      {items.map((c) => (
        <PartnerCard key={c.name} {...c} large={large} />
      ))}
    </div>
  </motion.div>
);

const Sponsors: React.FC = () => (
  <section id="sponsors" className="relative py-20 sm:py-28 bg-gradient-to-b from-white to-amber-50 overflow-hidden">
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={stagger}
        className="text-center mb-12"
      >
        <img
          src={MASCOT.eat}
          alt="麻吉貓"
          className="mx-auto w-48 sm:w-56 mb-4"
        />
        <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold mb-4">
          <Heart size={14} /> 活動陣容
        </motion.div>
        <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-black text-gray-900 mb-4">
          主辦・協辦・贊助
        </motion.h2>
        <motion.p variants={fadeUp} className="text-gray-600 text-lg max-w-2xl mx-auto">
          感謝這些單位讓<strong className="text-orange-600">燒肉祭・火鍋祭</strong>成為可能
        </motion.p>
      </motion.div>

      <div className="space-y-10 sm:space-y-12">
        {/* 主辦：單張，加大顯眼 */}
        <RoleBlock
          title="主 辦 單 位"
          titleEn="Organizer"
          items={credits.organizer}
          cols="max-w-2xl mx-auto"
          large
        />

        {/* 協辦：3 欄 */}
        <RoleBlock
          title="協 辦 單 位"
          titleEn="Co-organizers"
          items={credits.coOrganizer}
          cols="sm:grid-cols-2 lg:grid-cols-3"
        />

        {/* 贊助：3 欄 */}
        <RoleBlock
          title="贊 助 商"
          titleEn="Sponsors"
          items={credits.sponsor}
          cols="sm:grid-cols-2 lg:grid-cols-3"
          note="※ 非所有合作餐廳皆使用本次贊助商產品"
        />
      </div>
    </div>
  </section>
);

// ====== 3. 托可生活誌專訪 ======
// 已上線的真實合作案例（托可生活誌專訪 + 同步 IG 曝光）
const tocoArticles = [
  {
    name: '烤烤豬',
    tag: '日式燒肉',
    desc: '日式炭火燒肉的職人魂，從炭、肉、醬料的堅持說起。',
    article: 'https://talkacemedia.com/article/47574',
    ig: 'https://www.instagram.com/p/DW3fFRMjx6R/',
    img: '/festival/toco-kao.png'
  },
  {
    name: '川鳳麻辣雞煲火鍋',
    tag: '麻辣火鍋',
    desc: '川味底湯加台灣土雞，一鍋紅油辣得有層次、回甘有故事。',
    article: 'https://talkacemedia.com/article/48158',
    ig: 'https://www.instagram.com/p/DXBWl2JD6FA/',
    img: '/festival/toco-chuanfeng.png'
  },
  {
    name: '聚食釜',
    tag: '個人鍋物',
    desc: '一人一釜的精緻鍋物，把家的溫度做成單人份的儀式感。',
    article: 'https://talkacemedia.com/article/48374',
    ig: 'https://www.instagram.com/p/DXLajDWD8Oi/',
    img: '/festival/toco-jushifu.png'
  },
  {
    name: '百味釜',
    tag: '創意鍋物',
    desc: '湯頭不只一味，把世界料理變成一桌可分享的鍋。',
    article: 'https://talkacemedia.com/article/48509',
    ig: 'https://www.instagram.com/p/DXa3RhVj1_L/',
    img: '/festival/toco-baiweifu.png'
  },
  {
    name: '草原風蒙古火鍋',
    tag: '蒙古火鍋',
    desc: '搬一片草原進台北，銅鍋、羊肉、孜然，吃出遊牧的豪邁。',
    article: 'https://talkacemedia.com/article/47845',
    ig: 'https://www.instagram.com/p/DWYfD_9D2V5/',
    img: '/festival/toco-mongol.png'
  },
  {
    name: '祇園禪院壽喜燒',
    tag: '壽喜燒',
    desc: '京都禪意走進台北的壽喜燒，慢火細煮的職人時間。',
    article: 'https://talkacemedia.com/article/48672',
    ig: 'https://www.instagram.com/p/DXtNi_WDyd2/',
    img: '/festival/toco-gion.png'
  }
];

const TocoFeature: React.FC = () => (
  <section id="toco" className="relative py-20 sm:py-28 bg-white overflow-hidden">
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={stagger}
        className="text-center mb-12"
      >
        <img
          src={MASCOT.rest}
          alt="麻吉貓"
          className="mx-auto w-48 sm:w-56 mb-4"
        />
        <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold mb-4">
          <BookOpen size={14} /> 已上線合作案例
        </motion.div>
        <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-black text-gray-900 mb-4">
          托可生活誌 · 深度專訪
        </motion.h2>
        <motion.p variants={fadeUp} className="text-gray-600 text-lg max-w-2xl mx-auto">
          台灣最具影響力的飲食生活媒體之一，<br className="hidden sm:block" />
          <strong className="text-purple-600">合作品牌已上線 {tocoArticles.length} 篇深度專訪</strong>，您的餐廳也能成為下一篇被收藏的故事
        </motion.p>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        variants={stagger}
        className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {tocoArticles.map((a) => (
          <motion.div
            key={a.name}
            variants={fadeUp}
            whileHover={{ y: -8 }}
            className="group relative bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all border border-purple-100"
          >
            {/* 主連結：托可文章 */}
            <a
              href={a.article}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
              aria-label={`閱讀 ${a.name} 的托可生活誌專訪`}
            >
              <div className="aspect-[4/3] overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100 relative">
                <img
                  src={a.img}
                  alt={a.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  loading="lazy"
                />
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/95 backdrop-blur text-xs font-bold text-purple-700">
                  {a.tag}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2 leading-snug group-hover:text-purple-600 transition-colors">
                  {a.name}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-2">{a.desc}</p>
                <div className="flex items-center gap-1 text-sm font-semibold text-purple-600 group-hover:gap-2 transition-all">
                  <BookOpen size={14} /> 閱讀托可專訪 <ArrowRight size={16} />
                </div>
              </div>
            </a>

            {/* 次要連結：IG 貼文 */}
            <a
              href={a.ig}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`查看 ${a.name} 的 IG 貼文`}
              className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/95 backdrop-blur grid place-items-center text-pink-600 shadow-lg hover:bg-gradient-to-br hover:from-pink-500 hover:to-purple-600 hover:text-white transition-all hover:scale-110 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <Instagram size={18} />
            </a>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        className="mt-10 text-center"
      >
        <a
          href="https://talkacemedia.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-purple-600 hover:text-purple-800 transition-colors"
        >
          查看更多托可生活誌專訪 <ExternalLink size={14} />
        </a>
      </motion.div>
    </div>
  </section>
);

// ====== 4. 網紅開箱（KOL 聯名案例） ======
// 已上線的真實聯名合作案例
const kolCases = [
  {
    title: '角頭 × 胡同燒肉',
    subtitle: '電影 IP × 燒肉名店',
    desc: '結合電影《角頭》系列話題熱度，導流到合作餐廳。透過名人造訪 + 短影音 + 多圖圖文，做出單點品牌的爆量曝光。',
    tags: ['短影音', '名人造訪', '高互動圖文'],
    color: 'from-rose-500 to-red-600',
    accent: 'rose',
    img: '/festival/kol-jiaotou-1.jpg',
    imgSecondary: '/festival/kol-jiaotou-2.jpg',
    posts: [
      { type: 'reel' as const, label: 'Reels', href: 'https://www.instagram.com/p/DNDZOOGyGyn/' },
      { type: 'carousel' as const, label: '圖文', href: 'https://www.instagram.com/p/DNDN2JDy05t/?img_index=9' }
    ]
  },
  {
    title: '拿坡里 × 唐氏基金會',
    subtitle: '品牌 × 公益議題',
    desc: '結合品牌與非營利公益議題，創造有溫度的內容曝光。讓 KOL 內容不只是「業配」，而是參與一場有意義的合作，為品牌加分。',
    tags: ['公益合作', '品牌善意', '社會議題'],
    color: 'from-orange-500 to-amber-500',
    accent: 'orange',
    img: '/festival/kol-napoli-1.jpg',
    imgSecondary: '/festival/kol-napoli-2.jpg',
    posts: [
      { type: 'reel' as const, label: 'Reels', href: 'https://www.instagram.com/reels/DWTcw6ikUgk/' },
      { type: 'reel' as const, label: 'Reels', href: 'https://www.instagram.com/p/DWTgcPRkSGj' }
    ]
  }
];

const KOLShowcase: React.FC = () => (
  <section id="kol" className="relative py-20 sm:py-28 bg-gradient-to-b from-rose-50 to-pink-50 overflow-hidden">
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={stagger}
        className="text-center mb-12"
      >
        <img
          src={MASCOT.love}
          alt="麻吉貓"
          className="mx-auto w-48 sm:w-56 mb-4"
        />
        <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100 text-pink-700 text-xs font-bold mb-4">
          <Camera size={14} /> 真實合作案例
        </motion.div>
        <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-black text-gray-900 mb-4">
          百萬流量・<span className="bg-gradient-to-r from-pink-600 to-rose-500 bg-clip-text text-transparent">網紅聯名</span>
        </motion.h2>
        <motion.p variants={fadeUp} className="text-gray-600 text-lg max-w-2xl mx-auto">
          從<strong className="text-pink-600">電影 IP 跨界聯名</strong>到<strong className="text-orange-600">品牌公益合作</strong>，<br className="hidden sm:block" />
          我們已為合作餐廳串連各種類型的 KOL/KOC 內容曝光
        </motion.p>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        variants={stagger}
        className="grid lg:grid-cols-2 gap-6 mb-12"
      >
        {kolCases.map((c) => (
          <motion.div
            key={c.title}
            variants={fadeUp}
            whileHover={{ y: -6 }}
            className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all border border-pink-100 group"
          >
            <div className="grid sm:grid-cols-[220px_1fr]">
              {/* 左：直式 IG 主圖 + 右下浮動次圖 */}
              <div className="relative aspect-[3/4] sm:aspect-auto sm:min-h-[320px] overflow-hidden bg-gray-100">
                <img
                  src={c.img}
                  alt={c.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />
                {/* 次圖縮圖（暗示有第二則貼文） */}
                {c.imgSecondary && (
                  <div className="absolute bottom-3 right-3 w-16 h-20 rounded-lg overflow-hidden border-2 border-white shadow-lg">
                    <img
                      src={c.imgSecondary}
                      alt={`${c.title} 第二則`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
                {/* IG 標籤 */}
                <div className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 backdrop-blur text-xs font-bold text-pink-600 shadow">
                  <Instagram size={12} /> IG
                </div>
              </div>

              {/* 右：文字 + CTA */}
              <div className="p-5 sm:p-6 flex flex-col">
                <div className={`inline-block self-start px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${c.color} mb-2`}>
                  {c.subtitle}
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight mb-3">{c.title}</h3>
                <p className="text-sm text-gray-700 leading-relaxed mb-4 flex-1">{c.desc}</p>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {c.tags.map((t) => (
                    <span key={t} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-100">
                      # {t}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {c.posts.map((p) => (
                    <a
                      key={p.href}
                      href={p.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-gradient-to-r ${c.color} text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg hover:scale-105 transition-all`}
                    >
                      <Instagram size={14} />
                      <span>{p.label}</span>
                      <ExternalLink size={12} className="opacity-70" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        className="max-w-md mx-auto"
      >
        <div className="p-6 rounded-2xl bg-white border border-pink-100 shadow-md text-center">
          <Award className="w-8 h-8 mx-auto mb-2 text-pink-500" />
          <div className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-pink-600 to-rose-500 bg-clip-text text-transparent">
            1 年
          </div>
          <div className="text-sm font-semibold text-gray-700 mt-1">內容授權使用</div>
          <div className="text-xs text-gray-500 mt-1">合作期間品牌可重複使用網紅內容</div>
        </div>
      </motion.div>
    </div>
  </section>
);

// ====== 5. 活動 APP (Mobile Cards) ======
const AppFeature: React.FC = () => (
  <section id="app" className="relative py-20 sm:py-28 bg-gradient-to-br from-emerald-50 via-white to-teal-50 overflow-hidden">
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={stagger}
        className="text-center mb-12"
      >
        <img
          src={MASCOT.gift}
          alt="麻吉貓"
          className="mx-auto w-48 sm:w-56 mb-4"
        />
        <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold mb-4">
          <Smartphone size={14} /> 協會會員系統
        </motion.div>
        <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-black text-gray-900 mb-4">
          活動 APP・<span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">集點兌獎</span>
        </motion.h2>
        <motion.p variants={fadeUp} className="text-gray-600 text-lg max-w-2xl mx-auto">
          消費者輕鬆集點、領券、兌餐，<br className="hidden sm:block" />
          <strong className="text-emerald-600">協會持續再行銷會員，為合作餐廳帶來持續曝光</strong>
        </motion.p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-12 items-center">
        {/* 左：手機 mockup */}
        <motion.div
          initial={{ opacity: 1, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative flex justify-center"
        >
          {/* Phone frame */}
          <div className="relative w-[280px] h-[580px] rounded-[3rem] bg-gray-900 p-3 shadow-2xl">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-gray-900 rounded-b-2xl z-10" />
            <div className="w-full h-full rounded-[2.4rem] overflow-hidden bg-gradient-to-b from-emerald-500 to-teal-600 relative">
              {/* 模擬內容 */}
              <div className="absolute inset-0 p-5 text-white">
                <div className="flex items-center justify-between mb-6 mt-2">
                  <div>
                    <div className="text-xs opacity-80">Hi, 美食控</div>
                    <div className="font-bold">王小明 會員</div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/20 grid place-items-center">
                    <Bell size={18} />
                  </div>
                </div>

                <div className="bg-white/15 backdrop-blur rounded-2xl p-4 border border-white/20 mb-4">
                  <div className="text-xs opacity-90">您的累積點數</div>
                  <div className="text-4xl font-black mt-1">650 <span className="text-sm font-normal">點</span></div>
                  <div className="text-[10px] opacity-80 mt-2">距離兌換 iPhone 17 抽獎券：再 150 點</div>
                  <div className="h-1.5 bg-white/20 rounded-full mt-2 overflow-hidden">
                    <div className="h-full w-[85%] bg-yellow-300 rounded-full" />
                  </div>
                </div>

                <div className="text-xs font-semibold mb-2 opacity-90">熱門兌換</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { emoji: '🥩', name: '燒肉券', pts: '500' },
                    { emoji: '🍲', name: '火鍋券', pts: '400' },
                    { emoji: '🎫', name: '抽獎券', pts: '200' },
                    { emoji: '🎁', name: '神秘禮', pts: '100' }
                  ].map((it) => (
                    <div key={it.name} className="bg-white text-gray-900 rounded-xl p-2.5">
                      <div className="text-2xl text-center">{it.emoji}</div>
                      <div className="text-xs font-bold text-center mt-0.5">{it.name}</div>
                      <div className="text-[10px] text-emerald-600 text-center font-semibold">{it.pts} 點</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 浮動小卡 */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute -left-4 sm:-left-10 top-20 bg-white rounded-2xl shadow-xl p-3 flex items-center gap-2 border border-emerald-100"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 grid place-items-center text-white">
              <Bell size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900">新活動上架</div>
              <div className="text-[10px] text-gray-500">協會推播提醒</div>
            </div>
          </motion.div>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 3, repeat: Infinity, delay: 1 }}
            className="absolute -right-4 sm:-right-10 bottom-20 bg-white rounded-2xl shadow-xl p-3 flex items-center gap-2 border border-amber-100"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center text-white">
              <Gift size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900">優惠券到期</div>
              <div className="text-[10px] text-gray-500">明日提醒</div>
            </div>
          </motion.div>
        </motion.div>

        {/* 右：三大功能 */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="space-y-5"
        >
          {[
            {
              icon: Coins,
              title: '多元集點',
              desc: '加入 LINE 好友、下載 APP、推薦好友、玩小遊戲，多種方式輕鬆累積點數，消費者自主操作',
              color: 'from-emerald-500 to-teal-500'
            },
            {
              icon: Ticket,
              title: '優惠券兌換',
              desc: '集點兌換各品牌餐券、抽獎券，您的優惠券成為跨品牌流量入口',
              color: 'from-amber-500 to-orange-500'
            },
            {
              icon: QrCode,
              title: '餐廳兌換核銷',
              desc: '消費者帶優惠券回您的餐廳兌換餐點，再造一次消費機會',
              color: 'from-rose-500 to-pink-500'
            }
          ].map((f) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              whileHover={{ x: 6 }}
              className="flex gap-4 p-5 rounded-2xl bg-white shadow-md hover:shadow-xl transition-all border border-gray-100"
            >
              <div className={`w-14 h-14 flex-shrink-0 rounded-2xl bg-gradient-to-br ${f.color} grid place-items-center text-white shadow-md`}>
                <f.icon size={26} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}

          <motion.div
            variants={fadeUp}
            className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
          >
            <div className="flex items-center gap-2 text-yellow-200 text-sm font-bold mb-1">
              <Sparkles size={16} /> 協會持續再行銷
            </div>
            <p className="text-sm leading-relaxed">
              會員池由協會集中經營，每一檔活動都會針對會員推播，
              <strong>為合作餐廳帶來持續曝光與回流流量。</strong>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  </section>
);

// ====== 6. 參加流程 ======
const joinSteps = [
  {
    no: '01',
    icon: FileText,
    title: '填寫合作申請表',
    desc: '線上填寫公司與品牌資料，閱讀並同意合作合約，由協會專員確認',
    color: 'from-red-500 to-rose-500',
    cta: { label: '填寫報名表單', href: '#/festival/apply', external: false }
  },
  {
    no: '02',
    icon: CreditCard,
    title: '完成繳費',
    desc: '每品牌上架費原價 NT$9,000，專案優惠價 NT$3,000，協會確認後寄送繳費連結，線上刷卡 / 匯款 / 藍新金流皆可',
    color: 'from-amber-500 to-yellow-500'
  },
  {
    no: '03',
    icon: Rocket,
    title: '正式上架，啟動行銷',
    desc: '官網品牌牆露出、APP 上架、KOL 媒合、品牌專訪排程同步啟動',
    color: 'from-emerald-500 to-teal-500'
  }
];

const JoinProcess: React.FC = () => (
  <section id="join-process" className="relative py-20 sm:py-28 bg-white overflow-hidden">
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={stagger}
        className="text-center mb-14"
      >
        <img
          src={MASCOT.dance}
          alt="麻吉貓"
          className="mx-auto w-48 sm:w-56 mb-4"
        />
        <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold mb-4">
          <CheckCircle2 size={14} /> 3 步驟・極速上架
        </motion.div>
        <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-black text-gray-900 mb-4">
          餐廳合作參加流程
        </motion.h2>
        <motion.p variants={fadeUp} className="text-gray-600 text-lg max-w-2xl mx-auto">
          從申請到正式上架，<strong className="text-red-600">最快 3 個工作天</strong>內完成
        </motion.p>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        variants={stagger}
        className="relative"
      >
        {/* 連接線 (桌機) */}
        <div className="hidden lg:block absolute top-24 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-red-300 via-orange-300 to-emerald-300" />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-5">
          {joinSteps.map((s) => {
            const cta = (s as { cta?: { label: string; href: string; external?: boolean } }).cta;
            return (
            <motion.div
              key={s.no}
              variants={fadeUp}
              whileHover={{ y: -6 }}
              className="relative"
            >
              <div className="bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all p-6 border border-gray-100 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${s.color} grid place-items-center text-white shadow-lg relative z-10`}>
                    <s.icon size={28} />
                  </div>
                  <div className={`text-5xl font-black bg-gradient-to-br ${s.color} bg-clip-text text-transparent opacity-30`}>
                    {s.no}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
                {cta && (
                  <a
                    href={cta.href}
                    {...(cta.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className={`mt-auto px-4 py-2.5 rounded-xl bg-gradient-to-r ${s.color} text-white text-sm font-bold shadow-md hover:shadow-lg hover:scale-[1.02] transition-all inline-flex items-center justify-center gap-1.5`}
                  >
                    {cta.label} <ArrowRight size={16} />
                  </a>
                )}
              </div>
            </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        className="mt-14 text-center"
      >
        <a
          href={APPLY_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="px-10 py-4 rounded-full bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-lg shadow-2xl shadow-orange-200 hover:scale-105 transition-all inline-flex items-center gap-2"
        >
          立即填寫合作申請 <ArrowRight size={20} />
        </a>
        <p className="text-xs text-gray-500 mt-3">＊填寫後協會專員 1 個工作天內聯繫您</p>
      </motion.div>
    </div>
  </section>
);

// ====== 7. Q&A ======
const faqs = [
  {
    q: '上架費多少？包含哪些內容？',
    a: '上架費原價每品牌 NT$9,000，本檔專案優惠價為 NT$3,000。七大曝光矩陣（網紅 IG、托可生活誌專訪、官網品牌牆、App 品牌牆、新聞稿、實體宣傳物、贊助商食材）全部包含，等於用 3,000 元換到 NT$100,000+ 的整合行銷資源。'
  },
  {
    q: 'NT$20,000 優惠券是什麼？我需要再額外支付嗎？',
    a: '優惠券是您提供給活動消費者兌換的折抵券面額（如：500 元 × 40 張），由消費者集點兌換到您的餐廳消費使用。這 NT$20,000 不是現金支出，而是您預留給活動會員的消費誘因。'
  },
  {
    q: '活動期間有多久？',
    a: '燒肉祭為 8/1–9/30，火鍋祭為 10/1–11/30，各為兩個月的獨立檔期（含預熱期、活動期、回流期）。兩檔活動前後銜接，全年皆有曝光聲量。'
  },
  {
    q: '我的餐廳需要準備什麼？',
    a: '只需要準備：(1) 餐廳基本資料與菜單照片，(2) 願意配合活動期間的優惠方案，(3) 配合協會提供的櫃檯立牌與 QR Code 海報。其餘行銷、媒體、KOL、APP、消費者導流全部由協會處理。'
  },
  {
    q: '網紅是怎麼挑選的？我可以指定嗎？',
    a: '協會根據您的餐廳屬性（燒肉/火鍋/客單價/客群）媒合最適合的 KOL/KOC，您可以從建議名單中挑選或提出偏好。內容會由網紅在 IG 圖文/限動曝光，並授權您使用 1 年。'
  },
  {
    q: '消費者集到點可以兌換我們的什麼東西？',
    a: '由您決定提供的優惠券內容，常見如：餐券、折價券、加菜券、招待券。協會會協助設計兌換規則與面額，確保不傷品牌價值又能吸引回流。'
  },
  {
    q: '如果我不滿意，可以退費嗎？',
    a: '上架費為一次性合作費用，合約簽訂後若未開始導入行銷資源前，可申請全額退費；活動正式啟動後（網紅已產出內容、品牌牆已上架），則依合約比例計算。詳情可於洽談時討論。'
  },
  {
    q: '我可以同時報名燒肉祭和火鍋祭嗎？',
    a: '可以。兩檔活動分開計價，但同時報名享有合作優惠（會在簽約前提供方案）。建議燒肉店主推燒肉祭，火鍋店主推火鍋祭，但跨品類也歡迎一起參加。'
  },
  {
    q: '集團旗下有多品牌，可以一起參加嗎？',
    a: '可以！每個品牌為一個參加單位（不限店數），費用依品牌數計算。例如集團旗下 3 個品牌，即上架費專案優惠價 NT$3,000（原價 9,000）× 3 + NT$20,000 優惠券 × 3，每個品牌皆可獨立曝光、各自累積活動流量。'
  }
];

const FAQ: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="relative py-20 sm:py-28 bg-gradient-to-b from-amber-50 to-white overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="text-center mb-12"
        >
          <img
            src={MASCOT.rest}
            alt="麻吉貓"
            className="mx-auto w-48 sm:w-56 mb-4"
          />
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold mb-4">
            <MessageSquare size={14} /> 常見問題
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-black text-gray-900 mb-4">
            Q&A
          </motion.h2>
          <motion.p variants={fadeUp} className="text-gray-600 text-lg">
            合作前最想知道的事，我們幫您整理好了
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={stagger}
          className="space-y-3"
        >
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <motion.div
                key={f.q}
                variants={fadeUp}
                className={`bg-white rounded-2xl border transition-all shadow-sm ${
                  isOpen ? 'border-orange-300 shadow-lg' : 'border-gray-200'
                }`}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full p-5 sm:p-6 text-left flex items-start gap-4 hover:bg-orange-50/50 transition-colors rounded-2xl"
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full grid place-items-center font-black text-sm transition-colors ${
                    isOpen ? 'bg-gradient-to-br from-red-500 to-orange-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    Q
                  </div>
                  <span className="flex-1 font-bold text-gray-900 pt-1">{f.q}</span>
                  <ChevronDown
                    size={20}
                    className={`flex-shrink-0 text-gray-400 transition-transform mt-1 ${isOpen ? 'rotate-180 text-orange-500' : ''}`}
                  />
                </button>
                <motion.div
                  initial={false}
                  animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 sm:px-6 pb-5 sm:pb-6 pl-16 sm:pl-[4.5rem] text-gray-700 leading-relaxed">
                    {f.a}
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

// ====== Final CTA ======
const FinalCTA: React.FC = () => (
  <section id="final-cta" className="py-20 sm:py-28 relative overflow-hidden">
    {/* 食物背景照片 */}
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: 'url(/festival/bg-cta.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    />
    {/* 淡遮罩 — 跟 Hero 一致，食物紋理為主 */}
    <div className="absolute inset-0 bg-black/25" />
    <div className="absolute inset-0 bg-gradient-to-br from-red-800/40 via-red-600/25 to-orange-500/20" />

    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-yellow-300/20 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-red-400/30 blur-3xl" />
    </div>
    {/* 麻吉貓 floating（左右各一隻） */}
    <img
      src={MASCOT.jump}
      alt="麻吉貓"
      className="hidden md:block absolute left-6 lg:left-16 bottom-12 w-28 lg:w-40 z-10 drop-shadow-2xl pointer-events-none"
    />
    <img
      src={MASCOT.dance}
      alt="麻吉貓"
      className="hidden md:block absolute right-6 lg:right-16 bottom-12 w-28 lg:w-40 z-10 drop-shadow-2xl pointer-events-none"
    />

    <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center text-white z-20">
      <motion.div
        initial={{ opacity: 1, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/35 backdrop-blur-md border border-white/30 text-sm font-semibold mb-6">
          <Star size={16} className="text-yellow-200" /> 名額有限・先報先審
        </div>
        <h2
          className="text-4xl sm:text-6xl font-black leading-tight mb-6"
          style={{ textShadow: '0 4px 24px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.5)' }}
        >
          準備好為您的餐廳<br />
          <span className="text-yellow-200">引爆下一波客流量</span>了嗎？
        </h2>
        <p
          className="text-xl text-white mb-10 max-w-2xl mx-auto leading-relaxed"
          style={{ textShadow: '0 2px 12px rgba(0,0,0,0.55)' }}
        >
          填寫合作申請表，協會專員將在 1 個工作天內聯繫您，<br className="hidden sm:block" />
          為您客製化最適合的合作方案。
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <a
            href={APPLY_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 rounded-full bg-white text-red-600 font-black text-lg shadow-2xl hover:scale-105 transition-all inline-flex items-center gap-2"
          >
            立即填寫合作申請 <ArrowRight size={22} />
          </a>
          <a
            href="mailto:foodpowerteam@gmail.com"
            className="px-8 py-4 rounded-full bg-white/15 backdrop-blur border-2 border-white/40 text-white font-black text-lg hover:bg-white/25 transition-all inline-flex items-center gap-2"
          >
            <Mail size={20} /> 直接聯絡我們
          </a>
        </div>
      </motion.div>
    </div>
  </section>
);

// ====== LINE 浮標（右下角 sticky FAB） ======
const LineFAB: React.FC = () => (
  <motion.a
    href="https://lin.ee/oIeFIMO"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="加入官方 LINE @foodpowerteam"
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ delay: 1.2, type: 'spring', stiffness: 200, damping: 15 }}
    className="group fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50"
  >
    {/* Pulse 圈圈動畫 */}
    <span className="absolute inset-0 rounded-full bg-[#06C755] opacity-60 animate-ping" />

    {/* 主按鈕 pill 樣式 */}
    <div className="relative inline-flex items-center gap-2 px-4 py-3 sm:px-5 sm:py-3.5 rounded-full bg-[#06C755] text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all">
      <MessageSquare size={20} className="fill-white" />
      <span className="font-black text-sm tracking-wide hidden sm:inline">加入官方 LINE</span>
      <span className="font-black text-sm tracking-wide sm:hidden">LINE</span>
    </div>

    {/* 桌機 hover 提示泡泡 */}
    <span className="hidden lg:block absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
      隨時掌握活動最新動態 →
      <span className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
    </span>
  </motion.a>
);

// ====== Footer ======
const FestivalFooter: React.FC = () => (
  <footer className="relative bg-gray-900 text-gray-300 py-12 overflow-hidden">
    {/* 麻吉貓告別 */}
    <img
      src={MASCOT.wave}
      alt="麻吉貓"
      className="absolute top-4 right-4 sm:right-12 w-14 sm:w-20 opacity-60 pointer-events-none"
    />
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 grid place-items-center text-white font-black">食</div>
            <div>
              <div className="font-bold text-white">食在力量</div>
              <div className="text-xs text-orange-400">美食產業交流協會</div>
            </div>
          </div>
          <p className="text-sm leading-relaxed">
            連結產業，創造共好。<br />
            為餐飲品牌打造整合行銷祭典。
          </p>
        </div>
        <div>
          <h4 className="font-bold text-white mb-3">聯絡我們</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="mailto:foodpowerteam@gmail.com" className="flex items-center gap-2 hover:text-orange-400 transition-colors">
                <Mail size={14} /> foodpowerteam@gmail.com
              </a>
            </li>
            <li>
              <a href="https://lin.ee/oIeFIMO" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-green-400 transition-colors">
                <MessageSquare size={14} /> 官方 LINE @foodpowerteam
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-bold text-white mb-3">快速連結</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="https://www.foodpowerteam.com" className="hover:text-orange-400 transition-colors">食在力量官網</a></li>
            <li><button onClick={() => scrollTo('event-intro')} className="hover:text-orange-400 transition-colors">活動方案</button></li>
            <li><button onClick={() => scrollTo('faq')} className="hover:text-orange-400 transition-colors">常見問題</button></li>
          </ul>
        </div>
      </div>
      <div className="mt-10 pt-6 border-t border-gray-800 text-xs text-gray-500 text-center">
        © {new Date().getFullYear()} 食在力量美食產業交流協會 · All rights reserved.
      </div>
    </div>
  </footer>
);

// ====== Main ======
const Festival: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <FestivalHeader />
      <Hero />
      <LaunchEvent />
      <AssociationIntro />
      <MascotIntro />
      <EventIntro />
      <ExposureChannels />
      <TocoFeature />
      <KOLShowcase />
      <AppFeature />
      <MarketingRoadmap />
      <BrandWall />
      <Sponsors />
      <JoinProcess />
      <FAQ />
      <FinalCTA />
      <FestivalFooter />
      <LineFAB />
    </div>
  );
};

export default Festival;
