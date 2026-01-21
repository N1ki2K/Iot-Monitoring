package com.monitoring.iotmon.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.monitoring.iotmon.ui.theme.*

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
    modifier: Modifier = Modifier
) {
    val (icon, color, label) = when (type) {
        SensorType.TEMPERATURE -> Triple(Icons.Default.Thermostat, TemperatureColor, "Temperature")
        SensorType.HUMIDITY -> Triple(Icons.Default.WaterDrop, HumidityColor, "Humidity")
        SensorType.LIGHT -> Triple(Icons.Default.WbSunny, LightColor, "Light")
        SensorType.SOUND -> Triple(Icons.Default.VolumeUp, SoundColor, "Sound")
        SensorType.AIR_QUALITY -> Triple(Icons.Default.Air, AirQualityColor, "Air Quality")
    }

    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = Slate800
        )
    ) {
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
                    .background(
                        Brush.radialGradient(
                            colors = listOf(
                                color.copy(alpha = 0.3f),
                                color.copy(alpha = 0.1f)
                            )
                        )
                    ),
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
                color = Slate400
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
                        color = Color.White
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = unit,
                        style = MaterialTheme.typography.bodyMedium,
                        color = Slate400,
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
                        .background(Slate700)
                )
            }
        }
    }
}

@Composable
fun SensorCardsGrid(
    temperature: Double?,
    humidity: Double?,
    light: Int?,
    sound: Int?,
    airQuality: Int?,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier) {
        // First row - Temperature and Humidity
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            SensorCard(
                type = SensorType.TEMPERATURE,
                value = temperature?.let { String.format("%.1f", it) },
                unit = "°C",
                modifier = Modifier.weight(1f)
            )
            SensorCard(
                type = SensorType.HUMIDITY,
                value = humidity?.let { String.format("%.1f", it) },
                unit = "%",
                modifier = Modifier.weight(1f)
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
                value = light?.toString(),
                unit = "lux",
                modifier = Modifier.weight(1f)
            )
            SensorCard(
                type = SensorType.SOUND,
                value = sound?.toString(),
                unit = "dB",
                modifier = Modifier.weight(1f)
            )
            SensorCard(
                type = SensorType.AIR_QUALITY,
                value = airQuality?.toString(),
                unit = "ppm",
                modifier = Modifier.weight(1f)
            )
        }
    }
}
