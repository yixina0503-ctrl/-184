import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FolkloreMap } from './components/FolkloreMap';
import { folkloreData } from './constants';
import { Folklore, UserContribution } from './types';
import { MapPin, Calendar, X, RotateCcw, Search, Info, TrendingUp, Globe, Plus } from 'lucide-react';
import { db, auth } from './firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { ContributionForm } from './components/ContributionForm';

const months = [
  { id: 0, name: '全部', en: 'ALL' },
  { id: 1, name: '正月', en: '1st Mo.' },
  { id: 2, name: '二月', en: '2nd Mo.' },
  { id: 3, name: '三月', en: '3rd Mo.' },
  { id: 4, name: '四月', en: '4th Mo.' },
  { id: 5, name: '五月', en: '5th Mo.' },
  { id: 6, name: '六月', en: '6th Mo.' },
  { id: 7, name: '七月', en: '7th Mo.' },
  { id: 8, name: '八月', en: '8th Mo.' },
  { id: 9, name: '九月', en: '9th Mo.' },
  { id: 10, name: '十月', en: '10th Mo.' },
  { id: 11, name: '冬月', en: '11th Mo.' },
  { id: 12, name: '腊月', en: '12th Mo.' },
];

export default function App() {
  console.log('App rendering, data count:', folkloreData.length);
  const [activeMonth, setActiveMonth] = useState(0);
  const [selectedFolklore, setSelectedFolklore] = useState<Folklore | null>(null);
  const [userContributions, setUserContributions] = useState<UserContribution[]>([]);
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadLocal = () => {
      const localSaved = localStorage.getItem('local_contributions');
      if (localSaved) {
        try {
          const parsed = JSON.parse(localSaved);
          setUserContributions(prev => {
            // If we have firestore data, we might want to blend them
            // For simplicity, just use local if no DB, or merge
            return [...parsed];
          });
        } catch (e) {
          console.error('Error parsing local contributions', e);
        }
      }
    };

    loadLocal();
    window.addEventListener('storage', loadLocal);

    if (!db) return;

    const q = query(collection(db, 'contributions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const contributions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserContribution[];
      
      // Update local storage with what we got from server
      setUserContributions(contributions);
    }, (error) => {
      console.warn('Firestore subscription failed (likely permissions):', error);
    });
    return () => unsubscribe();
  }, []);

  const handleSelect = useCallback((folklore: Folklore) => {
    console.log('Selected folklore:', folklore.name);
    setSelectedFolklore(folklore);
  }, []);

  const handleReset = () => {
    setSelectedFolklore(null);
  };

  const activeMonthData = months.find(m => m.id === activeMonth);
  const filteredFolklore = activeMonth === 0 
    ? folkloreData 
    : folkloreData.filter(f => f.month === activeMonth);

  // Combine and sort by month
  const allFolklore = [...filteredFolklore, ...userContributions].sort((a, b) => {
    const monthA = a.month || 1;
    const monthB = b.month || 1;
    return monthA - monthB;
  });

  const timelineItems = (() => {
    if (folkloreData.length === 0) return [];
    
    // Always find next items relative to the full dataset for a better "timeline" feel
    // but prioritize the filtered list if the user is explicitly exploring a month.
    const sourceList = activeMonth === 0 ? folkloreData : allFolklore;
    const currentId = selectedFolklore?.id || sourceList[0]?.id;
    
    let currentIndex = sourceList.findIndex(f => f.id === currentId);
    if (currentIndex === -1) currentIndex = 0;

    const items = [];
    for (let i = 0; i < 3; i++) {
      const index = (currentIndex + i) % sourceList.length;
      if (sourceList[index]) {
        items.push(sourceList[index]);
      }
    }
    return items;
  })();

  return (
    <div className="fixed inset-0 bg-[#0D0D0F] text-[#F1F1F1] font-sans p-6 flex flex-col gap-6 overflow-hidden">
      <div className="absolute top-2 right-2 text-[10px] text-gold z-[100] bg-black/50 px-2 py-1 rounded">
        系统运行中 | 数据: {folkloreData.length} | 月份: {activeMonthData?.name}
      </div>
      {/* Header */}
      <header className="flex justify-between items-center shrink-0">
        <div className="brand">
          <h1 className="font-serif text-3xl tracking-widest text-gold">華夏民俗志</h1>
          <p className="text-[10px] uppercase text-text-dim tracking-[0.2em]">Interactive Archive of Chinese Cultural Heritage</p>
        </div>
        <div className="hidden md:flex items-center bg-card border border-border px-4 py-2 rounded-full w-80 gap-3 text-text-dim text-sm">
          <Search size={16} />
          <span>探索民俗、节气或地域...</span>
        </div>
      </header>

      {/* Bento Grid */}
      <main className="grid grid-cols-4 grid-rows-4 gap-4 flex-grow relative min-h-0 border border-white/5 rounded-3xl">
        
        {/* Hero Map Card */}
        <div className="bento-card col-span-3 row-span-3 !p-0 bg-[#020205] flex flex-col overflow-hidden">
          <div className="absolute top-4 left-4 z-[1000] flex items-center gap-2 text-gold/60 text-[10px] uppercase tracking-widest font-medium pointer-events-none">
            <Globe size={12} />
            <span>華夏地理圖誌</span>
          </div>
          
          <div className="flex-grow relative overflow-hidden">
            <FolkloreMap 
              activeMonth={activeMonth} 
              onSelect={handleSelect} 
              selectedId={selectedFolklore?.id} 
              userContributions={userContributions}
              onMapClick={(lat, lng) => {
                // Optional: handle map click to pre-fill location
                console.log('Map clicked:', lat, lng);
              }}
            />
          </div>

          <div className="p-4 bg-black/20 backdrop-blur-sm border-t border-border flex justify-between items-center shrink-0">
            <div className="text-xs text-gold/80">当前聚焦：{selectedFolklore ? selectedFolklore.loc : '全国范围'}</div>
            <div className="flex gap-4 text-[10px] text-text-dim uppercase tracking-tighter">
              <span>Left Click: Select</span>
              <span>Scroll: Zoom</span>
            </div>
          </div>
        </div>

        {/* Feature / Month Filter Card */}
        <div className="bento-card col-span-1 row-span-1 bg-gradient-to-br from-[#2A1A1A] to-card flex flex-col gap-3">
          <div className="flex items-center justify-between shrink-0">
            <div className="text-[10px] text-gold uppercase tracking-widest font-bold">岁时节令</div>
            <div className="text-[10px] text-text-dim">{activeMonthData?.en}</div>
          </div>
          <div className="flex-grow overflow-y-auto no-scrollbar">
            <div className="grid grid-cols-2 gap-1.5">
              {months.map((month) => (
                <button
                  key={month.id}
                  onClick={() => setActiveMonth(month.id)}
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all duration-300 ${
                    activeMonth === month.id 
                      ? 'bg-gold text-bg' 
                      : 'bg-white/5 text-text-dim hover:text-text-main hover:bg-white/10'
                  }`}
                >
                  {month.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Card 1 */}
        <div className="bento-card col-span-1 row-span-1 flex flex-col justify-center items-center text-center group">
          <div className="text-3xl font-bold group-hover:text-gold transition-colors">{filteredFolklore.length}</div>
          <div className="text-[10px] uppercase text-text-dim tracking-widest mt-1">
            {activeMonth === 0 ? '总记录条目' : `${activeMonthData?.name}记录`}
          </div>
          <TrendingUp size={16} className="absolute top-4 right-4 text-white/10" />
        </div>

        {/* Folklore List Card */}
        <div className="bento-card col-span-1 row-span-2 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex items-center gap-2 text-gold text-[10px] uppercase tracking-widest font-bold">
              <Info size={12} />
              <span>{activeMonthData?.name}民俗志</span>
            </div>
          </div>
          
          <div className="flex-grow overflow-y-auto no-scrollbar pr-1">
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowContributionForm(true)}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 transition-all mb-2 group"
              >
                <Plus size={16} className="group-hover:rotate-90 transition-transform" />
                <span className="text-[10px] font-bold uppercase tracking-widest">标记新民俗</span>
              </button>

              {allFolklore.length > 0 ? (
                allFolklore.map((folklore) => (
                  <button
                    key={folklore.id}
                    onClick={() => handleSelect(folklore)}
                    className={`text-left p-2.5 rounded-xl transition-all duration-300 group relative overflow-hidden ${
                      selectedFolklore?.id === folklore.id
                        ? 'bg-accent text-white'
                        : 'bg-white/5 hover:bg-white/10 text-text-dim hover:text-text-main'
                    }`}
                  >
                    <div className="text-[11px] font-bold truncate pr-4">{folklore.name}</div>
                    <div className="text-[9px] opacity-60 mt-0.5 flex items-center gap-1">
                      <MapPin size={8} />
                      {folklore.loc}
                      {folklore.isUserContribution && (
                        <span className="ml-auto bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded text-[7px] uppercase">User</span>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-10 text-text-dim text-[10px]">
                  暂无记录
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Timeline / Gallery Card */}
        <div className="bento-card col-span-3 row-span-1 !p-0 flex overflow-hidden">
          {timelineItems.length > 0 ? (
            <>
              {timelineItems.map((item, idx) => (
                <div 
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className={`flex-1 relative group cursor-pointer overflow-hidden ${idx < 2 ? 'border-r border-border' : ''}`}
                >
                  <img 
                    src={item.img}
                    className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-opacity duration-500"
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1528164344705-47542687000d?w=400&h=300&fit=crop';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="relative h-full p-4 flex flex-col justify-between z-10">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${idx === 0 ? 'text-accent' : 'text-text-dim'}`}>
                      {idx === 0 ? 'NOW' : idx === 1 ? 'UP NEXT' : 'LATER'}
                    </span>
                    <div>
                      <div className="text-lg font-bold group-hover:text-gold transition-colors leading-tight">{item.date}</div>
                      <div className="text-[10px] text-text-dim truncate mt-1">{item.name}</div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="flex-grow flex items-center justify-center text-text-dim text-xs uppercase tracking-widest">
              暂无活动排期
            </div>
          )}
        </div>


        {/* Reset View Button Overlay */}
        <AnimatePresence>
          {selectedFolklore && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleReset}
              className="absolute top-4 right-4 z-30 flex items-center gap-2 bg-red-600/90 hover:bg-red-600 text-white px-4 py-2 rounded-full text-[10px] font-bold shadow-lg transition-colors group"
            >
              <RotateCcw size={12} className="group-hover:rotate-[-45deg] transition-transform" />
              重置视角
            </motion.button>
          )}
        </AnimatePresence>

      </main>

      {/* Contribution Form Modal */}
      <AnimatePresence>
        {showContributionForm && (
          <ContributionForm 
            onClose={() => setShowContributionForm(false)} 
            onSuccess={() => {
              // Optional: show success toast
            }}
          />
        )}
      </AnimatePresence>

      {/* Detail View Overlay (Side Panel) */}
      <AnimatePresence>
        {selectedFolklore && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 z-[9999] w-full md:w-[500px] bg-[#121214]/98 backdrop-blur-2xl border-l border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] flex flex-col"
          >
            <div className="relative h-[40vh] shrink-0 bg-black">
              <img 
                src={selectedFolklore.img} 
                alt={selectedFolklore.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1528164344705-47542687000d?w=1000&h=600&fit=crop';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#121214] via-transparent to-black/20 pointer-events-none" />
              <button 
                onClick={handleReset}
                className="absolute top-6 right-6 p-3 bg-black/50 hover:bg-red-600/80 rounded-full transition-all duration-300 text-white group z-10"
              >
                <X size={24} className="group-hover:rotate-90 transition-transform" />
              </button>
            </div>

            <div className="p-10 flex-grow overflow-y-auto no-scrollbar">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-[1px] w-8 bg-gold" />
                  <span className="text-gold text-[10px] uppercase tracking-[0.3em] font-bold">民俗档案</span>
                </div>

                <h2 className="text-4xl font-serif font-bold text-white tracking-tight leading-tight mb-6">
                  {selectedFolklore.name}
                </h2>
                
                <div className="flex flex-wrap gap-3 mb-10">
                  <span className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-xs text-text-main">
                    <MapPin size={14} className="text-accent" />
                    {selectedFolklore.loc}
                  </span>
                  <span className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-xs text-text-main">
                    <Calendar size={14} className="text-accent" />
                    {selectedFolklore.date}
                  </span>
                </div>

                <div className="space-y-6">
                  {selectedFolklore.video && (
                    <div className="mb-8 rounded-2xl overflow-hidden border border-white/10 bg-black aspect-video">
                      <iframe
                        src={(() => {
                          const v = selectedFolklore.video;
                          if (!v) return '';
                          if (v.includes('youtube.com') || v.includes('youtu.be')) {
                            if (v.includes('/embed/')) return v;
                            const videoId = v.split('v=')[1]?.split('&')[0] || v.split('/').pop()?.split('?')[0];
                            return `https://www.youtube.com/embed/${videoId}?rel=0`;
                          }
                          return v;
                        })()}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={selectedFolklore.name}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <div className="text-gold/40 text-[10px] uppercase tracking-[0.2em] font-bold whitespace-nowrap">文化概览</div>
                    <div className="h-[1px] flex-grow bg-white/5" />
                  </div>
                  <p className="text-text-main/90 leading-relaxed text-lg font-light first-letter:text-3xl first-letter:font-serif first-letter:text-gold first-letter:mr-1">
                    {selectedFolklore.desc}
                  </p>
                </div>

                <div className="mt-16 grid grid-cols-2 gap-4">
                  <button className="bg-gold text-bg py-4 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-white transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-gold/10">
                    <Info size={16} />
                    深入探索
                  </button>
                  <button className="bg-white/5 border border-white/10 text-white py-4 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-2">
                    <RotateCcw size={16} />
                    收藏记录
                  </button>
                </div>
                
                <div className="h-20" />
              </motion.div>
            </div>
            
            <div className="p-8 border-t border-white/5 bg-black/40 backdrop-blur-md flex items-center justify-between">
              <span className="text-[10px] text-text-dim uppercase tracking-widest">非物质文化遗产保护项目</span>
              <div className="flex gap-2">
                <div className="w-1 h-1 rounded-full bg-gold" />
                <div className="w-1 h-1 rounded-full bg-gold/50" />
                <div className="w-1 h-1 rounded-full bg-gold/20" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="flex justify-between items-center shrink-0 text-[10px] text-text-dim uppercase tracking-widest">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(230,57,70,0.6)]" />
            <span>岁时节令</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-gold shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
            <span>传统技艺</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
            <span>民间文学</span>
          </div>
        </div>
        <div>数据更新至：癸卯年 臘月廿四</div>
      </footer>
    </div>
  );
}
