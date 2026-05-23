import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, ArrowLeft } from 'lucide-react';

/**
 * 日系高級設計 Demo
 *
 * 色彩：墨黑底 + 紙白字 + 燒赤紅 + 古銅金
 * 字體：明朝體標題 + 細黑體內文
 * 排版：極大留白、細線分隔、垂直元素
 */

const COLOR = {
  bg: '#0E0B08',        // 墨黑（非純黑，帶暖）
  paper: '#F2EBDB',     // 紙白
  paperDim: '#C9C0AC',
  red: '#B83A2E',       // 燒赤
  gold: '#B89968',      // 古銅金
  line: '#332E25'       // 細線
};

const fontSerif = '"Noto Serif TC", "Songti TC", serif';
const fontSans = '"Noto Sans TC", sans-serif';

const DesignDemoJP: React.FC = () => {
  return (
    <div style={{ background: COLOR.bg, color: COLOR.paper, minHeight: '100vh', fontFamily: fontSans, fontWeight: 300, letterSpacing: '0.04em' }}>
      {/* 返回 */}
      <Link
        to="/design"
        className="fixed top-6 left-6 z-50 inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur text-xs"
        style={{ border: `1px solid ${COLOR.line}`, color: COLOR.paperDim, background: 'rgba(14,11,8,0.7)' }}
      >
        <ArrowLeft size={14} /> 返回比較頁
      </Link>

      {/* === Header === */}
      <header className="px-6 sm:px-10 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 grid place-items-center" style={{ border: `1px solid ${COLOR.gold}`, color: COLOR.gold, fontFamily: fontSerif, fontSize: 18 }}>
            食
          </div>
          <div style={{ fontFamily: fontSerif }} className="text-sm tracking-[0.3em]">
            FOOD POWER TEAM
          </div>
        </div>
        <div className="text-[10px] tracking-[0.4em]" style={{ color: COLOR.paperDim }}>
          EST. <span style={{ color: COLOR.gold }}>2018</span>
        </div>
      </header>

      <hr style={{ borderColor: COLOR.line }} />

      {/* === Hero === */}
      <section className="relative min-h-[88vh] flex flex-col items-center justify-center px-6 py-24 text-center overflow-hidden">
        {/* 垂直裝飾文字 */}
        <div
          className="absolute left-8 top-1/2 -translate-y-1/2 hidden md:block text-[10px] tracking-[0.5em]"
          style={{ writingMode: 'vertical-rl', color: COLOR.paperDim }}
        >
          美 食 產 業 交 流 協 會
        </div>
        <div
          className="absolute right-8 top-1/2 -translate-y-1/2 hidden md:block text-[10px] tracking-[0.5em]"
          style={{ writingMode: 'vertical-rl', color: COLOR.gold }}
        >
          連 結 産 業 · 創 造 共 好
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2 }}
        >
          <div className="text-xs tracking-[0.5em] mb-8" style={{ color: COLOR.gold }}>
            ─── 食 在 力 量 ───
          </div>

          <h1
            style={{ fontFamily: fontSerif, fontWeight: 300, letterSpacing: '0.15em', color: COLOR.paper }}
            className="text-5xl sm:text-7xl md:text-[5.5rem] leading-[1.3]"
          >
            連結産業
            <br />
            <span style={{ color: COLOR.red, fontWeight: 400 }}>創 造 共 好</span>
          </h1>

          <div className="my-12 mx-auto" style={{ width: 1, height: 80, background: COLOR.gold }} />

          <p style={{ fontFamily: fontSans, color: COLOR.paperDim, fontWeight: 300, letterSpacing: '0.2em' }} className="text-xs sm:text-sm">
            FOOD INDUSTRY ASSOCIATION OF TAIWAN
          </p>
        </motion.div>

        {/* 底部刻度線 */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 text-[10px] tracking-[0.3em]" style={{ color: COLOR.paperDim }}>
          <div style={{ width: 24, height: 1, background: COLOR.line }} />
          <span>SCROLL</span>
          <div style={{ width: 24, height: 1, background: COLOR.line }} />
        </div>
      </section>

      <hr style={{ borderColor: COLOR.line }} />

      {/* === About === */}
      <section className="px-6 sm:px-10 py-24 sm:py-32 max-w-4xl mx-auto">
        <div className="text-[10px] tracking-[0.5em] mb-6" style={{ color: COLOR.gold }}>
          ─── 01 ABOUT ───
        </div>
        <h2 style={{ fontFamily: fontSerif, fontWeight: 300, letterSpacing: '0.1em' }} className="text-3xl sm:text-5xl leading-relaxed mb-10">
          關於食在力量
        </h2>
        <div className="space-y-6 leading-loose text-base sm:text-lg" style={{ color: COLOR.paperDim, letterSpacing: '0.08em' }}>
          <p>
            由全台餐飲業菁英共同發起，
            <span style={{ color: COLOR.gold }}>整合品牌、食材、媒體、數位、金流</span>
            等資源，協助餐廳擺脫單打獨鬥。
          </p>
          <p>
            我們不只是個協會，更是您的
            <span style={{ color: COLOR.red, fontWeight: 400 }}>産業共好平台</span>
            ──辦活動、做行銷、串通路、養會員，讓每一間合作餐廳都被看見。
          </p>
        </div>
      </section>

      <hr style={{ borderColor: COLOR.line }} />

      {/* === Stats === */}
      <section className="px-6 sm:px-10 py-24 sm:py-32 max-w-5xl mx-auto">
        <div className="text-[10px] tracking-[0.5em] mb-12 text-center" style={{ color: COLOR.gold }}>
          ─── 02 NUMBERS ───
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 sm:gap-16">
          {[
            { value: '2,500+', label: '社群人數', en: 'COMMUNITY' },
            { value: '100+', label: '合作品牌', en: 'BRANDS' },
            { value: '30+', label: '年度活動', en: 'EVENTS' }
          ].map((s, i) => (
            <div key={s.label} className="text-center">
              <div className="text-[10px] tracking-[0.4em] mb-4" style={{ color: COLOR.paperDim }}>
                0{i + 1} / 03
              </div>
              <div
                style={{ fontFamily: fontSerif, fontWeight: 300, color: COLOR.paper, letterSpacing: '0.02em' }}
                className="text-6xl sm:text-7xl mb-4"
              >
                {s.value}
              </div>
              <div className="mx-auto mb-3" style={{ width: 40, height: 1, background: COLOR.gold }} />
              <div className="text-sm tracking-[0.3em]" style={{ color: COLOR.paperDim }}>
                {s.label}
              </div>
              <div className="text-[10px] tracking-[0.4em] mt-1" style={{ color: COLOR.gold }}>
                {s.en}
              </div>
            </div>
          ))}
        </div>
      </section>

      <hr style={{ borderColor: COLOR.line }} />

      {/* === Activities === */}
      <section className="px-6 sm:px-10 py-24 sm:py-32 max-w-4xl mx-auto">
        <div className="text-[10px] tracking-[0.5em] mb-6" style={{ color: COLOR.gold }}>
          ─── 03 ACTIVITIES ───
        </div>
        <h2 style={{ fontFamily: fontSerif, fontWeight: 300, letterSpacing: '0.1em' }} className="text-3xl sm:text-5xl mb-16">
          年度活動類型
        </h2>
        <div className="space-y-0">
          {[
            { num: 'I', name: '產業論壇', en: 'Industry Forum' },
            { num: 'II', name: '美食探店', en: 'Restaurant Visits' },
            { num: 'III', name: '企業參訪', en: 'Corporate Tours' },
            { num: 'IV', name: '主題通路分享會', en: 'Channel Workshop' },
            { num: 'V', name: '國際市場分享會', en: 'Global Market Forum' }
          ].map((a, idx, arr) => (
            <div key={a.name}>
              <div className="py-6 sm:py-8 flex items-baseline gap-6 sm:gap-10 group">
                <div
                  style={{ fontFamily: fontSerif, color: COLOR.gold, fontWeight: 400 }}
                  className="text-2xl sm:text-3xl w-12 sm:w-16 flex-shrink-0"
                >
                  {a.num}
                </div>
                <div className="flex-1">
                  <div style={{ fontFamily: fontSerif, color: COLOR.paper, letterSpacing: '0.1em', fontWeight: 400 }} className="text-xl sm:text-3xl mb-1">
                    {a.name}
                  </div>
                  <div className="text-[10px] tracking-[0.4em]" style={{ color: COLOR.paperDim }}>
                    {a.en}
                  </div>
                </div>
                <div className="text-xs tracking-[0.3em] opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: COLOR.red }}>
                  詳閱 →
                </div>
              </div>
              {idx < arr.length - 1 && <hr style={{ borderColor: COLOR.line }} />}
            </div>
          ))}
        </div>
      </section>

      <hr style={{ borderColor: COLOR.line }} />

      {/* === CTA === */}
      <section className="px-6 py-32 sm:py-40 text-center">
        <div className="text-[10px] tracking-[0.5em] mb-8" style={{ color: COLOR.gold }}>
          ─── JOIN US ───
        </div>
        <h2 style={{ fontFamily: fontSerif, fontWeight: 300, letterSpacing: '0.1em' }} className="text-3xl sm:text-5xl mb-16 leading-relaxed">
          成為這個
          <br />
          <span style={{ color: COLOR.red }}>産業共好平台</span>
          的一份子
        </h2>

        <a
          href="#"
          className="inline-flex items-center gap-4 px-12 py-4 text-sm tracking-[0.4em] transition-all hover:gap-6"
          style={{ border: `1px solid ${COLOR.gold}`, color: COLOR.gold }}
          onClick={(e) => e.preventDefault()}
        >
          加 入 我 們 <ArrowRight size={16} />
        </a>
      </section>

      {/* === Footer === */}
      <hr style={{ borderColor: COLOR.line }} />
      <footer className="px-6 sm:px-10 py-10 flex flex-col sm:flex-row gap-4 items-center justify-between text-[10px] tracking-[0.3em]" style={{ color: COLOR.paperDim }}>
        <div>© 食 在 力 量 美 食 産 業 交 流 協 會</div>
        <div style={{ color: COLOR.gold }}>DESIGN DEMO · 日系高級 / JAPANESE LUXURY</div>
      </footer>
    </div>
  );
};

export default DesignDemoJP;
