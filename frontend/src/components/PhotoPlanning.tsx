import React, { useState } from 'react';
import type { PhotoLoadState } from './SpeciesPhoto';
import { formatExifNumber, formatShutter } from './PhotoMetadata';
import { ReferenceComparisons } from './ReferenceComparisons';
import type { BirdSpecies } from '../types';
import { regionName } from '../lib/discovery';

interface PhotoPlanningProps {
  speciesId: string;
  region?: string;
  speciesName?: string;
  state: PhotoLoadState;
  onChooseHotspot: () => void;
  onSessionExpired?: () => void;
  seasonalContext?: BirdSpecies['seasonalContext'];
}

export function seasonalChartUrl(region?: string) {
  return region && /^[A-Z]{2}(?:-[A-Z0-9]{1,8}){0,2}$/.test(region) ? `https://ebird.org/barchart?r=${encodeURIComponent(region)}` : null;
}

// Exposure comparison only: same scene light and aperture, no field prediction.
export function equivalentIso(iso: number | null, referenceSeconds: number | null, targetSeconds: number) {
  if (iso === null || referenceSeconds === null || !Number.isFinite(iso) || !Number.isFinite(referenceSeconds) || !Number.isFinite(targetSeconds) || iso <= 0 || referenceSeconds <= 0 || targetSeconds <= 0) return null;
  const value = iso * referenceSeconds / targetSeconds;
  return Number.isFinite(value) && value >= 1 && value <= 1000000 ? Math.round(value) : null;
}

