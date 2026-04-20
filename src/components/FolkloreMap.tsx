import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Folklore, UserContribution } from '../types';
import { folkloreData } from '../constants';

interface FolkloreMapProps {
  activeMonth: number;
  onSelect: (folklore: Folklore) => void;
  selectedId?: number | string;
  userContributions?: UserContribution[];
  onMapClick?: (lat: number, lng: number) => void;
}

// 辅助组件：处理地图平移
const MapController = ({ selectedId, userContributions }: { selectedId?: number | string, userContributions?: UserContribution[] }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedId) {
      const allData = [...folkloreData, ...(userContributions || [])];
      const folklore = allData.find(f => f.id === selectedId);
      if (folklore) {
        map.flyTo([folklore.lat, folklore.lng], 8, {
          duration: 1.5
        });
      }
    }
  }, [selectedId, map, userContributions]);

  return null;
};

const MapClickHandler = ({ onClick }: { onClick?: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click: (e) => {
      if (onClick) onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

export const FolkloreMap: React.FC<FolkloreMapProps> = ({ 
  activeMonth, 
  onSelect, 
  selectedId, 
  userContributions = [],
  onMapClick
}) => {
  
  // 【修改1：修复筛选逻辑】使用 Number() 确保匹配，并同时过滤用户上传的数据
  const filteredFolklore = activeMonth === 0 
    ? folkloreData 
    : folkloreData.filter(f => Number(f.month) === activeMonth);

  const filteredUserContributions = activeMonth === 0
    ? userContributions
    : userContributions.filter(c => Number(c.month) === activeMonth);

  // 合并筛选后的所有标记点
  const allMarkers = [...filteredFolklore, ...filteredUserContributions];

  // 【修改2：图标生成逻辑】确保图片路径正确对应
  const createPhotoIcon = (folklore: Folklore) => {
    const isSelected = selectedId === folklore.id;
    const isUser = folklore.isUserContribution;
    const size = isSelected ? 60 : 45;
    const borderColor = isSelected ? '#E63946' : (isUser ? '#3B82F6' : '#D4AF37');
    
    // 如果数据里没有 img 字段，则根据 id 自动生成路径
    const imgSrc = folklore.img || `/images/${folklore.id}.jpg`;
    
    return L.divIcon({
      className: 'custom-photo-marker',
      html: `
        <div style="position: relative; width: ${size}px; height: ${size}px;">
          <div style="
            width: ${size}px; 
            height: ${size}px; 
            border-radius: 50%; 
            border: 2px solid ${borderColor}; 
            overflow: hidden; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.5); 
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
            background: #1A1A1D;
            transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'};
            z-index: ${isSelected ? '1000' : '10'};
          ">
            <img 
              src="${imgSrc}" 
              style="width: 100%; height: 100%; object-fit: cover;" 
              referrerPolicy="no-referrer" 
              onerror="this.src='https://images.unsplash.com/photo-1528164344705-47542687000d?w=100&h=100&fit=crop'"
            />
          </div>
          ${isSelected ? `<div style="position: absolute; top: -5px; left: -5px; right: -5px; bottom: -5px; border-radius: 50%; border: 2px solid ${borderColor}; animation: marker-ping 2s infinite; opacity: 0.8;"></div>` : ''}
          ${isUser && !isSelected ? '<div style="position: absolute; top: 0; right: 0; width: 12px; height: 12px; background: #3B82F6; border: 2px solid white; border-radius: 50%; z-index: 20;"></div>' : ''}
        </div>
        <style>
          @keyframes marker-ping {
            0% { transform: scale(1); opacity: 0.8; }
            100% { transform: scale(1.4); opacity: 0; }
          }
        </style>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  return (
    <div className="w-full h-full relative bg-[#020205]">
      <MapContainer 
        center={[35.8617, 104.1954]} 
        zoom={4} 
        style={{ width: '100%', height: '100%', background: '#020205' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        <MapController selectedId={selectedId} userContributions={userContributions} />
        <MapClickHandler onClick={onMapClick} />

        {allMarkers.map((folklore) => (
          <Marker 
            key={folklore.id} 
            position={[folklore.lat, folklore.lng]}
            icon={createPhotoIcon(folklore)}
            eventHandlers={{
              click: () => onSelect(folklore),
            }}
          />
        ))}
      </MapContainer>

      <div className="absolute bottom-4 left-4 z-[1000] pointer-events-none">
        <div className="bg-black/60 backdrop-blur-md border border-white/10 p-3 rounded-xl">
          <p className="text-[10px] text-gold uppercase tracking-widest font-bold">華夏地理圖誌</p>
          <p className="text-[9px] text-text-dim mt-1">
            已加载 {allMarkers.length} 项 {activeMonth === 0 ? '年度' : `${activeMonth}月`}民俗
          </p>
        </div>
      </div>
    </div>
  );
};
