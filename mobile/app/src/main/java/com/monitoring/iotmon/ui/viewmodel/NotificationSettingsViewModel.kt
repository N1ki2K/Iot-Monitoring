package com.monitoring.iotmon.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.monitoring.iotmon.data.preferences.UserPreferences
import com.monitoring.iotmon.ui.screens.NotificationSettingsState
import com.monitoring.iotmon.worker.ThresholdWorker
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class NotificationSettingsViewModel(application: Application) : AndroidViewModel(application) {

    private val preferences = UserPreferences(application)
    private val context = application.applicationContext

    private val _state = MutableStateFlow(NotificationSettingsState())
    val state: StateFlow<NotificationSettingsState> = _state.asStateFlow()

    init {
        loadSettings()
    }

    private fun loadSettings() {
        viewModelScope.launch {
            preferences.thresholdSettingsFlow.collect { settings ->
                _state.value = NotificationSettingsState(
                    notificationsEnabled = settings.notificationsEnabled,
                    tempAlertsEnabled = settings.tempAlertsEnabled,
                    tempHighThreshold = settings.tempHighThreshold,
                    tempLowThreshold = settings.tempLowThreshold,
                    humidityAlertsEnabled = settings.humidityAlertsEnabled,
                    humidityHighThreshold = settings.humidityHighThreshold,
                    humidityLowThreshold = settings.humidityLowThreshold,
                    noiseAlertsEnabled = settings.noiseAlertsEnabled,
                    noiseHighThreshold = settings.noiseHighThreshold,
                    deviceOfflineAlerts = settings.deviceOfflineAlerts
                )
            }
        }
    }

    fun toggleNotifications(enabled: Boolean) {
        viewModelScope.launch {
            preferences.setNotificationsEnabled(enabled)
            _state.value = _state.value.copy(notificationsEnabled = enabled)

            // Start or stop the background worker
            if (enabled) {
                ThresholdWorker.schedule(context)
            } else {
                ThresholdWorker.cancel(context)
            }
        }
    }

    fun toggleTempAlerts(enabled: Boolean) {
        viewModelScope.launch {
            preferences.setTempAlertsEnabled(enabled)
            _state.value = _state.value.copy(tempAlertsEnabled = enabled)
        }
    }

    fun updateTempThresholds(high: Float, low: Float) {
        viewModelScope.launch {
            preferences.setTempThresholds(high, low)
            _state.value = _state.value.copy(
                tempHighThreshold = high,
                tempLowThreshold = low
            )
        }
    }

    fun toggleHumidityAlerts(enabled: Boolean) {
        viewModelScope.launch {
            preferences.setHumidityAlertsEnabled(enabled)
            _state.value = _state.value.copy(humidityAlertsEnabled = enabled)
        }
    }

    fun updateHumidityThresholds(high: Float, low: Float) {
        viewModelScope.launch {
            preferences.setHumidityThresholds(high, low)
            _state.value = _state.value.copy(
                humidityHighThreshold = high,
                humidityLowThreshold = low
            )
        }
    }

    fun toggleNoiseAlerts(enabled: Boolean) {
        viewModelScope.launch {
            preferences.setNoiseAlertsEnabled(enabled)
            _state.value = _state.value.copy(noiseAlertsEnabled = enabled)
        }
    }

    fun updateNoiseThreshold(high: Float) {
        viewModelScope.launch {
            preferences.setNoiseThreshold(high)
            _state.value = _state.value.copy(noiseHighThreshold = high)
        }
    }

    fun toggleDeviceOfflineAlerts(enabled: Boolean) {
        viewModelScope.launch {
            preferences.setDeviceOfflineAlerts(enabled)
            _state.value = _state.value.copy(deviceOfflineAlerts = enabled)
        }
    }
}
