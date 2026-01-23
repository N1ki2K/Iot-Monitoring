package com.monitoring.iotmon.ui.screens

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Sort
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.monitoring.iotmon.data.models.Reading
import com.monitoring.iotmon.ui.components.SensorType
import com.monitoring.iotmon.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*

enum class SortField { TIME, DEVICE, VALUE }
enum class SortOrder { ASC, DESC }
enum class DateRange(val label: String, val days: Int?) {
    TODAY("Today", 0),
    LAST_7_DAYS("Last 7 days", 7),
    LAST_30_DAYS("Last 30 days", 30),
    ALL("All time", null)
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun SensorDetailScreen(
    sensorType: SensorType,
    readings: List<Reading>,
    isLoading: Boolean,
    onBack: () -> Unit
) {
    val (title, icon, color, unit, getValue) = when (sensorType) {
        SensorType.TEMPERATURE -> SensorInfo(
            "Temperature",
            Icons.Default.Thermostat,
            TemperatureColor,
            "°C"
        ) { it.temperatureC }
        SensorType.HUMIDITY -> SensorInfo(
            "Humidity",
            Icons.Default.WaterDrop,
            HumidityColor,
            "%"
        ) { it.humidityPct }
        SensorType.LIGHT -> SensorInfo(
            "Light",
            Icons.Default.WbSunny,
            LightColor,
            "lux"
        ) { it.lux?.toDouble() }
        SensorType.SOUND -> SensorInfo(
            "Sound",
            Icons.Default.VolumeUp,
            SoundColor,
            "dB"
        ) { it.sound?.toDouble() }
        SensorType.AIR_QUALITY -> SensorInfo(
            "Air Quality",
            Icons.Default.Air,
            AirQualityColor,
            "ppm"
        ) { it.co2Ppm?.toDouble() }
    }

    // Sorting state
    var sortField by remember { mutableStateOf(SortField.TIME) }
    var sortOrder by remember { mutableStateOf(SortOrder.DESC) }
    var showSortMenu by remember { mutableStateOf(false) }

    // Date range filter state
    var dateRange by remember { mutableStateOf(DateRange.ALL) }
    var showDateMenu by remember { mutableStateOf(false) }

    // Pagination state
    val pageSize = 50
    var currentPage by remember { mutableStateOf(0) }
    val listState = rememberLazyListState()

    // Filter readings by date range
    val filteredReadings = remember(readings, dateRange) {
        if (dateRange == DateRange.ALL || dateRange.days == null) {
            readings
        } else {
            val calendar = Calendar.getInstance()
            if (dateRange == DateRange.TODAY) {
                calendar.set(Calendar.HOUR_OF_DAY, 0)
                calendar.set(Calendar.MINUTE, 0)
                calendar.set(Calendar.SECOND, 0)
                calendar.set(Calendar.MILLISECOND, 0)
            } else {
                calendar.add(Calendar.DAY_OF_YEAR, -dateRange.days!!)
            }
            val cutoffDate = calendar.time
            val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())

            readings.filter { reading ->
                try {
                    val readingDate = dateFormat.parse(reading.ts.take(19))
                    readingDate != null && readingDate.after(cutoffDate)
                } catch (e: Exception) {
                    true
                }
            }
        }
    }

    // Sort filtered readings
    val sortedReadings = remember(filteredReadings, sortField, sortOrder) {
        val sorted = when (sortField) {
            SortField.TIME -> filteredReadings.sortedBy { it.ts }
            SortField.DEVICE -> filteredReadings.sortedBy { it.deviceId }
            SortField.VALUE -> filteredReadings.sortedBy { getValue(it) ?: Double.MIN_VALUE }
        }
        if (sortOrder == SortOrder.DESC) sorted.reversed() else sorted
    }

    // Calculate total pages
    val totalPages = remember(sortedReadings) {
        (sortedReadings.size + pageSize - 1) / pageSize
    }

