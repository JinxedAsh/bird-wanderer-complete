import React, { useEffect, useRef, useState } from 'react';
import type { BirdSpecies } from '../types';
import { loadSpeciesPhoto, type SpeciesPhoto as Photo } from '../lib/discovery';
import { SessionExpiredError } from '../lib/auth';
import { positionInformationPanel } from './InformationDisclosure';
import { PhotoMetadata } from './PhotoMetadata';

interface SpeciesPhotoProps {
  species: BirdSpecies;
  frameClassName: string;
  hero?: boolean;
  onSessionExpired?: () => void;
  children?: React.ReactNode;
  onPhotoStateChange?: (state: PhotoLoadState) => void;
}

export interface PhotoLoadState {
  speciesId: string;
  photo: Photo | null;
  loading: boolean;
  error: string;
}

export type PhotoAttribution = Pick<Photo,'author'|'license'|'licenseUrl'|'sourceUrl'|'title'|'credit'|'attribution'|'usageTerms'|'restrictions'|'matchUrl'>;
export const PhotoCredit: React.FC<{ photo: PhotoAttribution; full?: boolean; overlay?: boolean; children?: React.ReactNode }> = ({ photo, full = false, overlay = false, children }) => (
  <figcaption onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} className={`${overlay ? 'photo-credit' : ''} ${full ? 'photo-credit-hero' : ''}`} title={`Photo: ${photo.author} · ${photo.license}`}>
    <details onToggle={positionInformationPanel} onKeyDown={event => { if (event.key === 'Escape') event.currentTarget.open = false; }} className="reference-info"><summary aria-label="Full photo credit and rights" title="Photo credit"><span aria-hidden="true" className="material-symbols-outlined text-[16px]">info</span><span className="sr-only">Photo credit</span></summary>
      <div className="reference-info-panel">
        <p>Photo: {photo.author} • <a href={photo.licenseUrl} target="_blank" rel="noreferrer" className="underline">{photo.license}</a></p>
        <p>{photo.title ? `${photo.title.replace(/^File:/, '')} · ` : ''}<a href={photo.sourceUrl} target="_blank" rel="noreferrer" className="underline">Wikimedia Commons</a> · cropped to fit</p>
        {photo.credit && <p>Credit: {photo.credit}</p>}{photo.attribution && <p>Attribution: {photo.attribution}</p>}{photo.usageTerms && <p>Usage terms: {photo.usageTerms}</p>}{photo.restrictions && <p>Restrictions: {photo.restrictions}</p>}
        {children}
      </div>
    </details>
  </figcaption>
);

export const SpeciesPhoto: React.FC<SpeciesPhotoProps> = ({ species, frameClassName, hero = false, onSessionExpired, onPhotoStateChange, children }) => {
  const frame = useRef<HTMLDivElement>(null);
  const expired = useRef(onSessionExpired);
  expired.current = onSessionExpired;
  const photoStateChanged = useRef(onPhotoStateChange);
  photoStateChanged.current = onPhotoStateChange;
  const [visible, setVisible] = useState(hero);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [broken, setBroken] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (visible || !species.source || !frame.current) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '100px' });
    observer.observe(frame.current);
    return () => observer.disconnect();
  }, [visible, species.source]);
  useEffect(() => {
    if (!species.source || !visible) return;
    const controller = new AbortController();
    setPhoto(null); setLoaded(false); setError(''); setBroken(false);
    photoStateChanged.current?.({ speciesId: species.id, photo: null, loading: true, error: '' });
    loadSpeciesPhoto(species.id, controller.signal).then((result) => {
      if (!controller.signal.aborted) {
        setPhoto(result.photo); setLoaded(true);
        photoStateChanged.current?.({ speciesId: species.id, photo: result.photo, loading: false, error: '' });
      }
    }).catch((error) => {
      if (!controller.signal.aborted) {
        if (error instanceof SessionExpiredError) expired.current?.();
        else {
          const message = error.message || 'Photo unavailable.';
          setError(message); setLoaded(true);
          photoStateChanged.current?.({ speciesId: species.id, photo: null, loading: false, error: message });
        }
      }
    });
    return () => controller.abort();
  }, [species.id, species.source, visible, attempt]);
  const src = broken ? '/discovery-placeholder.svg' : photo?.thumbnailUrl || species.image;
  return (
    <figure className={hero ? 'relative' : 'contents'}>
      <div ref={frame} className={frameClassName}>
        <img src={src} alt={species.source && (!photo || broken) ? `${!loaded && !broken ? 'Loading photo' : 'Photo unavailable'}: ${species.name}` : species.name} loading={hero ? 'eager' : 'lazy'} decoding="async" onError={() => setBroken(true)} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
        {children}
        {hero && species.source && <div className="absolute bottom-3 left-3 right-3 w-fit max-w-[calc(100%-1.5rem)] flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md text-white text-[11px] font-medium shadow-sm"><span className="w-2 h-2 shrink-0 rounded-full bg-[#fe932c]"></span><span>{photo?.exif?.status === 'available' ? 'Camera settings available' : photo ? 'No camera settings' : loaded ? 'No photo yet' : 'Loading photo…'}</span></div>}
      </div>
      {photo && <PhotoCredit photo={photo} full={hero} overlay>{hero && photo.exif && <PhotoMetadata exif={photo.exif} />}</PhotoCredit>}
      {hero && species.source && !photo && <p role={error ? 'alert' : 'status'} className="mt-1 text-[12px] text-[#42493e]">{error || (loaded ? 'No freely licensed photo is available for this bird yet.' : 'Loading species photograph...')}</p>}
      {broken && species.source && <p role="status" className="col-span-3 row-start-3 text-[11px] text-[#42493e]">This photo could not load.</p>}
      {hero && (error || broken) && <button type="button" onClick={() => { setBroken(false); setAttempt((prev) => prev + 1); }} className="mt-1 text-[12px] font-semibold text-[#154212] underline">Retry photo</button>}
    </figure>
  );
};
