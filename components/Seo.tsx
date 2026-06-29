import React, { useEffect } from 'react';

// 每頁 SEO/分享 meta。React 19 會自動把 <title>/<meta>/<link> hoist 到 <head>，
// 因此各頁只要在最上層渲染 <Seo .../> 即可設定該頁的標題、描述、canonical 與 OG。
const SITE = 'https://www.foodpowerteam.com';
const DEFAULT_DESC =
  '食在力量 - 連結產業，創造共好。匯聚各產業菁英，提供講座論壇、企業參訪、專業課程等活動報名與會員管理服務。';
const DEFAULT_IMAGE = `${SITE}/og-brand.jpg`;

interface SeoProps {
  title: string;
  description?: string;
  /** 不含網域的路徑，例如 /join；首頁傳 '' */
  path?: string;
  image?: string;
  /** 後台、付款、收據等不希望被索引的頁面設 true */
  noindex?: boolean;
}

const Seo: React.FC<SeoProps> = ({
  title,
  description = DEFAULT_DESC,
  path = '',
  image = DEFAULT_IMAGE,
  noindex = false,
}) => {
  const url = `${SITE}${path}`;
  const fullTitle = title.includes('食在力量') ? title : `${title}｜食在力量`;
  // 用 document.title 更新唯一的 <title> 元素文字，避免與 index.html 的靜態 <title> 重複
  // （重複的 <title> 會讓爬蟲讀到第一個＝靜態預設，導致每頁標題失效）
  useEffect(() => {
    document.title = fullTitle;
  }, [fullTitle]);
  return (
    <>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="食在力量" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </>
  );
};

export default Seo;
