import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { Member } from '../types';
import { Loader2, Search, UserCheck, CreditCard, AlertCircle } from 'lucide-react';
import { submitNewebPayForm } from '../utils/newebpay';
import { notifyAdmin } from '../utils/notification';

const MemberRenewal: React.FC = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const { data, error } = await supabase
          .from('members')
          .select('id, name, member_no, email, phone, membership_expiry_date')
          .order('member_no', { ascending: true });
        
        if (error) throw error;
        setMembers(data || []);
      } catch (err) {
        console.error('Error fetching members:', err);
        alert('無法讀取會員資料');
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  const filteredMembers = members.filter(m => 
    m.name.includes(searchTerm) || 
    m.member_no.includes(searchTerm) ||
    (m.phone && m.phone.includes(searchTerm))
  );

  const handleRenewal = async () => {
    if (!selectedMember) return;
    if (!confirm(`確定要為 ${selectedMember.name} 進行續約繳費？`)) return;

    setIsProcessing(true);
    try {
      // 1. 建立續約訂單
      const merchantOrderNo = `RENEW_${Date.now()}`;
      const amount = 5000; // 續約費用與新加入一樣

      const { data: renewal, error } = await supabase
        .from('member_renewals')
        .insert([{
          member_id: selectedMember.id,
          amount: amount,
          merchant_order_no: merchantOrderNo,
          payment_status: 'pending',
          renewal_date: new Date().toISOString().split('T')[0]
        }])
        .select()
        .single();

      if (error) throw error;

      // 2. 送出金流表單
      await submitNewebPayForm({
        MerchantOrderNo: merchantOrderNo,
        Amt: amount,
        ItemDesc: `食在力量會員續約 (${selectedMember.name})`,
        Email: selectedMember.email || ''
      });

    } catch (err: any) {
      console.error('Renewal error:', err);
      alert('建立續約訂單失敗: ' + err.message);
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-red-600" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">會員續約繳費</h1>
          <p className="text-gray-500">請搜尋並選擇您的會員資料，進行線上續約繳費。</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          {/* 搜尋區塊 */}
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="輸入姓名、會員編號或手機號碼搜尋..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedMember(null); // 重新搜尋時清除選擇
                }}
                className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all text-lg"
              />
            </div>
          </div>

          {/* 列表區塊 */}
          <div className="max-h-[400px] overflow-y-auto p-2">
            {searchTerm && filteredMembers.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <AlertCircle className="mx-auto mb-2" size={32} />
                <p>找不到符合的會員資料</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMembers.map(member => (
                  <button
                    key={member.id}
                    onClick={() => setSelectedMember(member)}
                    className={`w-full text-left p-4 rounded-xl transition-all flex items-center justify-between group ${
                      selectedMember?.id === member.id 
                        ? 'bg-red-50 border-2 border-red-500 shadow-md' 
                        : 'hover:bg-gray-50 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        selectedMember?.id === member.id ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {member.member_no}
                      </div>
                      <div>
                        <h3 className={`font-bold text-lg ${selectedMember?.id === member.id ? 'text-red-900' : 'text-gray-900'}`}>
                          {member.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          到期日: {member.membership_expiry_date || '無資料'}
                        </p>
                      </div>
                    </div>
                    {selectedMember?.id === member.id && (
                      <CheckCircle className="text-red-600" size={24} />
                    )}
                  </button>
                ))}
                {!searchTerm && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    請輸入關鍵字搜尋會員
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 確認區塊 */}
          {selectedMember && (
            <div className="p-6 bg-red-50 border-t border-red-100 animate-in slide-in-from-bottom duration-300">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h3 className="text-lg font-bold text-red-900 mb-1">確認續約資料</h3>
                  <p className="text-red-700 text-sm">
                    將為 <span className="font-bold underline">{selectedMember.name}</span> (會員編號: {selectedMember.member_no}) 進行續約
                  </p>
                  <p className="text-red-600/80 text-xs mt-1">
                    續約費用: NT$ 5,000 / 年
                  </p>
                </div>
                <button
                  onClick={handleRenewal}
                  disabled={isProcessing}
                  className="w-full md:w-auto bg-red-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? <Loader2 className="animate-spin" /> : <CreditCard size={20} />}
                  前往繳費
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper Icon
const CheckCircle = ({ className, size }: { className?: string, size?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size || 24} 
    height={size || 24} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

export default MemberRenewal;
