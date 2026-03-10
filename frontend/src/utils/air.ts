type AirReading = {
  air_baseline_pct?: unknown;
  air_quality_raw?: unknown;
};

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
