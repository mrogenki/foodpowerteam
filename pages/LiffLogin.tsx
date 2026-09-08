import React, { useEffect, useState } from 'react';
import liff from '@line/liff';
import { Loader2 } from 'lucide-react';

// 網站登入中繼頁：LINE 登入完成後一定會落在 LIFF 的 Endpoint URL，
// 因此把此頁設為「網站登入」LIFF 的 endpoint（/liff/login）——由它完成登入握手，
// 再把使用者送回原本要看的頁面（return / sessionStorage）。
const WEBLOGIN_LIFF_ID = ((import.meta as any)?.env?.VITE_LIFF_WEBLOGIN_ID as string) || '2010533806-Qoq00FsJ';
const RET_KEY = 'login_return';

function safeTarget(raw: string | null): string {
  // 只允許站內相對路徑，避免開放重導
  if (!raw) return '/';
  try {
    const dec = decodeURIComponent(raw);
    if (dec.startsWith('/') && !dec.startsWith('//')) return dec;
  } catch { /* ignore */ }
  return '/';
}

export default function LiffLogin() {
  const [msg, setMsg] = useState('登入中…');

  useEffect(() => {
    (async () => {
      // 進來時若帶 ?return=，先存起來（登入 redirect 回來後 URL 不會保留它）
      const q = new URLSearchParams(window.location.search);
      const ret = q.get('return');
      if (ret) { try { sessionStorage.setItem(RET_KEY, ret); } catch {} }

      try {
        await liff.init({ liffId: WEBLOGIN_LIFF_ID });
      } catch (e: any) {
        setMsg('LINE 初始化失敗：' + (e?.message || e));
        return;
      }

      if (!liff.isLoggedIn()) {
        // 觸發 OAuth；redirectUri 回到本頁（本頁即 endpoint，合法），回來後即為已登入
        liff.login({ redirectUri: window.location.origin + '/liff/login' });
        return;
      }

      // 已登入 → 送回原頁
      let target = '/';
      try { target = safeTarget(sessionStorage.getItem(RET_KEY)); sessionStorage.removeItem(RET_KEY); } catch {}
      window.location.replace(target);
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="animate-spin text-red-600 mx-auto mb-4" size={44} />
        <p className="text-gray-600">{msg}</p>
      </div>
    </div>
  );
}
