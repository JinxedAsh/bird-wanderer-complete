import { InformationDisclosure } from './InformationDisclosure';
import React, { useEffect, useRef, useState } from 'react';
import { observations, type ObservationConditions } from '../lib/observations';
import { SessionExpiredError } from '../lib/auth';

export interface ConditionsSelection { key: string; conditionsId: string; conditions: ObservationConditions }
export const conditionsKey = (point: { latitude: number; longitude: number } | null, observedAt: string, utcOffset: string) => point && observedAt ? JSON.stringify([Math.round(point.latitude * 10) / 10, Math.round(point.longitude * 10) / 10, observedAt, utcOffset]) : '';
export function ObservationConditionsPanel({ point, observedAt, utcOffset, disabled, onChange, onSessionExpired }: {
  point: { latitude: number; longitude: number } | null; observedAt: string; utcOffset: string; disabled?: boolean;
  onChange: (value: ConditionsSelection | null) => void; onSessionExpired?: () => void;
}) {
  const key = conditionsKey(point, observedAt, utcOffset);
  const [result, setResult] = useState<ConditionsSelection | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(false), [attempt, setAttempt] = useState(0), [skipped, setSkipped] = useState(false);
  const callbacks = useRef({ onChange, onSessionExpired }); callbacks.current = { onChange, onSessionExpired };
  useEffect(() => {
    const controller = new AbortController();
    if (disabled) return () => controller.abort();
    setResult(null); setError(''); setLoading(false); callbacks.current.onChange(null);
    if (!key || !point || skipped) return () => controller.abort();
    setLoading(true);
    const timer = setTimeout(() => {
      void observations.conditions(point, observedAt, utcOffset, controller.signal).then(data => {
        if (!controller.signal.aborted) { const value = { ...data, key }; setResult(value); callbacks.current.onChange(value); }
      }).catch(failure => { if (!controller.signal.aborted) { if (failure instanceof SessionExpiredError) callbacks.current.onSessionExpired?.(); setError(failure instanceof Error ? failure.message : 'Conditions unavailable.'); } })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 650);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [key, attempt, skipped, disabled]);
  const data = result?.key === key ? result.conditions : null;
  return <section className="bg-[#f1f4f9] p-3.5 rounded-xl mb-4 space-y-2 text-[12px]">
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-[18px] font-medium">Conditions</h3>
      <span className="text-[10px] text-[#42493e]">Estimated</span>
      <InformationDisclosure label="Weather source and options">
        <p>Weather for the hour and area of your sighting, estimated by <a href={data?.sourceUrl || 'https://open-meteo.com/'} target="_blank" rel="noreferrer" className="underline">Open-Meteo</a> (CC BY 4.0). Only a rounded position (about 11 km), the date and the time are sent. Your photo and account are never sent.</p>
        {data && data.precipitationMm != null && <p>Rain: {data.precipitationMm} mm.</p>}
        {key && !disabled && <div className="flex flex-wrap gap-x-4"><button type="button" className="min-h-11 underline" onClick={() => { setSkipped(false); setAttempt(value => value + 1); }}>Retry conditions</button><button type="button" className="min-h-11 underline" onClick={() => { setSkipped(true); callbacks.current.onChange(null); }}>Save without conditions</button></div>}
      </InformationDisclosure>
    </div>
    {!key && <p>Choose a location, date and time to add the weather.</p>}
    {key && loading && <p role="status">Loading the weather for that place and time… You can save without it.</p>}
    {error && <div role="alert"><p>{error}</p>{!disabled && <button type="button" className="min-h-11 underline" onClick={() => { setSkipped(false); setAttempt(value => value + 1); }}>Retry conditions</button>}</div>}
    {data && <div role="status" className="grid grid-cols-4 gap-2 text-center">
      {[
        ['Temperature', data.temperatureC, '°C'], ['Cloud', data.cloudCoverPercent, '%'],
        ['Wind', data.windKmh, ' km/h'], ['Humidity', data.humidityPercent, '%'],
      ].map(([label, value, unit]) => <div key={label} className="min-w-0 rounded-lg bg-white p-2"><div className="text-[10px] text-[#42493e]">{label}</div><div title={value == null ? 'Unavailable' : `${value}${unit}`} aria-label={`${label}: ${value == null ? 'Unavailable' : `${value}${unit}`}`} className="mt-1 font-semibold break-words">{value == null ? '—' : `${value}${unit}`}</div></div>)}
    </div>}
    {skipped && <p role="status">Weather left out. You can still save the observation.</p>}
  </section>;
}
