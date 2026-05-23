import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowUpRight, FileText, ExternalLink, Search } from 'lucide-react';

/**
 * Design Direction Comparison
 * 路徑：/design
 *
 * 用 awesome-design-md 5 個品牌的真實色票/字體做 mini hero，
 * 讓使用者直接感受該風格套在「食在力量」會是什麼樣子。
 */

// ============== 5 個品牌的真實設計規範（從 awesome-design-md 抽出核心 token） ==============

const templates = [
  {
    slug: 'airbnb',
    name: 'Airbnb',
    descCN: '溫暖珊瑚紅 + 大量留白 + 圓潤友善 + 攝影為主。生活品味調性，最接近餐飲/品味類網站。',
    keywords: ['溫暖', '攝影為主', '圓潤', '生活感'],
    swatches: ['#FF385C', '#222222', '#717171', '#F7F7F7', '#FFFFFF'],
    font: '"Circular", "Inter", system-ui',
    radius: '32px', // 全圓 pill
    site: 'https://www.airbnb.com',
    mdPath: '/design-md/airbnb.md',
    miniHero: {
      bg: '#FFFFFF',
      ink: '#222222',
      muted: '#717171',
      primary: '#FF385C',
      hairline: '#DDDDDD',
      surface: '#F7F7F7'
    }
  },
  {
    slug: 'notion',
    name: 'Notion',
    descCN: '深紫色 + 米色 + 大量 pastel 區塊 + 友善 illustration。Workspace/工具類質感，溫和但有自信。',
    keywords: ['友善', 'Pastel', '工具感', '自信'],
    swatches: ['#5645D4', '#0A1530', '#FFE8D4', '#F8F5E8', '#37352F'],
    font: '"Inter", system-ui',
    radius: '8px',
    site: 'https://www.notion.so',
    mdPath: '/design-md/notion.md',
    miniHero: {
      bg: '#FFFFFF',
      ink: '#0A1530',
      muted: '#5D5B54',
      primary: '#5645D4',
      hairline: '#E5E3DF',
      surface: '#F8F5E8'
    }
  },
  {
    slug: 'stripe',
    name: 'Stripe',
    descCN: '深藍墨 + 電紫漸層 + 大氣 mesh 背景 + Sohne 細體無襯線。金融科技質感，現代精緻、克制有力。',
    keywords: ['漸層', '科技感', '細體', '精緻'],
    swatches: ['#533AFD', '#0D253D', '#1C1E54', '#F6F9FC', '#EA2261'],
    font: '"Inter", "SF Pro Display", system-ui',
    radius: '4px',
    site: 'https://stripe.com',
    mdPath: '/design-md/stripe.md',
    miniHero: {
      bg: 'linear-gradient(135deg, #0D253D 0%, #1C1E54 50%, #533AFD 100%)',
      ink: '#FFFFFF',
      muted: 'rgba(255,255,255,0.7)',
      primary: '#FFFFFF',
      hairline: 'rgba(255,255,255,0.15)',
      surface: 'transparent'
    }
  },
  {
    slug: 'apple',
    name: 'Apple',
    descCN: '黑白雙色畫布 + 大字體粗標題 + 攝影博物館式排版。極簡高級、產品為主、UI 退場。',
    keywords: ['極簡', '黑白', '攝影', '高級'],
    swatches: ['#000000', '#1D1D1F', '#0066CC', '#F5F5F7', '#FFFFFF'],
    font: '"SF Pro Display", "Inter", system-ui',
    radius: '980px', // 全 pill
    site: 'https://www.apple.com',
    mdPath: '/design-md/apple.md',
    miniHero: {
      bg: '#000000',
      ink: '#FFFFFF',
      muted: '#A1A1A6',
      primary: '#2997FF',
      hairline: 'rgba(255,255,255,0.1)',
      surface: '#1D1D1F'
    }
  },
  {
    slug: 'lovable',
    name: 'Lovable',
    descCN: '米色羊皮紙底 + 近黑字 + Camera Plain 字體 + 半透明灰階。手作感、有溫度、現代但不冰冷。',
    keywords: ['羊皮紙', '溫暖', '半透明', '手作感'],
    swatches: ['#F7F4ED', '#1C1C1C', '#ECEAE4', '#5F5F5D', '#FCFBF8'],
    font: '"Inter", ui-sans-serif, system-ui',
    radius: '9999px',
    site: 'https://lovable.dev',
    mdPath: '/design-md/lovable.md',
    miniHero: {
      bg: '#F7F4ED',
      ink: '#1C1C1C',
      muted: '#5F5F5D',
      primary: '#1C1C1C',
      hairline: '#ECEAE4',
      surface: '#FCFBF8'
    }
  }
];

