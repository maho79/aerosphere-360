/**
 * poiService.ts
 * Peak Finder & Points of Interest (POI) Horizon Locator
 * Calculates visible peaks, castles, towers, and regional landmarks in 3D panoramic space.
 */

import { getDistance, getGeodesicBearing } from './geo';

export interface HorizonPOI {
  id: string;
  name: string;
  nameEn?: string;
  type: 'peak' | 'castle' | 'tower' | 'bridge' | 'nature' | 'landmark';
  elevationMeters: number;
  lat: number;
  lon: number;
  icon: string;
}

export interface PlacedHorizonPOI extends HorizonPOI {
  distanceMeters: number;
  distanceKmStr: string;
  bearingDeg: number;
  sphereLon: number; // 0-360 deg in 3D panorama spherical coordinates
  elevDeg: number;   // Visual pitch angle in degrees relative to horizon
}

// Curated landmark catalog for Western Slovakia, Small Carpathians, border region and High Tatras
export const REGIONAL_POIS: HorizonPOI[] = [
  // Malé Karpaty - Peaks & Lookouts
  { id: 'devinska_kobyla', name: 'Devínska Kobyla', nameEn: 'Devínska Kobyla Peak', type: 'peak', elevationMeters: 514, lat: 48.1872, lon: 17.0003, icon: '🏔️' },
  { id: 'kamzik', name: 'Kamzík • TV Veža', nameEn: 'Kamzík TV Tower', type: 'tower', elevationMeters: 439, lat: 48.1825, lon: 17.0950, icon: '🗼' },
  { id: 'somar', name: 'Somár (Malé Karpaty)', nameEn: 'Somár Peak', type: 'peak', elevationMeters: 650, lat: 48.3150, lon: 17.1528, icon: '🏔️' },
  { id: 'vysoka', name: 'Vysoká (Malé Karpaty)', nameEn: 'Vysoká Peak', type: 'peak', elevationMeters: 754, lat: 48.4183, lon: 17.2181, icon: '🏔️' },
  { id: 'vapenna', name: 'Vápenná • Roštún', nameEn: 'Vápenná Peak', type: 'peak', elevationMeters: 752, lat: 48.4617, lon: 17.2736, icon: '🏔️' },
  { id: 'zaruby', name: 'Záruby (Najvyšší vrch MK)', nameEn: 'Záruby Highest Peak', type: 'peak', elevationMeters: 768, lat: 48.5233, lon: 17.3944, icon: '🏔️' },

  // Castles & Historic Fortresses
  { id: 'hrad_devin', name: 'Hrad Devín', nameEn: 'Devín Castle', type: 'castle', elevationMeters: 212, lat: 48.1739, lon: 16.9783, icon: '🏰' },
  { id: 'hrad_pajstun', name: 'Hrad Pajštún', nameEn: 'Pajštún Castle Ruin', type: 'castle', elevationMeters: 486, lat: 48.2758, lon: 17.0825, icon: '🏰' },
  { id: 'hrad_biely_kamen', name: 'Biely Kameň (Svätý Jur)', nameEn: 'Biely Kameň Ruin', type: 'castle', elevationMeters: 290, lat: 48.2561, lon: 17.2028, icon: '🏰' },
  { id: 'cerveny_kamen', name: 'Hrad Červený Kameň', nameEn: 'Červený Kameň Castle', type: 'castle', elevationMeters: 335, lat: 48.3917, lon: 17.3353, icon: '🏰' },

  // Austria Border & Marchfeld Landmarks
  { id: 'braunsberg', name: 'Braunsberg (Hainburg)', nameEn: 'Braunsberg Lookout', type: 'peak', elevationMeters: 346, lat: 48.1539, lon: 16.9589, icon: '🏔️' },
  { id: 'hundsheimer_berg', name: 'Hundsheimer Berg', nameEn: 'Hundsheimer Peak (AT)', type: 'peak', elevationMeters: 480, lat: 48.1272, lon: 16.9381, icon: '🏔️' },
  { id: 'schloss_hof', name: 'Zámok Schloss Hof (AT)', nameEn: 'Schloss Hof Palace', type: 'castle', elevationMeters: 148, lat: 48.2133, lon: 16.9367, icon: '🏰' },
  { id: 'schloss_marchegg', name: 'Zámok Schloss Marchegg', nameEn: 'Marchegg Palace & Storks', type: 'castle', elevationMeters: 142, lat: 48.2789, lon: 16.9083, icon: '🏰' },
  { id: 'cyklomost_slobody', name: 'Cyklomost slobody (DNV - Schlosshof)', nameEn: 'Freedom Cycling Bridge', type: 'bridge', elevationMeters: 140, lat: 48.2114, lon: 16.9678, icon: '🌉' },
  { id: 'wind_farms_marchfeld', name: 'Veterné elektrárne (Marchfeld AT)', nameEn: 'Wind Turbines Marchfeld', type: 'landmark', elevationMeters: 230, lat: 48.3180, lon: 16.8150, icon: '💨' },

  // High Tatras (visible in Tatra region panoramas)
  { id: 'lomnicky_stit', name: 'Lomnický štít (2 634 m)', nameEn: 'Lomnický Peak', type: 'peak', elevationMeters: 2634, lat: 49.1950, lon: 20.2131, icon: '🏔️' },
  { id: 'gerlachovsky_stit', name: 'Gerlachovský štít (2 654 m)', nameEn: 'Gerlachovský Peak', type: 'peak', elevationMeters: 2654, lat: 49.1639, lon: 20.1342, icon: '🏔️' },
  { id: 'slavkovsky_stit', name: 'Slavkovský štít (2 452 m)', nameEn: 'Slavkovský Peak', type: 'peak', elevationMeters: 2452, lat: 49.1658, lon: 20.1844, icon: '🏔️' },
  { id: 'krivan', name: 'Kriváň (2 494 m)', nameEn: 'Kriváň Peak', type: 'peak', elevationMeters: 2494, lat: 49.1589, lon: 19.9989, icon: '🏔️' },
];

