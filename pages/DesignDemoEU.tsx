import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowUpRight, ArrowLeft } from 'lucide-react';

/**
 * 歐美現代精緻 Design Demo
 *
 * 色彩：米白底 + 深炭灰 + 焦橘 + 鼠尾草綠
 * 字體：襯線標題 + 無襯線內文，緊湊字距
 * 排版：方格驅動、邊框細緻、留白克制不浪費
 */

const COLOR = {
  bg: '#F4F1EC',         // 米白
  bgAlt: '#EDE9E2',
  ink: '#1A1A1A',        // 深炭灰
  inkDim: '#5C5C5C',
  orange: '#D9572C',     // 焦橘
  sage: '#5E7A5E',       // 鼠尾草綠
  line: '#1A1A1A'
};

const fontSerif = '"Noto Serif TC", Georgia, serif';
const fontSans = '"Inter", "Noto Sans TC", sans-serif';

const DesignDemoEU: React.FC = () => {
  return (
    <div style={{ background: COLOR.bg, color: COLOR.ink, minHeight: '100vh', fontFamily: fontSans }}>
      {/* 返回 */}
      <Link
        to="/design"
        className="fixed top-6 left-6 z-50 inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium backdrop-blur"
        style={{ background: 'rgba(244,241,236,0.85)', border: `1px solid ${COLOR.ink}`, color: COLOR.ink }}
      >
        <ArrowLeft size={14} /> 返回比較頁
      </Link>

      {/* === Header === */}
      <header className="px-6 sm:px-10 py-6 border-b" style={{ borderColor: COLOR.line }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 grid place-items-center font-black text-lg" style={{ background: COLOR.ink, color: COLOR.bg, fontFamily: fontSerif }}>
              食
            </div>
            <div>
              <div style={{ fontFamily: fontSerif }} className="text-lg font-bold leading-none">食在力量</div>
              <div className="text-[10px] tracking-[0.2em] mt-1" style={{ color: COLOR.inkDim }}>FOOD POWER TEAM — EST. 2018</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium" style={{ color: COLOR.ink }}>
            <a className="hover:opacity-60 transition-opacity">About</a>
            <a className="hover:opacity-60 transition-opacity">Events</a>
            <a className="hover:opacity-60 transition-opacity">Members</a>
            <a className="px-4 py-2 text-xs tracking-wider font-bold uppercase" style={{ background: COLOR.ink, color: COLOR.bg }}>Join</a>
          </nav>
        </div>
      </header>

      {/* === Hero === */}
      <section className="px-6 sm:px-10 py-20 sm:py-32">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-10 items-end">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-8"
          >
            <div className="text-xs tracking-[0.3em] font-medium uppercase mb-6" style={{ color: COLOR.orange }}>
              ── Food Industry Association
            </div>
            <h1
              style={{ fontFamily: fontSerif, fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1.05 }}
              className="text-6xl sm:text-7xl lg:text-[7.5rem] mb-8"
            >
              Connecting<br />
              the <em style={{ color: COLOR.orange, fontStyle: 'italic' }}>Food</em><br />
              Industry.
            </h1>
            <p className="text-lg sm:text-xl max-w-2xl leading-relaxed" style={{ color: COLOR.inkDim }}>
              食在力量美食產業交流協會 — 由全台餐飲業菁英共同發起，整合品牌、食材、媒體、數位、金流等資源，協助餐廳擺脫單打獨鬥。
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="lg:col-span-4 space-y-3"
          >
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="flex items-center justify-between px-6 py-5 group hover:gap-8 transition-all"
              style={{ background: COLOR.ink, color: COLOR.bg }}
            >
              <span className="text-sm font-bold uppercase tracking-wider">加入協會</span>
              <ArrowUpRight size={20} className="group-hover:rotate-45 transition-transform" />
            </a>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="flex items-center justify-between px-6 py-5 group hover:gap-8 transition-all"
              style={{ border: `1.5px solid ${COLOR.ink}`, color: COLOR.ink }}
            >
              <span className="text-sm font-bold uppercase tracking-wider">了解活動</span>
              <ArrowUpRight size={20} />
            </a>
          </motion.div>
        </div>
      </section>

      {/* === Stats Strip === */}
      <section className="border-y" style={{ borderColor: COLOR.line }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-10 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x" style={{ '--tw-divide-opacity': 1, borderColor: COLOR.line } as React.CSSProperties}>
          {[
            { value: '2,500+', label: 'Community Members', cn: '社群人數' },
            { value: '100+', label: 'Partner Brands', cn: '合作品牌' },
            { value: '30+', label: 'Annual Events', cn: '年度活動' }
          ].map((s) => (
            <div key={s.label} className="py-10 sm:py-12 px-6 first:pl-0 last:pr-0" style={{ borderColor: COLOR.line }}>
              <div className="text-xs tracking-[0.3em] uppercase mb-3" style={{ color: COLOR.inkDim }}>
                {s.cn} · {s.label}
              </div>
              <div
                style={{ fontFamily: fontSerif, fontWeight: 400, letterSpacing: '-0.04em' }}
                className="text-6xl sm:text-7xl leading-none"
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* === Statement === */}
      <section className="px-6 sm:px-10 py-24 sm:py-32" style={{ background: COLOR.bgAlt }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-xs tracking-[0.3em] uppercase mb-8 font-medium" style={{ color: COLOR.sage }}>
            ─── Our Mission
          </div>
          <h2
            style={{ fontFamily: fontSerif, fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1.2 }}
            className="text-4xl sm:text-6xl mb-10"
          >
            We're not just an association.<br />
            We're a <em style={{ fontStyle: 'italic', color: COLOR.orange }}>shared platform</em> for the industry.
          </h2>
          <p className="text-lg leading-relaxed max-w-3xl" style={{ color: COLOR.inkDim }}>
            辦活動、做行銷、串通路、養會員、抽大獎 — 我們讓每一間合作餐廳都被看見。連結品牌、食材、媒體、數位、金流，創造美食產業的共好。
          </p>
        </div>
      </section>

      {/* === Activities Grid === */}
      <section className="px-6 sm:px-10 py-24 sm:py-32">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mb-16">
            <div>
              <div className="text-xs tracking-[0.3em] uppercase mb-3 font-medium" style={{ color: COLOR.orange }}>
                ─── 03 · Programs
              </div>
              <h2 style={{ fontFamily: fontSerif, fontWeight: 400, letterSpacing: '-0.02em' }} className="text-4xl sm:text-6xl leading-tight">
                Year-round<br />
                Activities.
              </h2>
            </div>
            <div className="text-sm max-w-sm" style={{ color: COLOR.inkDim }}>
              從產業論壇到國際市場，我們每年舉辦超過 30 場高品質活動。
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-px" style={{ background: COLOR.ink }}>
            {[
              { no: '01', name: '產業論壇', en: 'Industry Forum', desc: 'B2B 高峰對話' },
              { no: '02', name: '美食探店', en: 'Tasting Tours', desc: '城市口袋名單' },
              { no: '03', name: '企業參訪', en: 'Corporate Tours', desc: '走進產業現場' },
              { no: '04', name: '通路分享會', en: 'Channel Workshop', desc: '進銷存實戰' },
              { no: '05', name: '國際市場', en: 'Global Market', desc: '出海第一步' }
            ].map((a) => (
              <div
                key={a.no}
                className="p-6 sm:p-7 group cursor-pointer transition-colors hover:bg-stone-100"
                style={{ background: COLOR.bg }}
              >
                <div className="text-xs tracking-[0.2em] font-bold mb-8" style={{ color: COLOR.orange }}>
                  {a.no}
                </div>
                <div style={{ fontFamily: fontSerif, fontWeight: 400 }} className="text-2xl mb-1">{a.name}</div>
                <div className="text-xs tracking-[0.15em] uppercase mb-6" style={{ color: COLOR.inkDim }}>{a.en}</div>
                <div className="text-sm" style={{ color: COLOR.inkDim }}>{a.desc}</div>
                <ArrowUpRight size={18} className="mt-8 opacity-30 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === CTA === */}
      <section className="px-6 sm:px-10 py-24 sm:py-32" style={{ background: COLOR.ink, color: COLOR.bg }}>
        <div className="max-w-5xl mx-auto text-center">
          <div className="text-xs tracking-[0.3em] uppercase mb-8" style={{ color: COLOR.orange }}>
            ─── Become a Member
          </div>
          <h2 style={{ fontFamily: fontSerif, fontWeight: 400, letterSpacing: '-0.02em', lineHeight: 1.1 }} className="text-5xl sm:text-7xl mb-12">
            Join Taiwan's most<br />
            <em style={{ fontStyle: 'italic' }}>connected</em> food industry network.
          </h2>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="inline-flex items-center gap-3 px-8 py-4 text-sm font-bold uppercase tracking-[0.2em] transition-all hover:gap-5"
            style={{ background: COLOR.orange, color: COLOR.bg }}
          >
            立即加入 Apply Now <ArrowUpRight size={18} />
          </a>
        </div>
      </section>

      {/* === Footer === */}
      <footer className="px-6 sm:px-10 py-10 border-t" style={{ borderColor: COLOR.line }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-4 items-center justify-between text-xs" style={{ color: COLOR.inkDim }}>
          <div className="tracking-wider">© 2026 Food Power Team Association · All rights reserved</div>
          <div style={{ color: COLOR.orange }} className="font-bold tracking-[0.2em] uppercase">Design Demo · 歐美現代 / Modern Editorial</div>
        </div>
      </footer>
    </div>
  );
};

export default DesignDemoEU;
