package com.monitoring.iotmon.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.monitoring.iotmon.data.models.Reading
import com.monitoring.iotmon.ui.theme.*

data class ChartLine(
    val label: String,
    val color: Color,
    val values: List<Float>
)

@Composable
fun SensorChart(
    title: String,
    lines: List<ChartLine>,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .background(Slate800, RoundedCornerShape(16.dp))
            .padding(16.dp)
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = Color.White,
            modifier = Modifier.padding(bottom = 8.dp)
        )

        // Legend
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            lines.forEach { line ->
                Row(verticalAlignment = androidx.compose.ui.Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(8.dp)
                            .background(line.color, RoundedCornerShape(2.dp))
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = line.label,
                        style = MaterialTheme.typography.bodySmall,
                        color = Slate400
                    )
                }
            }
        }

        // Chart canvas
        if (lines.isNotEmpty() && lines.any { it.values.isNotEmpty() }) {
            Canvas(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(150.dp)
            ) {
                val width = size.width
                val height = size.height
                val padding = 8.dp.toPx()

                // Find min and max across all lines
                val allValues = lines.flatMap { it.values }
                if (allValues.isEmpty()) return@Canvas

                val minValue = allValues.minOrNull() ?: 0f
                val maxValue = allValues.maxOrNull() ?: 100f
                val valueRange = (maxValue - minValue).coerceAtLeast(1f)

                // Draw each line
                lines.forEach { line ->
                    if (line.values.size < 2) return@forEach

                    val path = Path()
                    val stepX = (width - 2 * padding) / (line.values.size - 1)

                    line.values.forEachIndexed { index, value ->
                        val x = padding + index * stepX
                        val y = height - padding - ((value - minValue) / valueRange) * (height - 2 * padding)

                        if (index == 0) {
                            path.moveTo(x, y)
                        } else {
                            path.lineTo(x, y)
                        }
                    }

                    drawPath(
                        path = path,
                        color = line.color,
                        style = Stroke(width = 2.dp.toPx())
                    )

                    // Draw dots at each point
                    line.values.forEachIndexed { index, value ->
                        val x = padding + index * stepX
                        val y = height - padding - ((value - minValue) / valueRange) * (height - 2 * padding)

                        drawCircle(
                            color = line.color,
                            radius = 3.dp.toPx(),
                            center = Offset(x, y)
                        )
                    }
                }
            }
        } else {
            // No data placeholder
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(150.dp),
                contentAlignment = androidx.compose.ui.Alignment.Center
            ) {
                Text(
                    text = "No data available",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Slate400
                )
            }
        }
    }
}

@Composable
fun TemperatureHumidityChart(
    readings: List<Reading>,
    modifier: Modifier = Modifier
) {
    val tempValues = readings.mapNotNull { it.temperatureC?.toFloat() }.takeLast(20)
    val humidityValues = readings.mapNotNull { it.humidityPct?.toFloat() }.takeLast(20)

    SensorChart(
        title = "Temperature & Humidity",
        lines = listOf(
            ChartLine("Temp °C", TemperatureColor, tempValues),
            ChartLine("Humidity %", HumidityColor, humidityValues)
        ),
        modifier = modifier
    )
}

@Composable
fun LightSoundChart(
    readings: List<Reading>,
    modifier: Modifier = Modifier
) {
    val lightValues = readings.mapNotNull { it.lux?.toFloat() }.takeLast(20)
    val soundValues = readings.mapNotNull { it.sound?.toFloat() }.takeLast(20)

    SensorChart(
        title = "Light & Sound",
        lines = listOf(
            ChartLine("Light", LightColor, lightValues),
            ChartLine("Sound", SoundColor, soundValues)
        ),
        modifier = modifier
    )
}
