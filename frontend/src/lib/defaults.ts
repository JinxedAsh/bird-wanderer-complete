import type { BirdSpecies, Hotspot, UserProfile } from '../types';

// Neutral starting values used until the signed-in account and the bird list
// have loaded. They hold no sample content, so nothing invented can be shown.
export const EMPTY_PROFILE: UserProfile = {
  name: '',
  handle: '',
  title: 'Birder',
  location: '',
  bio: '',
  avatarUrl: '/bird-wanderer-logo.svg',
  primaryRig: '',
  birdsCount: 0,
  photosCount: 0,
  tripsCount: 0,
  locationPrivacy: 'approximate',
  profileVisibility: 'public',
  sensitiveSpeciesProtection: true,
  pushAlertsEnabled: true,
};

export const EMPTY_SPECIES: BirdSpecies = {
  id: '',
  name: '',
  scientificName: '',
  image: '/discovery-placeholder.svg',
};

export const EMPTY_HOTSPOT: Hotspot = {
  id: '',
  name: '',
  speciesCount: null,
  distanceKm: null,
  bestTime: '',
  imageUrl: '/discovery-placeholder.svg',
  region: '',
  coordinates: '',
  activeTodayCount: null,
  temp: '',
  weatherCondition: '',
  wind: '',
  trailDifficulty: '',
  recommendedGear: '',
  openingHours: '',
  entryFee: '',
  cameraPass: '',
  transitTip: '',
  recentSightings: [],
  photos: [],
  speciesList: [],
};
