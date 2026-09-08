import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, ChevronLeft, Loader2, Newspaper, Lock } from 'lucide-react';
import liff from '@line/liff';
import { Article } from '../types';
import { supabase } from '../utils/supabaseClient';
import BlockRenderer from '../components/BlockRenderer';
import Seo from '../components/Seo';

const SITE = 'https://www.foodpowerteam.com';
// 網站登入專用 LIFF（Endpoint = 網站根目錄 https://www.foodpowerteam.com/，站上任何頁面都可登入解鎖）
const WEBLOGIN_LIFF_ID = ((import.meta as any)?.env?.VITE_LIFF_WEBLOGIN_ID as string) || '2010533806-Qoq00FsJ';
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
  // 解鎖牆狀態：idle=只顯示登入鈕；bind=顯示綁定表單；expired=會籍過期；notmember=查無會員
  const [gateStep, setGateStep] = useState<'idle' | 'bind' | 'expired' | 'notmember'>('idle');
  const [lineUserId, setLineUserId] = useState('');
  const [binding, setBinding] = useState(false);
  const [bPhone, setBPhone] = useState('');
  const [bName, setBName] = useState('');
  const [bBirthday, setBBirthday] = useState('');

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

  // 呼叫解鎖 RPC：成功→展開全文；否則→引導綁定
  const doUnlock = async (uid: string): Promise<boolean> => {
    if (!supabase || !slug) return false;
    const { data, error } = await supabase.rpc('article_unlock', { p_slug: slug, p_line_user_id: uid });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) { alert('解鎖失敗，請稍後再試'); return false; }
    if (row.unlocked) {
      setArticle(a => (a ? { ...a, content: row.content, locked: false } : a));
      setGateStep('idle');
      return true;
    }
    // 未解鎖（多半是「還沒綁定 LINE」）→ 引導綁定
    setGateStep('bind');
    return false;
  };

  // 以 LINE 身分解鎖全文（有效會員才會拿到完整內容）
  const unlock = async () => {
    if (!supabase || !slug) return;
    setUnlocking(true);
    try {
      await liff.init({ liffId: WEBLOGIN_LIFF_ID });
      if (!liff.isLoggedIn()) {
        // 導去登入中繼頁完成 LINE 握手（LINE 會落在 LIFF endpoint /liff/login），完成後送回本文章自動續解
        try { sessionStorage.setItem('unlock_after_login', slug); } catch {}
        const ret = window.location.pathname + window.location.search;
        window.location.href = '/liff/login?return=' + encodeURIComponent(ret);
        return;
      }
      const prof = await liff.getProfile();
      setLineUserId(prof.userId);
      setBName(prev => prev || prof.displayName || '');
      await doUnlock(prof.userId);
    } catch (e: any) {
      alert('LINE 登入失敗：' + (e?.message ?? String(e)));
    } finally {
      setUnlocking(false);
    }
  };

  // 未綁定會員 → 當場以手機+姓名+生日綁定（同會員專區），綁定後自動解鎖
  const submitBind = async () => {
    if (!supabase || !lineUserId) return;
    if (!bPhone.trim() || !bName.trim() || !bBirthday.trim()) { alert('請填寫手機、姓名、生日'); return; }
    setBinding(true);
    try {
      const { error } = await supabase.rpc('member_bind_line', {
        p_line_user_id: lineUserId, p_phone: bPhone.trim(), p_name: bName.trim(), p_birthday: bBirthday.trim(),
      });
      if (error) {
        // 查無會員 / 資料不符 → 引導加入會員（member_bind_line 會 raise）
        setGateStep('notmember');
        return;
      }
      // 綁定成功，再解鎖一次：仍鎖住代表會籍過期
      const ok = await doUnlock(lineUserId);
      if (!ok) setGateStep('expired');
    } catch {
      setGateStep('notmember');
    } finally {
      setBinding(false);
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

              {/* 步驟一：登入 */}
              {gateStep === 'idle' && (
                <>
                  <h3 className="text-xl font-bold text-gray-900">會員限定・全文閱讀</h3>
                  <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                    這篇文章為食在力量會員專屬。<br />用 LINE 登入驗證會員身分，即可閱讀全文。
                  </p>
                  <button onClick={unlock} disabled={unlocking}
                    className="mt-5 w-full sm:w-auto sm:px-10 bg-red-600 text-white py-3.5 rounded-xl font-bold text-lg shadow-lg shadow-red-200 disabled:opacity-50">
                    {unlocking ? '驗證中…' : '用 LINE 登入看全文'}
                  </button>
                  <div className="mt-4 text-sm text-gray-500">
                    還不是會員？<Link to="/join" className="text-red-600 font-bold ml-1 hover:underline">加入食在力量 →</Link>
                  </div>
                </>
              )}

              {/* 步驟二：未綁定 → 當場綁定（手機+姓名+生日，同會員專區） */}
              {gateStep === 'bind' && (
                <div className="max-w-sm mx-auto text-left">
                  <h3 className="text-xl font-bold text-gray-900 text-center">綁定會員身分</h3>
                  <p className="text-sm text-gray-500 mt-2 mb-4 text-center">你的 LINE 尚未綁定會員。輸入入會時的資料驗證，之後免再輸入。</p>
                  <div className="space-y-3">
                    <input value={bPhone} onChange={e => setBPhone(e.target.value)} inputMode="tel" placeholder="手機號碼"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-600" />
                    <input value={bName} onChange={e => setBName(e.target.value)} placeholder="姓名（真實姓名）"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-600" />
                    <input type="date" value={bBirthday} onChange={e => setBBirthday(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-red-600" />
                    <button onClick={submitBind} disabled={binding}
                      className="w-full bg-red-600 text-white py-3.5 rounded-xl font-bold text-lg shadow-lg shadow-red-200 disabled:opacity-50">
                      {binding ? '驗證中…' : '綁定並閱讀全文'}
                    </button>
                    <p className="text-xs text-center text-gray-400">需與入會登記的手機、姓名、生日一致</p>
                  </div>
                </div>
              )}

              {/* 會籍過期 */}
              {gateStep === 'expired' && (
                <>
                  <h3 className="text-xl font-bold text-gray-900">會籍已到期</h3>
                  <p className="text-sm text-gray-500 mt-2">您的會籍目前非有效狀態，續費後即可閱讀會員限定文章。</p>
                  <a href="/renew" className="mt-5 inline-block sm:px-10 bg-red-600 text-white py-3.5 px-8 rounded-xl font-bold text-lg shadow-lg shadow-red-200">前往續費</a>
                </>
              )}

              {/* 查無會員 */}
              {gateStep === 'notmember' && (
                <>
                  <h3 className="text-xl font-bold text-gray-900">查不到你的會員資料</h3>
                  <p className="text-sm text-gray-500 mt-2">手機／姓名／生日需與入會登記一致。若你還不是會員，歡迎加入食在力量。</p>
                  <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
                    <button onClick={() => setGateStep('bind')} className="bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-bold">重新輸入</button>
                    <Link to="/join" className="bg-red-600 text-white py-3 px-8 rounded-xl font-bold">加入食在力量 →</Link>
                  </div>
                </>
              )}
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
