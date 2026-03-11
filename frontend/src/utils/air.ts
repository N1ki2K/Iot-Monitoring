import type { Reading } from '../types';

type AirReading = Partial<Pick<Reading, 'air_baseline_pct' | 'air_quality_raw'>>;

export const getDisplayedAir = (reading: AirReading | null | undefined): number => {
  if (!reading) return 0;

  if (reading.air_baseline_pct !== null && reading.air_baseline_pct !== undefined && reading.air_baseline_pct !== "") {
    const airBaselinePct = Number(reading.air_baseline_pct);

    if (Number.isFinite(airBaselinePct)) {
      return airBaselinePct;
    }
  }

  return Number(reading.air_quality_raw) || 0;
};
