import React from 'react';

// eBird's terms ask for visible attribution wherever its data is shown.
// One short, linked line is enough; details live on eBird itself.
export function DataSource({ className = '' }: { className?: string }) {
  return (
    <p className={`text-center text-[11px] text-[#72796e] ${className}`}>
      Data:{' '}
      <a href="https://ebird.org" target="_blank" rel="noreferrer" className="underline">
        eBird
      </a>
    </p>
  );
}
