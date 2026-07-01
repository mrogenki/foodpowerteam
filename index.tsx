
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// 相容舊的 HashRouter 連結：把 /#/path 轉成乾淨路徑 /path（在 React 掛載前執行）
// 確保已寄出的付款連結、已印的報到 QR、分享的 VIP/折扣連結仍可正常開啟
if (window.location.hash.startsWith('#/')) {
  const clean = window.location.hash.substring(1); // e.g. /activity/1?c=CODE
  window.history.replaceState(null, '', clean);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
