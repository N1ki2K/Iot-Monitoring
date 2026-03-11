package com.monitoring.iotmon.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.monitoring.iotmon.data.models.Reading
import com.monitoring.iotmon.ui.theme.*
import com.monitoring.iotmon.util.getDisplayedAir
import com.monitoring.iotmon.util.getDisplayedSound

enum class SensorType {
    TEMPERATURE,
    HUMIDITY,
    LIGHT,
    SOUND,
    AIR_QUALITY
}

@Composable
fun SensorCard(
    type: SensorType,
    value: String?,
    unit: String,
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null
) {
    val colorScheme = MaterialTheme.colorScheme
    val cardColors = CardDefaults.cardColors(containerColor = colorScheme.surface)
    val cardShape = RoundedCornerShape(16.dp)

    if (onClick != null) {
        Card(
            modifier = modifier,
            shape = cardShape,
            colors = cardColors,
            onClick = onClick
        ) {
            SensorCardContent(type = type, value = value, unit = unit)
        }
    } else {
        Card(
            modifier = modifier,
            shape = cardShape,
            colors = cardColors
        ) {
            SensorCardContent(type = type, value = value, unit = unit)
        }
    }
}

@Composable
private fun SensorCardContent(
    type: SensorType,
    value: String?,
    unit: String
) {
    val colorScheme = MaterialTheme.colorScheme
    val (icon, color, label) = when (type) {
        SensorType.TEMPERATURE -> Triple(Icons.Default.Thermostat, TemperatureColor, "Temperature")
        SensorType.HUMIDITY -> Triple(Icons.Default.WaterDrop, HumidityColor, "Humidity")
        SensorType.LIGHT -> Triple(Icons.Default.WbSunny, LightColor, "Light")
        SensorType.SOUND -> Triple(Icons.AutoMirrored.Filled.VolumeUp, SoundColor, "Sound")
        SensorType.AIR_QUALITY -> Triple(Icons.Default.Air, AirQualityColor, "Air vs Baseline")
    }

    val iconContainerColor =
        if (colorScheme.surface.luminance() > 0.5f) Color.White else color.copy(alpha = 0.16f)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Icon with colored background
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(iconContainerColor),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = color,
                modifier = Modifier.size(28.dp)
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Label
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(4.dp))

        // Value
        if (value != null) {
            Row(
                verticalAlignment = Alignment.Bottom,
                horizontalArrangement = Arrangement.Center
            ) {
                Text(
                    text = value,
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = colorScheme.onSurface
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    text = unit,
                    style = MaterialTheme.typography.bodyMedium,
                    color = colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(bottom = 4.dp)
                )
            }
        } else {
            // Loading skeleton
            Box(
                modifier = Modifier
                    .width(60.dp)
                    .height(32.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(colorScheme.surfaceVariant)
            )
        }
    }
}

@Composable
fun SensorCardsGrid(
    reading: Reading,
    modifier: Modifier = Modifier,
    onSensorClick: (SensorType) -> Unit = {}
) {
    val displayedSound = getDisplayedSound(reading)
    val displayedAir = getDisplayedAir(reading)

    Column(modifier = modifier) {
        // First row - Temperature and Humidity
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            SensorCard(
                type = SensorType.TEMPERATURE,
                value = reading.temperatureC?.let { String.format("%.1f", it) },
                unit = "°C",
                modifier = Modifier.weight(1f),
                onClick = { onSensorClick(SensorType.TEMPERATURE) }
            )
            SensorCard(
                type = SensorType.HUMIDITY,
                value = reading.humidityPct?.let { String.format("%.1f", it) },
                unit = "%",
                modifier = Modifier.weight(1f),
                onClick = { onSensorClick(SensorType.HUMIDITY) }
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Second row - Light, Sound, Air Quality
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            SensorCard(
                type = SensorType.LIGHT,
                value = reading.lux?.toString(),
                unit = "lux",
                modifier = Modifier.weight(1f),
                onClick = { onSensorClick(SensorType.LIGHT) }
            )
            SensorCard(
                type = SensorType.SOUND,
                value = displayedSound?.let { String.format("%.1f", it) },
                unit = "dB",
                modifier = Modifier.weight(1f),
                onClick = { onSensorClick(SensorType.SOUND) }
            )
            SensorCard(
                type = SensorType.AIR_QUALITY,
                value = displayedAir?.let { String.format("%.1f", it) },
                unit = "%",
                modifier = Modifier.weight(1f),
                onClick = { onSensorClick(SensorType.AIR_QUALITY) }
            )
        }
    }
}
