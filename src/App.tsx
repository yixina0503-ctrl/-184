import { useState, useCallback, useEffect, useMemo } from 'react';
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
  const [activeMonth, setActiveMonth] = useState(0);
  const [selectedFolklore, setSelectedFolklore] = useState<Folklore | null>(null);
  const [userContributions, setUserContributions] = useState<UserContribution[]>([]);
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const localSaved = localStorage.getItem('local_contributions');
    if (localSaved) {
      try {
        setUserContributions(JSON.parse(localSaved));
      } catch (e) {
        console.error('Local data parse error', e);
      }
    }

    if (!db) return;

    const q = query(collection(db, 'contributions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const contributions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserContribution[];
      setUserContributions(contributions);
      localStorage.setItem('local_contributions', JSON.stringify(contributions));
    }, (error) => {
      console.warn('Firestore subscription failed:', error);
    });

    return () => unsubscribe();
  }, []);

  const handleSelect = useCallback((folklore: Folklore) => {
    setSelectedFolklore(folklore);
  }, []);

  const handleReset = () => setSelectedFolklore(null);

  const allFolklore = useMemo(() => {
    const filteredBase = activeMonth === 0 
      ? folkloreData 
      : folkloreData.filter(f => f.month === activeMonth);
    
    const filteredUser = activeMonth === 0 
      ? userContributions 
      : userContributions.filter(c => c.month === activeMonth);

    return [...filteredBase, ...filteredUser];
  }, [activeMonth, userContributions]);

  const timelineItems = useMemo(() => {
    if (allFolklore.length === 0) return [];
    const currentIndex = selectedFolklore 
      ? allFolklore.findIndex(f => f.id === selectedFolklore.id) 
      : 0;
    const safeIndex = currentIndex === -1 ? 0 : currentIndex;

    return [0, 1, 2].map(offset => {
      const index = (safeIndex + offset) % allFolklore.length;
      return allFolklore[index];
    });
  }, [allFolklore, selectedFolklore]);

  const activeMonthData = months.find(m => m.id === activeMonth);

  return (
    <div className="flex flex-col h-screen w-full bg-[#050505] text-text-main p-4 md:p-6 gap-6 overflow-hidden">
      
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

      <main className="grid grid-cols-4 grid-rows-4 gap-4 flex-grow relative min-h-0">
        
        {/* 地图卡片 */}
        <div className="bento-card col-span-3 row-span-3 !p-0 bg-[#020205] flex flex-col overflow-hidden relative z-0">
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 text-gold/60 text-[10px] uppercase tracking-widest font-medium pointer-events-none">
            <Globe size={12} />
            <span>華夏地理圖誌</span>
          </div>
          <div className="flex-grow relative">
            <FolkloreMap 
              activeMonth={activeMonth} 
              onSelect={handleSelect} 
              selectedId={selectedFolklore?.id} 
              folkloreData={allFolklore} 
            />
          </div>
          <div className="p-4 bg-black/20 backdrop-blur-sm border-t border-border flex justify-between items-center">
            <div className="text-xs text-gold/80">当前聚焦：{selectedFolklore ? selectedFolklore.loc : '全国范围'}</div>
            <div className="flex gap-4 text-[10px] text-text-dim uppercase">
              <span>Click: Select</span>
              <span>Scroll: Zoom</span>
            </div>
          </div>
        </div>

        {/* 月份筛选器 */}
        <div className="bento-card col-span-1 row-span-1 bg-gradient-to-br from-[#2A1A1A] to-card flex flex-col gap-3 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-gold uppercase tracking-widest font-bold">岁时节令</div>
            <div className="text-[10px] text-text-dim">{activeMonthData?.en}</div>
          </div>
          <div className="flex-grow overflow-y-auto no-scrollbar grid grid-cols-2 gap-1.5">
            {months.map((month) => (
              <button
                key={month.id}
                onClick={() => setActiveMonth(month.id)}
                className={`px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                  activeMonth === month.id 
                    ? 'bg-gold text-bg' 
                    : 'bg-white/5 text-text-dim hover:bg-white/10'
                }`}
              >
                {month.name}
              </button>
            ))}
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="bento-card col-span-1 row-span-1 flex flex-col justify-center items-center text-center group relative">
          <div className="text-3xl font-bold group-hover:text-gold transition-colors">{allFolklore.length}</div>
          <div className="text-[10px] uppercase text-text-dim tracking-widest mt-1">
            {activeMonth === 0 ? '总记录条目' : `${activeMonthData?.name}记录`}
          </div>
          <TrendingUp size={16} className="absolute top-4 right-4 text-white/10" />
        </div>

        {/* 民俗列表 */}
        <div className="bento-card col-span-1 row-span-2 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 text-gold text-[10px] uppercase tracking-widest font-bold mb-4">
            <Info size={12} />
            <span>{activeMonthData?.name}民俗志</span>
          </div>
          <div className="flex-grow overflow-y-auto no-scrollbar space-y-2">
            <button
              onClick={() => setShowContributionForm(true)}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-gold/10 border border-gold/20 text-gold hover:bg-gold/20 transition-all group"
            >
              <Plus size={16} className="group-hover:rotate-90 transition-transform" />
              <span className="text-[10px] font-bold uppercase">标记新民俗</span>
            </button>
            {allFolklore.map((f) => (
              <button
                key={f.id}
                onClick={() => handleSelect(f)}
                className={`w-full text-left p-2.5 rounded-xl transition-all ${
                  selectedFolklore?.id === f.id ? 'bg-accent text-white' : 'bg-white/5 hover:bg-white/10 text-text-dim'
                }`}
              >
                <div className="text-[11px] font-bold truncate">{f.name}</div>
                <div className="text-[9px] opacity-60 flex items-center gap-1 mt-0.5">
                  <MapPin size={8} /> {f.loc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 时间轴/画廊 */}
        <div className="bento-card col-span-3 row-span-1 !p-0 flex overflow-hidden">
          {timelineItems.length > 0 ? (
            <div className="flex w-full h-full">
              {timelineItems.map((item, idx) => (
                <div 
                  key={`${item.id}-${idx}`} 
                  className="relative flex-1 group cursor-pointer overflow-hidden border-r border-white/5"
                  onClick={() => handleSelect(item)}
                >
                  <img 
                    src={item.img || `/images/${item.id}.jpg`} 
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1528164344705-47542687000d?w=800&h=600&fit=crop' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  <div className="absolute inset-0 p-4 flex flex-col justify-between z-10">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${idx === 0 ? 'text-gold' : 'text-text-dim'}`}>
                      {idx === 0 ? 'NOW' : idx === 1 ? 'UP NEXT' : 'LATER'}
                    </span>
                    <div>
                      <div className="text-lg font-bold group-hover:text-gold transition-colors">{item.date}</div>
                      <div className="text-[10px] text-text-dim truncate">{item.name}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-grow flex items-center justify-center text-text-dim text-xs uppercase">暂无活动排期</div>
          )}
        </div>

        {/* 重置视图按钮 */}
        <AnimatePresence>
          {selectedFolklore && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleReset}
              className="absolute top-4 right-4 z-30 flex items-center gap-2 bg-red-600/90 hover:bg-red-600 text-white px-4 py-2 rounded-full text-[10px] font-bold shadow-lg"
            >
              <RotateCcw size={12} /> 重置视角
            </motion.button>
          )}
        </AnimatePresence>
      </main>

      {/* 侧边栏详情页 (修复了层级遮挡问题) */}
      <AnimatePresence>
        {selectedFolklore && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full md:w-[450px] bg-[#0A0A0C] border-l border-white/10 z-[9999] shadow-2xl flex flex-col"
          >
            <div className="relative h-64 shrink-0">
              <img 
                src={selectedFolklore.img || `/images/${selectedFolklore.id}.jpg`}
                alt={selectedFolklore.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1528164344705-47542687000d?w=800&h=600&fit=crop';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0C] via-transparent to-transparent" />
              <button 
                onClick={() => setSelectedFolklore(null)}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 rounded-full transition-colors text-white"
              >
                <X size={20} />
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
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showContributionForm && (
          <ContributionForm onClose={() => setShowContributionForm(false)} />
        )}
      </AnimatePresence>

      <footer className="flex justify-between items-center shrink-0 text-[10px] text-text-dim uppercase tracking-widest mt-auto">
        <div className="flex gap-6">
          <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-accent" /> 岁时节令</span>
          <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-gold" /> 传统技艺</span>
        </div>
        <div>数据更新至：癸卯年 臘月廿四</div>
      </footer>
    </div>
  );
}
