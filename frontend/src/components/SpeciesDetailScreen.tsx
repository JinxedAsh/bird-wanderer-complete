import React, { useMemo, useState } from 'react';
import { BirdSpecies, Hotspot, ScreenType } from '../types';
import { fieldTime, regionName, type SpeciesLocations } from '../lib/discovery';
import { SpeciesPhoto, type PhotoLoadState } from './SpeciesPhoto';
import { PhotoPlanning } from './PhotoPlanning';
import { SpeciesInfoPanel } from './SpeciesInfoPanel';
import { SpeciesRecording } from './SpeciesRecording';
import { ReferenceComparisons } from './ReferenceComparisons';
import { HotspotMap } from './HotspotMap';
import { hotspotCoordinates } from '../lib/maps';

interface SpeciesDetailScreenProps {
  subscribed?: boolean;
  onToggleSubscription?: () => void;
  saved?: boolean;
  saveDisabled?: boolean;
  onToggleBookmark?: () => void;
  onSessionExpired?: () => void;
  locations?: SpeciesLocations;
  hotspots?: Hotspot[];
  locationsError?: string;
  onRetryLocations?: () => void;
  onSelectHotspotById?: (id: string) => void;
  species: BirdSpecies;
  onNavigate: (screen: ScreenType) => void;
  onQuickLog: (species: BirdSpecies) => void;
  showToast: (message: string) => void;
}

