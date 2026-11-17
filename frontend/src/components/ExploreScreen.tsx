import React from 'react';
import { BirdSpecies, ScreenType } from '../types';
import { SpeciesPhoto } from './SpeciesPhoto';
import type { LocationPoint } from '../lib/location';
import { fieldTime, type HotspotWeather } from '../lib/discovery';
import { InformationDisclosure } from './InformationDisclosure';
import { DataSource } from './DataSource';

interface ExploreScreenProps {
  location?: LocationPoint | null;
  onChooseLocation?: () => void;
  weather?: Omit<HotspotWeather, 'hotspotId'>;
  weatherError?: string;
  onRetryWeather?: () => void;
  onSessionExpired?: () => void;
  discoveryRegion?: string;
  hotspotCount?: number;
  observerName: string;
  speciesList: BirdSpecies[];
  onSelectSpecies: (species: BirdSpecies) => void;
  onNavigate: (screen: ScreenType) => void;
  onQuickLog: (species: BirdSpecies) => void;
}

export const ExploreScreen: React.FC<ExploreScreenProps> = ({
  location,
  onChooseLocation,
  weather,
  weatherError,
  onRetryWeather,
  onSessionExpired,
  discoveryRegion,
  hotspotCount,
  observerName,
  speciesList,
  onSelectSpecies,
  onNavigate,
  onQuickLog,
}) => {
  const nearbyBirds = speciesList.slice(0, 4);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const notableBird = speciesList.find(bird => bird.recentObservations?.length);

  return (
    <div className="flex flex-col w-full px-4 pb-28 space-y-6">
      {/* Greeting & Environmental Observation Module */}
      <section className="flex flex-col space-y-2 pt-1">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <button type="button" onClick={onChooseLocation} className="text-[12px] font-medium text-[#42493e] flex items-center gap-1.5 text-left">
              <span
                className="material-symbols-outlined text-[15px] text-[#154212]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                near_me
              </span>
              {location ? `${location.source === 'GPS' ? 'Your location' : 'Chosen location'}${discoveryRegion ? ` · ${discoveryRegion}` : ''}` : discoveryRegion || 'Choose location'}
            </button>
            <h2 className="text-[22px] min-[360px]:text-[26px] leading-tight font-bold text-[#181c20] tracking-tight">
              {greeting}, {observerName.trim().split(/\s+/)[0]}
            </h2>
          </div>
          <button
            onClick={() => onNavigate('search')}
            aria-label="Open search"
            className="w-11 h-11 rounded-full bg-[#ebeef3] flex items-center justify-center text-[#154212] hover:bg-[#e0e3e8] active:scale-95 transition-all shadow-sm flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[22px]">search</span>
          </button>
        </div>

        {/* Weather & Field Conditions Pill */}
        <div className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl bg-[#f1f4f9] shadow-sm">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="material-symbols-outlined text-[18px] text-[#fe932c]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              wb_sunny
            </span>
            {!location ? <button type="button" onClick={onChooseLocation} className="text-[14px] font-semibold text-[#181c20] truncate text-left">Set location for weather</button> : <span className="text-[14px] font-semibold text-[#181c20] truncate">{weatherError ? 'Weather unavailable' : !weather ? 'Loading weather…' : weather.current.temperatureC == null ? '—' : `${weather.current.temperatureC}°C`}</span>}
            {weather?.current.condition && <><span className="text-[#c2c9bb] text-[12px]">•</span><span className="text-[14px] text-[#42493e] truncate">{weather.current.condition}</span></>}
          </div>
          {weather && <div className="flex shrink-0 items-center gap-1.5 text-[#42493e]">
            <span className="material-symbols-outlined text-[16px]">air</span>
            <span className="text-[12px] font-semibold">{weather.current.windKmh == null ? '—' : `${weather.current.windKmh} km/h`}</span>
            <InformationDisclosure className="reference-info-inline" label="Weather source">
              <p>Forecast for the area around your location. Weather data: <a href={weather.sourceUrl} target="_blank" rel="noreferrer" className="underline">Open-Meteo</a> (<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer" className="underline">CC BY 4.0</a>).</p>
              {location?.accuracyM !== undefined && <p>Your location is accurate to about {Math.round(location.accuracyM)} m, so distances are approximate.</p>}
            </InformationDisclosure>
          </div>}
        </div>
        {weatherError && <p role="status" className="text-[12px] text-[#904d00]">{weatherError} <button type="button" onClick={onRetryWeather} className="underline">Retry Explore weather</button></p>}
      </section>

      {/* Main Section: What's out there? */}
      <section className="flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 className="text-[20px] font-medium text-[#181c20]">What’s out there?</h3>
            <span aria-label={location ? 'Reports within 50 km' : 'Recent reports'} className="sr-only min-[360px]:not-sr-only text-[10px] font-bold uppercase tracking-wider text-[#154212]">
              {location ? 'Within 50 km' : 'Seen recently'}
            </span>
          </div>
          <button
            onClick={() => onNavigate('search')}
            className="reference-filter h-7 shrink-0 whitespace-nowrap text-[12px] font-semibold text-[#154212] hover:text-[#2d5a27] transition-colors flex items-center gap-0.5"
          >
            All sights
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>

        <div className="flex flex-col space-y-2">
          {nearbyBirds.length === 0 && <p className="text-[13px] text-[#42493e]">{location ? 'No recent reports within 50 km. Try another location or search all birds.' : 'No recent reports yet. Use search to browse all birds.'}</p>}
          {nearbyBirds.map((bird) => (
            <article
              key={bird.id}
              className="grid grid-cols-[64px_1fr_auto] items-center p-2 rounded-xl bg-white shadow-sm hover:shadow-md transition-all group cursor-pointer"
              onClick={() => onSelectSpecies(bird)}
            >
              <SpeciesPhoto key={bird.id} species={bird} onSessionExpired={onSessionExpired} frameClassName="w-16 h-16 rounded-lg overflow-hidden bg-[#ebeef3]" />

              <div className="flex-1 min-w-0 ml-3.5 flex flex-col">
                <h4 className="text-[18px] font-semibold text-[#181c20] truncate group-hover:text-[#154212] transition-colors">
                  <button type="button" onClick={(e) => { e.stopPropagation(); onSelectSpecies(bird); }} className="text-left">
                    {bird.name}
                  </button>
                </h4>
                <span className="text-[13px] italic text-[#42493e] truncate">
                  {bird.scientificName}
                </span>
              </div>

              <button
                type="button"
                aria-label={`Log sighting of ${bird.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickLog(bird);
                }}
                className="w-11 h-11 rounded-lg bg-[#f1f4f9] flex items-center justify-center text-[#42493e] hover:text-[#154212] hover:bg-[#ebeef3] active:scale-95 transition-all flex-shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* Quick Actions Section */}
      <section className="flex flex-col space-y-2">
        <h3 className="text-[18px] font-medium text-[#181c20]">Quick actions</h3>
        <div className="grid grid-cols-3 gap-2.5">
          {/* 1. Community */}
          <button
            onClick={() => onNavigate('community')}
            className="flex flex-col items-center text-center p-2 rounded-lg bg-white shadow-sm hover:bg-[#f1f4f9] active:scale-[0.98] transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#ebeef3] flex items-center justify-center text-[#154212] group-hover:bg-[#154212] group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">groups</span>
            </div>
            <span className="text-[12px] font-semibold text-[#181c20] mt-1 truncate w-full">
              Community
            </span>
            <span className="text-[10px] text-[#42493e] mt-0.5">Share logs</span>
          </button>

          {/* 2. Nearby Hotspots */}
          <button
            onClick={() => onNavigate('hotspots')}
            className="flex flex-col items-center text-center p-2 rounded-lg bg-white shadow-sm hover:bg-[#f1f4f9] active:scale-[0.98] transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#ebeef3] flex items-center justify-center text-[#154212] group-hover:bg-[#154212] group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">explore_nearby</span>
            </div>
            <span className="text-[12px] font-semibold text-[#181c20] mt-1 truncate w-full">
              Hotspots
            </span>
            <span className="text-[10px] text-[#42493e] mt-0.5">{hotspotCount ? `${hotspotCount} ${location ? 'nearby' : 'places'}` : 'Find places'}</span>
          </button>

          {/* 3. Bird Quiz */}
          <button
            onClick={() => onNavigate('quiz')}
            className="flex flex-col items-center text-center p-2 rounded-lg bg-white shadow-sm hover:bg-[#f1f4f9] active:scale-[0.98] transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#ebeef3] flex items-center justify-center text-[#904d00] group-hover:bg-[#fe932c] group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">quiz</span>
            </div>
            <span className="text-[12px] font-semibold text-[#181c20] mt-1 truncate w-full">
              Bird quiz
            </span>
            <span className="text-[10px] text-[#42493e] mt-0.5">Test ear</span>
          </button>
        </div>
      </section>

      {/* Best Birds Today Section */}
      {notableBird && (
        <section className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[18px] font-medium text-[#181c20]">Latest report</h3>
            <span className="px-2 py-0.5 rounded-full bg-[#ffdcc3] text-[#6e3900] text-[10px] flex items-center gap-1 font-bold">
              <span
                className="material-symbols-outlined text-[13px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                star
              </span>
              Recent
            </span>
          </div>

          <div
            onClick={() => onSelectSpecies(notableBird)}
            className="p-3.5 rounded-xl bg-white shadow-sm flex items-center justify-between relative overflow-hidden cursor-pointer hover:shadow-md transition-all group"
          >
            <div className="absolute -right-8 -top-8 w-28 h-28 bg-[#154212]/5 rounded-full blur-xl pointer-events-none"></div>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-[#c7ecce] flex items-center justify-center text-[#20402b] flex-shrink-0 shadow-sm">
                <span className="material-symbols-outlined text-[24px]">clock_loader_40</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[16px] font-bold text-[#181c20] truncate group-hover:text-[#154212] transition-colors">
                  {notableBird.name}
                </span>
                <div className="flex items-center gap-1 mt-0.5 text-[#42493e] min-w-0">
                  <span
                    className="material-symbols-outlined text-[14px] text-[#904d00] flex-shrink-0"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    schedule
                  </span>
                  <span className="text-[12px] truncate">{`Seen ${fieldTime(notableBird.recentObservations![0].observedAt)} at ${notableBird.recentObservations![0].location}`}</span>
                </div>
              </div>
            </div>

            <button
              aria-label={`View ${notableBird.name} report details`}
              onClick={(e) => { e.stopPropagation(); onSelectSpecies(notableBird); }}
              className="w-8 h-8 rounded-full bg-[#ebeef3] flex items-center justify-center text-[#181c20] group-hover:bg-[#2d5a27] group-hover:text-white transition-colors flex-shrink-0 ml-2"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        </section>
      )}
      {speciesList.length > 0 && <DataSource />}
    </div>
  );
};
