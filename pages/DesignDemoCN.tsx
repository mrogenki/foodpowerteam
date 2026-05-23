import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

/**
 * 中式溫潤奢華 Design Demo
 *
 * 色彩：宣紙白 + 朱紅 + 古銅金 + 深棕
 * 字體：宋體粗標題 + 黑體內文
 * 元素：印章、雲紋、卷軸感、紅金搭配
 */

const COLOR = {
  bg: '#FBF6EB',         // 宣紙白
  bgAlt: '#F2E9D2',
  red: '#A52A2A',        // 朱紅
  redDeep: '#7A1A1A',
  gold: '#B68A35',       // 古銅金
  goldLight: '#D4B25C',
  ink: '#2E1A10',        // 墨棕
  inkDim: '#5A4634'
};

const fontSerif = '"Noto Serif TC", "Songti TC", serif';
const fontSans = '"Noto Sans TC", sans-serif';

// 印章樣式
const SealStamp: React.FC<{ text: string; size?: number }> = ({ text, size = 64 }) => (
  <div
    className="inline-grid place-items-center"
    style={{
      width: size,
      height: size,
      background: COLOR.red,
      color: COLOR.bg,
      fontFamily: fontSerif,
      fontWeight: 900,
      fontSize: size * 0.35,
      letterSpacing: '0.05em',
      border: `2px solid ${COLOR.red}`,
      boxShadow: `inset 0 0 0 3px ${COLOR.bg}, inset 0 0 0 5px ${COLOR.red}`,
      transform: 'rotate(-3deg)'
    }}
  >
    {text}
  </div>
);

