import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Calendar, User, ArrowRight, Newspaper } from 'lucide-react';
import { Article, ARTICLE_CATEGORIES } from '../types';

const fmtDate = (s?: string) => {
  if (!s) return '';
  try { return new Date(s).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return s.slice(0, 10); }
};

const ArticleList: React.FC<{ articles: Article[] }> = ({ articles }) => {
  const [filter, setFilter] = useState<string>('all');

  const published = useMemo(
    () => (articles || [])
      .filter(a => a.status === 'published')
      .sort((a, b) => String(b.published_at || b.created_at || '').localeCompare(String(a.published_at || a.created_at || ''))),
    [articles]
  );

  const list = filter === 'all' ? published : published.filter(a => a.category === filter);

  return (
    <div className="pb-20">
      {/* Hero */}
      <section className="bg-white border-b py-16 px-4 mb-10">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold mb-4">
            <Newspaper size={14} /> 專欄
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-gray-900">產業專欄</h1>
          <p className="text-gray-500 max-w-2xl mx-auto">產業資訊、專家觀點與協會動態，掌握餐飲與美食產業第一手洞見。</p>

          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <button onClick={() => setFilter('all')}
              className={`px-5 py-2 rounded-full font-bold transition-all ${filter === 'all' ? 'bg-gray-900 text-white shadow-lg' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              全部
            </button>
            {ARTICLE_CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setFilter(cat)}
                className={`px-5 py-2 rounded-full font-bold transition-all ${filter === cat ? 'bg-red-600 text-white shadow-lg' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {list.length === 0 ? (
          <div className="text-center text-gray-400 py-20">目前尚無文章，敬請期待。</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {list.map(a => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }}>
                <Link to={`/article/${a.slug}`} className="group block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all overflow-hidden h-full">
                  <div className="aspect-[16/9] bg-gray-100 overflow-hidden">
                    {a.cover
                      ? <img src={a.cover} alt={a.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      : <div className="w-full h-full grid place-items-center text-gray-300"><Newspaper size={40} /></div>}
                  </div>
                  <div className="p-5">
                    {a.category && <span className="inline-block text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full mb-2">{a.category}</span>}
                    <h2 className="text-lg font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-red-600 transition-colors">{a.title}</h2>
                    {a.excerpt && <p className="text-sm text-gray-500 mt-2 line-clamp-2">{a.excerpt}</p>}
                    <div className="flex items-center justify-between mt-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">{a.author_name && <><User size={12} /> {a.author_name}</>}</span>
                      <span className="flex items-center gap-1"><Calendar size={12} /> {fmtDate(a.published_at || a.created_at)}</span>
                    </div>
                    <div className="mt-3 text-red-600 text-sm font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      閱讀全文 <ArrowRight size={14} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArticleList;
