import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, ChevronLeft, Loader2, Newspaper } from 'lucide-react';
import { Article } from '../types';
import { supabase } from '../utils/supabaseClient';
import BlockRenderer from '../components/BlockRenderer';
import Seo from '../components/Seo';

const SITE = 'https://www.foodpowerteam.com';
const fmtDate = (s?: string) => {
  if (!s) return '';
  try { return new Date(s).toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return s.slice(0, 10); }
};

const ArticleDetail: React.FC<{ articles?: Article[] }> = ({ articles }) => {
  const { slug } = useParams<{ slug: string }>();
  // 預渲染（SSR）時由 prerender 每次 render() 注入的初始資料，讓正文能進到靜態 HTML。
  // 必須在 render 時讀取（非 module 載入時），否則每篇都拿到第一次的值。
  const ssrInitial = (typeof window === 'undefined') ? (globalThis as any).__SSR_DATA__ as Article | undefined : undefined;
  const fromProps = (articles || []).find(a => a.slug === slug && a.status === 'published');
  const [article, setArticle] = useState<Article | null>(
    (ssrInitial && ssrInitial.slug === slug) ? ssrInitial : (fromProps || null)
  );
  const [loading, setLoading] = useState(!article);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (article && article.slug === slug) { setLoading(false); return; }
    const load = async () => {
      const p = (articles || []).find(a => a.slug === slug && a.status === 'published');
      if (p) { if (!cancelled) { setArticle(p); setLoading(false); } return; }
      if (!supabase || !slug) { if (!cancelled) { setLoading(false); setNotFound(true); } return; }
      const { data } = await supabase.from('articles').select('*').eq('slug', slug).eq('status', 'published').maybeSingle();
      if (cancelled) return;
      if (data) setArticle(data as Article); else setNotFound(true);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, articles]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-red-600" size={44} /></div>;
  }

  if (notFound || !article) {
    return (
      <div className="pt-32 min-h-screen bg-gray-50 text-center px-4">
        <div className="text-4xl mb-4">📰</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">找不到這篇文章</h1>
        <p className="text-gray-500 mb-8">文章可能已下架或連結有誤。</p>
        <Link to="/articles" className="inline-block bg-red-600 text-white px-8 py-3 rounded-full font-bold hover:bg-red-700 transition-colors">回專欄</Link>
      </div>
    );
  }

  const url = `${SITE}/article/${article.slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt || undefined,
    image: article.cover || undefined,
    datePublished: article.published_at || article.created_at || undefined,
    dateModified: article.updated_at || article.published_at || undefined,
    author: article.author_name ? { '@type': 'Person', name: article.author_name, jobTitle: article.author_title || undefined } : { '@type': 'Organization', name: '食在力量' },
    publisher: { '@type': 'Organization', name: '食在力量美食產業交流協會' },
    mainEntityOfPage: url,
    articleSection: article.category || undefined,
  };

  return (
    <div className="pt-24 min-h-screen bg-white pb-24">
      <Seo title={article.title} description={article.excerpt || article.title} path={`/article/${article.slug}`} image={article.cover} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      <article className="max-w-3xl mx-auto px-4 sm:px-6">
        <Link to="/articles" className="inline-flex items-center gap-2 text-gray-400 hover:text-red-600 mb-6 text-sm font-medium transition-colors">
          <ChevronLeft className="w-4 h-4" /> 回專欄
        </Link>

        {article.category && <span className="inline-block text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full mb-3">{article.category}</span>}
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight mb-4">{article.title}</h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 border-b pb-6 mb-8">
          {article.author_name && (
            <span className="flex items-center gap-2">
              {article.author_avatar
                ? <img src={article.author_avatar} alt={article.author_name} className="w-8 h-8 rounded-full object-cover" />
                : <span className="w-8 h-8 rounded-full bg-red-100 text-red-600 grid place-items-center text-xs font-bold">{article.author_name.slice(0, 1)}</span>}
              <span className="font-bold text-gray-700">{article.author_name}</span>
              {article.author_title && <span className="text-gray-400">· {article.author_title}</span>}
            </span>
          )}
          <span className="flex items-center gap-1"><Calendar size={14} /> {fmtDate(article.published_at || article.created_at)}</span>
        </div>

        {article.cover && (
          <img src={article.cover} alt={article.title} className="w-full rounded-2xl mb-8 object-cover" loading="eager" />
        )}

        <div className="prose prose-lg max-w-none text-gray-800 leading-relaxed">
          <BlockRenderer value={article.content} />
        </div>

        {article.author_bio && (
          <div className="mt-12 bg-gray-50 rounded-2xl p-6 flex items-start gap-4">
            {article.author_avatar
              ? <img src={article.author_avatar} alt={article.author_name} className="w-14 h-14 rounded-full object-cover shrink-0" />
              : <span className="w-14 h-14 rounded-full bg-red-100 text-red-600 grid place-items-center text-lg font-bold shrink-0"><Newspaper size={22} /></span>}
            <div>
              <div className="font-bold text-gray-900">{article.author_name}{article.author_title && <span className="text-gray-400 font-normal"> · {article.author_title}</span>}</div>
              <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">{article.author_bio}</p>
            </div>
          </div>
        )}

        <div className="mt-12 text-center">
          <Link to="/articles" className="inline-block bg-gray-900 text-white px-8 py-3 rounded-full font-bold hover:bg-gray-800 transition-colors">看更多專欄文章</Link>
        </div>
      </article>
    </div>
  );
};

export default ArticleDetail;
