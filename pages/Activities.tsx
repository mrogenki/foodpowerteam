import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, DollarSign, ChevronRight, Clock, Crown, Ban, History } from 'lucide-react';
import { Activity, MemberActivity, ActivityType } from '../types';

interface ActivitiesProps {
  activities: Activity[];
  memberActivities: MemberActivity[];
  loading?: boolean;
}

// Skeleton card for loading state
const SkeletonCard: React.FC = () => (
  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
    <div className="aspect-video bg-gray-200" />
    <div className="p-6 space-y-3">
      <div className="h-5 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-100 rounded w-1/2" />
      <div className="h-4 bg-gray-100 rounded w-2/3" />
      <div className="h-4 bg-gray-100 rounded w-1/3" />
      <div className="h-px bg-gray-100 my-2" />
      <div className="h-4 bg-gray-100 rounded w-1/4" />
    </div>
  </div>
);

const isPastDate = (date: string, time: string) => {
  const activityFullDate = new Date(`${date.replace(/-/g, '/')} ${time}`);
  return activityFullDate <= new Date();
};

const ActivityCard: React.FC<{ activity: Activity | MemberActivity, isMemberActivity?: boolean }> = ({ activity, isMemberActivity = false }) => {
  const isClosed = activity.status === 'closed' || isPastDate(activity.date, activity.time);

  const getTypeColor = (type: ActivityType) => {
    switch(type) {
      case ActivityType.GATHERING: return 'bg-orange-600 text-white';
      case ActivityType.VISIT: return 'bg-blue-600 text-white';
      case ActivityType.COURSE: return 'bg-green-600 text-white';
      case ActivityType.DINNER: return 'bg-pink-700 text-white';
      case ActivityType.PROJECT: return 'bg-purple-600 text-white';
      default: return 'bg-gray-800 text-white';
    }
  };

  const linkPath = isMemberActivity ? `/member-activity/${activity.id}` : `/activity/${activity.id}`;

  return (
    <Link to={linkPath} className={`group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 block ${isClosed ? 'opacity-80 grayscale-[0.5]' : ''}`}>
      <div className="relative aspect-video overflow-hidden bg-gray-100">
        <img 
          src={activity.picture} 
          alt={activity.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          loading="lazy"
          width="600"
          height="337"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 left-4 flex gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getTypeColor(activity.type)}`}>
            {activity.type}
          </span>
          {isMemberActivity && (
             <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1">
               <Crown size={12} aria-hidden="true" /> 會員專屬
             </span>
          )}
        </div>
        {isClosed && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
             <span className="bg-gray-800 text-white px-4 py-2 rounded-lg font-bold border border-white/30 backdrop-blur-sm">報名已截止</span>
          </div>
        )}
      </div>
      <div className="p-6">
        <h3 className={`text-xl font-bold mb-4 line-clamp-1 transition-colors ${isClosed ? 'text-gray-500' : 'group-hover:text-red-600'}`}>{activity.title}</h3>
        <div className="space-y-2 text-sm text-gray-500 mb-6">
          <div className="flex items-center gap-2">
            <Calendar size={16} className={isClosed ? 'text-gray-400' : 'text-red-600'} aria-hidden="true" />
            <span>{activity.date}</span>
            <Clock size={16} className={`${isClosed ? 'text-gray-400' : 'text-red-600'} ml-2`} aria-hidden="true" />
            <span>{activity.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={16} className={isClosed ? 'text-gray-400' : 'text-red-600'} aria-hidden="true" />
            <span className="line-clamp-1">{activity.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign size={16} className={isClosed ? 'text-gray-400' : 'text-red-600'} aria-hidden="true" />
            <span>NT$ {activity.price.toLocaleString()}</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
          {isClosed ? (
             <span className="text-gray-400 font-bold text-sm flex items-center gap-1"><Ban size={16} aria-hidden="true" /> 報名截止</span>
          ) : (
             <span className="text-red-600 font-bold text-sm">立即報名</span>
          )}
          <ChevronRight size={18} className={isClosed ? 'text-gray-300' : 'text-red-600'} aria-hidden="true" />
        </div>
      </div>
    </Link>
  );
};

const ActivitiesPage: React.FC<ActivitiesProps> = ({ activities, memberActivities, loading = false }) => {
  const now = new Date();

  const isUpcoming = (a: Activity | MemberActivity) => {
    const activityFullDate = new Date(`${a.date.replace(/-/g, '/')} ${a.time}`);
    return activityFullDate > now;
  };

  const isPast = (a: Activity | MemberActivity) => {
    const activityFullDate = new Date(`${a.date.replace(/-/g, '/')} ${a.time}`);
    return activityFullDate <= now;
  };

  const allActivities = React.useMemo(() => [
    ...activities.map(a => ({ ...a, isMemberActivity: false })),
    ...memberActivities.map(a => ({ ...a, isMemberActivity: true }))
  ].sort((a, b) => {
    const dateA = new Date(`${a.date.replace(/-/g, '/')} ${a.time}`).getTime();
    const dateB = new Date(`${b.date.replace(/-/g, '/')} ${b.time}`).getTime();
    return dateB - dateA; // Sort descending (newest first)
  }), [activities, memberActivities]);

  const upcomingActivities = React.useMemo(() => allActivities.filter(isUpcoming).sort((a, b) => {
    const dateA = new Date(`${a.date.replace(/-/g, '/')} ${a.time}`).getTime();
    const dateB = new Date(`${b.date.replace(/-/g, '/')} ${b.time}`).getTime();
    return dateA - dateB; // Sort ascending for upcoming (closest first)
  }), [allActivities, now]);
  
  const pastActivities = React.useMemo(() => allActivities.filter(isPast), [allActivities, now]);

  return (
    <div className="pb-20 pt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-16">
          
          {/* 最近活動 */}
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold flex items-center gap-3 text-gray-900">
                <span className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <Calendar size={28} />
                </span>
                最近活動
              </h2>
            </div>
            
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : upcomingActivities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {upcomingActivities.map(activity => (
                  <ActivityCard key={`${activity.isMemberActivity ? 'm' : 'g'}-${activity.id}`} activity={activity} isMemberActivity={activity.isMemberActivity} />
                ))}
              </div>
            ) : (
              <div className="bg-white p-20 rounded-3xl border border-dashed text-center">
                <Calendar className="mx-auto text-gray-200 mb-4" size={48} />
                <h3 className="text-xl font-bold text-gray-400">目前暫無即將舉辦的活動</h3>
              </div>
            )}
          </div>

          {/* 過往活動 */}
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold flex items-center gap-3 text-gray-600">
                <span className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                  <History size={28} />
                </span>
                過往活動
              </h2>
            </div>
            
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 opacity-70">
                {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : pastActivities.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 opacity-80">
                {pastActivities.map(activity => (
                  <ActivityCard key={`${activity.isMemberActivity ? 'm' : 'g'}-${activity.id}`} activity={activity} isMemberActivity={activity.isMemberActivity} />
                ))}
              </div>
            ) : (
              <div className="bg-white p-20 rounded-3xl border border-dashed text-center">
                <History className="mx-auto text-gray-200 mb-4" size={48} />
                <h3 className="text-xl font-bold text-gray-400">目前暫無過往活動紀錄</h3>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default ActivitiesPage;
