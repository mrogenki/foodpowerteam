
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, UserPlus, Calendar, ChevronLeft, ChevronRight, MapPin, Flame, ArrowRight } from 'lucide-react';
import { Activity, MemberActivity, ClubActivity } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface HomeProps {
  activities: Activity[];
  memberActivities: MemberActivity[];
}

const Home: React.FC<HomeProps> = ({ activities, memberActivities }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const now = new Date();

  const optimizeImageUrl = (url: string, width = 1200) => {
    if (!url) return '';
    if (url.includes('unsplash.com')) {
      // Remove existing width/quality params if any
      const baseUrl = url.split('?')[0];
      return `${baseUrl}?w=${width}&q=80&auto=format&fit=crop`;
    }
    return url;
  };

  // 篩選出即將到來的活動，並排序取前 5 筆
  const isUpcoming = (a: Activity | MemberActivity) => {
    const activityFullDate = new Date(`${a.date.replace(/-/g, '/')} ${a.time}`);
    return activityFullDate > now;
  };

  const allUpcomingActivities = React.useMemo(() => [
    ...activities.map(a => ({ ...a, isMemberActivity: false })),
    ...memberActivities.map(a => ({ ...a, isMemberActivity: true }))
  ].filter(isUpcoming).sort((a, b) => {
    const dateA = new Date(`${a.date.replace(/-/g, '/')} ${a.time}`).getTime();
    const dateB = new Date(`${b.date.replace(/-/g, '/')} ${b.time}`).getTime();
    return dateA - dateB; // 越近的排越前面
  }).slice(0, 5), [activities, memberActivities, now]);

  // 輪播自動播放邏輯
  useEffect(() => {
    if (allUpcomingActivities.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % allUpcomingActivities.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [allUpcomingActivities.length]);

  const nextSlide = () => setCurrentSlide(prev => (prev + 1) % allUpcomingActivities.length);
  const prevSlide = () => setCurrentSlide(prev => (prev - 1 + allUpcomingActivities.length) % allUpcomingActivities.length);

  const getTypeColor = (type: string) => {
    switch(type) {
      case '講座論壇': return 'bg-orange-600';
      case '企業參訪': return 'bg-blue-600';
      case '專業課程': return 'bg-green-600';
      case '交流餐敘': return 'bg-pink-700';
      case '專案活動': return 'bg-purple-600';
      default: return 'bg-gray-800';
    }
  };

  useEffect(() => {
    document.title = `食在力量 - 連結產業，創造共好`;
    
    const updateMeta = (prop: string, content: string) => {
      let el = document.querySelector(`meta[property="${prop}"]`);
      if (el) el.setAttribute('content', content);
    };
    
    updateMeta('og:title', '食在力量');
    updateMeta('og:description', '食在力量 - 連結產業，創造共好。匯聚各產業菁英，提供講座論壇、企業參訪、專業課程等活動報名與會員管理服務。');
    updateMeta('og:image', 'https://www.foodpowerteam.com/og-brand.jpg');
    updateMeta('og:url', 'https://www.foodpowerteam.com/');
  }, []);

  // JSON-LD for Organization
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "食在力量",
    "url": "https://www.foodpowerteam.com/",
    "logo": "https://www.foodpowerteam.com/logo.svg",
    "description": "連結產業，創造共好。匯聚各產業菁英，提供講座論壇、企業參訪、專業課程等活動報名與會員管理服務。"
  };

  return (
    <div className="pb-20 bg-white">
      <script type="application/ld+json">
        {JSON.stringify(orgJsonLd)}
      </script>

      {/* 燒肉祭・火鍋祭 promo banner (招商頁入口) */}
      <Link
        to="/festival"
        className="relative block bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 text-white overflow-hidden group hover:brightness-110 transition-all"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Flame size={20} className="animate-pulse flex-shrink-0 text-yellow-200" />
            <div className="text-sm sm:text-base font-bold truncate">
              <span className="text-yellow-200">招商中</span>・燒肉祭 × 火鍋祭
              <span className="hidden md:inline text-white/90 font-medium ml-2">— 餐廳業者整合行銷祭典</span>
            </div>
          </div>
          <span className="text-xs sm:text-sm font-bold flex items-center gap-1 flex-shrink-0 opacity-90 group-hover:opacity-100 group-hover:gap-2 transition-all">
            了解詳情 <ArrowRight size={14} />
          </span>
        </div>
      </Link>

      {/* Hero Section / Carousel */}
      {allUpcomingActivities.length > 0 ? (
        <div className="relative w-full h-[85vh] overflow-hidden bg-black">
          <AnimatePresence mode="wait">
            {allUpcomingActivities.map((activity, index) => index === currentSlide && (
              <motion.div 
                key={`${activity.isMemberActivity ? 'm' : 'g'}-${activity.id}`} 
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 z-10"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30 z-20"></div>
                <img 
                  src={optimizeImageUrl(activity.picture, 1920)} 
                  alt={activity.title} 
                  className="w-full h-full object-cover opacity-80" 
                  loading="eager"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 z-30 flex flex-col justify-end pb-24 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
                  <motion.div 
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                    className="flex flex-wrap items-center gap-3 mb-8"
                  >
                    <span className={`${getTypeColor(activity.type)} text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest`}>
                      {activity.type}
                    </span>
                    {activity.isMemberActivity && (
                      <span className="bg-red-600 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                        <Crown size={14} />
                        會員專屬
                      </span>
                    )}
                  </motion.div>
                  
                  <motion.h2 
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.8 }}
                    className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-8 leading-[0.9] tracking-tighter uppercase max-w-5xl"
                  >
                    {activity.title}
                  </motion.h2>

                  <motion.div 
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className="flex flex-wrap items-center gap-8 text-gray-300 mb-12"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar size={24} className="text-red-500" />
                      <span className="text-lg font-medium tracking-tight">{activity.date}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin size={24} className="text-red-500" />
                      <span className="text-lg font-medium tracking-tight">{activity.location}</span>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                  >
                    <Link 
                      to={activity.isMemberActivity ? `/member-activity/${activity.id}` : `/activity/${activity.id}`} 
                      className="inline-flex items-center gap-4 bg-white text-black hover:bg-red-700 hover:text-white px-10 py-5 rounded-full font-black text-lg transition-all shadow-2xl hover:-translate-y-1 active:translate-y-0"
                    >
                      探索詳情
                      <ChevronRight size={24} />
                    </Link>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {allUpcomingActivities.length > 1 && (
            <div className="absolute bottom-12 right-12 z-40 flex items-center gap-6">
              <div className="flex gap-3">
                {allUpcomingActivities.map((_, index) => (
                  <button 
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`h-1 transition-all duration-500 ${index === currentSlide ? 'w-12 bg-red-600' : 'w-6 bg-white/30 hover:bg-white/60'}`}
                    aria-label={`切換至第 ${index + 1} 個活動`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={prevSlide} 
                  className="p-3 border border-white/20 hover:bg-white hover:text-black text-white rounded-full backdrop-blur-sm transition-all"
                  aria-label="上一個活動"
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  onClick={nextSlide} 
                  className="p-3 border border-white/20 hover:bg-white hover:text-black text-white rounded-full backdrop-blur-sm transition-all"
                  aria-label="下一個活動"
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <section className="relative h-[70vh] flex items-center bg-black overflow-hidden">
          <div className="absolute inset-0 opacity-40">
            <img 
              src="https://images.unsplash.com/photo-1528605248644-14dd04022da1?q=80&w=1920&auto=format&fit=crop" 
              className="w-full h-full object-cover"
              alt="Background"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent"></div>
          <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 lg:px-24 w-full">
            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black text-white mb-8 leading-[0.85] tracking-tighter uppercase">
              連結產業<br/>創造共好
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-2xl leading-relaxed mb-12 font-medium">
              食在力量致力於餐飲業與食品產業的交流與成長，匯聚各產業菁英，提供講座論壇、企業參訪與專業課程。
            </p>
            <Link to="/activities" className="inline-flex items-center gap-4 bg-red-700 text-white hover:bg-white hover:text-black px-10 py-5 rounded-full font-black text-lg transition-all shadow-2xl">
              探索活動
              <ChevronRight size={24} />
            </Link>
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 mt-12 relative z-40">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* 協會活動 CTA */}
          <motion.div 
            whileHover={{ y: -10 }}
            className="bg-white rounded-[40px] p-10 md:p-16 shadow-2xl shadow-black/5 border border-gray-100 group transition-all"
          >
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-8 group-hover:bg-red-600 group-hover:text-white transition-all">
              <Calendar size={32} />
            </div>
            <h2 className="text-4xl font-black text-gray-900 mb-6 tracking-tight uppercase">探索協會活動</h2>
            <p className="text-gray-500 text-lg leading-relaxed mb-10">
              我們定期舉辦講座論壇、企業參訪與專業課程，歡迎報名參加，與我們一起成長。
            </p>
            <Link to="/activities" className="inline-flex items-center gap-3 text-red-700 font-black text-xl hover:gap-5 transition-all">
              查看所有活動
              <ChevronRight size={28} />
            </Link>
          </motion.div>

          {/* 加入會員 CTA */}
          <motion.div 
            whileHover={{ y: -10 }}
            className="bg-gray-900 rounded-[40px] p-10 md:p-16 shadow-2xl shadow-black/20 relative overflow-hidden group transition-all"
          >
            <div className="relative z-10">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-white mb-8 group-hover:bg-red-600 transition-all">
                <UserPlus size={32} />
              </div>
              <h2 className="text-4xl font-black text-white mb-6 tracking-tight uppercase">加入食在力量</h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-10">
                立即註冊成為會員，享有專屬活動優惠、產業媒合機會，並與頂尖業者交流共學。
              </p>
              <div className="flex flex-wrap gap-6">
                <Link to="/join" className="bg-red-600 hover:bg-white hover:text-black text-white px-8 py-4 rounded-2xl font-black text-lg transition-all shadow-xl shadow-red-900/20">
                  立即加入
                </Link>
                <Link to="/renew" className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-2xl font-black text-lg border border-white/10 transition-all">
                  會員續約
                </Link>
              </div>
            </div>
            {/* 裝飾背景 */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-600 rounded-full blur-[120px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
          </motion.div>

        </div>
      </div>
    </div>
  );
};

export default Home;
