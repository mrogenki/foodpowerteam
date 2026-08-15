
import React, { useState } from 'react';
import { Globe, Building2, User, Tag, Briefcase, Share2 } from 'lucide-react';
import { Member, IndustryCategories } from '../types';

interface MemberListProps {
  members: Member[];
}

// LINE 電子名片 LIFF app id（在 LINE Console「食在力量會員綁定」channel 下，已開啟 shareTargetPicker）。
// 點擊後於 LINE App 內開啟名片分享頁。非機密，允許 env 覆寫。
const LIFF_CARD_ID = ((import.meta as any)?.env?.VITE_LIFF_CARD_ID as string) || '2010533806-16QDwn2u';
const buildCardShareUrl = (id: string | number): string | null =>
  LIFF_CARD_ID ? `https://liff.line.me/${LIFF_CARD_ID}?member=${encodeURIComponent(String(id))}` : null;

// 定義產業分類的顏色樣式
const getCategoryStyle = (category: string) => {
  switch (category) {
    case '餐飲服務':
      return { 
        bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100', 
        hoverText: 'group-hover:text-red-600', decoration: 'bg-red-50',
        activeBtn: 'bg-red-600 text-white shadow-red-200'
      };
    case '美食產品':
      return { 
        bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100', 
        hoverText: 'group-hover:text-orange-600', decoration: 'bg-orange-50',
        activeBtn: 'bg-orange-600 text-white shadow-orange-200'
      };
    case '通路行銷':
      return { 
        bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', 
        hoverText: 'group-hover:text-blue-600', decoration: 'bg-blue-50',
        activeBtn: 'bg-blue-600 text-white shadow-blue-200'
      };
    case '營運協作':
      return { 
        bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-100', 
        hoverText: 'group-hover:text-teal-600', decoration: 'bg-teal-50',
        activeBtn: 'bg-teal-600 text-white shadow-teal-200'
      };
    case '原物料':
      return { 
        bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100', 
        hoverText: 'group-hover:text-green-600', decoration: 'bg-green-50',
        activeBtn: 'bg-green-600 text-white shadow-green-200'
      };
    case '加工製造':
      return { 
        bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', 
        hoverText: 'group-hover:text-purple-600', decoration: 'bg-purple-50',
        activeBtn: 'bg-purple-600 text-white shadow-purple-200'
      };
    default: // 其他
      return { 
        bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', 
        hoverText: 'group-hover:text-gray-800', decoration: 'bg-gray-100',
        activeBtn: 'bg-gray-600 text-white shadow-gray-200'
      };
  }
};

