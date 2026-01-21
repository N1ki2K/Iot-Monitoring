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

data class DashboardState(
    val isLoading: Boolean = true,
    val devices: List<String> = emptyList(),
    val selectedDevice: String? = null,
    val latestReading: Reading? = null,
    val history: List<Reading> = emptyList(),
    val lastUpdate: String? = null,
    val error: String? = null,
    val isRefreshing: Boolean = false
)

class DashboardViewModel : ViewModel() {

    private val repository = IoTRepository()

    private val _state = MutableStateFlow(DashboardState())
    val state: StateFlow<DashboardState> = _state.asStateFlow()

    private var autoRefreshJob: Job? = null

    fun loadDevices(userId: Int, isAdmin: Boolean) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)

            when (val result = repository.getDevices()) {
                is Result.Success -> {
                    val devices = result.data
                    val selectedDevice = devices.firstOrNull()

                    _state.value = _state.value.copy(
                        devices = devices,
                        selectedDevice = selectedDevice,
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
        _state.value = _state.value.copy(selectedDevice = deviceId)
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
                    _state.value = _state.value.copy(
                        latestReading = latestResult.data,
                        lastUpdate = java.text.SimpleDateFormat(
                            "HH:mm:ss",
                            java.util.Locale.getDefault()
                        ).format(java.util.Date())
                    )
                }
                is Result.Error -> {
                    _state.value = _state.value.copy(error = latestResult.message)
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
}
