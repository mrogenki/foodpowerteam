import React, { useState } from 'react';
import { Article, ARTICLE_CATEGORIES } from '../types';
import BlockEditor from './BlockEditor';
import { Plus, Edit2, Trash2, UploadCloud, Newspaper, ArrowLeft, Eye, EyeOff, ExternalLink } from 'lucide-react';

const slugify = (title: string): string => {
  const base = (title || '').toLowerCase().trim()
    .replace(/[^\w一-鿿\s-]/g, '')  // 去標點（保留中英數/中文/空白/-）
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/[一-鿿]/g, '');        // 移除中文（URL 用 ASCII slug 較利 SEO）
  return base || `article-${Date.now().toString(36)}`;
};

const emptyForm = (): any => ({
  slug: '', title: '', excerpt: '', content: '[]', cover: '', category: ARTICLE_CATEGORIES[0],
  author_name: '', author_title: '', author_bio: '', author_avatar: '', status: 'draft',
});

const ArticleManager: React.FC<{
  articles: Article[];
  onAdd: (art: any) => void;
  onUpdate: (art: any) => void;
  onDelete: (id: string | number) => void;
  onUploadImage: (file: File) => Promise<string>;
}> = ({ articles, onAdd, onUpdate, onDelete, onUploadImage }) => {
  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [formData, setFormData] = useState<any>(emptyForm());
  const [slugTouched, setSlugTouched] = useState(false);

  const sorted = [...(articles || [])].sort((a, b) =>
    String(b.created_at || '').localeCompare(String(a.created_at || '')));

  const handleCreate = () => { setEditingId(null); setFormData(emptyForm()); setSlugTouched(false); setView('edit'); };
  const handleEdit = (a: Article) => { setEditingId(a.id); setFormData({ ...a }); setSlugTouched(true); setView('edit'); };

  const setTitle = (title: string) => {
    setFormData((f: any) => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) { alert('請填寫標題'); return; }
    const slug = (formData.slug || '').trim() || slugify(formData.title);
    const payload = { ...formData, slug };
    if (editingId) onUpdate({ ...payload, id: editingId }); else onAdd(payload);
    setView('list');
  };

  const uploadTo = async (e: React.ChangeEvent<HTMLInputElement>, field: 'cover' | 'author_avatar') => {
    if (e.target.files && e.target.files[0]) {
      const url = await onUploadImage(e.target.files[0]);
      if (url) setFormData((f: any) => ({ ...f, [field]: url }));
    }
  };

  const togglePublish = (a: Article) => {
    onUpdate({ ...a, status: a.status === 'published' ? 'draft' : 'published' });
  };

  if (view === 'edit') {
    return (
      <div className="bg-white p-6 rounded-2xl border border-gray-100">
        <button onClick={() => setView('list')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-4 font-bold"><ArrowLeft size={18} /> 返回列表</button>
        <h2 className="text-2xl font-bold mb-6">{editingId ? '編輯文章' : '新增文章'}</h2>
        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-2">標題 <span className="text-red-600">*</span></label>
            <input value={formData.title} onChange={e => setTitle(e.target.value)} required className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-red-500" placeholder="文章標題" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">網址 slug（英文，SEO 用）</label>
            <input value={formData.slug} onChange={e => { setSlugTouched(true); setFormData({ ...formData, slug: e.target.value }); }} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-red-500 font-mono text-sm" placeholder="my-article" />
            <p className="text-xs text-gray-400 mt-1">網址：/article/{formData.slug || '...'}</p>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">分類</label>
            <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-red-500">
              {ARTICLE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-2">摘要（列表與搜尋引擎描述用）</label>
            <textarea value={formData.excerpt} onChange={e => setFormData({ ...formData, excerpt: e.target.value })} rows={2} maxLength={200} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-red-500" placeholder="一兩句話的重點摘要" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-2">封面圖片</label>
            <div className="flex items-center gap-4">
              {formData.cover ? <img src={formData.cover} alt="cover" className="w-32 h-20 object-cover rounded-lg border bg-gray-50" /> : <div className="w-32 h-20 rounded-lg border bg-gray-50 grid place-items-center text-gray-300"><Newspaper size={22} /></div>}
              <label className="cursor-pointer bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-200 flex items-center gap-2"><UploadCloud size={18} /> 上傳封面<input type="file" className="hidden" accept="image/*" onChange={e => uploadTo(e, 'cover')} /></label>
            </div>
          </div>

          <div className="md:col-span-2 border-t pt-4"><h3 className="font-bold text-gray-800 mb-2">作者資訊</h3></div>
          <div><label className="block text-sm font-bold text-gray-700 mb-2">作者姓名</label><input value={formData.author_name} onChange={e => setFormData({ ...formData, author_name: e.target.value })} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-red-500" placeholder="例：王大明 / 食在力量編輯部" /></div>
          <div><label className="block text-sm font-bold text-gray-700 mb-2">作者頭銜</label><input value={formData.author_title} onChange={e => setFormData({ ...formData, author_title: e.target.value })} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-red-500" placeholder="例：某某餐飲執行長 / 產業顧問" /></div>
          <div className="md:col-span-2"><label className="block text-sm font-bold text-gray-700 mb-2">作者簡介</label><textarea value={formData.author_bio} onChange={e => setFormData({ ...formData, author_bio: e.target.value })} rows={2} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-red-500" placeholder="作者的一段簡介（選填）" /></div>
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-2">作者大頭照</label>
            <div className="flex items-center gap-4">
              {formData.author_avatar ? <img src={formData.author_avatar} alt="avatar" className="w-14 h-14 object-cover rounded-full border" /> : <div className="w-14 h-14 rounded-full border bg-gray-50 grid place-items-center text-gray-300 text-xs">無</div>}
              <label className="cursor-pointer bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-200 flex items-center gap-2"><UploadCloud size={16} /> 上傳<input type="file" className="hidden" accept="image/*" onChange={e => uploadTo(e, 'author_avatar')} /></label>
            </div>
          </div>

          <div className="md:col-span-2 border-t pt-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">內文（區塊編輯器）</label>
            <BlockEditor value={formData.content} onChange={val => setFormData({ ...formData, content: val })} onUploadImage={onUploadImage} />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-2">狀態</label>
            <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-red-500">
              <option value="draft">草稿（不公開）</option>
              <option value="published">發布（公開上線）</option>
            </select>
          </div>

          <div className="md:col-span-2 flex justify-end gap-4 pt-6 border-t">
            <button type="button" onClick={() => setView('list')} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200">取消</button>
            <button type="submit" className="px-8 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 shadow-lg shadow-red-200">儲存文章</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">專欄管理</h2>
        <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-bold shadow-lg shadow-red-200"><Plus size={20} /> 新增文章</button>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">尚無文章，點右上角「新增文章」開始。</div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {sorted.map(a => (
            <div key={a.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
              <div className="w-20 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                {a.cover ? <img src={a.cover} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-gray-300"><Newspaper size={18} /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-gray-900 truncate flex items-center gap-2">
                  {a.title}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${a.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{a.status === 'published' ? '已發布' : '草稿'}</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{a.category || '—'}　·　/article/{a.slug}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {a.status === 'published' && <a href={`/article/${a.slug}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-700 p-2" title="檢視"><ExternalLink size={16} /></a>}
                <button onClick={() => togglePublish(a)} className="text-gray-500 hover:text-gray-900 p-2" title={a.status === 'published' ? '取消發布' : '發布'}>{a.status === 'published' ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                <button onClick={() => handleEdit(a)} className="text-blue-500 hover:text-blue-700 p-2" title="編輯"><Edit2 size={16} /></button>
                <button onClick={() => { if (confirm(`確定刪除文章「${a.title}」？`)) onDelete(a.id); }} className="text-red-400 hover:text-red-600 p-2" title="刪除"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ArticleManager;
