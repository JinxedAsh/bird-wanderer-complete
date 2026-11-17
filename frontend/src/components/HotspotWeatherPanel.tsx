import React from 'react';
import { fieldTime, type HotspotWeather } from '../lib/discovery';

interface HotspotWeatherPanelProps {
  weather?: HotspotWeather;
  error?: string;
  onRetry?: () => void;
}

const measurement = (value: number | null, unit: string) => value === null ? 'Unavailable' : `${value}${unit}`;
const clock = (time: string | null) => time ? time.slice(11, 16) : 'Unavailable';

export function lightWindows(day: HotspotWeather['days'][number]) {
  const minutes = (time: string | null) => {
    if (!time || !time.startsWith(`${day.date}T`) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(time)) return null;
    const hour = Number(time.slice(11, 13)), minute = Number(time.slice(14, 16));
    return hour < 24 && minute < 60 ? hour * 60 + minute : null;
  };
  const rise = minutes(day.sunrise), set = minutes(day.sunset);
  if (rise === null || set === null || set <= rise) return null;
  const format = (value: number) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
  return { morning: `${format(rise)}–${format(Math.min(rise + 60, set))}`, evening: `${format(Math.max(set - 60, rise))}–${format(set)}` };
}

export const HotspotWeatherPanel: React.FC<HotspotWeatherPanelProps> = ({ weather, error, onRetry }) => {
  if (error) return <div role="alert" className="text-[12px] text-[#42493e]"><p>{error}</p><button type="button" onClick={onRetry} className="mt-2 font-semibold text-[#154212] underline">Retry weather</button></div>;
  if (!weather) return <p role="status" className="text-[12px] text-[#42493e]">Loading hotspot weather…</p>;
  const { current } = weather;
  return (
    <div className="space-y-3 text-[12px] text-[#42493e]">
      <p>Forecast for this hotspot, updated {fieldTime(current.time)}.</p>
      <div className="grid grid-cols-2 gap-2">
        {[
          ['Temperature', measurement(current.temperatureC, '°C')], ['Wind speed', measurement(current.windKmh, ' km/h')],
          ['Humidity', measurement(current.humidityPercent, '%')], ['Precipitation', measurement(current.precipitationMm, ' mm')],
          ['Cloud cover', measurement(current.cloudCoverPercent, '%')], ['Conditions', current.condition],
        ].map(([label, value]) => <div key={label} className="rounded-xl bg-[#f1f4f9] p-2.5"><p className="text-[10px] font-semibold">{label}</p><p className="text-[14px] font-bold text-[#181c20]">{value}</p></div>)}
      </div>
      {weather.days.map((day) => {
        const windows = lightWindows(day);
        return <div key={day.date} className="rounded-xl bg-[#f1f4f9] p-2.5"><p className="font-semibold text-[#181c20]">{fieldTime(day.date)}</p><p>Sunrise: {clock(day.sunrise)} • Sunset: {clock(day.sunset)}</p>
          {windows && <p>Best light: about {windows.morning} and {windows.evening}.</p>}
        </div>;
      })}
      <div className="overflow-x-auto">
        <p className="mb-1 font-semibold text-[#181c20]">Next few hours</p>
        {weather.hourly.length ? <table className="w-full text-left text-[11px]"><thead><tr><th className="py-1">Time</th><th>Temp</th><th>Rain chance</th><th>Wind</th></tr></thead><tbody>{weather.hourly.slice(0, 6).map((row) => <tr key={row.time} className="border-t border-[#e0e3e8]"><td className="py-1.5">{row.time.slice(11)}</td><td>{measurement(row.temperatureC, '°C')}</td><td>{measurement(row.rainProbability, '%')}</td><td>{measurement(row.windKmh, ' km/h')}</td></tr>)}</tbody></table> : <p>No hourly forecast available right now.</p>}
      </div>
      <div className="rounded-xl bg-[#f1f4f9] p-2.5 space-y-1">
        <p className="font-semibold text-[#181c20]">Photography planning tips</p>
        <p>The first hour after sunrise and the last hour before sunset usually give the softest light.</p>
        {(current.windKmh !== null && current.windKmh >= 20) && <p>It is windy: steady long lenses and expect moving branches.</p>}
        {(current.precipitationMm !== null && current.precipitationMm > 0) && <p>Rain is forecast: pack a rain cover and check the rain chance below.</p>}
        {(current.cloudCoverPercent !== null && current.cloudCoverPercent >= 80) && <p>Heavy cloud may soften light; be ready to raise ISO if shutter speed drops.</p>}
        {weather.hourly.filter((row) => row.rainProbability !== null && row.windKmh !== null && row.rainProbability <= 20 && row.windKmh <= 15
          && weather.days.some((day) => day.sunrise && day.sunset && row.time >= day.sunrise && row.time <= day.sunset)).slice(0, 6).map((row, index) => <p key={row.time}>{index === 0 ? 'Calm, dry daylight hours: ' : ''}{fieldTime(row.time)} · rain {row.rainProbability}% · wind {row.windKmh} km/h</p>)}
      </div>
      <p className="text-[11px]"><a className="underline" href="https://open-meteo.com/" target="_blank" rel="noreferrer">Weather data by Open-Meteo</a> • <a className="underline" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a></p>
    </div>
  );
};
