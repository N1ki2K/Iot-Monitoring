package com.monitoring.iotmon.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.monitoring.iotmon.data.models.HealthStats
import com.monitoring.iotmon.ui.viewmodel.SystemHealthState
import kotlin.math.pow

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SystemHealthScreen(
    state: SystemHealthState,
    onBack: () -> Unit,
    onRefresh: () -> Unit
) {
    val colorScheme = MaterialTheme.colorScheme
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("System Health", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = onRefresh) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = colorScheme.background,
                    titleContentColor = colorScheme.onBackground,
                    navigationIconContentColor = colorScheme.onBackground,
                    actionIconContentColor = colorScheme.onBackground
                )
            )
        },
        containerColor = colorScheme.background
    ) { paddingValues ->
        if (state.isLoading) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                CircularProgressIndicator(color = colorScheme.primary)
            }
        } else if (state.error != null) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp)
            ) {
                Card(colors = CardDefaults.cardColors(containerColor = colorScheme.errorContainer)) {
                    Text(state.error, color = colorScheme.onErrorContainer, modifier = Modifier.padding(16.dp))
                }
            }
        } else {
            val data = state.data ?: return@Scaffold
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        HealthStatCard("Uptime", "${data.uptimeSeconds / 3600}h", Modifier.weight(1f))
                        HealthStatCard("Requests", data.requests.total.toString(), Modifier.weight(1f))
                    }
                }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        HealthStatCard("DB Size", formatBytes(data.database.sizeBytes), Modifier.weight(1f))
                        HealthStatCard("Readings", data.devices.totalReadings.toString(), Modifier.weight(1f))
                    }
                }
                item {
                    DetailSection("Users") {
                        DetailRow("Total", data.users.total.toString())
                        DetailRow("Admins", data.users.admins.toString())
                        DetailRow("Invited", data.users.invited.toString())
                        DetailRow("Must Change", data.users.mustChangePassword.toString())
                    }
                }
                item {
                    DetailSection("Devices") {
                        DetailRow("Controllers", data.devices.totalControllers.toString())
                        DetailRow("Distinct", data.devices.distinctDevices.toString())
                        DetailRow("Active 24h", data.devices.activeDevicesLast24h.toString())
                        DetailRow("Latest", data.devices.latestReadingAt ?: "No readings yet")
                    }
                }
                item {
                    DetailSection("Request Statuses") {
                        data.requests.byStatus.toList().sortedBy { it.first }.forEach { (status, count) ->
                            DetailRow("Status $status", count.toString())
                        }
                    }
                }
                item {
                    DetailSection("Database Tables") {
                        data.database.tableSizes.forEach { table ->
                            DetailRow("${table.table} (${table.rows})", formatBytes(table.bytes))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun HealthStatCard(label: String, value: String, modifier: Modifier = Modifier) {
    val colorScheme = MaterialTheme.colorScheme
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = colorScheme.surface)
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(label, color = colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(6.dp))
            Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun DetailSection(title: String, content: @Composable () -> Unit) {
    val colorScheme = MaterialTheme.colorScheme
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = colorScheme.surface)
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            content()
        }
    }
}

@Composable
private fun DetailRow(label: String, value: String) {
    val colorScheme = MaterialTheme.colorScheme
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, color = colorScheme.onSurfaceVariant)
        Text(value)
    }
}

private fun formatBytes(bytes: Long): String {
    if (bytes == 0L) return "0 B"
    val units = listOf("B", "KB", "MB", "GB", "TB")
    val exponent = kotlin.math.min((kotlin.math.ln(bytes.toDouble()) / kotlin.math.ln(1024.0)).toInt(), units.lastIndex)
    val value = bytes / 1024.0.pow(exponent.toDouble())
    return "${"%.1f".format(value)} ${units[exponent]}"
}
