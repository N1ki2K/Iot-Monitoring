DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'readings'
      AND column_name = 'co2_ppm'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'readings'
      AND column_name = 'air_quality_raw'
  ) THEN
    ALTER TABLE readings RENAME COLUMN co2_ppm TO air_quality_raw;
  END IF;
END $$;
