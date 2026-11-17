import React, { useMemo, useState } from 'react';
import { Hotspot, ScreenType, CommunityPost } from '../types';
import { fieldTime, regionName, type HotspotDetails, type HotspotWeather } from '../lib/discovery';
import { hotspotDirectionsUrl } from '../lib/maps';
import { HotspotMap } from './HotspotMap';
import { HotspotAccess } from './HotspotAccess';
import { HotspotWeatherPanel } from './HotspotWeatherPanel';

interface HotspotDetailScreenProps {
  subscribed?: boolean;
  onToggleSubscription?: () => void;
  saveDisabled?: boolean;
  weather?: HotspotWeather;
  weatherError?: string;
  onRetryWeather?: () => void;
  details?: HotspotDetails;
  detailsError?: string;
  onRetryDetails?: () => void;
  onSelectSpeciesById?: (id: string) => void;
  hotspot: Hotspot;
  onToggleSave: (hotspotId: string) => void;
  onNavigate: (screen: ScreenType) => void;
  showToast: (message: string) => void;
  fieldPhotos?: CommunityPost[];
  onOpenPost?: (id: string) => void;
}

export const HotspotDetailScreen: React.FC<HotspotDetailScreenProps> = ({
  subscribed=false,onToggleSubscription,
  saveDisabled = false,
  weather,
  weatherError,
  onRetryWeather,
  details,
  detailsError,
  onRetryDetails,
  onSelectSpeciesById,
  hotspot,
  onToggleSave,
  showToast,
  fieldPhotos = [],
  onOpenPost,
}) => {
  const isSaved = Boolean(hotspot.isSaved);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const mapHotspots = useMemo(() => [hotspot], [hotspot]);
  const directionsUrl = hotspotDirectionsUrl(hotspot);
  const recentSightings = details?.recentSightings || [];
  const speciesList = details?.speciesList || [];
  const recentSpeciesCount = new Set(recentSightings.map((sight) => sight.speciesId || sight.species)).size;
  const sunrise = weather?.days[0]?.sunrise?.slice(11, 16);
  const selectSpecies = (id: string | undefined) => {
    if (id && onSelectSpeciesById) onSelectSpeciesById(id);
    else showToast('This bird is not in the current bird list.');
  };

  const toggleAccordion = (id: string) => {
    setOpenAccordion((prev) => (prev === id ? null : id));
  };

  const handleToggleSave = () => {
    onToggleSave(hotspot.id);
  };

  return (
    <div className="flex flex-col w-full pb-28 pt-0">

      {/* Top Location Hero Banner */}
      <div className="relative w-full h-56 overflow-hidden bg-[#ebeef3]">
        <img
          src={hotspot.imageUrl}
          alt={hotspot.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2d3135]/90 via-[#2d3135]/30 to-transparent"></div>

        {/* Favorite & Map Floating Pill */}
        <div className="absolute top-3 right-4 flex items-center gap-2">
          <button
            onClick={handleToggleSave}
            disabled={saveDisabled}
            aria-label="Save this hotspot"
            aria-pressed={isSaved}
            className="w-11 h-11 rounded-full bg-white/90 backdrop-blur-md shadow-sm flex items-center justify-center text-[#181c20] hover:bg-white active:scale-95 transition-all"
          >
            <span
              className={`material-symbols-outlined text-[20px] transition-colors ${
                isSaved ? 'text-[#904d00]' : 'text-[#181c20]'
              }`}
              style={{ fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0" }}
            >
              {isSaved ? 'bookmark' : 'bookmark_border'}
            </span>
          </button>
        </div>

        {/* Title & Geo Badging */}
        <div className="absolute bottom-3 left-4 right-4 flex flex-col">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/90 backdrop-blur-sm text-[#181c20] text-[11px] font-semibold">
              <span className="material-symbols-outlined text-[14px] text-[#2d5a27]">
                location_on
              </span>
              {regionName(hotspot.region)}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#fe932c] text-white text-[11px] font-bold">
              eBird Hotspot
            </span>
          </div>
          <h2 className="text-[24px] font-bold text-white tracking-tight leading-none drop-shadow-sm">
            {hotspot.name}
          </h2>
        </div>
      </div>

      {/* Summary Metric Chips Panel */}
      <div className="px-4 pt-3">
        <div className="grid grid-cols-3 gap-2 bg-[#f1f4f9] p-3 rounded-xl shadow-xs">
          <div className="flex flex-col items-center justify-center text-center p-2 rounded-lg bg-white shadow-xs">
            <span className="material-symbols-outlined text-[20px] text-[#2d5a27] mb-0.5">
              flutter_dash
            </span>
            <span className="max-w-full break-words font-bold text-[#181c20] leading-tight text-[17px]">
              {details ? recentSpeciesCount : '—'}
            </span>
            <span title="Species reported here in the past 14 days" className="text-[10px] text-[#42493e] font-semibold mt-0.5">Seen recently</span>
          </div>

          <div className="flex flex-col items-center justify-center text-center p-2 rounded-lg bg-white shadow-xs">
            <span className="material-symbols-outlined text-[20px] text-[#904d00] mb-0.5">
              wb_twilight
            </span>
            <span className="max-w-full break-words font-bold text-[#181c20] leading-tight text-[17px]">{sunrise || '—'}</span>
            <span className="text-[10px] text-[#42493e] font-semibold mt-0.5">Sunrise</span>
          </div>

          <div className="flex flex-col items-center justify-center text-center p-2 rounded-lg bg-white shadow-xs">
            <span className="material-symbols-outlined text-[20px] text-[#154212] mb-0.5">
              thermostat
            </span>
            <span className="max-w-full break-words font-bold text-[#181c20] leading-tight text-[17px]">
              {weather?.current.temperatureC == null ? '—' : `${weather.current.temperatureC}°C`}
            </span>
            <span className="text-[10px] text-[#42493e] font-semibold mt-0.5 truncate w-full">
              {weather?.current.condition || (weatherError ? 'No forecast' : 'Weather')}
            </span>
          </div>
        </div>
      </div>

      {/* Action CTA Buttons Strip */}
      <div className="px-4 pt-3 grid grid-cols-3 gap-2">
        <button
          onClick={handleToggleSave}
          disabled={saveDisabled}
          aria-pressed={isSaved}
          className={`h-11 flex items-center justify-center gap-1.5 rounded font-semibold text-[13px] transition-all active:scale-95 ${
            isSaved
              ? 'bg-[#ffdcc3] text-[#6e3900]'
              : 'bg-[#ebeef3] hover:bg-[#e0e3e8] text-[#181c20]'
          }`}
        >
          <span
            className="material-symbols-outlined text-[18px]"
            style={{ fontVariationSettings: isSaved ? "'FILL' 1" : "'FILL' 0" }}
          >
            {isSaved ? 'bookmark' : 'bookmark_border'}
          </span>
          <span>SAVE</span>
        </button>

        <button
          onClick={() => {
            setOpenAccordion('visit');
            document.getElementById('accordion-visit')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="h-11 flex items-center justify-center gap-1.5 rounded bg-[#2d5a27] text-white font-semibold text-[13px] shadow-sm active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">navigation</span>
          <span>PLAN VISIT</span>
        </button>

        <button
          onClick={() => {
            setOpenAccordion('species');
            document.getElementById('accordion-species')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="h-11 flex items-center justify-center gap-1.5 rounded bg-[#ebeef3] hover:bg-[#e0e3e8] text-[#181c20] font-semibold text-[13px] active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">menu_book</span>
          <span>SPECIES</span>
        </button>
      </div>


      {/* Section 1: Recent Sightings */}
      <div className="px-4 pt-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#154212]"></span>
            <h3 className="text-[18px] font-medium text-[#181c20]">Recent Sightings</h3>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-[11px] text-[#42493e] font-semibold">Past 14 days</span>
            {onToggleSubscription && <button type="button" aria-pressed={subscribed} aria-label={subscribed ? 'Unsubscribe from hotspot alerts' : 'Subscribe to hotspot alerts'} title={subscribed ? 'Alerts on for this hotspot' : 'Get alerts for this hotspot'} onClick={onToggleSubscription} className={`w-11 h-11 -my-2 rounded-full flex items-center justify-center ${subscribed ? 'text-[#904d00]' : 'text-[#42493e]'} hover:bg-[#ebeef3]`}>
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: subscribed ? "'FILL' 1" : "'FILL' 0" }}>{subscribed ? 'notifications_active' : 'notifications'}</span>
            </button>}
          </div>
        </div>

        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto" tabIndex={0} role="region" aria-label="Recent hotspot reports">

          {!details && !detailsError && <p role="status" className="text-[12px] text-[#42493e]">Loading hotspot reports…</p>}
          {detailsError && <div role="alert" className="text-[12px] text-[#42493e]"><p>{detailsError}</p><button type="button" onClick={onRetryDetails} className="mt-2 font-semibold text-[#154212] underline">Try again</button></div>}

          {details && recentSightings.length === 0 && <p className="text-[12px] text-[#42493e]">No reports here in the past 14 days.</p>}
          {recentSightings.map((sight, idx) => (
            <div
              key={idx}
              role="button"
              tabIndex={0}
              onClick={() => selectSpecies(sight.speciesId)}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectSpecies(sight.speciesId); } }}
              className="flex items-center justify-between p-2 bg-white rounded-lg shadow-xs hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={sight.image}
                  alt={sight.species}
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-semibold text-[#181c20] truncate">
                    {sight.species}
                  </span>
                  <span className="text-[11px] italic text-[#42493e] truncate">
                    {sight.scientific}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end flex-shrink-0 pl-2">
                {sight.count !== null && <span className="px-2 py-0.5 rounded-full bg-[#f1f4f9] text-[#154212] text-[10px] font-bold">
                  {sight.count} {sight.count === 1 ? 'bird' : 'birds'}
                </span>}
                <span className="text-[10px] text-[#42493e] mt-1">{fieldTime(sight.timeAgo)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Recent photographs shared from this hotspot */}
      {fieldPhotos.length > 0 && <div className="pt-5">
        <div className="px-4 flex items-center justify-between mb-2">
          <h3 className="text-[17px] min-[360px]:text-[18px] font-medium text-[#181c20]">Recent Field Photographs</h3>
          <span className="text-[11px] text-[#42493e] font-semibold">Local birders</span>
        </div>

        <div className="flex gap-2.5 px-4 overflow-x-auto no-scrollbar pb-1">
          {fieldPhotos.slice(0, 12).map((post) => (
            <button
              type="button"
              key={post.id}
              onClick={() => onOpenPost?.(post.id)}
              aria-label={`Open ${post.speciesName} by ${post.authorName}`}
              className="relative flex-shrink-0 w-32 h-40 rounded-xl overflow-hidden shadow-xs bg-[#ebeef3] text-left"
            >
              <img src={post.imageUrl} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2">
                <span className="text-[11px] font-bold text-white truncate">{post.speciesName}</span>
                <span className="text-[10px] text-white/80 truncate">{post.authorName}</span>
              </div>
            </button>
          ))}
        </div>
      </div>}

      {/* Expandable Accordions */}
      <div className="px-4 pt-5 space-y-2.5">
        {/* Accordion 1: Plan Visit & Entry Gates */}
        <div id="accordion-visit" className="bg-white rounded-xl overflow-hidden shadow-xs border border-[#f1f4f9]">
          <button
            onClick={() => toggleAccordion('visit')}
            className="w-full p-3.5 flex items-center justify-between text-left hover:bg-[#f1f4f9] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-[#ebeef3] flex items-center justify-center text-[#154212]">
                <span className="material-symbols-outlined text-[18px]">schedule</span>
              </div>
              <span className="text-[15px] font-bold text-[#181c20]">
                Plan Visit & Entry Gates
              </span>
            </div>
            <span
              className={`material-symbols-outlined text-[#42493e] transition-transform duration-200 ${
                openAccordion === 'visit' ? 'rotate-180' : ''
              }`}
            >
              expand_more
            </span>
          </button>

          {openAccordion === 'visit' && (
            <div className="px-3.5 pb-3.5 pt-1 space-y-2">
              <HotspotAccess access={hotspot.access} />
            </div>
          )}
        </div>

        {/* Accordion 2: Detailed Micro-Weather */}
        <div className="bg-white rounded-xl overflow-hidden shadow-xs border border-[#f1f4f9]">
          <button
            onClick={() => toggleAccordion('weather')}
            className="w-full p-3.5 flex items-center justify-between text-left hover:bg-[#f1f4f9] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-[#ebeef3] flex items-center justify-center text-[#904d00]">
                <span className="material-symbols-outlined text-[18px]">air</span>
              </div>
              <span className="text-[15px] font-bold text-[#181c20]">
                Detailed Micro-Weather
              </span>
            </div>
            <span
              className={`material-symbols-outlined text-[#42493e] transition-transform duration-200 ${
                openAccordion === 'weather' ? 'rotate-180' : ''
              }`}
            >
              expand_more
            </span>
          </button>

          {openAccordion === 'weather' && (
            <div className="px-3.5 pb-3.5 pt-1 space-y-2">
              <HotspotWeatherPanel weather={weather} error={weatherError} onRetry={onRetryWeather} />
            </div>
          )}
        </div>

        {/* Accordion 3: View All Hotspot Species */}
        <div id="accordion-species" className="bg-white rounded-xl overflow-hidden shadow-xs border border-[#f1f4f9]">
          <button
            onClick={() => toggleAccordion('species')}
            className="w-full p-3.5 flex items-center justify-between text-left hover:bg-[#f1f4f9] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-[#ebeef3] flex items-center justify-center text-[#154212]">
                <span className="material-symbols-outlined text-[18px]">
                  format_list_bulleted
                </span>
              </div>
              <span className="text-[15px] font-bold text-[#181c20]">
                {hotspot.speciesCount == null ? 'Species recorded all time' : `Species recorded all time (${hotspot.speciesCount})`}
              </span>
            </div>
            <span
              className={`material-symbols-outlined text-[#42493e] transition-transform duration-200 ${
                openAccordion === 'species' ? 'rotate-180' : ''
              }`}
            >
              expand_more
            </span>
          </button>

          {openAccordion === 'species' && (
            <div className="px-3.5 pb-3.5 pt-1 space-y-1.5">
              {!details && <p className="text-[12px] text-[#42493e]">{detailsError ? 'The species list could not load. Use Try again above.' : 'Loading species list…'}</p>}
              {details && details.unmatchedTaxa > 0 && speciesList.length > 0 && <p className="text-[12px] text-[#42493e]">{details.unmatchedTaxa} other {details.unmatchedTaxa === 1 ? 'entry' : 'entries'} (such as hybrids) {details.unmatchedTaxa === 1 ? 'is' : 'are'} not listed.</p>}
              {details && speciesList.length === 0 && <p className="text-[12px] text-[#42493e]">No species listed for this hotspot yet.</p>}
              {speciesList.map((sp, i) => (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectSpecies(sp.speciesId)}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectSpecies(sp.speciesId); } }}
                  className="flex items-center justify-between py-2 px-2.5 rounded-lg hover:bg-[#f1f4f9] cursor-pointer transition-colors"
                >
                  <div>
                    <p className="text-[13px] font-bold text-[#181c20]">{sp.name}</p>
                    <p className="text-[11px] italic text-[#42493e]">{sp.scientific}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${sp.statusColor}`}>
                    {sp.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mx-4 mt-4 rounded-xl bg-white p-4 text-[13px] text-[#42493e]">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h3 className="text-[18px] font-medium text-[#181c20]">Sanctuary Map &amp; Access</h3><span className="text-[11px] font-mono">{hotspot.coordinates}</span></div>
        <HotspotMap hotspots={mapHotspots} label={`Map of ${hotspot.name}`} selectedId={hotspot.id} />
        {directionsUrl ? <a href={directionsUrl} target="_blank" rel="noreferrer" className="mt-3 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2d5a27] font-semibold text-white"><span className="material-symbols-outlined text-[18px]">directions</span>Open directions</a> : <p role="status" className="mt-2">Directions unavailable: this hotspot has no valid coordinates.</p>}
        <p className="mt-2 text-[11px]">Directions lead to the hotspot marker, which may not be the entrance.</p>
        <a href={hotspot.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block font-semibold text-[#154212] underline">View hotspot on eBird</a>
      </div>
    </div>
  );
};