// ============== MiniHero：用該品牌色票/字體做 ~一個 hero 區塊 ==============

const MiniHero: React.FC<{ tpl: typeof templates[number] }> = ({ tpl }) => {
  const h = tpl.miniHero;
  const isStripe = tpl.slug === 'stripe';
  const isApple = tpl.slug === 'apple';

  return (
    <div
      className="aspect-[4/3] overflow-hidden relative"
      style={{
        background: h.bg,
        color: h.ink,
        fontFamily: tpl.font
      }}
    >
      {/* Stripe-only: gradient mesh accent */}
      {isStripe && (
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background: 'radial-gradient(circle at 30% 20%, rgba(83,58,253,0.4) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(234,34,97,0.3) 0%, transparent 50%)'
          }}
        />
      )}

      <div className="absolute inset-0 p-5 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-auto">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 grid place-items-center text-[10px] font-black"
              style={{
                background: isApple || isStripe ? h.primary : h.ink,
                color: isApple || isStripe ? (isApple ? '#FFFFFF' : '#FFFFFF') : h.bg as string,
                borderRadius: tpl.slug === 'lovable' ? '9999px' : '4px'
              }}
            >
              食
            </div>
            <span className="text-[10px] font-semibold tracking-wide" style={{ color: h.muted }}>
              食在力量
            </span>
          </div>
          <div
            className="px-2 py-0.5 text-[9px] font-bold tracking-wider"
            style={{
              color: h.muted,
              borderRadius: tpl.radius === '4px' ? '4px' : '999px'
            }}
          >
            EST. 2018
          </div>
        </div>

        {/* Center content */}
        <div className="my-auto">
          {/* Eyebrow */}
          <div
            className="text-[9px] uppercase tracking-[0.2em] font-bold mb-2"
            style={{ color: h.primary }}
          >
            {tpl.slug === 'airbnb' && '— Food Industry Association'}
            {tpl.slug === 'notion' && '· An Industry Workspace ·'}
            {tpl.slug === 'stripe' && 'INFRASTRUCTURE FOR FOOD INDUSTRY'}
            {tpl.slug === 'apple' && '美 食 產 業 協 會'}
            {tpl.slug === 'lovable' && '美食產業 共好平台'}
          </div>

          {/* Headline — each brand has different headline style */}
          {tpl.slug === 'airbnb' && (
            <div
              className="text-2xl sm:text-3xl"
              style={{ fontWeight: 600, lineHeight: 1.15, letterSpacing: '-0.01em' }}
            >
              連結產業，
              <br />
              <span style={{ color: h.primary }}>創造共好。</span>
            </div>
          )}
          {tpl.slug === 'notion' && (
            <div
              className="text-2xl sm:text-3xl"
              style={{ fontWeight: 600, lineHeight: 1.05, letterSpacing: '-0.02em' }}
            >
              All-in-one
              <br />
              食在力量平台
            </div>
          )}
          {tpl.slug === 'stripe' && (
            <div
              className="text-2xl sm:text-3xl"
              style={{ fontWeight: 300, lineHeight: 1.05, letterSpacing: '-0.04em' }}
            >
              連結品牌
              <br />
              整合產業。
            </div>
          )}
          {tpl.slug === 'apple' && (
            <div
              className="text-3xl sm:text-4xl text-center"
              style={{ fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.03em' }}
            >
              食在力量。
              <br />
              <span style={{ fontWeight: 400, color: h.muted }}>非凡產業共好。</span>
            </div>
          )}
          {tpl.slug === 'lovable' && (
            <div
              className="text-2xl sm:text-3xl"
              style={{ fontWeight: 600, lineHeight: 1.0, letterSpacing: '-0.04em' }}
            >
              讓餐廳<br />不再單打獨鬥。
            </div>
          )}

          {/* Sub */}
          <div className="text-[11px] mt-2.5 leading-relaxed" style={{ color: h.muted, maxWidth: 240 }}>
            {tpl.slug === 'airbnb' && '匯聚全台餐飲菁英，整合品牌、食材、媒體等資源。'}
            {tpl.slug === 'notion' && '一個地方搞定行銷、活動、會員、通路。'}
            {tpl.slug === 'stripe' && 'The connective tissue for Taiwan F&B.'}
            {tpl.slug === 'apple' && '一個平台。所有資源。產業共好。'}
            {tpl.slug === 'lovable' && '一個社群、一個平台、一份產業共好。'}
          </div>

          {/* CTA */}
          <div className="mt-3 flex flex-wrap gap-2">
            {tpl.slug === 'airbnb' && (
              <button
                className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold text-white"
                style={{ background: h.primary, borderRadius: tpl.radius }}
              >
                <Search size={11} /> 探索餐廳
              </button>
            )}
            {tpl.slug === 'notion' && (
              <button
                className="px-3 py-1.5 text-[10px] font-bold text-white"
                style={{ background: h.primary, borderRadius: tpl.radius }}
              >
                免費加入 →
              </button>
            )}
            {tpl.slug === 'stripe' && (
              <button
                className="px-3 py-1.5 text-[10px] font-bold"
                style={{ background: '#FFFFFF', color: '#0D253D', borderRadius: tpl.radius }}
              >
                開始合作 →
              </button>
            )}
            {tpl.slug === 'apple' && (
              <>
                <button className="px-3 py-1 text-[10px] font-medium" style={{ background: h.primary, color: '#FFFFFF', borderRadius: tpl.radius }}>
                  進一步了解
                </button>
                <button className="px-3 py-1 text-[10px] font-medium" style={{ color: h.primary, borderRadius: tpl.radius }}>
                  立即加入 →
                </button>
              </>
            )}
            {tpl.slug === 'lovable' && (
              <button
                className="px-3 py-1.5 text-[10px] font-semibold"
                style={{
                  background: h.ink,
                  color: h.bg,
                  borderRadius: tpl.radius,
                  boxShadow: 'rgba(255,255,255,0.2) 0px 0.5px 0px 0px inset, rgba(0,0,0,0.2) 0px 0px 0px 0.5px inset'
                }}
              >
                加入協會
              </button>
            )}
          </div>
        </div>

        {/* Bottom stats strip — show how data is presented in each brand */}
        <div
          className="flex items-center gap-3 pt-3 mt-auto text-[9px]"
          style={{ borderTop: `1px solid ${h.hairline}`, color: h.muted }}
        >
          <span><strong style={{ color: h.ink }}>2,500+</strong> 社群</span>
          <span style={{ color: h.hairline }}>·</span>
          <span><strong style={{ color: h.ink }}>100+</strong> 品牌</span>
          <span style={{ color: h.hairline }}>·</span>
          <span><strong style={{ color: h.ink }}>30+</strong> 活動</span>
        </div>
      </div>
    </div>
  );
};