const MemberList: React.FC<MemberListProps> = ({ members }) => {
  const [filter, setFilter] = useState<string>('all');

  // 自動判斷會籍是否有效 (前端顯示邏輯)
  const isMemberActive = (m: Member) => {
    // 1. 若有到期日，以到期日為準 (大於等於今天即為有效)
    if (m.membership_expiry_date) {
      const today = new Date().toISOString().slice(0, 10);
      return m.membership_expiry_date >= today;
    }
    // 2. 若無到期日 (例如永久會員)，則依照 status 判斷
    return m.status === 'active';
  };

  const activeMembers = members.filter(isMemberActive);

  // 排序邏輯：Member No 小到大 (支援數字與文字混合，例如 M1, M2, M10 排序)
  const sortedMembers = [...activeMembers].sort((a, b) => {
    const valA = String(a.member_no || '');
    const valB = String(b.member_no || '');
    if (!valA && !valB) return 0;
    if (!valA) return 1;
    if (!valB) return -1;
    return valA.localeCompare(valB, undefined, { numeric: true });
  });

  const filteredMembers = filter === 'all' 
    ? sortedMembers 
    : sortedMembers.filter(m => m.industry_category === filter);

  return (
    <div className="pb-20">
      {/* Hero Section */}
      <section className="bg-white border-b py-16 px-4 mb-10">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-gray-900">協會成員名單</h1>
          <p className="text-gray-500 max-w-2xl mx-auto">匯聚各產業菁英，打造最強商務連結。點擊下方分類快速尋找合作夥伴。</p>
          
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <button 
              onClick={() => setFilter('all')}
              className={`px-5 py-2 rounded-full font-bold transition-all ${filter === 'all' ? 'bg-gray-900 text-white shadow-lg' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              全部
            </button>
            {IndustryCategories.map(cat => {
              const style = getCategoryStyle(cat);
              const isActive = filter === cat;
              return (
                <button 
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-5 py-2 rounded-full font-bold transition-all ${isActive ? `${style.activeBtn} shadow-lg` : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMembers.map(member => {
            const style = getCategoryStyle(member.industry_category as string);
            
            return (
              <div key={member.id} className="rounded-2xl border border-gray-100 bg-white p-6 hover:shadow-xl transition-all duration-300 group flex flex-col h-full relative overflow-hidden">
                  {/* 裝飾背景 - 依分類變色 */}
                  <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-[60px] -z-0 transition-colors duration-300 ${style.decoration}`}></div>
                  
                  <div className="mb-4 relative z-10">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full border ${style.bg} ${style.text} ${style.border}`}>
                        {member.industry_category}
                      </span>
                      {/* 修正：前台卡片顯示自動補零至 5 碼 */}
                      <span className="font-mono text-xs text-gray-400 font-bold opacity-60">#{(member.member_no || '').toString().padStart(5, '0')}</span>
                    </div>
                    <h3 className={`text-xl font-bold text-gray-900 mb-1 transition-colors ${style.hoverText}`}>
                      {member.brand_name || member.company_title || member.company || '未填寫品牌'}
                    </h3>
                    {(member.company_title || member.company) && (member.company_title || member.company) !== member.brand_name && (
                      <p className="text-xs text-gray-400">{member.company_title || member.company}</p>
                    )}
                  </div>
                  
                  <div className="flex-grow space-y-3 relative z-10">
                    <div className="flex items-center gap-2.5 text-gray-700 font-medium border-b border-gray-50 pb-2">
                      <div className="w-11 h-11 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 overflow-hidden flex-shrink-0 border border-gray-100">
                         {member.picture ? (
                           <img src={member.picture} alt={member.name} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                         ) : (
                           <User size={18} />
                         )}
                      </div>
                      <div>
                         <div className="text-sm">{member.name}</div>
                         <div className="text-xs text-gray-400">{member.job_title || '會員'}</div>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600">
                      <div className="flex gap-2 mb-1">
                         <Briefcase size={16} className={`flex-shrink-0 mt-0.5 ${style.text} opacity-60`} />
                         <span className="text-gray-800 font-bold">主要服務</span>
                      </div>
                      <p className="text-gray-500 leading-relaxed pl-6">
                        {member.main_service || member.intro || '暫無介紹'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-50 relative z-10">
                    {member.website ? (
                      <a 
                        href={member.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gray-50 text-gray-700 text-sm font-bold hover:bg-gray-800 hover:text-white transition-all"
                      >
                        <Globe size={16} />
                        參觀網站
                      </a>
                    ) : (
                      <button disabled className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gray-50 text-gray-300 text-sm font-bold cursor-not-allowed">
                        <Globe size={16} />
                        暫無網站
                      </button>
                    )}
                    {buildCardShareUrl(member.id) && (
                      <a
                        href={buildCardShareUrl(member.id)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#06C755] text-white text-sm font-bold hover:bg-[#05b34c] transition-all"
                      >
                        <Share2 size={16} />
                        分享電子名片
                      </a>
                    )}
                  </div>
              </div>
            );
          })}
        </div>

        {filteredMembers.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
              <User size={32} />
            </div>
            <p className="text-gray-400 font-bold">此分類目前尚無成員資料</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberList;
