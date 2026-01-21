package com.monitoring.iotmon.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.monitoring.iotmon.data.models.Reading
import com.monitoring.iotmon.data.models.UserControllerAssignment
import com.monitoring.iotmon.data.repository.IoTRepository
import com.monitoring.iotmon.data.repository.Result
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

enum class DeviceStatus { ONLINE, OFFLINE, UNKNOWN }

data class DashboardState(
    val isLoading: Boolean = true,
    val devices: List<String> = emptyList(),
    val selectedDevice: String? = null,
    val selectedDevicePairingCode: String? = null,
    val latestReading: Reading? = null,
    val history: List<Reading> = emptyList(),
    val lastUpdate: String? = null,
    val error: String? = null,
    val isRefreshing: Boolean = false,
    val deviceStatus: DeviceStatus = DeviceStatus.UNKNOWN,
    val lastSeen: String? = null
)

class DashboardViewModel : ViewModel() {

    private val repository = IoTRepository()

    private val _state = MutableStateFlow(DashboardState())
    val state: StateFlow<DashboardState> = _state.asStateFlow()

    private var autoRefreshJob: Job? = null
    private var controllerMap: Map<String, String> = emptyMap() // deviceId -> pairingCode

    fun loadDevices(userId: Int, isAdmin: Boolean) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)

            // Load user controllers to get pairing codes
            val controllersResult = repository.getUserControllers(userId)
            if (controllersResult is Result.Success) {
                controllerMap = controllersResult.data.associate { it.deviceId to it.pairingCode }
            }

            when (val result = repository.getDevices()) {
                is Result.Success -> {
                    val devices = result.data
                    val selectedDevice = devices.firstOrNull()
                    val pairingCode = selectedDevice?.let { controllerMap[it] }

                    _state.value = _state.value.copy(
                        devices = devices,
                        selectedDevice = selectedDevice,
                        selectedDevicePairingCode = pairingCode,
                        isLoading = false
                    )

                    // Load data for selected device
                    selectedDevice?.let { loadDeviceData(it) }

                    // Start auto-refresh
                    startAutoRefresh()
                }
                is Result.Error -> {
                    _state.value = _state.value.copy(
                        isLoading = false,
                        error = result.message
                    )
                }
            }
        }
    }

    fun selectDevice(deviceId: String) {
        val pairingCode = controllerMap[deviceId]
        _state.value = _state.value.copy(
            selectedDevice = deviceId,
            selectedDevicePairingCode = pairingCode
        )
        loadDeviceData(deviceId)
    }

    fun loadDeviceData(deviceId: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isRefreshing = true)

            // Load latest reading and history in parallel
            val latestResult = repository.getLatestReading(deviceId)
            val historyResult = repository.getHistory(deviceId, 1) // Last hour

            when (latestResult) {
                is Result.Success -> {
                    val reading = latestResult.data
                    val (status, lastSeen) = if (reading != null) {
                        calculateDeviceStatus(reading.ts)
                    } else {
                        Pair(DeviceStatus.UNKNOWN, null)
                    }

                    _state.value = _state.value.copy(
                        latestReading = reading,
                        lastUpdate = java.text.SimpleDateFormat(
                            "HH:mm:ss",
                            java.util.Locale.getDefault()
                        ).format(java.util.Date()),
                        deviceStatus = status,
                        lastSeen = lastSeen
                    )
                }
                is Result.Error -> {
                    _state.value = _state.value.copy(
                        error = latestResult.message,
                        deviceStatus = DeviceStatus.UNKNOWN
                    )
                }
            }

            when (historyResult) {
                is Result.Success -> {
                    _state.value = _state.value.copy(
                        history = historyResult.data,
                        isRefreshing = false
                    )
                }
                is Result.Error -> {
                    _state.value = _state.value.copy(
                        isRefreshing = false,
                        error = historyResult.message
                    )
                }
            }
        }
    }

    fun refresh() {
        _state.value.selectedDevice?.let { loadDeviceData(it) }
    }

    private fun startAutoRefresh() {
        autoRefreshJob?.cancel()
        autoRefreshJob = viewModelScope.launch {
            while (isActive) {
                delay(5000) // Refresh every 5 seconds like web frontend
                _state.value.selectedDevice?.let { loadDeviceData(it) }
            }
        }
    }

    fun stopAutoRefresh() {
        autoRefreshJob?.cancel()
    }

    override fun onCleared() {
        super.onCleared()
        autoRefreshJob?.cancel()
    }

    fun clearError() {
        _state.value = _state.value.copy(error = null)
    }

    private fun calculateDeviceStatus(timestamp: String): Pair<DeviceStatus, String?> {
        return try {
            // Parse ISO 8601 timestamp - server sends UTC time
            val dateFormat = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.getDefault())
            dateFormat.timeZone = java.util.TimeZone.getTimeZone("UTC")

            // Handle timestamps with or without milliseconds/timezone suffix
            val cleanTimestamp = timestamp
                .replace(Regex("\\.[0-9]+"), "") // Remove milliseconds
                .replace("Z", "") // Remove Z suffix
                .take(19) // Take only yyyy-MM-ddTHH:mm:ss

            val readingDate = dateFormat.parse(cleanTimestamp)
            val now = java.util.Date()

            if (readingDate != null) {
                val diffMs = now.time - readingDate.time
                val diffSeconds = diffMs / 1000
                val diffMinutes = diffSeconds / 60
                val diffHours = diffMinutes / 60
                val diffDays = diffHours / 24

                // Device is online if last reading was within 2 minutes
                val status = if (diffMinutes < 2) DeviceStatus.ONLINE else DeviceStatus.OFFLINE

                val lastSeen = when {
                    diffSeconds < 30 -> "Just now"
                    diffSeconds < 60 -> "${diffSeconds}s ago"
                    diffMinutes < 60 -> "${diffMinutes}m ago"
                    diffHours < 24 -> "${diffHours}h ago"
                    else -> "${diffDays}d ago"
                }

                Pair(status, lastSeen)
            } else {
                Pair(DeviceStatus.UNKNOWN, null)
            }
        } catch (e: Exception) {
            Pair(DeviceStatus.UNKNOWN, "Error: ${e.message}")
        }
    }
}
