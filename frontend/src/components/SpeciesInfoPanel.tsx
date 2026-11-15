import React, { useEffect, useRef, useState } from 'react';
import { loadSpeciesInformation, type SpeciesInformation } from '../lib/discovery';
import { SessionExpiredError } from '../lib/auth';

export const SpeciesInformationContent: React.FC<{ data?: SpeciesInformation; error?: string; onRetry?: () => void }> = ({ data, error, onRetry }) => {
  if (error) return <div role="alert"><p>{error}</p><button type="button" onClick={onRetry} className="mt-2 font-semibold text-[#154212] underline">Retry species information</button></div>;
  if (!data) return <p role="status">Loading species information…</p>;
  const profile = data.profile;
  if (!profile) return <p>No Wikipedia article is available for this bird yet.</p>;
  return <div className="space-y-3 break-words">
    {profile.summary && <p>{profile.summary}</p>}
    {([
      ['Identification', profile.identification], ['Habitat and range', profile.habitat],
      ['Behaviour', profile.behaviour], ['Seasonal movement', profile.seasonality],
    ] as const).map(([label, section]) => <section key={label}><h4 className="font-semibold text-[#181c20]">{label}</h4>{section ? <p>{section.text}</p> : <p>Not covered in the article.</p>}</section>)}
    <p className="text-[11px] break-words">Shortened from <a href={profile.revisionUrl} target="_blank" rel="noreferrer" className="underline">{profile.title}</a> by <a href={profile.historyUrl} target="_blank" rel="noreferrer" className="underline">Wikipedia contributors</a>, <a href={profile.licenseUrl} target="_blank" rel="noreferrer" className="underline">{profile.license}</a>.</p>
    <a href={profile.sourceUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#154212] underline">Read the full article</a>
  </div>;
};

export const SpeciesInfoPanel: React.FC<{ speciesId: string; onSessionExpired?: () => void }> = ({ speciesId, onSessionExpired }) => {
  const [requested, setRequested] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<SpeciesInformation>();
  const [error, setError] = useState('');
  const expired = useRef(onSessionExpired);
  expired.current = onSessionExpired;
  useEffect(() => {
    if (!requested) return;
    const controller = new AbortController();
    setData(undefined); setError('');
    loadSpeciesInformation(speciesId, controller.signal).then((result) => {
      if (!controller.signal.aborted) setData(result);
    }).catch((error) => {
      if (!controller.signal.aborted) {
        if (error instanceof SessionExpiredError) expired.current?.();
        else setError(error.message || 'Species information unavailable.');
      }
    });
    return () => controller.abort();
  }, [speciesId, requested, attempt]);
  return <details id="species-information" tabIndex={-1} onToggle={(event) => { if (event.currentTarget.open) setRequested(true); }} className="mb-4 scroll-mt-20 rounded-xl bg-[#f1f4f9] p-3 text-[13px] leading-relaxed text-[#42493e]">
    <summary className="cursor-pointer font-semibold text-[#181c20]">Identification, Habitat &amp; Behaviour</summary>
    <div className="mt-3"><SpeciesInformationContent data={data?.speciesId === speciesId ? data : undefined} error={error} onRetry={() => setAttempt((prev) => prev + 1)} /></div>
  </details>;
};
