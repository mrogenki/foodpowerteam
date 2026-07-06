import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ isSsrBuild }) => {
    return {
      server: {
        port: 3004,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        tailwindcss(),
      ],
      // 只暴露 VITE_ 前綴變數到前端；TELEGRAM_/GEMINI 等機密一律留後端
      envPrefix: ['VITE_'],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // manualChunks 僅用於 client build；SSR build 會把 react 等視為 external，不可分包
        rollupOptions: isSsrBuild ? {} : {
          output: {
            manualChunks: {
              // React 核心獨立成一包（快取效益最大）
              'vendor-react': ['react', 'react-dom', 'react-router-dom'],
              // 動畫庫分離（體積大，但各頁共用）
              'vendor-motion': ['motion/react'],
              // Supabase client 獨立（只在需要時載入）
              'vendor-supabase': ['@supabase/supabase-js'],
              // 圖示庫分離
              'vendor-icons': ['lucide-react'],
              // 加密金流工具（只有付款頁需要）
              'vendor-payment': ['crypto-js'],
            }
          }
        },
        // 提高警告門檻（AdminDashboard 本身就很大）
        chunkSizeWarningLimit: 600,
      }
    };
});