/**
 * Calculates visible POIs for a given panorama location and camera orientation.
 */
export function calculateVisiblePOIs(
  curLat: number | null | undefined,
  curLon: number | null | undefined,
  northOffset: number = 0,
  maxDistanceKm: number = 50
): PlacedHorizonPOI[] {
  if (curLat === null || curLat === undefined || curLon === null || curLon === undefined || (curLat === 0 && curLon === 0)) {
    return [];
  }

  const result: PlacedHorizonPOI[] = [];

  for (const poi of REGIONAL_POIS) {
    const distMeters = getDistance(curLat, curLon, poi.lat, poi.lon);
    const distKm = distMeters / 1000;

    // Filter by max distance (peaks in Tatras have special visibility range if within 60km)
    const effectiveMaxDist = poi.elevationMeters > 2000 ? 70 : maxDistanceKm;
    if (distKm > effectiveMaxDist || distKm < 0.2) continue;

    const bearing = getGeodesicBearing(curLat, curLon, poi.lat, poi.lon);
    // Align with 3D spherical longitude considering true north offset
    const sphereLon = (bearing - northOffset + 360) % 360;

    // Elevation angle relative to horizon: Higher distant peaks sit slightly higher above horizon
    // Base horizon line is at ~0 deg pitch.
    const elevDeg = Math.min(Math.max((poi.elevationMeters - 150) / 350 - distKm * 0.05, 0.5), 6.5);

    result.push({
      ...poi,
      distanceMeters: Math.round(distMeters),
      distanceKmStr: distKm < 10 ? `${distKm.toFixed(1)} km` : `${Math.round(distKm)} km`,
      bearingDeg: Math.round(bearing),
      sphereLon,
      elevDeg,
    });
  }

  // Sort by distance ascending so closer POIs take priority
  result.sort((a, b) => a.distanceMeters - b.distanceMeters);
  return result;
}