    // Paginated readings for current page
    val displayedReadings = remember(sortedReadings, currentPage) {
        val startIndex = currentPage * pageSize
        val endIndex = minOf(startIndex + pageSize, sortedReadings.size)
        if (startIndex < sortedReadings.size) {
            sortedReadings.subList(startIndex, endIndex)
        } else {
            emptyList()
        }
    }

    // Scroll to top when page changes
    LaunchedEffect(currentPage) {
        listState.scrollToItem(0)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            icon,
                            contentDescription = null,
                            tint = color,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "$title History",
                            fontWeight = FontWeight.Bold
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back"
                        )
                    }
                },
                actions = {
                    // Sort button
                    Box {
                        IconButton(onClick = { showSortMenu = true }) {
                            Icon(
                                Icons.AutoMirrored.Filled.Sort,
                                contentDescription = "Sort",
                                tint = Cyan500
                            )
                        }
                        DropdownMenu(
                            expanded = showSortMenu,
                            onDismissRequest = { showSortMenu = false }
                        ) {
                            Text(
                                "Sort by",
                                style = MaterialTheme.typography.labelMedium,
                                color = Slate400,
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                            )

                            SortMenuItem(
                                label = "Time",
                                icon = Icons.Default.Schedule,
                                isSelected = sortField == SortField.TIME,
                                sortOrder = if (sortField == SortField.TIME) sortOrder else null,
                                onClick = {
                                    if (sortField == SortField.TIME) {
                                        sortOrder = if (sortOrder == SortOrder.DESC) SortOrder.ASC else SortOrder.DESC
                                    } else {
                                        sortField = SortField.TIME
                                        sortOrder = SortOrder.DESC
                                    }
                                    currentPage = 0
                                    showSortMenu = false
                                }
                            )

                            SortMenuItem(
                                label = "Device",
                                icon = Icons.Default.Router,
                                isSelected = sortField == SortField.DEVICE,
                                sortOrder = if (sortField == SortField.DEVICE) sortOrder else null,
                                onClick = {
                                    if (sortField == SortField.DEVICE) {
                                        sortOrder = if (sortOrder == SortOrder.DESC) SortOrder.ASC else SortOrder.DESC
                                    } else {
                                        sortField = SortField.DEVICE
                                        sortOrder = SortOrder.ASC
                                    }
                                    currentPage = 0
                                    showSortMenu = false
                                }
                            )

                            SortMenuItem(
                                label = "Value",
                                icon = icon,
                                isSelected = sortField == SortField.VALUE,
                                sortOrder = if (sortField == SortField.VALUE) sortOrder else null,
                                onClick = {
                                    if (sortField == SortField.VALUE) {
                                        sortOrder = if (sortOrder == SortOrder.DESC) SortOrder.ASC else SortOrder.DESC
                                    } else {
                                        sortField = SortField.VALUE
                                        sortOrder = SortOrder.DESC
                                    }
                                    currentPage = 0
                                    showSortMenu = false
                                }
                            )
                        }
                    }

                    // Date range filter button
                    Box {
                        IconButton(onClick = { showDateMenu = true }) {
                            Icon(
                                Icons.Default.DateRange,
                                contentDescription = "Filter by date",
                                tint = if (dateRange != DateRange.ALL) Cyan500 else Slate400
                            )
                        }
                        DropdownMenu(
                            expanded = showDateMenu,
                            onDismissRequest = { showDateMenu = false }
                        ) {
                            Text(
                                "Date range",
                                style = MaterialTheme.typography.labelMedium,
                                color = Slate400,
                                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                            )

                            DateRange.entries.forEach { range ->
                                DropdownMenuItem(
                                    text = {
                                        Text(
                                            range.label,
                                            color = if (dateRange == range) Cyan500 else MaterialTheme.colorScheme.onSurface
                                        )
                                    },
                                    leadingIcon = {
                                        Icon(
                                            when (range) {
                                                DateRange.TODAY -> Icons.Default.Today
                                                DateRange.LAST_7_DAYS -> Icons.Default.DateRange
                                                DateRange.LAST_30_DAYS -> Icons.Default.CalendarMonth
                                                DateRange.ALL -> Icons.Default.AllInclusive
                                            },
                                            contentDescription = null,
                                            tint = if (dateRange == range) Cyan500 else Slate400
                                        )
                                    },
                                    trailingIcon = {
                                        if (dateRange == range) {
                                            Icon(
                                                Icons.Default.Check,
                                                contentDescription = null,
                                                tint = Cyan500
                                            )
                                        }
                                    },
                                    onClick = {
                                        dateRange = range
                                        currentPage = 0
                                        showDateMenu = false
                                    }
                                )
                            }
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
        if (isLoading) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = color)
            }
        } else if (readings.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Default.SearchOff,
                        contentDescription = null,
                        tint = Slate400,
                        modifier = Modifier.size(48.dp)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        "No data available",
                        color = Slate400
                    )
                }
            }
        } else {
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
            ) {
                // Stats Card
                item {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Slate800)
                    ) {
                        val values = filteredReadings.mapNotNull { getValue(it) }

                        Column(modifier = Modifier.padding(16.dp)) {
                            // Date range indicator
                            if (dateRange != DateRange.ALL) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(bottom = 12.dp),
                                    horizontalArrangement = Arrangement.Center,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        Icons.Default.FilterList,
                                        contentDescription = null,
                                        tint = Cyan500,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        text = dateRange.label,
                                        style = MaterialTheme.typography.labelMedium,
                                        color = Cyan500
                                    )
                                }
                            }

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceEvenly
                            ) {
                                StatItem(
                                    label = "Min",
                                    value = values.minOrNull()?.let { String.format("%.1f", it) } ?: "-",
                                    unit = unit,
                                    color = color
                                )
                                StatItem(
                                    label = "Avg",
                                    value = values.takeIf { it.isNotEmpty() }?.average()?.let { String.format("%.1f", it) } ?: "-",
                                    unit = unit,
                                    color = color
                                )
                                StatItem(
                                    label = "Max",
                                    value = values.maxOrNull()?.let { String.format("%.1f", it) } ?: "-",
                                    unit = unit,
                                    color = color
                                )
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            // Record count
                            Text(
                                text = if (dateRange == DateRange.ALL)
                                    "${filteredReadings.size} total records"
                                else
                                    "${filteredReadings.size} of ${readings.size} records",
                                style = MaterialTheme.typography.bodySmall,
                                color = Slate400,
                                modifier = Modifier.align(Alignment.CenterHorizontally)
                            )
                        }
                    }
                }

                // Sort indicator and page info
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Sorted by ${sortField.name.lowercase().replaceFirstChar { it.uppercase() }}",
                            style = MaterialTheme.typography.bodySmall,
                            color = Slate400
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Icon(
                            if (sortOrder == SortOrder.DESC) Icons.Default.ArrowDownward else Icons.Default.ArrowUpward,
                            contentDescription = null,
                            tint = Cyan500,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.weight(1f))
                        Text(
                            text = "Page ${currentPage + 1} of $totalPages",
                            style = MaterialTheme.typography.bodySmall,
                            color = Slate400
                        )
                    }
                }

                // Table Header
                stickyHeader {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Slate800)
                            .padding(horizontal = 16.dp, vertical = 12.dp)
                    ) {
                        Text(
                            text = "Time",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = if (sortField == SortField.TIME) Cyan500 else Slate300,
                            modifier = Modifier.weight(1.5f)
                        )
                        Text(
                            text = "Device",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = if (sortField == SortField.DEVICE) Cyan500 else Slate300,
                            modifier = Modifier.weight(1.5f)
                        )
                        Text(
                            text = "Value",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = if (sortField == SortField.VALUE) Cyan500 else Slate300,
                            textAlign = TextAlign.End,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                // Table Data
                itemsIndexed(
                    items = displayedReadings,
                    key = { index, reading -> "${reading.deviceId}-${reading.ts}-$index" }
                ) { index, reading ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(if (index % 2 == 0) Slate900 else Slate950)
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = formatTimestamp(reading.ts),
                            style = MaterialTheme.typography.bodySmall,
                            color = Slate400,
                            modifier = Modifier.weight(1.5f)
                        )
                        Text(
                            text = reading.deviceId.take(12) + if (reading.deviceId.length > 12) "..." else "",
                            style = MaterialTheme.typography.bodySmall,
                            color = Slate400,
                            modifier = Modifier.weight(1.5f)
                        )
                        Text(
                            text = "${getValue(reading)?.let { String.format("%.1f", it) } ?: "-"} $unit",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium,
                            color = color,
                            textAlign = TextAlign.End,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                // Pagination controls
                item {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = Slate800)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Previous button
                            FilledTonalButton(
                                onClick = { if (currentPage > 0) currentPage-- },
                                enabled = currentPage > 0,
                                colors = ButtonDefaults.filledTonalButtonColors(
                                    containerColor = Cyan500.copy(alpha = 0.2f),
                                    contentColor = Cyan500,
                                    disabledContainerColor = Slate700,
                                    disabledContentColor = Slate400
                                )
                            ) {
                                Icon(
                                    Icons.Default.ChevronLeft,
                                    contentDescription = "Previous",
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Prev")
                            }

                            // Page indicator
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    text = "${currentPage + 1} / $totalPages",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                                Text(
                                    text = "${sortedReadings.size} total",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Slate400
                                )
                            }

                            // Next button
                            FilledTonalButton(
                                onClick = { if (currentPage < totalPages - 1) currentPage++ },
                                enabled = currentPage < totalPages - 1,
                                colors = ButtonDefaults.filledTonalButtonColors(
                                    containerColor = Cyan500.copy(alpha = 0.2f),
                                    contentColor = Cyan500,
                                    disabledContainerColor = Slate700,
                                    disabledContentColor = Slate400
                                )
                            ) {
                                Text("Next")
                                Spacer(modifier = Modifier.width(4.dp))
                                Icon(
                                    Icons.Default.ChevronRight,
                                    contentDescription = "Next",
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SortMenuItem(
    label: String,
    icon: ImageVector,
    isSelected: Boolean,
    sortOrder: SortOrder?,
    onClick: () -> Unit
) {
    DropdownMenuItem(
        text = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    label,
                    color = if (isSelected) Cyan500 else MaterialTheme.colorScheme.onSurface
                )
                if (sortOrder != null) {
                    Spacer(modifier = Modifier.width(8.dp))
                    Icon(
                        if (sortOrder == SortOrder.DESC) Icons.Default.ArrowDownward else Icons.Default.ArrowUpward,
                        contentDescription = null,
                        tint = Cyan500,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }
        },
        leadingIcon = {
            Icon(
                icon,
                contentDescription = null,
                tint = if (isSelected) Cyan500 else Slate400
            )
        },
        onClick = onClick
    )
}

@Composable
private fun StatItem(
    label: String,
    value: String,
    unit: String,
    color: Color
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = Slate400
        )
        Spacer(modifier = Modifier.height(4.dp))
        Row(verticalAlignment = Alignment.Bottom) {
            Text(
                text = value,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = color
            )
            Spacer(modifier = Modifier.width(2.dp))
            Text(
                text = unit,
                style = MaterialTheme.typography.bodySmall,
                color = Slate400,
                modifier = Modifier.padding(bottom = 4.dp)
            )
        }
    }
}

private fun formatTimestamp(ts: String): String {
    return try {
        val inputFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
        val outputFormat = SimpleDateFormat("MM/dd HH:mm", Locale.getDefault())
        val date = inputFormat.parse(ts.take(19))
        date?.let { outputFormat.format(it) } ?: ts.take(16)
    } catch (e: Exception) {
        ts.take(16)
    }
}

private data class SensorInfo(
    val title: String,
    val icon: ImageVector,
    val color: Color,
    val unit: String,
    val getValue: (Reading) -> Double?
)
