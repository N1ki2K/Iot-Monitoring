package com.monitoring.iotmon.util

import com.monitoring.iotmon.data.models.Reading

fun getDisplayedSound(reading: Reading?): Double? {
    if (reading == null) return null

    val estimatedSpl = reading.soundEstSpl
    if (estimatedSpl != null && estimatedSpl.isFinite()) {
        return estimatedSpl
    }

    val dbFs = reading.soundDbfs
    if (dbFs != null && dbFs.isFinite()) {
        return dbFs
    }

    return reading.sound?.toDouble()
}

fun getDisplayedAir(reading: Reading?): Double? {
    if (reading == null) return null

    val baselinePct = reading.airBaselinePct
    if (baselinePct != null && baselinePct.isFinite()) {
        return baselinePct
    }

    val rawValue = reading.airQualityRaw
    if (rawValue != null && rawValue.isFinite()) {
        return rawValue
    }

    return reading.co2Ppm?.toDouble()
}
