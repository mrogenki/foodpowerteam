import { createClient } from '@supabase/supabase-js';

// Supabase 設定
// 2026-07-12 遷移：孟買（kplty…）→ 東京（igow…），詳見 docs/migrate-db-to-tokyo.md
const DEFAULT_URL = 'https://igowitmbnlvzznqgfpfl.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnb3dpdG1ibmx2enpucWdmcGZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NjE2MzcsImV4cCI6MjA5OTMzNzYzN30.XovQ0zXKOZ58jEOUJvM7HYZWNW5OsJPTq3hlNWwfh70';

const getConfig = (envKey: string, storageKey: string, defaultValue: string): string => {
  try {
    const envVal = (import.meta as any)?.env?.[envKey];
    if (envVal) return envVal;
  } catch (e) {}
  // SSR 預渲染環境沒有 localStorage，需防護
  if (typeof localStorage !== 'undefined') {
    const storageVal = localStorage.getItem(storageKey);
    if (storageVal) return storageVal;
  }
  return defaultValue;
};

const SUPABASE_URL = getConfig('VITE_SUPABASE_URL', 'supabase_url', DEFAULT_URL);
const SUPABASE_ANON_KEY = getConfig('VITE_SUPABASE_ANON_KEY', 'supabase_key', DEFAULT_KEY);

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;
