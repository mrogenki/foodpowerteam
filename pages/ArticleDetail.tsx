import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, ChevronLeft, Loader2, Newspaper, Lock } from 'lucide-react';
import liff from '@line/liff';
import { Article } from '../types';
import { supabase } from '../utils/supabaseClient';
import BlockRenderer from '../components/BlockRenderer';
import Seo from '../components/Seo';

const SITE = 'https://www.foodpowerteam.com';
// 會員專區 LIFF（用來驗證會員身分解鎖全文）
const MEMBER_LIFF_ID = ((import.meta as any)?.env?.VITE_LIFF_MEMBER_ID as string) || '2010533806-E7Dmp1Mc';
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
  const [unlocking, setUnlocking] = useState(false);
  const [notMember, setNotMember] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (article && article.slug === slug) { setLoading(false); return; }
    const load = async () => {
      const p = (articles || []).find(a => a.slug === slug && a.status === 'published');
      if (p) { if (!cancelled) { setArticle(p); setLoading(false); } return; }
      if (!supabase || !slug) { if (!cancelled) { setLoading(false); setNotFound(true); } return; }
      // 走公開視圖 RPC（會員限定文章只回預覽 + locked）
      const { data } = await supabase.rpc('public_articles');
      if (cancelled) return;
      const found = (Array.isArray(data) ? data : []).find((a: any) => a.slug === slug) as Article | undefined;
      if (found) setArticle(found); else setNotFound(true);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, articles]);

  // 以 LINE 身分解鎖全文（有效會員才會拿到完整內容）
  const unlock = async () => {
    if (!supabase || !slug) return;
    setNotMember(false);
    setUnlocking(true);
    try {
      await liff.init({ liffId: MEMBER_LIFF_ID });
      if (!liff.isLoggedIn()) {
        // 記錄登入後要自動續解的文章，redirect 回來自動完成
        try { sessionStorage.setItem('unlock_after_login', slug); } catch {}
        liff.login({ redirectUri: window.location.href });
        return;
      }
      const prof = await liff.getProfile();
      const { data, error } = await supabase.rpc('article_unlock', { p_slug: slug, p_line_user_id: prof.userId });
      const row = Array.isArray(data) ? data[0] : data;
      if (error || !row) { alert('解鎖失敗，請稍後再試'); return; }
      if (row.unlocked) {
        setArticle(a => (a ? { ...a, content: row.content, locked: false } : a));
      } else {
        setNotMember(true);
      }
    } catch (e: any) {
      alert('LINE 登入失敗：' + (e?.message ?? String(e)));
    } finally {
      setUnlocking(false);
    }
  };

  // LINE 登入 redirect 回來後，自動續解上次要看的文章
  useEffect(() => {
    let resume = '';
    try { resume = sessionStorage.getItem('unlock_after_login') || ''; } catch {}
    if (resume && resume === slug && article?.locked) {
      try { sessionStorage.removeItem('unlock_after_login'); } catch {}
      unlock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, article?.locked]);

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
    author: article.author_name
      ? {
          '@type': 'Person',
          name: article.author_name,
          jobTitle: article.author_title || undefined,
          description: article.author_bio || undefined,
          image: article.author_avatar || undefined,
        }
      : { '@type': 'Organization', name: '食在力量美食產業交流協會' },
    publisher: {
      '@type': 'Organization',
      name: '食在力量美食產業交流協會',
      logo: { '@type': 'ImageObject', url: 'https://www.foodpowerteam.com/logo.svg' },
    },
    mainEntityOfPage: url,
    articleSection: article.category || undefined,
    // 會員限定：標記付費/會員牆（預覽公開可索引，全文需會員）——符合 Google 付費內容規範，非 cloaking
    ...(article.members_only
      ? {
          isAccessibleForFree: false,
          hasPart: {
            '@type': 'WebPageElement',
            isAccessibleForFree: false,
            cssSelector: '.members-only-content',
          },
        }
      : {}),
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

        <div className="prose prose-lg max-w-none text-gray-800 leading-relaxed members-only-content">
          <BlockRenderer value={article.content} />
        </div>

        {/* 會員限定解鎖牆 */}
        {article.locked && (
          <div className="relative -mt-8">
            {/* 漸層遮罩，暗示下方還有內容 */}
            <div className="h-24 -mt-16 bg-gradient-to-b from-transparent to-white pointer-events-none" />
            <div className="rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 to-orange-50 p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-white shadow grid place-items-center mx-auto mb-4 text-red-600">
                <Lock size={26} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">會員限定・全文閱讀</h3>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                這篇文章為食在力量會員專屬。<br />用 LINE 登入驗證會員身分，即可閱讀全文。
              </p>
              {notMember && (
                <p className="text-sm text-red-600 font-medium mt-3">
                  您目前不是有效會員（或會籍已到期）。
                </p>
              )}
              <button
                onClick={unlock}
                disabled={unlocking}
                className="mt-5 w-full sm:w-auto sm:px-10 bg-red-600 text-white py-3.5 rounded-xl font-bold text-lg shadow-lg shadow-red-200 disabled:opacity-50"
              >
                {unlocking ? '驗證中…' : '用 LINE 登入看全文'}
              </button>
              <div className="mt-4 text-sm text-gray-500">
                還不是會員？
                <Link to="/join" className="text-red-600 font-bold ml-1 hover:underline">加入食在力量 →</Link>
              </div>
            </div>
          </div>
        )}

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
