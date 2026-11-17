import React from 'react';
import type { PhotoExif } from '../lib/discovery';

export const formatExifNumber = (value: number) => Number(value.toPrecision(6)).toString();
export const formatShutter = (seconds: number | null) => {
  if (seconds === null) return '—';
  const denominator = 1 / seconds;
  // Use a reciprocal only when it faithfully represents the recorded value.
  return seconds < 1 && Math.abs(denominator - Math.round(denominator)) < 0.000001
    ? `1/${Math.round(denominator)} s` : `${formatExifNumber(seconds)} s`;
};

export const PhotoMetadata: React.FC<{ exif: PhotoExif; source?: 'upload' | 'commons' }> = ({ exif, source = 'commons' }) => {
  const rows = [
    ['Camera make', exif.cameraMake || '—'],
    ['Camera model', exif.cameraModel || '—'],
    ['Lens', exif.lens || '—'],
    ['Shutter speed', formatShutter(exif.exposureSeconds)],
    ['Aperture', exif.aperture === null ? '—' : `f/${formatExifNumber(exif.aperture)}`],
    ['ISO', exif.iso === null ? '—' : formatExifNumber(exif.iso)],
    ['Focal length', exif.focalLengthMm === null ? '—' : `${formatExifNumber(exif.focalLengthMm)} mm`],
    ['Taken', exif.capturedAt ? `${exif.capturedAt}${exif.utcOffset ? ` (UTC${exif.utcOffset})` : ''}` : '—'],
  ];
  return (
    <section aria-label={source === 'upload' ? 'Uploaded photo camera metadata' : 'Reference photo camera metadata'} className="mt-3 rounded-xl bg-[#f1f4f9] p-3 text-[12px] text-[#42493e]">
      <h3 className="text-[14px] font-bold text-[#181c20]">{source === 'upload' ? 'Your camera settings' : 'Camera settings for this photo'}</h3>
      {exif.status === 'available' ? <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">{rows.map(([label, value]) => <React.Fragment key={label}><dt className="font-semibold">{label}</dt><dd className="break-words">{value}</dd></React.Fragment>)}</dl> : <p className="mt-1">This photo has no camera settings saved with it.</p>}
      {exif.status === 'available' && <p className="mt-2">{source === 'upload' ? 'Read from your photo file.' : 'Read from the photo file. Use these as an example, not a recommendation.'}</p>}
    </section>
  );
};
