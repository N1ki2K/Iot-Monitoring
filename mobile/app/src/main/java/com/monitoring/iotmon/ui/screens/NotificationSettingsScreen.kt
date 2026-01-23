package com.monitoring.iotmon.ui.screens

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.monitoring.iotmon.ui.theme.*
import com.monitoring.iotmon.util.NotificationHelper

data class NotificationSettingsState(
    val notificationsEnabled: Boolean = false,
    val tempAlertsEnabled: Boolean = true,
    val tempHighThreshold: Float = 35f,
    val tempLowThreshold: Float = 10f,
    val humidityAlertsEnabled: Boolean = true,
    val humidityHighThreshold: Float = 80f,
    val humidityLowThreshold: Float = 30f,
    val noiseAlertsEnabled: Boolean = true,
    val noiseHighThreshold: Float = 80f,
    val deviceOfflineAlerts: Boolean = true
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationSettingsScreen(
    state: NotificationSettingsState,
    onBack: () -> Unit,
    onToggleNotifications: (Boolean) -> Unit,
    onToggleTempAlerts: (Boolean) -> Unit,
    onUpdateTempThresholds: (high: Float, low: Float) -> Unit,
    onToggleHumidityAlerts: (Boolean) -> Unit,
    onUpdateHumidityThresholds: (high: Float, low: Float) -> Unit,
    onToggleNoiseAlerts: (Boolean) -> Unit,
    onUpdateNoiseThreshold: (Float) -> Unit,
    onToggleDeviceOfflineAlerts: (Boolean) -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    fun checkPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }

    var hasNotificationPermission by remember { mutableStateOf(checkPermission()) }

    // Re-check permission when returning from settings
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                hasNotificationPermission = checkPermission()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    // Local state for sliders
    var tempHigh by remember(state.tempHighThreshold) { mutableStateOf(state.tempHighThreshold) }
    var tempLow by remember(state.tempLowThreshold) { mutableStateOf(state.tempLowThreshold) }
    var humidityHigh by remember(state.humidityHighThreshold) { mutableStateOf(state.humidityHighThreshold) }
    var humidityLow by remember(state.humidityLowThreshold) { mutableStateOf(state.humidityLowThreshold) }
    var noiseHigh by remember(state.noiseHighThreshold) { mutableStateOf(state.noiseHighThreshold) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(Slate950, Slate900)
                )
            )
    ) {
        Column(
            modifier = Modifier.fillMaxSize()
        ) {
            // Top Bar
            TopAppBar(
                title = {
                    Text(
                        text = "Notification Settings",
                        fontWeight = FontWeight.Bold
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Slate950,
                    titleContentColor = MaterialTheme.colorScheme.onSurface
                )
            )

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Main toggle
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Slate800)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.Notifications,
                                contentDescription = null,
                                tint = Cyan500
                            )
                            Column {
                                Text(
                                    text = "Enable Notifications",
                                    style = MaterialTheme.typography.bodyLarge,
                                    fontWeight = FontWeight.Medium
                                )
                                Text(
                                    text = "Receive alerts when thresholds are exceeded",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                        Switch(
                            checked = state.notificationsEnabled,
                            onCheckedChange = { enabled ->
                                if (enabled && !hasNotificationPermission && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                    // Ensure channel exists before opening settings
                                    NotificationHelper.createChannel(context)
                                    Toast.makeText(context, "Please enable notifications in settings", Toast.LENGTH_SHORT).show()
                                    val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                                        putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
                                    }
                                    context.startActivity(intent)
                                } else {
                                    onToggleNotifications(enabled)
                                }
                            },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = Cyan500,
                                checkedTrackColor = Cyan500.copy(alpha = 0.5f)
                            )
                        )
                    }
                }

                if (!hasNotificationPermission && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                // Ensure channel exists before opening settings
                                NotificationHelper.createChannel(context)
                                val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                                    putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
                                }
                                context.startActivity(intent)
                            },
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = WarningColor.copy(alpha = 0.2f))
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.Warning,
                                contentDescription = null,
                                tint = WarningColor
                            )
                            Column {
                                Text(
                                    text = "Notification permission required",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Medium,
                                    color = WarningColor
                                )
                                Text(
                                    text = "Tap to open settings and grant permission",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = WarningColor.copy(alpha = 0.8f)
                                )
                            }
                        }
                    }
                }

                // Temperature Alerts
                ThresholdSection(
                    title = "Temperature Alerts",
                    icon = Icons.Default.Thermostat,
                    enabled = state.tempAlertsEnabled && state.notificationsEnabled,
                    onToggle = onToggleTempAlerts,
                    masterEnabled = state.notificationsEnabled
                ) {
                    ThresholdSlider(
                        label = "High Threshold",
                        value = tempHigh,
                        range = 0f..50f,
                        unit = "C",
                        onValueChange = { tempHigh = it },
                        onValueChangeFinished = { onUpdateTempThresholds(tempHigh, tempLow) }
                    )
                    ThresholdSlider(
                        label = "Low Threshold",
                        value = tempLow,
                        range = -10f..30f,
                        unit = "C",
                        onValueChange = { tempLow = it },
                        onValueChangeFinished = { onUpdateTempThresholds(tempHigh, tempLow) }
                    )
                }

                // Humidity Alerts
                ThresholdSection(
                    title = "Humidity Alerts",
                    icon = Icons.Default.WaterDrop,
                    enabled = state.humidityAlertsEnabled && state.notificationsEnabled,
                    onToggle = onToggleHumidityAlerts,
                    masterEnabled = state.notificationsEnabled
                ) {
                    ThresholdSlider(
                        label = "High Threshold",
                        value = humidityHigh,
                        range = 50f..100f,
                        unit = "%",
                        onValueChange = { humidityHigh = it },
                        onValueChangeFinished = { onUpdateHumidityThresholds(humidityHigh, humidityLow) }
                    )
                    ThresholdSlider(
                        label = "Low Threshold",
                        value = humidityLow,
                        range = 0f..50f,
                        unit = "%",
                        onValueChange = { humidityLow = it },
                        onValueChangeFinished = { onUpdateHumidityThresholds(humidityHigh, humidityLow) }
                    )
                }

                // Noise Alerts
                ThresholdSection(
                    title = "Noise Alerts",
                    icon = Icons.Default.VolumeUp,
                    enabled = state.noiseAlertsEnabled && state.notificationsEnabled,
                    onToggle = onToggleNoiseAlerts,
                    masterEnabled = state.notificationsEnabled
                ) {
                    ThresholdSlider(
                        label = "High Threshold",
                        value = noiseHigh,
                        range = 40f..120f,
                        unit = " dB",
                        onValueChange = { noiseHigh = it },
                        onValueChangeFinished = { onUpdateNoiseThreshold(noiseHigh) }
                    )
                }

                // Device Offline Alerts
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Slate800)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.WifiOff,
                                contentDescription = null,
                                tint = if (state.notificationsEnabled) ErrorColor else Slate600
                            )
                            Column {
                                Text(
                                    text = "Device Offline Alerts",
                                    style = MaterialTheme.typography.bodyLarge,
                                    fontWeight = FontWeight.Medium,
                                    color = if (state.notificationsEnabled) MaterialTheme.colorScheme.onSurface else Slate600
                                )
                                Text(
                                    text = "Notify when a device goes offline",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = if (state.notificationsEnabled) MaterialTheme.colorScheme.onSurfaceVariant else Slate600
                                )
                            }
                        }
                        Switch(
                            checked = state.deviceOfflineAlerts && state.notificationsEnabled,
                            onCheckedChange = onToggleDeviceOfflineAlerts,
                            enabled = state.notificationsEnabled,
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = ErrorColor,
                                checkedTrackColor = ErrorColor.copy(alpha = 0.5f)
                            )
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}

