package com.monitoring.iotmon.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.DeleteSweep
import androidx.compose.material.icons.filled.FilterAlt
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.monitoring.iotmon.data.models.AuditLogEntry
import com.monitoring.iotmon.ui.viewmodel.AuditLogsState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AuditLogsScreen(
    state: AuditLogsState,
    onBack: () -> Unit,
    onRefresh: () -> Unit,
    onUpdateFilters: (String, String, String, String, Int) -> Unit,
    onClearFilters: () -> Unit,
    onNextPage: () -> Unit,
    onPreviousPage: () -> Unit,
    onPurgeBeforeChange: (String) -> Unit,
    onPurgeBefore: () -> Unit,
    onPurgeAll: () -> Unit
) {
    val colorScheme = MaterialTheme.colorScheme
    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedBorderColor = colorScheme.primary,
        focusedLabelColor = colorScheme.primary,
        cursorColor = colorScheme.primary
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Audit Logs", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = onRefresh) {
                        Icon(Icons.Default.FilterAlt, contentDescription = "Refresh")
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = colorScheme.surface)
            ) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Filters", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    OutlinedTextField(
                        value = state.actorId,
                        onValueChange = { onUpdateFilters(it, state.action, state.entityType, state.entityId, state.limit) },
                        label = { Text("Actor ID") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = fieldColors,
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = state.action,
                        onValueChange = { onUpdateFilters(state.actorId, it, state.entityType, state.entityId, state.limit) },
                        label = { Text("Action") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = fieldColors,
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = state.entityType,
                        onValueChange = { onUpdateFilters(state.actorId, state.action, it, state.entityId, state.limit) },
                        label = { Text("Entity Type") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = fieldColors,
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = state.entityId,
                        onValueChange = { onUpdateFilters(state.actorId, state.action, state.entityType, it, state.limit) },
                        label = { Text("Entity ID") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = fieldColors,
                        singleLine = true
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Button(onClick = onRefresh, modifier = Modifier.weight(1f)) { Text("Apply") }
                        TextButton(onClick = onClearFilters, modifier = Modifier.weight(1f)) { Text("Clear") }
                    }
                }
            }

            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = colorScheme.surface)
            ) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Admin Tools", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    OutlinedTextField(
                        value = state.purgeBefore,
                        onValueChange = onPurgeBeforeChange,
                        label = { Text("Purge before (ISO date/time)") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = fieldColors,
                        singleLine = true
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Button(onClick = onPurgeBefore, modifier = Modifier.weight(1f)) {
                            Icon(Icons.Default.Schedule, contentDescription = null)
                            Spacer(Modifier.width(8.dp))
                            Text("Purge Before")
                        }
                        Button(onClick = onPurgeAll, modifier = Modifier.weight(1f)) {
                            Icon(Icons.Default.DeleteSweep, contentDescription = null)
                            Spacer(Modifier.width(8.dp))
                            Text("Purge All")
                        }
                    }
                }
            }

            state.error?.let {
                Card(colors = CardDefaults.cardColors(containerColor = colorScheme.errorContainer)) {
                    Text(it, color = colorScheme.onErrorContainer, modifier = Modifier.padding(16.dp))
                }
            }

            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = colorScheme.surface)
            ) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Entries", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)

                    if (state.isLoading) {
                        Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = colorScheme.primary)
                        }
                    } else if (state.data?.data.isNullOrEmpty()) {
                        Text("No audit entries found", color = colorScheme.onSurfaceVariant)
                    } else {
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(420.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(state.data?.data ?: emptyList()) { entry ->
                                AuditLogCard(entry)
                            }
                        }
                    }

                    HorizontalDivider()

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "Page ${state.page} of ${state.data?.pagination?.totalPages ?: 1}",
                            color = colorScheme.onSurfaceVariant
                        )
                        Row {
                            TextButton(onClick = onPreviousPage, enabled = state.page > 1) { Text("Prev") }
                            TextButton(
                                onClick = onNextPage,
                                enabled = state.page < (state.data?.pagination?.totalPages ?: 1)
                            ) { Text("Next") }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AuditLogCard(entry: AuditLogEntry) {
    val colorScheme = MaterialTheme.colorScheme
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = colorScheme.surfaceVariant)
    ) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(entry.action, fontWeight = FontWeight.SemiBold)
            Text("${entry.entityType} • ${entry.entityId ?: "-"}", color = colorScheme.onSurfaceVariant)
            Text(entry.actorEmail ?: "System", color = colorScheme.onSurfaceVariant)
            Text(entry.createdAt, style = MaterialTheme.typography.bodySmall, color = colorScheme.onSurfaceVariant)
            val source = entry.metadata?.get("client")?.toString() ?: "-"
            Text("Source: $source • IP: ${entry.ipAddress ?: "-"}", style = MaterialTheme.typography.bodySmall)
            entry.metadata?.let {
                Text(it.toString(), style = MaterialTheme.typography.bodySmall, color = colorScheme.onSurfaceVariant)
            }
        }
    }
}
