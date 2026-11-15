import React, { useMemo, useState } from 'react';
import { Hotspot, ScreenType } from '../types';
import { HotspotMap } from './HotspotMap';
import { nearbyRadiusKm } from '../lib/location';
import { DataSource } from './DataSource';

interface HotspotsScreenProps {
  nearbyEnabled?: boolean;
  onChooseLocation?: () => void;
  hotspots: Hotspot[];
  onSelectHotspot: (hotspot: Hotspot) => void;
  onNavigate: (screen: ScreenType) => void;
  showToast: (message: string) => void;
}

export const HotspotsScreen: React.FC<HotspotsScreenProps> = ({
  nearbyEnabled = false,
  onChooseLocation,
  hotspots,
  onSelectHotspot,
  onNavigate,
  showToast,
}) => {
  const [activeFilter, setActiveFilter] = useState<'nearby' | 'popular' | 'saved'>('nearby');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePinId, setActivePinId] = useState<string | null>(null);

  const filteredHotspots = useMemo(() => hotspots.filter((h) => {
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matches = (
        h.name.toLowerCase().includes(q)
      );
      if (!matches) return false;
    }
    if (activeFilter === 'popular') {
      return (h.speciesCount ?? 0) >= 15;
    }
    if (activeFilter === 'saved') {
      return h.isSaved;
    }
    return !nearbyEnabled || (h.distanceKm != null && h.distanceKm <= nearbyRadiusKm);
  }).sort((a, b) => nearbyEnabled ? (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) : 0), [hotspots, searchQuery, activeFilter, nearbyEnabled]);

  const handlePinClick = (id: string) => {
    setActivePinId(id);
    const target = hotspots.find((h) => h.id === id);
    if (target) {
      showToast(`Selected ${target.name}`);
      const el = document.getElementById(`hotspot-card-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <div className="flex flex-col w-full pb-28">
      {/* Search and Filters */}
      <div className="px-4 pt-2">
        <div className="relative flex items-center w-full">
          <span className="material-symbols-outlined absolute left-4 text-[#42493e] pointer-events-none text-[20px]">
            search
          </span>
          <input
            aria-label="Search hotspots"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search locations"
            className="w-full h-12 pl-12 pr-11 bg-white rounded-lg text-[14px] text-[#181c20] placeholder:text-[#42493e]/70 focus:outline-none focus:ring-2 focus:ring-[#154212] shadow-sm transition-all"
            type="text"
          />
          <button
            onClick={() => onChooseLocation?.()}
            aria-label="Choose location"
            className="absolute right-1 w-11 h-11 flex items-center justify-center rounded-full text-[#42493e] hover:text-[#154212] transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">near_me</span>
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 py-2 overflow-x-auto no-scrollbar">
          {(['nearby', 'popular', 'saved'] as const).map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`hotspot-filter min-h-7 px-3.5 py-1 rounded-full text-[13px] font-medium capitalize transition-all active:scale-95 whitespace-nowrap ${
                  isActive
                    ? 'bg-[#154212] text-white shadow-sm'
                    : 'bg-[#f1f4f9] text-[#42493e] hover:bg-[#ebeef3]'
                }`}
              >
                  {filter === 'nearby' ? nearbyEnabled ? 'Nearby (50 km)' : 'All' : filter}
              </button>
            );
          })}
        </div>
      </div>

      {/* Map Stage */}
      <div className="relative px-4 my-1">
        <HotspotMap hotspots={filteredHotspots} label="Map of hotspots" selectedId={activePinId} onSelect={setActivePinId} onOpen={(id) => {
          const hotspot = filteredHotspots.find((h) => h.id === id);
          if (hotspot) onSelectHotspot(hotspot);
        }} />
      </div>
      {/* Location Cards List */}
      <div className="px-4 pt-1 flex flex-col gap-2.5">
        {filteredHotspots.map((hotspot) => {
          const isHighlighted = activePinId === hotspot.id;
          return (
            <div
              id={`hotspot-card-${hotspot.id}`}
              key={hotspot.id}
              onClick={() => onSelectHotspot(hotspot)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectHotspot(hotspot);
                }
              }}
              className={`bg-white rounded-xl px-4 py-[15px] shadow-sm hover:shadow-md transition-all active:scale-[0.99] flex items-center justify-between gap-3 cursor-pointer border ${
                isHighlighted ? 'border-[#154212] ring-2 ring-[#154212]/30' : 'border-transparent'
              }`}
            >
              <div className="flex flex-col min-w-0">
                <h2 className="text-[16px] font-medium text-[#181c20] truncate">{hotspot.name}</h2>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[11px] text-[#42493e]">
                  {hotspot.speciesCount != null && <span className="font-bold text-[#154212]">{hotspot.speciesCount} species</span>}
                  {hotspot.distanceKm != null && <><span className="w-1 h-1 rounded-full bg-[#c2c9bb]"></span>
                  <span title="Straight-line distance">{hotspot.distanceKm.toFixed(1)} km</span></>}
                  {(hotspot.recentSightings?.length ?? 0) > 0 && <><span className="w-1 h-1 rounded-full bg-[#c2c9bb]"></span>
                  <span title="Species reported here in the past 14 days">{hotspot.recentSightings!.length} seen recently</span></>}
                </div>
              </div>

              <span className="material-symbols-outlined text-[#42493e] text-[20px] flex-shrink-0">
                chevron_right
              </span>
            </div>
          );
        })}
        {filteredHotspots.length === 0 && (
          <p role="status" className="py-8 text-center text-[13px] text-[#42493e]">
            {activeFilter === 'saved' && !searchQuery.trim() ? 'No saved hotspots yet. Open a hotspot and tap Save.' : nearbyEnabled && activeFilter === 'nearby' && !searchQuery.trim() ? 'No hotspots within 50 km of your location.' : 'No hotspots match this search.'}
          </p>
        )}
        {hotspots.length > 0 && <DataSource className="pt-2" />}
      </div>
    </div>
  );
};