@Composable
private fun ThresholdSection(
    title: String,
    icon: ImageVector,
    enabled: Boolean,
    onToggle: (Boolean) -> Unit,
    masterEnabled: Boolean,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Slate800)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        icon,
                        contentDescription = null,
                        tint = if (masterEnabled) Cyan500 else Slate600
                    )
                    Text(
                        text = title,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = if (masterEnabled) MaterialTheme.colorScheme.onSurface else Slate600
                    )
                }
                Switch(
                    checked = enabled,
                    onCheckedChange = onToggle,
                    enabled = masterEnabled,
                    colors = SwitchDefaults.colors(
                        checkedThumbColor = Cyan500,
                        checkedTrackColor = Cyan500.copy(alpha = 0.5f)
                    )
                )
            }

            if (enabled && masterEnabled) {
                content()
            }
        }
    }
}

@Composable
private fun ThresholdSlider(
    label: String,
    value: Float,
    range: ClosedFloatingPointRange<Float>,
    unit: String,
    onValueChange: (Float) -> Unit,
    onValueChangeFinished: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = "${value.toInt()}$unit",
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold,
                color = Cyan500
            )
        }
        Slider(
            value = value,
            onValueChange = onValueChange,
            valueRange = range,
            onValueChangeFinished = onValueChangeFinished,
            colors = SliderDefaults.colors(
                thumbColor = Cyan500,
                activeTrackColor = Cyan500,
                inactiveTrackColor = Slate600
            )
        )
    }
}
