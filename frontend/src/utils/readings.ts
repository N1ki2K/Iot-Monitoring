type SoundReading = {
  sound?: unknown;
  sound_dbfs?: unknown;
  sound_est_spl?: unknown;
};

export const getDisplayedSound = (reading: SoundReading | null | undefined): number => {
  if (!reading) return 0;

  if (reading.sound_est_spl !== null && reading.sound_est_spl !== undefined && reading.sound_est_spl !== "") {
    const estimatedSpl = Number(reading.sound_est_spl);

    if (Number.isFinite(estimatedSpl)) {
      return estimatedSpl;
    }
  }

  if (reading.sound_dbfs !== null && reading.sound_dbfs !== undefined && reading.sound_dbfs !== "") {
    const dbFs = Number(reading.sound_dbfs);

    if (Number.isFinite(dbFs)) {
      return dbFs;
    }
  }

  return Number(reading.sound) || 0;
};
