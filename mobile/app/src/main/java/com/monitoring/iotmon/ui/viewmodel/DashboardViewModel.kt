package com.monitoring.iotmon.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.monitoring.iotmon.data.models.Reading
import com.monitoring.iotmon.data.models.UserControllerAssignment
import com.monitoring.iotmon.data.preferences.UserPreferences
import com.monitoring.iotmon.data.repository.IoTRepository
import com.monitoring.iotmon.data.repository.Result
import com.monitoring.iotmon.util.NotificationHelper
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
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

class DashboardViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = IoTRepository()
    private val userPreferences = UserPreferences(application)
    private val notificationHelper = NotificationHelper(application)

    private val _state = MutableStateFlow(DashboardState())
    val state: StateFlow<DashboardState> = _state.asStateFlow()

    private var autoRefreshJob: Job? = null
    private var controllerMap: Map<String, String> = emptyMap() // deviceId -> pairingCode

    // Track last alerted values to avoid duplicate notifications
    private val lastAlertedTemp = mutableMapOf<String, Float?>()
    private val lastAlertedHumidity = mutableMapOf<String, Float?>()
    private val lastAlertedNoise = mutableMapOf<String, Float?>()
    private val lastDeviceStatus = mutableMapOf<String, DeviceStatus>()

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

                    // Check thresholds and send notifications
                    if (reading != null) {
                        checkThresholdsAndNotify(deviceId, reading, status, lastSeen)
                    }
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

    private fun checkThresholdsAndNotify(deviceId: String, reading: Reading, status: DeviceStatus, lastSeen: String?) {
        viewModelScope.launch {
            val settings = userPreferences.thresholdSettingsFlow.first()

            // Check if notifications are enabled
            if (!settings.notificationsEnabled) return@launch

            val deviceLabel = deviceId

            // Check temperature
            if (settings.tempAlertsEnabled) {
                val temp = reading.temperatureC?.toFloat()
                if (temp != null) {
                    val wasInRange = lastAlertedTemp[deviceId]?.let {
                        it >= settings.tempLowThreshold && it <= settings.tempHighThreshold
                    } ?: true
                    val isOutOfRange = temp < settings.tempLowThreshold || temp > settings.tempHighThreshold

                    if (isOutOfRange && wasInRange) {
                        val isHigh = temp > settings.tempHighThreshold
                        val threshold = if (isHigh) settings.tempHighThreshold else settings.tempLowThreshold
                        notificationHelper.sendThresholdAlert(
                            title = "Temperature Alert - $deviceLabel",
                            message = "Temperature is ${if (isHigh) "above" else "below"} threshold",
                            sensorType = "Temperature",
                            currentValue = temp,
                            thresholdValue = threshold,
                            isHigh = isHigh
                        )
                    }
                    lastAlertedTemp[deviceId] = temp
                }
            }

            // Check humidity
            if (settings.humidityAlertsEnabled) {
                val humidity = reading.humidityPct?.toFloat()
                if (humidity != null) {
                    val wasInRange = lastAlertedHumidity[deviceId]?.let {
                        it >= settings.humidityLowThreshold && it <= settings.humidityHighThreshold
                    } ?: true
                    val isOutOfRange = humidity < settings.humidityLowThreshold || humidity > settings.humidityHighThreshold

                    if (isOutOfRange && wasInRange) {
                        val isHigh = humidity > settings.humidityHighThreshold
                        val threshold = if (isHigh) settings.humidityHighThreshold else settings.humidityLowThreshold
                        notificationHelper.sendThresholdAlert(
                            title = "Humidity Alert - $deviceLabel",
                            message = "Humidity is ${if (isHigh) "above" else "below"} threshold",
                            sensorType = "Humidity",
                            currentValue = humidity,
                            thresholdValue = threshold,
                            isHigh = isHigh
                        )
                    }
                    lastAlertedHumidity[deviceId] = humidity
                }
            }

            // Check noise
            if (settings.noiseAlertsEnabled) {
                val noise = reading.sound?.toFloat()
                if (noise != null) {
                    val wasInRange = lastAlertedNoise[deviceId]?.let { it <= settings.noiseHighThreshold } ?: true
                    val isOutOfRange = noise > settings.noiseHighThreshold

                    if (isOutOfRange && wasInRange) {
                        notificationHelper.sendThresholdAlert(
                            title = "Noise Alert - $deviceLabel",
                            message = "Noise level exceeded threshold",
                            sensorType = "Noise",
                            currentValue = noise,
                            thresholdValue = settings.noiseHighThreshold,
                            isHigh = true
                        )
                    }
                    lastAlertedNoise[deviceId] = noise
                }
            }

            // Check device offline
            if (settings.deviceOfflineAlerts) {
                val previousStatus = lastDeviceStatus[deviceId]
                if (previousStatus == DeviceStatus.ONLINE && status == DeviceStatus.OFFLINE) {
                    notificationHelper.sendDeviceOfflineAlert(deviceLabel, lastSeen ?: "Unknown")
                }
                lastDeviceStatus[deviceId] = status
            }
        }
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
