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

// Component to handle map view changes
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

// Component to handle map clicks
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
  const filteredFolklore = activeMonth === 0 
    ? folkloreData 
    : folkloreData.filter(f => f.month === activeMonth);

  // Combine with user contributions
  const allMarkers = [...filteredFolklore, ...userContributions];

  // Custom icon creator for photo markers
  const createPhotoIcon = (folklore: Folklore) => {
    const isSelected = selectedId === folklore.id;
    const isUser = folklore.isUserContribution;
    const size = isSelected ? 60 : 45;
    const borderColor = isSelected ? '#E63946' : (isUser ? '#3B82F6' : '#D4AF37');
    
    return L.divIcon({
      className: 'custom-photo-marker',
      html: `
        <div style="position: relative; width: ${size}px; height: ${size}px;">
          <div style="
            width: ${size}px; 
            height: ${size}px; 
            border-radius: 9999px; 
            border: 2px solid ${borderColor}; 
            overflow: hidden; 
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3); 
            transition: all 0.3s; 
            background: #1A1A1D;
            transform: ${isSelected ? 'scale(1.1)' : 'scale(1)'};
            z-index: ${isSelected ? '1000' : '10'};
          ">
            <img 
              src="${folklore.img}" 
              style="width: 100%; height: 100%; object-fit: cover;" 
              referrerPolicy="no-referrer" 
              onerror="this.src='https://images.unsplash.com/photo-1528164344705-47542687000d?w=100&h=100&fit=crop'"
            />
          </div>
          ${isSelected ? `<div style="position: absolute; top: -4px; left: -4px; right: -4px; bottom: -4px; border-radius: 9999px; border: 1px solid ${borderColor}; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; opacity: 0.75;"></div>` : ''}
          ${isUser && !isSelected ? '<div style="position: absolute; -top: 2px; -right: 2px; width: 12px; height: 12px; background: #3B82F6; border: 2px solid white; border-radius: 9999px; z-index: 20;"></div>' : ''}
        </div>
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
        {/* Dark Mode Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
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

      {/* Map Overlay Info */}
      <div className="absolute bottom-4 left-4 z-[1000] pointer-events-none">
        <div className="bg-black/60 backdrop-blur-md border border-white/10 p-3 rounded-xl">
          <p className="text-[10px] text-gold uppercase tracking-widest font-bold">Interactive Map Mode</p>
          <p className="text-xs text-text-dim">Leaflet + OpenStreetMap</p>
        </div>
      </div>
    </div>
  );
};
