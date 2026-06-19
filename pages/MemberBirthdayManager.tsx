import React, { useState, useMemo } from 'react';
import { Member } from '../types';
import { Search, Mail, Copy, CheckCircle, Cake, Filter, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface MemberBirthdayManagerProps {
  members: Member[];
}

const MemberBirthdayManager: React.FC<MemberBirthdayManagerProps> = ({ members }) => {
  const currentMonth = new Date().getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  // 判斷會員是否有效
  const isMemberActive = (member: Member) => {
    const today = new Date().toISOString().slice(0, 10);
    const isExpired = member.membership_expiry_date && member.membership_expiry_date < today;
    return member.status === 'active' && !isExpired;
  };

  const birthdayMembers = useMemo(() => {
    return members.filter(member => {
      if (!member.birthday) return false;
      
      // 解析生日字串 (預期格式: YYYY-MM-DD)
      const parts = member.birthday.split('-');
      if (parts.length >= 2) {
        const month = parseInt(parts[1], 10);
        return month === selectedMonth;
      }
      return false;
    }).filter(member => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        member.name.toLowerCase().includes(term) ||
        (member.member_no && member.member_no.toLowerCase().includes(term)) ||
        (member.phone && member.phone.includes(term)) ||
        (member.email && member.email.toLowerCase().includes(term))
      );
    }).sort((a, b) => {
      // 依據日期排序
      const dayA = parseInt(a.birthday?.split('-')[2] || '0', 10);
      const dayB = parseInt(b.birthday?.split('-')[2] || '0', 10);
      return dayA - dayB;
    });
  }, [members, selectedMonth, searchTerm]);

  const handleCopyEmails = () => {
    const emails = birthdayMembers
      .map(m => m.email)
      .filter(e => e && e.trim() !== '')
      .join(', ');
    
    if (emails) {
      navigator.clipboard.writeText(emails);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      alert('沒有可複製的信箱');
    }
  };

  const exportToExcel = () => {
    if (birthdayMembers.length === 0) {
      alert('沒有資料可匯出');
      return;
    }

    const exportData = birthdayMembers.map(m => ({
      '會員編號': m.member_no,
      '姓名': m.name,
      '生日': m.birthday,
      '狀態': isMemberActive(m) ? '有效' : '已過期',
      '手機': m.phone || '',
      '信箱': m.email || '',
      '公司名稱': m.company_title || m.brand_name || '',
      '職稱': m.job_title || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${selectedMonth}月壽星名單`);
    XLSX.writeFile(wb, `食在力量_${selectedMonth}月壽星名單_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Cake className="text-red-600" />
            會員生日管理
          </h2>
          <p className="text-gray-500 mt-1">查看與管理每個月的壽星會員</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleCopyEmails}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {copied ? <CheckCircle size={18} className="text-green-500" /> : <Copy size={18} />}
            {copied ? '已複製信箱' : '複製所有信箱'}
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Download size={18} />
            匯出名單
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400" size={20} />
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">選擇月份：</span>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                <button
                  key={month}
                  onClick={() => setSelectedMonth(month)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    selectedMonth === month
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {month}月
                </button>
              ))}
            </div>
          </div>
          
          <div className="ml-auto relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="搜尋姓名、編號、手機..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
            />
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {selectedMonth} 月共有 <span className="font-bold text-red-600 text-lg">{birthdayMembers.length}</span> 位壽星
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="p-4 text-sm font-semibold text-gray-600">會員編號</th>
                <th className="p-4 text-sm font-semibold text-gray-600">姓名</th>
                <th className="p-4 text-sm font-semibold text-gray-600">生日</th>
                <th className="p-4 text-sm font-semibold text-gray-600">狀態</th>
                <th className="p-4 text-sm font-semibold text-gray-600">聯絡方式</th>
                <th className="p-4 text-sm font-semibold text-gray-600">公司/職稱</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {birthdayMembers.length > 0 ? (
                birthdayMembers.map((member) => {
                  const isActive = isMemberActive(member);
                  return (
                    <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-sm font-medium text-gray-900">
                        {member.member_no || '-'}
                      </td>
                      <td className="p-4 text-sm font-medium text-gray-900">
                        {member.name}
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Cake size={14} className="text-red-400" />
                          {member.birthday}
                        </div>
                      </td>
                      <td className="p-4 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {isActive ? '有效' : '已過期'}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        <div className="flex flex-col gap-1">
                          {member.phone && <div>{member.phone}</div>}
                          {member.email && (
                            <div className="flex items-center gap-1 text-gray-500 text-xs">
                              <Mail size={12} />
                              {member.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600">
                        <div className="flex flex-col">
                          <span className="font-medium">{member.company_title || member.brand_name || '-'}</span>
                          <span className="text-xs text-gray-500">{member.job_title || ''}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    <Cake size={48} className="mx-auto text-gray-300 mb-3" />
                    <p>這個月沒有壽星，或沒有符合搜尋條件的會員</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 手機版卡片視圖 */}
        <div className="md:hidden space-y-3">
          {birthdayMembers.length > 0 ? (
            birthdayMembers.map((member) => {
              const isActive = isMemberActive(member);
              return (
                <div key={member.id} className="border border-gray-100 rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900">{member.name}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{isActive ? '有效' : '已過期'}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{member.member_no || '-'}</div>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-red-500 font-medium shrink-0"><Cake size={14} /> {member.birthday}</div>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">{member.company_title || member.brand_name || '-'}{member.job_title ? <span className="text-gray-400"> · {member.job_title}</span> : ''}</div>
                  <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                    {member.phone && <div>{member.phone}</div>}
                    {member.email && <div className="flex items-center gap-1"><Mail size={12} /> {member.email}</div>}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Cake size={48} className="mx-auto text-gray-300 mb-3" />
              <p>這個月沒有壽星，或沒有符合搜尋條件的會員</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberBirthdayManager;