// ============== Main page ==============

const DesignDemoIndex: React.FC = () => {
  return (
    <div className="min-h-screen bg-stone-50 text-gray-900">
      {/* Header */}
      <header className="px-6 sm:px-10 py-8 border-b border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <div className="text-xs font-bold tracking-[0.3em] text-orange-600 uppercase mb-2">
              Design Direction · Reference Comparison
            </div>
            <h1 className="text-3xl sm:text-4xl font-black">食在力量 · 風格參考</h1>
            <p className="text-sm text-gray-500 mt-1">
              5 個來自 <a href="https://github.com/VoltAgent/awesome-design-md" target="_blank" rel="noopener noreferrer" className="underline">awesome-design-md</a> 的真實品牌設計規範，套到「食在力量」內容看實際效果。
            </p>
          </div>
          <Link to="/" className="text-xs font-bold tracking-wider px-4 py-2 rounded-full bg-gray-900 text-white hover:bg-gray-700 transition-colors">
            返回正式網站 →
          </Link>
        </div>
      </header>

      {/* Cards */}
      <main className="max-w-7xl mx-auto px-6 sm:px-10 py-10">
        <div className="grid lg:grid-cols-2 gap-6">
          {templates.map((t, i) => (
            <motion.div
              key={t.slug}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="bg-white rounded-2xl shadow-md overflow-hidden border border-stone-200 hover:shadow-xl transition-shadow"
            >
              {/* Mini hero */}
              <MiniHero tpl={t} />

              {/* Card info */}
              <div className="p-6">
                <div className="flex items-baseline justify-between mb-2">
                  <h2 className="text-2xl font-black tracking-tight">{t.name}</h2>
                  <div className="flex gap-2">
                    <a
                      href={t.site}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold tracking-wider rounded-full bg-gray-900 text-white hover:bg-gray-700 transition-colors"
                    >
                      看官網 <ArrowUpRight size={12} />
                    </a>
                    <a
                      href={t.mdPath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold tracking-wider rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <FileText size={12} /> DESIGN.md
                    </a>
                  </div>
                </div>

                <p className="text-sm text-gray-600 leading-relaxed mb-4">{t.descCN}</p>

                {/* Swatches */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mr-1">Colors</span>
                  {t.swatches.map((c) => (
                    <div
                      key={c}
                      className="w-6 h-6 rounded-md border border-stone-200"
                      style={{ background: c }}
                      title={c}
                    />
                  ))}
                </div>

                {/* Keywords */}
                <div className="flex flex-wrap gap-1.5">
                  {t.keywords.map(k => (
                    <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-semibold border border-stone-200">
                      # {k}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Notes & next steps */}
        <div className="mt-12 grid md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-stone-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 grid place-items-center text-orange-600 flex-shrink-0">
                <ExternalLink size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold mb-2">怎麼用這個比較頁</h3>
                <ul className="text-sm text-gray-600 space-y-1.5 leading-relaxed">
                  <li>• 每張卡上方的 <strong>mini hero</strong> 是直接套該品牌色票/字體做的，把同一份「食在力量」內容套上去看感受</li>
                  <li>• 點 <strong>看官網</strong> 看該品牌實際網站視覺</li>
                  <li>• 點 <strong>DESIGN.md</strong> 看完整設計規範（這份才是 Claude 之後產 UI 會讀的東西）</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-600 grid place-items-center text-white flex-shrink-0">
                <ArrowUpRight size={18} />
              </div>
              <div>
                <h3 className="text-lg font-bold mb-2">選好之後怎麼做</h3>
                <ul className="text-sm text-gray-700 space-y-1.5 leading-relaxed">
                  <li>① 跟我說選哪個品牌風格（或想混搭哪兩個）</li>
                  <li>② 我把該 DESIGN.md 設為專案主規範，CLAUDE.md 加引用</li>
                  <li>③ 挑 1 頁示範改寫（例如 /about）</li>
                  <li>④ 你滿意後 rollout 到全站</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 之前自製的 demo */}
        <details className="mt-10">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1">
            ▸ 也有之前自製的 3 個方向（你說怪怪的，先收起來）
          </summary>
          <div className="mt-4 flex gap-3 flex-wrap">
            <Link to="/design/jp" className="text-xs text-gray-600 underline">/design/jp 日系</Link>
            <Link to="/design/eu" className="text-xs text-gray-600 underline">/design/eu 歐美</Link>
            <Link to="/design/cn" className="text-xs text-gray-600 underline">/design/cn 中式</Link>
          </div>
        </details>
      </main>

      <footer className="px-6 sm:px-10 py-8 border-t border-stone-200 text-xs text-gray-500 text-center">
        食在力量 Design Direction · 參考自 VoltAgent / awesome-design-md
      </footer>
    </div>
  );
};

export default DesignDemoIndex;