const DesignDemoCN: React.FC = () => {
  return (
    <div style={{ background: COLOR.bg, color: COLOR.ink, minHeight: '100vh', fontFamily: fontSans }}>
      {/* 返回 */}
      <Link
        to="/design"
        className="fixed top-6 left-6 z-50 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium backdrop-blur"
        style={{ background: 'rgba(251,246,235,0.9)', border: `1px solid ${COLOR.gold}`, color: COLOR.red }}
      >
        <ArrowLeft size={14} /> 返回比較頁
      </Link>

      {/* 雲紋背景裝飾 */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 20%, ${COLOR.red} 1px, transparent 1px), radial-gradient(circle at 80% 50%, ${COLOR.gold} 1px, transparent 1px)`,
          backgroundSize: '60px 60px, 80px 80px'
        }}
      />

      {/* === Header === */}
      <header className="relative px-6 sm:px-10 py-5 border-b-2" style={{ borderColor: COLOR.red }}>
        <div className="absolute inset-x-0 bottom-0 h-px" style={{ background: COLOR.gold, transform: 'translateY(3px)' }} />
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <SealStamp text="食" size={48} />
            <div>
              <div style={{ fontFamily: fontSerif, color: COLOR.red, fontWeight: 700 }} className="text-xl leading-none tracking-wider">
                食在力量
              </div>
              <div className="text-[10px] tracking-[0.3em] mt-1.5" style={{ color: COLOR.gold }}>
                ◆ 美食産業交流協會 ◆
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs font-bold tracking-widest" style={{ color: COLOR.red }}>
            <span>創</span><span>·</span><span>於</span><span>·</span><span style={{ color: COLOR.gold }}>2018</span>
          </div>
        </div>
      </header>

      {/* === Hero === */}
      <section className="relative px-6 py-24 sm:py-32 text-center overflow-hidden">
        {/* 上下裝飾線 */}
        <div className="absolute top-12 left-1/2 -translate-x-1/2 flex items-center gap-3" style={{ color: COLOR.gold }}>
          <div style={{ width: 60, height: 1, background: COLOR.gold }} />
          <span style={{ fontFamily: fontSerif }} className="text-sm tracking-[0.5em]">食 ◆ 在 ◆ 力 ◆ 量</span>
          <div style={{ width: 60, height: 1, background: COLOR.gold }} />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="relative pt-12"
        >
          <h1
            style={{ fontFamily: fontSerif, fontWeight: 900, color: COLOR.red, letterSpacing: '0.15em', lineHeight: 1.2 }}
            className="text-6xl sm:text-8xl mb-6 relative inline-block"
          >
            <span style={{ position: 'absolute', top: -8, left: -8, color: COLOR.gold, opacity: 0.3, zIndex: 0 }}>連結産業</span>
            <span className="relative z-10">連結産業</span>
          </h1>
          <h1
            style={{ fontFamily: fontSerif, fontWeight: 900, color: COLOR.ink, letterSpacing: '0.15em', lineHeight: 1.2 }}
            className="text-6xl sm:text-8xl mb-12"
          >
            創造<span style={{ color: COLOR.red }}>共好</span>
          </h1>

          {/* 朱紅雙線 */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div style={{ width: 80, height: 2, background: COLOR.red }} />
            <div className="w-2 h-2 rounded-full" style={{ background: COLOR.gold }} />
            <div style={{ width: 80, height: 2, background: COLOR.red }} />
          </div>

          <p style={{ color: COLOR.inkDim, letterSpacing: '0.2em' }} className="text-base sm:text-lg max-w-2xl mx-auto leading-loose">
            匯聚産業菁英・整合品牌資源<br />
            為餐飲業者打造的<span style={{ color: COLOR.red, fontWeight: 700 }}>産業共好平台</span>
          </p>

          <div className="mt-12">
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="inline-block relative px-12 py-4 text-base font-bold tracking-[0.3em] transition-all hover:translate-y-[-2px]"
              style={{
                background: COLOR.red,
                color: COLOR.bg,
                border: `2px solid ${COLOR.gold}`,
                boxShadow: `0 4px 0 ${COLOR.redDeep}`
              }}
            >
              加 入 我 們
            </a>
          </div>
        </motion.div>

        {/* 底部裝飾雲紋 */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xl tracking-[0.5em]" style={{ color: COLOR.gold, opacity: 0.5 }}>
          ◇ ◆ ◇
        </div>
      </section>

      {/* === About === */}
      <section className="relative px-6 sm:px-10 py-24 sm:py-32" style={{ background: COLOR.bgAlt }}>
        {/* 上邊框花紋 */}
        <div className="absolute top-0 left-0 right-0 h-3" style={{ background: `linear-gradient(90deg, ${COLOR.red} 0%, ${COLOR.gold} 50%, ${COLOR.red} 100%)` }} />
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <SealStamp text="壹" size={56} />
            <h2 style={{ fontFamily: fontSerif, fontWeight: 700, color: COLOR.red, letterSpacing: '0.2em' }} className="text-4xl sm:text-5xl mt-6">
              關 於 我 們
            </h2>
            <div className="text-xs tracking-[0.5em] mt-3" style={{ color: COLOR.gold }}>
              ABOUT  US
            </div>
          </div>

          <div className="space-y-6 text-base sm:text-lg leading-loose" style={{ color: COLOR.ink, letterSpacing: '0.08em' }}>
            <p className="text-center">
              <span style={{ fontFamily: fontSerif, fontWeight: 700, color: COLOR.red }}>食在力量美食產業交流協會</span>
              由全台餐飲業菁英共同發起，整合品牌、食材、媒體、數位、金流等資源，協助餐廳擺脫單打獨鬥。
            </p>
            <div className="flex items-center justify-center gap-3 py-4">
              <div style={{ width: 40, height: 1, background: COLOR.gold }} />
              <div className="w-1.5 h-1.5" style={{ background: COLOR.red, transform: 'rotate(45deg)' }} />
              <div style={{ width: 40, height: 1, background: COLOR.gold }} />
            </div>
            <p className="text-center">
              我們不只是個協會 — 更是您的 <span style={{ color: COLOR.red, fontWeight: 700, fontFamily: fontSerif }}>產業共好平台</span> —
              辦活動、做行銷、串通路、養會員，讓每一間合作餐廳都被看見。
            </p>
          </div>
        </div>
      </section>

      {/* === Stats === */}
      <section className="px-6 sm:px-10 py-24 sm:py-32">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <SealStamp text="貳" size={56} />
            <h2 style={{ fontFamily: fontSerif, fontWeight: 700, color: COLOR.red, letterSpacing: '0.2em' }} className="text-4xl sm:text-5xl mt-6">
              協 會 印 記
            </h2>
            <div className="text-xs tracking-[0.5em] mt-3" style={{ color: COLOR.gold }}>
              BY  THE  NUMBERS
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { value: '2,500+', label: '社群人數', sub: '産業菁英匯聚一堂' },
              { value: '100+', label: '合作品牌', sub: '一同前行的夥伴' },
              { value: '30+', label: '年度活動', sub: '一年到頭精彩不斷' }
            ].map((s, i) => (
              <div
                key={s.label}
                className="relative p-8 text-center"
                style={{
                  background: COLOR.bg,
                  border: `1px solid ${COLOR.gold}`,
                  boxShadow: `4px 4px 0 ${COLOR.red}`
                }}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 text-xs font-bold tracking-wider" style={{ background: COLOR.bg, color: COLOR.red, fontFamily: fontSerif }}>
                  {['壹', '貳', '參'][i]}
                </div>
                <div
                  style={{ fontFamily: fontSerif, fontWeight: 900, color: COLOR.red, letterSpacing: '0.02em' }}
                  className="text-6xl sm:text-7xl mb-3"
                >
                  {s.value}
                </div>
                <div style={{ fontFamily: fontSerif, color: COLOR.ink }} className="text-xl font-bold tracking-widest mb-1">
                  {s.label}
                </div>
                <div className="text-xs tracking-wider" style={{ color: COLOR.inkDim }}>
                  {s.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === Activities === */}
      <section className="relative px-6 sm:px-10 py-24 sm:py-32" style={{ background: COLOR.bgAlt }}>
        <div className="absolute top-0 left-0 right-0 h-3" style={{ background: `linear-gradient(90deg, ${COLOR.red} 0%, ${COLOR.gold} 50%, ${COLOR.red} 100%)` }} />
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <SealStamp text="參" size={56} />
            <h2 style={{ fontFamily: fontSerif, fontWeight: 700, color: COLOR.red, letterSpacing: '0.2em' }} className="text-4xl sm:text-5xl mt-6">
              年 度 活 動
            </h2>
            <div className="text-xs tracking-[0.5em] mt-3" style={{ color: COLOR.gold }}>
              FIVE  PROGRAMS
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { num: '壹', name: '產業論壇', en: 'Forum' },
              { num: '貳', name: '美食探店', en: 'Tasting' },
              { num: '參', name: '企業參訪', en: 'Tour' },
              { num: '肆', name: '通路分享', en: 'Channel' },
              { num: '伍', name: '國際市場', en: 'Global' }
            ].map((a) => (
              <div
                key={a.name}
                className="relative p-6 text-center group cursor-pointer transition-all hover:translate-y-[-4px]"
                style={{
                  background: COLOR.bg,
                  border: `1px solid ${COLOR.gold}`
                }}
              >
                <div
                  className="text-5xl mb-3"
                  style={{ fontFamily: fontSerif, fontWeight: 900, color: COLOR.red, opacity: 0.85 }}
                >
                  {a.num}
                </div>
                <div className="mx-auto mb-3" style={{ width: 24, height: 1, background: COLOR.gold }} />
                <div style={{ fontFamily: fontSerif, color: COLOR.ink, fontWeight: 700 }} className="text-lg tracking-widest mb-1">
                  {a.name}
                </div>
                <div className="text-[10px] tracking-[0.3em] uppercase" style={{ color: COLOR.inkDim }}>
                  {a.en}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === CTA === */}
      <section className="relative px-6 py-24 sm:py-32 text-center overflow-hidden" style={{ background: COLOR.red, color: COLOR.bg }}>
        {/* 金色雙線 */}
        <div className="absolute top-6 left-6 right-6" style={{ height: 1, background: COLOR.goldLight }} />
        <div className="absolute top-8 left-6 right-6" style={{ height: 1, background: COLOR.goldLight }} />
        <div className="absolute bottom-6 left-6 right-6" style={{ height: 1, background: COLOR.goldLight }} />
        <div className="absolute bottom-8 left-6 right-6" style={{ height: 1, background: COLOR.goldLight }} />

        <div className="relative max-w-3xl mx-auto">
          <SealStamp text="共好" size={72} />

          <h2
            style={{ fontFamily: fontSerif, fontWeight: 900, color: COLOR.bg, letterSpacing: '0.15em', lineHeight: 1.3 }}
            className="text-4xl sm:text-6xl mt-10 mb-8"
          >
            一同前行<br />
            <span style={{ color: COLOR.goldLight }}>共創美食盛世</span>
          </h2>

          <p style={{ color: COLOR.bg, opacity: 0.85, letterSpacing: '0.2em' }} className="text-base mb-12 leading-loose">
            邀您加入我們，成為這個產業共好平台的一份子
          </p>

          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="inline-block px-12 py-4 text-base font-bold tracking-[0.4em] transition-all hover:scale-105"
            style={{
              background: COLOR.bg,
              color: COLOR.red,
              border: `2px solid ${COLOR.goldLight}`,
              fontFamily: fontSerif
            }}
          >
            加  入  我  們
          </a>
        </div>
      </section>

      {/* === Footer === */}
      <footer className="px-6 sm:px-10 py-10" style={{ background: COLOR.ink, color: COLOR.bg }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-4 items-center justify-between text-xs tracking-wider">
          <div>© 食在力量美食產業交流協會 · All Rights Reserved</div>
          <div style={{ color: COLOR.goldLight }} className="font-bold tracking-[0.3em]">
            ◆ DESIGN DEMO · 中式溫潤 ◆
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DesignDemoCN;
