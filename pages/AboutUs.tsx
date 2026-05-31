import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, Users, Briefcase, Award, Globe, Heart, Target, Calendar, Building2, ShieldCheck, Sparkles, Handshake, TrendingUp, Newspaper, X, ZoomIn } from 'lucide-react';

const CERT_IMAGE = '/license-certificate.jpg';

const AboutUs: React.FC = () => {
  const [certOpen, setCertOpen] = useState(false);
  const [certAvailable, setCertAvailable] = useState(true);

  useEffect(() => {
    document.title = '關於我們 | 食在力量 - 連結產業，創造共好';
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Hero Section */}
      <div className="bg-red-600 py-20 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold mb-4"
          >
            關於我們
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-red-100 max-w-2xl"
          >
            連結食品產業力量，打造共創、共享、共贏的專業社群。
          </motion.p>
        </div>
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* 成果數據統計 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <Users className="text-red-600" size={24} />, value: '2,500+', label: '產業老闆社群', note: '持續成長中' },
              { icon: <Award className="text-red-600" size={24} />, value: '150+', label: '協會正式會員', note: '持續成長中' },
              { icon: <Calendar className="text-red-600" size={24} />, value: '100', label: '累計舉辦活動（場）', note: '2023→2025 逐年成長' },
              { icon: <Building2 className="text-red-600" size={24} />, value: '2024.02', label: '正式成立' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="text-center"
              >
                <div className="inline-flex p-3 bg-red-50 rounded-xl mb-3">{stat.icon}</div>
                <div className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">{stat.value}</div>
                <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
                {stat.note && <div className="text-xs text-red-600/70 mt-1">{stat.note}</div>}
              </motion.div>
            ))}
          </div>

          {/* 活動場次逐年成長 */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-4 text-gray-700">
              <TrendingUp size={18} className="text-red-600" />
              <span className="text-sm font-bold">活動場次逐年成長</span>
            </div>
            <div className="flex items-end justify-around gap-4 h-32">
              {[
                { year: '2023', count: 25 },
                { year: '2024', count: 33 },
                { year: '2025', count: 42 },
              ].map((bar, i) => (
                <div key={bar.year} className="flex-1 flex flex-col items-center justify-end h-full">
                  <span className="text-sm font-bold text-red-700 mb-1">{bar.count} 場</span>
                  <motion.div
                    initial={{ height: 0 }}
                    whileInView={{ height: `${(bar.count / 42) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.6, ease: 'easeOut' }}
                    className="w-full max-w-[80px] bg-gradient-to-t from-red-600 to-red-400 rounded-t-lg"
                  />
                  <span className="text-xs text-gray-500 mt-2">{bar.year}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 使命 / 願景 / 核心價值 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-red-600 to-red-700 rounded-2xl p-8 md:p-10 shadow-xl text-white lg:col-span-3 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/4 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-3 text-red-100">
                  <Target size={18} />
                  <span className="text-sm font-bold tracking-wider">使命 MISSION</span>
                </div>
                <p className="text-xl md:text-2xl font-bold leading-relaxed">
                  連結食品與餐飲產業的每一份力量，協助業者突破通路與資訊的隔閡，攜手成長。
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3 text-red-100">
                  <Sparkles size={18} />
                  <span className="text-sm font-bold tracking-wider">願景 VISION</span>
                </div>
                <p className="text-xl md:text-2xl font-bold leading-relaxed">
                  成為台灣最值得信賴的美食產業交流平台，讓好品牌被看見、讓好夥伴能相遇。
                </p>
              </div>
            </div>
            <div className="relative z-10 border-t border-white/20 pt-6">
              <div className="text-sm font-bold tracking-wider text-red-100 mb-4">核心價值 VALUES</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { title: '共創', desc: '集結產業智慧，共同開創新商機。' },
                  { title: '共享', desc: '資源、人脈與經驗無私交流分享。' },
                  { title: '共贏', desc: '品牌與通路強強聯手，創造多贏。' },
                ].map((v) => (
                  <div key={v.title} className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
                    <div className="text-2xl font-extrabold mb-2">{v.title}</div>
                    <div className="text-sm text-red-50/90 leading-relaxed">{v.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* 發展歷程 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 lg:col-span-3"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-red-50 rounded-xl">
                <History className="text-red-600" size={28} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">發展歷程</h2>
            </div>
            <div className="prose prose-red max-w-none text-gray-600 leading-relaxed">
              <p className="text-lg">
                「食在力量」起源於對台灣餐飲/食品產業的熱愛與使命感。我們發現許多優秀的餐飲/食品品牌在成長過程中，常面臨通路對接困難、資訊不對稱等挑戰。
              </p>
              <p className="text-lg mt-4">
                因此，我們建立了一個專業的交流平台，透過「講座論壇」、「企業參訪」與「專業課程」，讓業者能互相學習、資源共享。從最初的小型聚會，發展至今已成為連結數百家品牌的指標性協會。
              </p>
            </div>
          </motion.div>

          {/* 理監事 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 lg:col-span-1"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-red-50 rounded-xl">
                <Award className="text-red-600" size={28} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">理監事會</h2>
            </div>
            <div className="space-y-6">
              <div className="border-l-4 border-red-600 pl-4">
                <h3 className="font-bold text-gray-900">理事長、秘書長</h3>
                <p className="text-sm text-gray-500 mt-1">核心領導團隊，統籌協會發展策略與資源對接。</p>
              </div>
              <div className="border-l-4 border-gray-200 pl-4">
                <h3 className="font-bold text-gray-900">理事、監事</h3>
                <p className="text-sm text-gray-500 mt-1">由產業精英組成，監督協會運作並提供專業諮詢。</p>
              </div>
              <div className="border-l-4 border-gray-200 pl-4">
                <h3 className="font-bold text-gray-900">顧問團</h3>
                <p className="text-sm text-gray-500 mt-1">邀請資深前輩與專家，為協會提供長期的智慧指導。</p>
              </div>
            </div>
          </motion.div>

          {/* 營運團隊 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 lg:col-span-2"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-red-50 rounded-xl">
                <Users className="text-red-600" size={28} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">營運團隊</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-2">
                  <Target size={18} className="text-red-600" /> 活動組
                </h3>
                <p className="text-sm text-gray-500">策劃講座論壇、企業參訪、交流餐敘與專業課程。</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-2">
                  <Globe size={18} className="text-red-600" /> 資訊組
                </h3>
                <p className="text-sm text-gray-500">負責系統開發、數位工具導入與線上平台維運。</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-2">
                  <Briefcase size={18} className="text-red-600" /> 行政組
                </h3>
                <p className="text-sm text-gray-500">處理協會日常行政、財務管理與會員入會服務。</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-2">
                  <Users size={18} className="text-red-600" /> 會員委員會
                </h3>
                <p className="text-sm text-gray-500">經營會員關係，招募新血並維護現有會員權益。</p>
              </div>
              
              {/* 通路組 */}
              <div className="p-4 bg-red-50/50 rounded-xl border border-red-100 md:col-span-1">
                <h3 className="font-bold text-red-900 flex items-center gap-2 mb-3">
                  <Globe size={18} className="text-red-600" /> 通路組
                </h3>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-red-700 border border-red-100 shadow-sm">企業福委</span>
                  <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-red-700 border border-red-100 shadow-sm">國際市場</span>
                </div>
                <p className="text-xs text-red-600/70 mt-3">專注於企業採購對接與全球市場拓展。</p>
              </div>

              {/* 品牌組 */}
              <div className="p-4 bg-red-50/50 rounded-xl border border-red-100 md:col-span-1">
                <h3 className="font-bold text-red-900 flex items-center gap-2 mb-3">
                  <Heart size={18} className="text-red-600" /> 品牌組
                </h3>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-red-700 border border-red-100 shadow-sm">餐飲人俱樂部</span>
                  <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-red-700 border border-red-100 shadow-sm">食品人俱樂部</span>
                </div>
                <p className="text-xs text-red-600/70 mt-3">深度經營垂直領域社群，促進品牌間的強強聯手。</p>
              </div>
            </div>
          </motion.div>

          {/* 合法立案資訊 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 lg:col-span-3"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-red-50 rounded-xl">
                <ShieldCheck className="text-red-600" size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">合法立案資訊</h2>
                <p className="text-sm text-gray-500 mt-0.5">依法登記之人民團體，營運公開透明</p>
              </div>
            </div>
            <div className={`grid grid-cols-1 gap-6 ${certAvailable ? 'lg:grid-cols-3' : ''}`}>
              {/* 資訊欄位 */}
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${certAvailable ? 'lg:col-span-2' : 'lg:grid-cols-3'}`}>
                {[
                  { label: '協會全名', value: '食在力量美食產業交流協會' },
                  { label: '主管機關', value: '內政部' },
                  { label: '立案字號', value: '台內團字第 1130022533 號' },
                  { label: '統一編號', value: '00509918' },
                  { label: '成立日期', value: '中華民國 113 年 2 月 25 日（2024）' },
                  { label: '組織型態', value: '全國性及區級人民團體（社團法人）' },
                  { label: '會址', value: '臺北市中正區羅斯福路 3 段 126 號 3 樓' },
                ].map((item) => (
                  <div key={item.label} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="text-xs font-bold text-gray-400 mb-1">{item.label}</div>
                    <div className="text-sm font-semibold text-gray-900">{item.value}</div>
                  </div>
                ))}
              </div>

              {/* 立案證書縮圖 */}
              {certAvailable && (
                <div className="lg:col-span-1">
                  <button
                    type="button"
                    onClick={() => setCertOpen(true)}
                    className="group relative w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shadow-sm hover:shadow-md transition-shadow"
                    aria-label="點擊放大立案證書"
                  >
                    <img
                      src={CERT_IMAGE}
                      alt="食在力量美食產業交流協會 立案證書"
                      loading="lazy"
                      onError={() => setCertAvailable(false)}
                      className="w-full h-auto object-contain"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <span className="flex items-center gap-1.5 bg-white/90 text-gray-900 text-xs font-bold px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow">
                        <ZoomIn size={14} /> 點擊放大
                      </span>
                    </div>
                  </button>
                  <p className="text-xs text-gray-400 text-center mt-2">內政部核發立案證書</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* 合作夥伴 / 媒體報導 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100 lg:col-span-3"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-red-50 rounded-xl">
                <Handshake className="text-red-600" size={28} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">合作夥伴與媒體</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center gap-2 mb-4 text-gray-700">
                  <Handshake size={18} className="text-red-600" />
                  <span className="text-sm font-bold">合作夥伴</span>
                </div>
                <div className="space-y-3">
                  {[
                    { abbr: 'TCCNA', name: '北美洲台灣商會聯合總會', logo: '/tccna-logo.png' },
                    { abbr: 'ETCC', name: '歐洲台灣商會聯合總會', logo: '/etcc-logo.jpg' },
                  ].map((p) => (
                    <div
                      key={p.abbr}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100"
                    >
                      <div className="shrink-0 w-20 h-20 rounded-lg bg-white border border-gray-200 flex items-center justify-center p-1.5 shadow-sm">
                        <img
                          src={p.logo}
                          alt={`${p.name} logo`}
                          loading="lazy"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-400">{p.abbr}</div>
                        <div className="font-bold text-gray-900">{p.name}</div>
                        <span className="inline-flex items-center gap-1 mt-1.5 bg-green-50 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full border border-green-100">
                          <ShieldCheck size={12} /> 已簽署 MOU
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-4 text-gray-700">
                  <Newspaper size={18} className="text-red-600" />
                  <span className="text-sm font-bold">媒體報導</span>
                </div>
                <div className="space-y-3">
                  {[
                    {
                      source: '卓越雜誌',
                      date: '2026.03.23',
                      title: '揭開台灣餐飲淘汰賽下半場！食在力量如何靠資源整合，聯手歐洲台商會翻轉產業新格局？',
                      url: 'https://www.ecf.com.tw/tw/article/show.aspx?num=10234',
                    },
                    {
                      source: '台灣產經新聞網',
                      date: '2025.06.24',
                      title: '打造文化輸出與品牌國際化雙引擎 食在力量餐飲代表團赴美參訪',
                      url: 'https://n.yam.com/Article/20250624541920',
                    },
                    {
                      source: '卓越雜誌',
                      date: '2026.05.05',
                      title: '打破地域與產業邊界！食在力量結盟彰青匯，百工百業鏈結共創「大食品時代」新生態',
                      url: 'https://www.ecf.com.tw/tw/article/show.aspx?num=10324&kind=36',
                    },
                  ].map((m) => (
                    <a
                      key={m.url}
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-red-200 hover:bg-red-50/30 transition-colors"
                    >
                      <Newspaper size={18} className="text-red-600 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                          <span className="font-bold text-red-600">{m.source}</span>
                          <span>·</span>
                          <span>{m.date}</span>
                        </div>
                        <div className="text-sm font-semibold text-gray-800 group-hover:text-red-700 leading-snug">
                          {m.title}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>

      {/* 立案證書燈箱 */}
      <AnimatePresence>
        {certOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCertOpen(false)}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
          >
            <button
              type="button"
              onClick={() => setCertOpen(false)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
              aria-label="關閉"
            >
              <X size={24} />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              src={CERT_IMAGE}
              alt="食在力量美食產業交流協會 立案證書"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AboutUs;
