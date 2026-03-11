package com.monitoring.iotmon.util

import com.monitoring.iotmon.data.models.Reading
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ReadingDisplayTest {

    @Test
    fun getDisplayedSoundPrefersEstimatedSplThenDbfsThenRawSound() {
        val readingWithAll = Reading(
            deviceId = "dev1",
            ts = "2024-01-01T00:00:00Z",
            temperatureC = null,
            humidityPct = null,
            lux = null,
            sound = 12,
            soundDbfs = -18.4,
            soundEstSpl = 44.7
        )
        assertEquals(44.7, getDisplayedSound(readingWithAll) ?: 0.0, 0.001)

        val readingWithDbfsOnly = readingWithAll.copy(soundEstSpl = null)
        assertEquals(-18.4, getDisplayedSound(readingWithDbfsOnly) ?: 0.0, 0.001)

        val readingWithRawOnly = readingWithAll.copy(soundEstSpl = null, soundDbfs = null)
        assertEquals(12.0, getDisplayedSound(readingWithRawOnly) ?: 0.0, 0.001)
    }

    @Test
    fun getDisplayedAirPrefersBaselineThenRawThenLegacyPpm() {
        val readingWithAll = Reading(
            deviceId = "dev1",
            ts = "2024-01-01T00:00:00Z",
            temperatureC = null,
            humidityPct = null,
            lux = null,
            sound = null,
            airQualityRaw = 321.5,
            airBaselinePct = 93.6,
            co2Ppm = 550
        )
        assertEquals(93.6, getDisplayedAir(readingWithAll) ?: 0.0, 0.001)

        val readingWithRawOnly = readingWithAll.copy(airBaselinePct = null)
        assertEquals(321.5, getDisplayedAir(readingWithRawOnly) ?: 0.0, 0.001)

        val readingWithLegacyOnly = readingWithAll.copy(airBaselinePct = null, airQualityRaw = null)
        assertEquals(550.0, getDisplayedAir(readingWithLegacyOnly) ?: 0.0, 0.001)
    }

    @Test
    fun displayHelpersReturnNullForNullReading() {
        assertNull(getDisplayedSound(null))
        assertNull(getDisplayedAir(null))
    }
}
