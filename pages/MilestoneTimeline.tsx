import React, { useState, useEffect } from 'react';
import { Milestone } from '../types';
import { Calendar, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../utils/supabaseClient';

const MilestoneTimeline: React.FC = () => {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [openYears, setOpenYears] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchMilestones = async () => {
      try {
        const { data, error } = await supabase
          .from('milestones')
          .select('*')
          .order('date', { ascending: false });
        
        if (error) throw error;
        if (data) {
          setMilestones(data);
          // 預設展開最新年份
          if (data.length > 0) {
            const latestYear = new Date(data[0].date).getFullYear().toString();
            setOpenYears(new Set([latestYear]));
          }
        }
      } catch (err) {
        console.error('Error fetching milestones:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMilestones();
  }, []);

  const toggleYear = (year: string) => {
    setOpenYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  // Sort milestones by date descending
  const sortedMilestones = React.useMemo(() => 
    [...milestones].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  , [milestones]);

  // Group by year
  const groupedByYear = React.useMemo(() => {
    const groups: { [key: string]: Milestone[] } = {};
    sortedMilestones.forEach(m => {
      const year = new Date(m.date).getFullYear().toString();
      if (!groups[year]) groups[year] = [];
      groups[year].push(m);
    });
    return groups;
  }, [sortedMilestones]);

  const years = React.useMemo(() => 
    Object.keys(groupedByYear).sort((a, b) => parseInt(b) - parseInt(a))
  , [groupedByYear]);

  // JSON-LD for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Timeline",
    "name": "食在力量大事記",
    "description": "記錄食在力量的每一個重要時刻與里程碑",
    "event": sortedMilestones.map(m => ({
      "@type": "Event",
      "name": m.title,
      "startDate": m.date,
      "description": m.description || m.title,
      "image": m.picture
    }))
  };

  // Skeleton loader
  if (loading) return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <div className="h-10 bg-gray-200 rounded-full w-56 mx-auto mb-4 animate-pulse" />
          <div className="h-5 bg-gray-100 rounded-full w-80 mx-auto animate-pulse" />
        </div>
        <div className="space-y-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-24 mb-3" />
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <script type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl mb-4">
            食在力量大事記
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">
            記錄食在力量的每一個重要時刻與里程碑
          </p>
          <p className="text-sm text-gray-400 mt-3">共 {milestones.length} 則紀錄・點選年份展開</p>
        </header>

        <div className="space-y-4">
          {years.map((year) => {
            const isOpen = openYears.has(year);
            const count = groupedByYear[year].length;
            return (
              <section key={year} aria-labelledby={`year-${year}`}>
                {/* Year Toggle Header */}
                <button
                  onClick={() => toggleYear(year)}
                  className="w-full flex items-center justify-between px-6 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-red-100 transition-all group"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-4">
                    <span id={`year-${year}`} className="bg-red-600 text-white px-4 py-1 rounded-full font-bold text-lg">
                      {year}
                    </span>
                    <span className="text-gray-500 text-sm font-medium">{count} 則紀錄</span>
                  </div>
                  <ChevronDown
                    size={20}
                    className={`text-gray-400 group-hover:text-red-500 transition-all duration-300 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Collapsible Content */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="relative pt-4 pb-2 pl-4">
                        {/* Vertical line */}
                        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-red-100" aria-hidden="true" />

                        <div className="space-y-4">
                          {groupedByYear[year].map((milestone, index) => (
                            <motion.article
                              key={milestone.id}
                              initial={{ opacity: 0, x: -16 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.05 }}
                              className="relative pl-10"
                            >
                              {/* Timeline Dot */}
                              <div className="absolute left-5 top-6 w-3.5 h-3.5 bg-white border-[3px] border-red-500 rounded-full z-10" aria-hidden="true" />

                              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-red-50 transition-all">
                                <div className="flex items-center gap-2 text-red-600 font-bold text-sm mb-2">
                                  <Calendar size={14} aria-hidden="true" />
                                  <time dateTime={milestone.date}>{milestone.date}</time>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">{milestone.title}</h3>
                                {milestone.picture && (
                                  <div className="mb-4 overflow-hidden rounded-xl bg-gray-100 aspect-video">
                                    <img
                                      src={milestone.picture}
                                      alt={milestone.title}
                                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                      referrerPolicy="no-referrer"
                                      loading="lazy"
                                      width="800"
                                      height="450"
                                    />
                                  </div>
                                )}
                                {milestone.description && (
                                  <p className="text-gray-600 leading-relaxed text-sm">
                                    {milestone.description}
                                  </p>
                                )}
                              </div>
                            </motion.article>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            );
          })}
        </div>

        {milestones.length === 0 && !loading && (
          <div className="text-center py-20 text-gray-400">
            <Calendar size={48} className="mx-auto mb-4 text-gray-200" />
            <p className="font-medium">目前尚無大事記紀錄</p>
          </div>
        )}

        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 text-gray-300 text-sm">
            <div className="w-8 h-px bg-gray-200"></div>
            <span>未完待續</span>
            <div className="w-8 h-px bg-gray-200"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MilestoneTimeline;
