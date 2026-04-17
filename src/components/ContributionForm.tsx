import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Calendar, Image as ImageIcon, Video, Send, Loader2, Map as MapIcon } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getMonthFromLunar } from '../constants';

interface ContributionFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const ContributionForm: React.FC<ContributionFormProps> = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    loc: '',
    lat: 35.8617,
    lng: 104.1954,
    desc: '',
    mediaUrl: '',
    mediaType: 'image' as 'image' | 'video'
  });

  const handleLogin = async () => {
    if (!auth) {
      setError('认证服务暂不可用。目前仅启用本地模式。');
      return;
    }
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error('Login error:', err);
      setError('登录失败，请重试');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Fallback if no Firebase auth
    if (!auth || !auth.currentUser) {
      if (!auth) {
        // Local mode: save to localStorage
        setLoading(true);
        setTimeout(() => {
          try {
            const newContribution = {
              ...formData,
              id: `local_${Date.now()}`,
              userId: 'local_user',
              userName: '访客 (本地存储)',
              createdAt: new Date().toISOString(),
              isUserContribution: true,
              month: getMonthFromLunar(formData.date),
              img: formData.mediaUrl || 'https://picsum.photos/seed/folklore/800/600'
            };
            
            const existing = JSON.parse(localStorage.getItem('local_contributions') || '[]');
            localStorage.setItem('local_contributions', JSON.stringify([newContribution, ...existing]));
            
            onSuccess();
            onClose();
            // Trigger a window event to notify App.tsx to reload
            window.dispatchEvent(new Event('storage'));
          } catch (err) {
            setError('本地保存失败');
          } finally {
            setLoading(false);
          }
        }, 1000);
        return;
      }
      handleLogin();
      return;
    }

    if (!db) {
       setError('数据库连接失败');
       return;
    }

    setLoading(true);
    setError(null);

    try {
      await addDoc(collection(db, 'contributions'), {
        ...formData,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || '匿名用户',
        createdAt: serverTimestamp(),
        isUserContribution: true,
        month: getMonthFromLunar(formData.date),
        img: formData.mediaUrl || 'https://picsum.photos/seed/folklore/800/600'
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Submission error:', err);
      setError('提交失败，请检查网络或权限');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#121214] border border-white/10 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div>
            <h3 className="text-xl font-serif text-gold font-bold">标记民俗活动</h3>
            <p className="text-[10px] text-text-dim uppercase tracking-widest mt-1">Contribute to Folklore Archive</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto custom-scrollbar space-y-6">
          {!auth.currentUser ? (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto">
                <Send className="text-gold" size={32} />
              </div>
              <h4 className="text-lg font-medium">请先登录以提交民俗活动</h4>
              <p className="text-sm text-text-dim">登录后您可以分享照片、视频和位置信息</p>
              <button
                type="button"
                onClick={handleLogin}
                className="bg-gold text-bg px-8 py-3 rounded-xl font-bold hover:bg-white transition-colors"
              >
                使用 Google 登录
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-gold uppercase tracking-widest font-bold">活动名称</label>
                  <input
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="例如：龙舞表演"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold outline-none transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] text-gold uppercase tracking-widest font-bold">活动时间</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" size={16} />
                    <input
                      required
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      placeholder="例如：正月十五"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm focus:border-gold outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gold uppercase tracking-widest font-bold">地理位置</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1 relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" size={16} />
                    <input
                      required
                      value={formData.loc}
                      onChange={e => setFormData({ ...formData, loc: e.target.value })}
                      placeholder="地点名称"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm focus:border-gold outline-none transition-colors"
                    />
                  </div>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.lat}
                    onChange={e => setFormData({ ...formData, lat: parseFloat(e.target.value) })}
                    placeholder="纬度"
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold outline-none transition-colors"
                  />
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.lng}
                    onChange={e => setFormData({ ...formData, lng: parseFloat(e.target.value) })}
                    placeholder="经度"
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold outline-none transition-colors"
                  />
                </div>
                <p className="text-[9px] text-text-dim italic">提示：您可以从地图上获取坐标，或手动输入。</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gold uppercase tracking-widest font-bold">媒体链接 (照片/视频 URL)</label>
                <div className="flex gap-4">
                  <div className="flex-grow relative">
                    <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" size={16} />
                    <input
                      value={formData.mediaUrl}
                      onChange={e => setFormData({ ...formData, mediaUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm focus:border-gold outline-none transition-colors"
                    />
                  </div>
                  <select
                    value={formData.mediaType}
                    onChange={e => setFormData({ ...formData, mediaType: e.target.value as 'image' | 'video' })}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold outline-none transition-colors"
                  >
                    <option value="image">照片</option>
                    <option value="video">视频</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gold uppercase tracking-widest font-bold">活动描述</label>
                <textarea
                  rows={4}
                  value={formData.desc}
                  onChange={e => setFormData({ ...formData, desc: e.target.value })}
                  placeholder="分享关于这个民俗活动的细节..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold outline-none transition-colors resize-none"
                />
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs">
                  {error}
                </div>
              )}

              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 border border-white/10 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gold text-bg py-4 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  提交标记
                </button>
              </div>
            </>
          )}
        </form>
      </motion.div>
    </motion.div>
  );
};
