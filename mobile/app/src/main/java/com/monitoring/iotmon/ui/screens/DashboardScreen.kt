package com.monitoring.iotmon.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.monitoring.iotmon.data.models.AuthUser
import com.monitoring.iotmon.ui.components.*
import com.monitoring.iotmon.ui.theme.*
import com.monitoring.iotmon.ui.viewmodel.DashboardState
import com.monitoring.iotmon.ui.viewmodel.DeviceStatus

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    user: AuthUser,
    state: DashboardState,
    onDeviceSelected: (String) -> Unit,
    onRefresh: () -> Unit,
    onSettingsClick: () -> Unit,
    onAdminClick: () -> Unit,
    onAuditLogsClick: () -> Unit,
    onSystemHealthClick: () -> Unit,
    onClaimDevice: () -> Unit,
    onLogout: () -> Unit,
    onSensorClick: (SensorType) -> Unit = {}
) {
    var showDeviceMenu by remember { mutableStateOf(false) }
    var showProfileMenu by remember { mutableStateOf(false) }
    var showQRCode by remember { mutableStateOf(false) }
    val colorScheme = MaterialTheme.colorScheme

    // QR Code Dialog
    if (showQRCode && state.selectedDevice != null && state.selectedDevicePairingCode != null) {
        QRCodeDialog(
            title = "Share Device",
            code = state.selectedDevicePairingCode,
            deviceId = state.selectedDevice,
            onDismiss = { showQRCode = false }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "IoT Monitor",
                            fontWeight = FontWeight.Bold,
                            color = colorScheme.primary
                        )
                        if (state.lastUpdate != null) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .clip(CircleShape)
                                    .background(SuccessColor)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = state.lastUpdate,
                                style = MaterialTheme.typography.bodySmall,
                                color = colorScheme.onSurfaceVariant
                            )
                        }
                    }
                },
                actions = {
                    // Refresh button
                    IconButton(onClick = onRefresh) {
                        Icon(
                            Icons.Default.Refresh,
                            contentDescription = "Refresh",
                            tint = if (state.isRefreshing) colorScheme.primary else colorScheme.onSurfaceVariant
                        )
                    }

                    // Profile menu
                    Box {
                        IconButton(onClick = { showProfileMenu = true }) {
                            Icon(
                                Icons.Default.AccountCircle,
                                contentDescription = "Profile",
                                tint = colorScheme.primary,
                                modifier = Modifier.size(32.dp)
                            )
                        }

                        DropdownMenu(
                            expanded = showProfileMenu,
                            onDismissRequest = { showProfileMenu = false }
                        ) {
                            // User info
                            Column(
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                            ) {
                                Text(
                                    text = user.username,
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = user.email,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = colorScheme.onSurfaceVariant
                                )
                                if (user.isAdmin == 1) {
                                    Text(
                                        text = "Admin",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = colorScheme.primary
                                    )
                                }
                            }

                            HorizontalDivider()

                            if (user.isAdmin == 1) {
                                DropdownMenuItem(
                                    text = { Text("Admin Dashboard") },
                                    leadingIcon = {
                                        Icon(Icons.Default.AdminPanelSettings, null)
                                    },
                                    onClick = {
                                        showProfileMenu = false
                                        onAdminClick()
                                    }
                                )

                                DropdownMenuItem(
                                    text = { Text("Audit Logs") },
                                    leadingIcon = {
                                        Icon(Icons.Default.History, null)
                                    },
                                    onClick = {
                                        showProfileMenu = false
                                        onAuditLogsClick()
                                    }
                                )

                                DropdownMenuItem(
                                    text = { Text("System Health") },
                                    leadingIcon = {
                                        Icon(Icons.Default.MonitorHeart, null)
                                    },
                                    onClick = {
                                        showProfileMenu = false
                                        onSystemHealthClick()
                                    }
                                )
                            }

                            DropdownMenuItem(
                                text = { Text("Settings") },
                                leadingIcon = {
                                    Icon(Icons.Default.Settings, null)
                                },
                                onClick = {
                                    showProfileMenu = false
                                    onSettingsClick()
                                }
                            )

                            HorizontalDivider()

                            DropdownMenuItem(
                                text = { Text("Logout", color = ErrorColor) },
                                leadingIcon = {
                                    Icon(Icons.AutoMirrored.Filled.Logout, null, tint = ErrorColor)
                                },
                                onClick = {
                                    showProfileMenu = false
                                    onLogout()
                                }
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = colorScheme.background,
                    titleContentColor = colorScheme.onBackground,
                    actionIconContentColor = colorScheme.onBackground
                )
            )
        },
        containerColor = colorScheme.background
    ) { paddingValues ->
        if (state.isLoading && !state.isRefreshing) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = Cyan500)
            }
        } else {
            PullToRefreshBox(
                isRefreshing = state.isRefreshing,
                onRefresh = onRefresh,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp)
                ) {
                    // Device Selector
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box {
                        OutlinedButton(
                            onClick = { showDeviceMenu = true },
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = colorScheme.onSurface
                            ),
                            border = ButtonDefaults.outlinedButtonBorder(enabled = true).copy(
                                brush = Brush.horizontalGradient(
                                    listOf(colorScheme.outline, colorScheme.outline)
                                )
                            )
                        ) {
                            Icon(
                                Icons.Default.Router,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = state.selectedDevice ?: "Select Device",
                                maxLines = 1
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Icon(
                                Icons.Default.ArrowDropDown,
                                contentDescription = null
                            )
                        }

                        DropdownMenu(
                            expanded = showDeviceMenu,
                            onDismissRequest = { showDeviceMenu = false }
                        ) {
                            if (state.devices.isEmpty()) {
                                DropdownMenuItem(
                                    text = { Text("No devices available") },
                                    onClick = { showDeviceMenu = false },
                                    enabled = false
                                )
                            } else {
                                state.devices.forEach { device ->
                                    DropdownMenuItem(
                                        text = {
                                            Text(
                                                device,
                                                color = if (device == state.selectedDevice) colorScheme.primary
                                                else MaterialTheme.colorScheme.onSurface
                                            )
                                        },
                                        onClick = {
                                            onDeviceSelected(device)
                                            showDeviceMenu = false
                                        },
                                        leadingIcon = {
                                            Icon(
                                                Icons.Default.Router,
                                                contentDescription = null,
                                                tint = if (device == state.selectedDevice) colorScheme.primary
                                                else colorScheme.onSurfaceVariant
                                            )
                                        }
                                    )
                                }
                            }
                        }
                    }

                    // Claim Device Button
                    FilledTonalButton(
                        onClick = onClaimDevice,
                        colors = ButtonDefaults.filledTonalButtonColors(
                            containerColor = colorScheme.primaryContainer,
                            contentColor = colorScheme.primary
                        )
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Claim")
                    }
                }

                // Device Status Card
                if (state.selectedDevice != null) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = colorScheme.surfaceVariant),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Status indicator
                            Box(
                                modifier = Modifier
                                    .size(12.dp)
                                    .clip(CircleShape)
                                    .background(
                                        when (state.deviceStatus) {
                                            DeviceStatus.ONLINE -> SuccessColor
                                            DeviceStatus.OFFLINE -> ErrorColor
                                            DeviceStatus.UNKNOWN -> colorScheme.onSurfaceVariant
                                        }
                                    )
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = when (state.deviceStatus) {
                                    DeviceStatus.ONLINE -> "Online"
                                    DeviceStatus.OFFLINE -> "Offline"
                                    DeviceStatus.UNKNOWN -> "Unknown"
                                },
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Medium,
                                color = when (state.deviceStatus) {
                                    DeviceStatus.ONLINE -> SuccessColor
                                    DeviceStatus.OFFLINE -> ErrorColor
                                    DeviceStatus.UNKNOWN -> colorScheme.onSurfaceVariant
                                }
                            )
                            if (state.lastSeen != null) {
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "• ${state.lastSeen}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = colorScheme.onSurfaceVariant
                                )
                            }
                            Spacer(modifier = Modifier.weight(1f))

                            // QR Code button
                            if (state.selectedDevicePairingCode != null) {
                                IconButton(
                                    onClick = { showQRCode = true },
                                    modifier = Modifier.size(32.dp)
                                ) {
                                    Icon(
                                        Icons.Default.QrCode2,
                                        contentDescription = "Share QR Code",
                                        tint = colorScheme.primary,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(4.dp))
                            }

                            Icon(
                                when (state.deviceStatus) {
                                    DeviceStatus.ONLINE -> Icons.Default.Wifi
                                    DeviceStatus.OFFLINE -> Icons.Default.WifiOff
                                    DeviceStatus.UNKNOWN -> Icons.Default.QuestionMark
                                },
                                contentDescription = null,
                                tint = when (state.deviceStatus) {
                                    DeviceStatus.ONLINE -> SuccessColor
                                    DeviceStatus.OFFLINE -> ErrorColor
                                    DeviceStatus.UNKNOWN -> colorScheme.onSurfaceVariant
                                },
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Sensor Cards
                if (state.latestReading != null) {
                    SensorCardsGrid(
                        reading = state.latestReading,
                        onSensorClick = onSensorClick
                    )
                } else {
                    // No data state
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = colorScheme.surface),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(32.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                Icons.Default.SensorsOff,
                                contentDescription = null,
                                modifier = Modifier.size(48.dp),
                                tint = colorScheme.onSurfaceVariant
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = "No sensor data",
                                style = MaterialTheme.typography.titleMedium,
                                color = colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = "Waiting for device to send data...",
                                style = MaterialTheme.typography.bodySmall,
                                color = colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Charts
                if (state.history.isNotEmpty()) {
                    TemperatureHumidityChart(
                        readings = state.history,
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    LightSoundChart(
                        readings = state.history,
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                // Error display
                if (state.error != null) {
                    Spacer(modifier = Modifier.height(16.dp))
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = ErrorColor.copy(alpha = 0.1f)
                        )
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.Error,
                                contentDescription = null,
                                tint = ErrorColor
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = state.error,
                                color = ErrorColor,
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }
                }
                }
            }
        }
    }
}