export const SpeciesDetailScreen: React.FC<SpeciesDetailScreenProps> = ({
  subscribed=false,onToggleSubscription,
  saved,
  saveDisabled = false,
  onToggleBookmark,
  onSessionExpired,
  locations,
  hotspots = [],
  locationsError,
  onRetryLocations,
  onSelectHotspotById,
  species,
  onNavigate,
  onQuickLog,
  showToast,
}) => {
  const isBookmarked = Boolean(saved);
  const [isSightingsExpanded, setIsSightingsExpanded] = useState(true);
  const [photoState, setPhotoState] = useState<PhotoLoadState>({ speciesId: species.id, photo: null, loading: true, error: '' });
  const mappedHotspots = useMemo(() => {
    const reportedIds = new Set(locations?.locations.map((location) => location.hotspotId));
    return hotspots.filter((hotspot) => reportedIds.has(hotspot.id) && hotspotCoordinates(hotspot));
  }, [hotspots, locations]);
  const toggleBookmark = () => onToggleBookmark?.();
  const region = regionName(species.coverageLabel || species.region);

  const focusSection = (id: string) => {
    const section = document.getElementById(id);
    let disclosure = section?.closest('details');
    // Open every enclosing panel before navigating to a nested guide control.
    while (disclosure) { disclosure.open = true; disclosure = disclosure.parentElement?.closest('details'); }
    section?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    section?.focus({ preventScroll: true });
  };

  return (
    <div className="flex flex-col w-full pb-28">

      {/* Top Action Rail */}
      <div className="px-4 py-1.5 flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-1 min-[360px]:gap-2">
          <span className="inline-flex shrink-0 items-center gap-1.5 px-1.5 min-[360px]:px-2.5 py-1 rounded-full bg-[#ffdcc3] text-[#6e3900] text-[10px] min-[360px]:text-[12px] whitespace-nowrap font-medium uppercase tracking-wide">
            <span
              className="material-symbols-outlined text-[14px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
            Target Species
          </span>
          {species.orderFamily && species.orderFamily !== 'Not available from eBird' && <span title={species.orderFamily} className="min-w-0 truncate px-2 min-[360px]:px-2.5 py-1 rounded-full bg-[#ebeef3] text-[#42493e] text-[11px] font-semibold">
            {species.orderFamily}
          </span>}
        </div>

        <div className="flex shrink-0 items-center gap-1 min-[360px]:gap-2">
          <button
            onClick={toggleBookmark}
            disabled={saveDisabled}
            aria-pressed={isBookmarked}
            aria-label="Bookmark species"
            className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center transition-all ${
              isBookmarked
                ? 'bg-[#ffdcc3] text-[#6e3900]'
                : 'bg-[#ebeef3] text-[#181c20] hover:bg-[#e0e3e8]'
            }`}
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: isBookmarked ? "'FILL' 1" : "'FILL' 0" }}
            >
              {isBookmarked ? 'bookmark' : 'bookmark_border'}
            </span>
          </button>

          <button type="button" onClick={() => focusSection('species-recording')} aria-label="Recorded calls" className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center bg-[#ebeef3] text-[#181c20] hover:bg-[#e0e3e8]">
            <span className="material-symbols-outlined text-[20px]">volume_down</span>
          </button>
        </div>
      </div>

      {/* Hero Photo Stage */}
      <div className="px-4 pb-2">
        <SpeciesPhoto key={species.id} species={species} hero onSessionExpired={onSessionExpired} onPhotoStateChange={setPhotoState} frameClassName="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#ebeef3] shadow-sm">
        </SpeciesPhoto>
      </div>

      {/* Species Title & Nomenclature */}
      <div className="px-4 pt-1 pb-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[22px] min-[360px]:text-[26px] leading-tight font-bold text-[#181c20] tracking-tight">{species.name}</h2>
          {species.iucnStatus && <span title="Conservation status" className="text-[10px] shrink-0 text-[#904d00] px-2 py-0.5 rounded bg-[#ffdcc3] uppercase tracking-wide font-medium">
            {species.iucnStatus}
          </span>}
        </div>
        <p className="text-[14px] text-[#42493e] italic mt-0.5">
          {species.scientificName}
          {species.alias && <span className="not-italic text-[#72796e]"> • {species.alias}</span>}
        </p>
      </div>

      {/* Bento Grid Metadata */}
      <div className="px-4 grid grid-cols-2 gap-2 pb-5">
        {/* Habitat */}
        <div className="bg-[#f1f4f9] rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[#42493e]">
            <span className="material-symbols-outlined text-[18px] text-[#3b6934]">waves</span>
            <span className="text-[12px] font-medium uppercase tracking-wide">Habitat</span>
          </div>
          <div className="mt-2">
            <span className="text-[20px] font-medium text-[#181c20] block leading-tight">
              Field guide
            </span>
            <span className="text-[12px] text-[#42493e]">
              <button type="button" onClick={() => focusSection('species-information')} className="font-semibold text-[#154212] underline">Identification &amp; habitat</button>
            </span>
          </div>
        </div>

        {/* Best Time */}
        <div className="bg-[#f1f4f9] rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[#42493e]">
            <span className="material-symbols-outlined text-[18px] text-[#904d00]">wb_twilight</span>
            <span className="text-[12px] font-medium uppercase tracking-wide">Best Time</span>
          </div>
          <div className="mt-2">
            <span className="text-[20px] font-medium text-[#181c20] block leading-tight">
              Varies by site
            </span>
            <span className="text-[12px] text-[#42493e]">
              <button type="button" onClick={() => focusSection('photography-planning')} className="font-semibold text-[#154212] underline">Timing &amp; access</button>
            </span>
          </div>
        </div>

        {/* Sightings */}
        <div className="bg-[#f1f4f9] rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[#42493e]">
            <span className="material-symbols-outlined text-[18px] text-[#3b6934]">travel_explore</span>
            <span className="text-[12px] font-medium uppercase tracking-wide">Sightings</span>
          </div>
          <div className="mt-2">
            <div className="flex flex-wrap items-baseline gap-1">
              <span className="text-[20px] font-medium text-[#181c20]">
                {species.recentObservations?.length ? 'Reported' : 'None'}
              </span>
              <span className="text-[12px] text-[#42493e]">past 14 days</span>
            </div>
            <span className="text-[12px] text-[#3b6934] font-medium truncate block">
              {region}
            </span>
          </div>
        </div>

        {/* Photography Difficulty */}
        <div className="bg-[#f1f4f9] rounded-lg p-3.5 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-[#42493e]">
            <span className="material-symbols-outlined text-[18px] text-[#904d00]">shutter_speed</span>
            <span className="text-[12px] font-medium uppercase tracking-wide">Photography</span>
          </div>
          <div className="mt-2">
            <span className="text-[20px] font-medium text-[#181c20] block leading-tight">
              {species.photographyDifficulty || 'Shot tips'}
            </span>
            <button type="button" onClick={() => focusSection('photography-planning')} className="min-h-11 text-left text-[12px] font-semibold text-[#154212] underline">Motion, light &amp; gear</button>
          </div>
        </div>
      </div>

      {/* Primary Action Deck */}
      <div className="px-4 pb-5 flex gap-2.5">
        <button
          onClick={() => {
            setIsSightingsExpanded(true);
            document.getElementById('sightings-sheet-anchor')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="flex-1 h-12 rounded-lg bg-[#ebeef3] text-[#181c20] font-semibold text-[13px] flex items-center justify-center gap-2 hover:bg-[#e0e3e8] active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">map</span>
          <span>VIEW SIGHTINGS</span>
        </button>

        <button
          type="button"
          aria-controls="photography-planning"
          onClick={() => focusSection('photography-planning')}
          className="flex-1 h-12 rounded-lg bg-[#2d5a27] text-white font-semibold text-[13px] flex items-center justify-center gap-2 shadow-sm hover:opacity-95 active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
          <span>PLAN A SHOT</span>
        </button>
      </div>

      {/* Photography Field Note Card */}
      <div className="px-4 pb-5">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#f1f4f9]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-[#ffdcc3] flex items-center justify-center text-[#6e3900]">
              <span className="material-symbols-outlined text-[16px]">tips_and_updates</span>
            </div>
            <h3 className="text-[17px] min-[360px]:text-[18px] leading-tight font-medium text-[#181c20]">Field Guide & Technique</h3>
            {onToggleSubscription && <button type="button" aria-pressed={subscribed} aria-label={subscribed ? 'Unsubscribe from species alerts' : 'Subscribe to species alerts'} title={subscribed ? 'Alerts on for this bird' : 'Get alerts for this bird'} onClick={onToggleSubscription} className={`ml-auto w-11 h-11 -my-2 shrink-0 rounded-full flex items-center justify-center ${subscribed ? 'text-[#904d00]' : 'text-[#42493e]'} hover:bg-[#ebeef3]`}><span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: subscribed ? "'FILL' 1" : "'FILL' 0" }}>{subscribed ? 'notifications_active' : 'notifications'}</span></button>}
          </div>
          <details id="photography-planning" tabIndex={-1} aria-label="Field Guide and Technique" className="text-[13px] text-[#42493e]"><summary className="min-h-11 flex items-center cursor-pointer font-semibold">About this bird and how to photograph it</summary>
          <SpeciesInfoPanel key={species.id} speciesId={species.id} onSessionExpired={onSessionExpired} />
          <PhotoPlanning key={`planning-${species.id}`} region={species.region} seasonalContext={species.seasonalContext} speciesName={species.name} speciesId={species.id} state={photoState} onSessionExpired={onSessionExpired} onChooseHotspot={() => focusSection('sightings-sheet-anchor')} />

          </details>

          <SpeciesRecording key={`recording-${species.id}`} speciesId={species.id} onSessionExpired={onSessionExpired} />
        </div>
      </div>

      <ReferenceComparisons key={`gallery-${species.id}`} speciesId={species.id} gallery onSessionExpired={onSessionExpired} />
      <section id="sightings-sheet-anchor" tabIndex={-1} className="w-full rounded-t-3xl border-t border-[#f1f4f9] bg-white pt-3 pb-6 text-[13px] text-[#42493e] shadow-md">
          <div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#e0e3e8]" />
          <button type="button" aria-expanded={isSightingsExpanded} aria-controls="species-reported-hotspots" onClick={() => setIsSightingsExpanded((value) => !value)} className="flex min-h-11 w-full items-center justify-between gap-2 px-4 text-left">
            <span><span className="block text-[17px] min-[360px]:text-[18px] font-medium text-[#181c20]">Sightings &amp; Field Map</span><span className="text-[11px]">Where it was reported · past 14 days</span></span>
            <span aria-hidden="true" className={`material-symbols-outlined text-[20px] ${isSightingsExpanded ? 'rotate-180' : ''}`}>expand_more</span>
          </button>
          {isSightingsExpanded && <div id="species-reported-hotspots" className="px-4 pt-2">
            {locations && mappedHotspots.length > 0 && <HotspotMap hotspots={mappedHotspots} frameClassName="hotspot-map-compact aspect-[337/166]" label={`Reported hotspots for ${species.name}`} onOpen={onSelectHotspotById} />}
            {locations && locations.locations.length > 0 && <p className="mt-2 text-[12px]">Tap a place for its map, weather and directions.{mappedHotspots.length < locations.locations.length ? ` ${mappedHotspots.length} of ${locations.locations.length} places are shown on the map.` : ''}</p>}
            {!locations && !locationsError && <p role="status" className="mt-2">Loading locations for {species.name}...</p>}
            {locationsError && <div role="alert" className="mt-2"><p>{locationsError}</p><button type="button" onClick={onRetryLocations} className="mt-2 font-semibold text-[#154212] underline">Try again</button></div>}
            {locations?.locations.length === 0 && <p className="mt-2">No recent reports at hotspots{region ? ` in ${region}` : ''} in the past 14 days.</p>}
            {locations?.locations.map((location) => (
              <button type="button" key={location.hotspotId} aria-label={`Open hotspot ${location.name}`} onClick={() => onSelectHotspotById?.(location.hotspotId)} className="mt-2 w-full rounded-xl bg-[#f1f4f9] p-3 text-left hover:bg-[#ebeef3]">
                <span className="block font-semibold text-[#181c20]">{location.name}</span>
                <span className="block text-[12px]">{fieldTime(location.observedAt)}{location.count === null ? '' : ` · ${location.count} ${location.count === 1 ? 'bird' : 'birds'}`}</span>
              </button>
            ))}
            <a href={species.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block font-semibold text-[#154212] underline">View species on eBird</a>
            <button type="button" onClick={() => onQuickLog(species)} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#2d5a27] text-[13px] font-semibold text-white"><span aria-hidden="true" className="material-symbols-outlined text-[18px]">edit_location</span>LOG YOUR SIGHTING</button>
          </div>}
        </section>

    </div>
  );
};
