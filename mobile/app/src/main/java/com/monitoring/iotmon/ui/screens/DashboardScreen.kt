package com.monitoring.iotmon.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    user: AuthUser,
    state: DashboardState,
    onDeviceSelected: (String) -> Unit,
    onRefresh: () -> Unit,
    onSettingsClick: () -> Unit,
    onAdminClick: () -> Unit,
    onClaimDevice: () -> Unit,
    onLogout: () -> Unit
) {
    var showDeviceMenu by remember { mutableStateOf(false) }
    var showProfileMenu by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "IoT Monitor",
                            fontWeight = FontWeight.Bold,
                            color = Cyan500
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
                                color = Slate400
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
                            tint = if (state.isRefreshing) Cyan500 else Slate400
                        )
                    }

                    // Profile menu
                    Box {
                        IconButton(onClick = { showProfileMenu = true }) {
                            Icon(
                                Icons.Default.AccountCircle,
                                contentDescription = "Profile",
                                tint = Cyan500,
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
                                    color = Slate400
                                )
                                if (user.isAdmin == 1) {
                                    Text(
                                        text = "Admin",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = Cyan500
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
                                    Icon(Icons.Default.Logout, null, tint = ErrorColor)
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
                    containerColor = Slate950
                )
            )
        },
        containerColor = Slate950
    ) { paddingValues ->
        if (state.isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = Cyan500)
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
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
                                contentColor = Slate200
                            ),
                            border = ButtonDefaults.outlinedButtonBorder(enabled = true).copy(
                                brush = Brush.horizontalGradient(listOf(Slate600, Slate600))
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
                                                color = if (device == state.selectedDevice) Cyan500
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
                                                tint = if (device == state.selectedDevice) Cyan500
                                                else Slate400
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
                            containerColor = Cyan500.copy(alpha = 0.2f),
                            contentColor = Cyan500
                        )
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Claim")
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Sensor Cards
                if (state.latestReading != null) {
                    SensorCardsGrid(
                        temperature = state.latestReading.temperatureC,
                        humidity = state.latestReading.humidityPct,
                        light = state.latestReading.lux,
                        sound = state.latestReading.sound,
                        airQuality = state.latestReading.co2Ppm
                    )
                } else {
                    // No data state
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Slate800),
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
                                tint = Slate400
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                text = "No sensor data",
                                style = MaterialTheme.typography.titleMedium,
                                color = Slate400
                            )
                            Text(
                                text = "Waiting for device to send data...",
                                style = MaterialTheme.typography.bodySmall,
                                color = Slate600
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