export const PhotoPlanning: React.FC<PhotoPlanningProps> = ({ speciesId, region, speciesName, state, onChooseHotspot, onSessionExpired, seasonalContext }) => {
  const [motion, setMotion] = useState<'perched' | 'flight'>('perched');
  const [target, setTarget] = useState('');
  const chartUrl = seasonalChartUrl(region);
  // Never use a previous species' reference while the current photo is loading.
  const current = state.speciesId === speciesId ? state : null;
  const photo = current && !current.loading && !current.error ? current.photo : null;
  const exif = photo?.exif;
  const settings = exif ? [
    exif.exposureSeconds === null ? null : formatShutter(exif.exposureSeconds),
    exif.aperture === null ? null : `f/${formatExifNumber(exif.aperture)}`,
    exif.iso === null ? null : `ISO ${formatExifNumber(exif.iso)}`,
    exif.focalLengthMm === null ? null : `${formatExifNumber(exif.focalLengthMm)} mm`,
  ].filter(Boolean) : [];
  const comparison = exif && target ? equivalentIso(exif.iso, exif.exposureSeconds, 1 / Number(target)) : null;
  return (
    <div className="space-y-3 text-[13px] leading-relaxed text-[#42493e]">
      <div>
        <p className="font-semibold text-[#181c20]">Settings used for the photo above</p>
        {!current || current.loading ? <p role="status">Loading this species' photo…</p>
          : current.error ? <p>The photo could not load. Use Retry photo above.</p>
          : settings.length ? <>
            <p>{settings.join(' • ')}</p>
            <p className="text-[11px]">One photographer's settings, shown as an example. Your light and distance will differ.</p>
          </> : <p>This photo has no camera settings saved with it.</p>}
      </div>
      {settings.length > 0 && exif && <div>
        <p className="font-semibold text-[#181c20]">How to use this example</p>
        {exif.exposureSeconds !== null && <p>{exif.exposureSeconds > 0.001 ? 'This shutter speed may be too slow for fast flight. For moving birds, try a faster shutter and check for motion blur.' : 'This photo uses a short exposure, which suits moving birds. Take a test shot to check the light.'}</p>}
        {exif.focalLengthMm !== null && <p>It was taken at {formatExifNumber(exif.focalLengthMm)} mm{exif.lens ? ` with ${exif.lens}` : ''}. Compare that with the reach of your own lens.</p>}
        {exif.aperture !== null && <p>The aperture was f/{formatExifNumber(exif.aperture)}. Check focus and depth of field in your own test shots.</p>}
      </div>}
      <ReferenceComparisons speciesId={speciesId} onSessionExpired={onSessionExpired} />
      <details className="rounded-xl bg-[#f1f4f9] p-3">
        <summary className="cursor-pointer font-semibold text-[#181c20]">Perched or in flight?</summary>
        <div className="mt-2 space-y-2">
          <label className="block">Planned shot
            <select value={motion} onChange={(event) => setMotion(event.target.value as 'perched' | 'flight')} className="mt-1 block w-full rounded-lg border border-[#c1c9be] bg-white p-2 text-[#181c20]">
              <option value="perched">Perched / mostly stationary</option><option value="flight">Flight / fast movement</option>
            </select>
          </label>
          <p aria-live="polite">{motion === 'flight' ? 'Use continuous autofocus or subject tracking if your camera has it. Try a faster shutter and short bursts, then check for blur.' : 'Focus on the eye and keep the camera steady. A slower shutter works while the bird stays still; be ready to go faster if it moves.'}</p>
          <label className="block">Try a shutter-speed comparison
            <select value={target} onChange={(event) => setTarget(event.target.value)} className="mt-1 block w-full rounded-lg border border-[#c1c9be] bg-white p-2 text-[#181c20]">
              <option value="">Choose a test shutter</option>
              {[250, 500, 1000, 2000, 4000].map((denominator) => <option key={denominator} value={denominator}>1/{denominator} s</option>)}
            </select>
          </label>
          <p aria-live="polite">{!target ? 'Choose a shutter speed to see the ISO it would need.' : comparison === null ? 'This needs a photo with both shutter speed and ISO saved.' : `At 1/${target} s, equivalent ISO is approximately ${comparison} in the same light and at the same aperture.`}</p>
          <p className="text-[11px]">A rough guide. Take a test shot to check brightness and noise.</p>
        </div>
      </details>
      <details className="rounded-xl bg-[#f1f4f9] p-3">
        <summary className="cursor-pointer font-semibold text-[#181c20]">When is it seen here?</summary>
        <div className="mt-2 space-y-2">
          {chartUrl ? <p><a href={chartUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#154212] underline">Open the eBird seasonal chart{regionName(region) ? ` for ${regionName(region)}` : ''}</a> and find {speciesName || 'this species'}. Taller bars mean it is reported more often in those weeks.</p> : <p>No seasonal chart is available for this area.</p>}
          {seasonalContext && <div className="space-y-1"><p className="font-semibold">{seasonalContext.location}</p><p>{seasonalContext.text}</p><p className="text-[11px]">Source: <a href={seasonalContext.sourceUrl} target="_blank" rel="noreferrer" className="underline">{seasonalContext.sourceLabel}</a>, checked {seasonalContext.checkedAt}</p></div>}
          <a href="https://support.ebird.org/en/support/solutions/articles/48001255130-ebird-bar-charts-and-graphs" target="_blank" rel="noreferrer" className="text-[11px] underline">How eBird seasonal charts work</a>
        </div>
      </details>
      <div>
        <p className="font-semibold text-[#181c20]">General technique</p>
        <p>Match shutter speed to subject motion. If exposure becomes too dark at your chosen shutter and aperture, consider raising ISO or using Auto ISO; review exposure and noise on test shots. Use continuous autofocus for moving birds if your camera supports it.</p>
        <a href="https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/best-bird-photos-the-keys-are-patience-practice-and-a-great-camera-lens-combo" target="_blank" rel="noreferrer" className="text-[11px] underline">More tips: Nikon Learn &amp; Explore</a>
      </div>
      <div>
        <p className="font-semibold text-[#181c20]">Before travelling</p>
        <p>Pick a hotspot where this bird was reported, then check its forecast, sunrise and sunset, and directions. Confirm opening hours, fees and camera rules with the site before you go.</p>
        <button type="button" onClick={onChooseHotspot} className="mt-2 rounded-xl bg-[#ebeef3] px-3 py-2 font-semibold text-[#154212] hover:bg-[#e0e3e8]">Choose a reported hotspot</button>
      </div>
    </div>
  );
};
