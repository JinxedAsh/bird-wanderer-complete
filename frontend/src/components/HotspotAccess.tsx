import React from 'react';
import type { AccessInformation } from '../types';

export function HotspotAccess({ access }: { access?: AccessInformation | null }) {
  if (!access) return <p className="text-[12px] text-[#42493e]">We have no visitor information for this hotspot yet. Check opening hours, fees and camera rules with the site before you travel.</p>;
  return <div className="space-y-3 text-[12px] text-[#42493e]">
    <p>From official sources, last reviewed {access.checkedAt}. Check for changes and closures before you travel. {access.reviewOverdue && <strong>Review overdue: older details are hidden until they are rechecked.</strong>}</p>
    {([['Gates Opening Hours', access.openingHours], ['Entry Fee', access.entryFee], ['Still Camera Pass / Rules', access.cameraPass], ['Approach / Entry Gates', access.approach], ['Seasonal notes', access.seasonalActivity]] as const).map(([label, fact]) => (
      <div key={label} className="space-y-1 break-words"><h4 className="font-bold text-[#181c20]">{label}</h4>
        <p>{access.reviewOverdue ? 'Hidden until rechecked.' : fact?.text || 'Not confirmed yet. Check with the site.'}</p>
        {fact?.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="mr-3 inline-block underline text-[#154212]">{source.label}</a>)}
      </div>
    ))}
    <p>Directions lead to the hotspot marker, not a verified entrance. Commercial shoots, tripods and drones may need separate permission.</p>
  </div>;
}
