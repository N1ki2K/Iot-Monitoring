package com.monitoring.iotmon.data.preferences

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import com.monitoring.iotmon.data.models.AuthUser
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "user_prefs")

class UserPreferences(private val context: Context) {

    companion object {
        private val USER_ID = intPreferencesKey("user_id")
        private val USERNAME = stringPreferencesKey("username")
        private val EMAIL = stringPreferencesKey("email")
        private val IS_ADMIN = intPreferencesKey("is_admin")
        private val DARK_MODE = booleanPreferencesKey("dark_mode")
        private val BIOMETRIC_ENABLED = booleanPreferencesKey("biometric_enabled")
        private val SAVED_EMAIL = stringPreferencesKey("saved_email")
        private val SAVED_PASSWORD = stringPreferencesKey("saved_password")

        // Notification settings
        private val NOTIFICATIONS_ENABLED = booleanPreferencesKey("notifications_enabled")
        private val TEMP_HIGH_THRESHOLD = floatPreferencesKey("temp_high_threshold")
        private val TEMP_LOW_THRESHOLD = floatPreferencesKey("temp_low_threshold")
        private val TEMP_ALERTS_ENABLED = booleanPreferencesKey("temp_alerts_enabled")
        private val HUMIDITY_HIGH_THRESHOLD = floatPreferencesKey("humidity_high_threshold")
        private val HUMIDITY_LOW_THRESHOLD = floatPreferencesKey("humidity_low_threshold")
        private val HUMIDITY_ALERTS_ENABLED = booleanPreferencesKey("humidity_alerts_enabled")
        private val NOISE_HIGH_THRESHOLD = floatPreferencesKey("noise_high_threshold")
        private val NOISE_ALERTS_ENABLED = booleanPreferencesKey("noise_alerts_enabled")
        private val DEVICE_OFFLINE_ALERTS = booleanPreferencesKey("device_offline_alerts")
    }

    val darkModeFlow: Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[DARK_MODE] ?: true // Default to dark mode
    }

    suspend fun setDarkMode(enabled: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[DARK_MODE] = enabled
        }
    }

    val biometricEnabledFlow: Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[BIOMETRIC_ENABLED] ?: false
    }

    suspend fun setBiometricEnabled(enabled: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[BIOMETRIC_ENABLED] = enabled
        }
    }

    // Save credentials for biometric login
    suspend fun saveCredentials(email: String, password: String) {
        context.dataStore.edit { preferences ->
            preferences[SAVED_EMAIL] = email
            preferences[SAVED_PASSWORD] = password
        }
    }

    suspend fun getCredentials(): Pair<String?, String?> {
        var email: String? = null
        var password: String? = null
        context.dataStore.edit { preferences ->
            email = preferences[SAVED_EMAIL]
            password = preferences[SAVED_PASSWORD]
        }
        return Pair(email, password)
    }

    suspend fun clearCredentials() {
        context.dataStore.edit { preferences ->
            preferences.remove(SAVED_EMAIL)
            preferences.remove(SAVED_PASSWORD)
            preferences.remove(BIOMETRIC_ENABLED)
        }
    }

    val userFlow: Flow<AuthUser?> = context.dataStore.data.map { preferences ->
        val userId = preferences[USER_ID]
        if (userId != null) {
            AuthUser(
                id = userId,
                username = preferences[USERNAME] ?: "",
                email = preferences[EMAIL] ?: "",
                isAdmin = preferences[IS_ADMIN] ?: 0
            )
        } else {
            null
        }
    }

    suspend fun saveUser(user: AuthUser) {
        context.dataStore.edit { preferences ->
            preferences[USER_ID] = user.id
            preferences[USERNAME] = user.username
            preferences[EMAIL] = user.email
            preferences[IS_ADMIN] = user.isAdmin
        }
    }

    suspend fun updateUser(user: AuthUser) {
        context.dataStore.edit { preferences ->
            preferences[USERNAME] = user.username
            preferences[EMAIL] = user.email
        }
    }

    suspend fun clearUser() {
        context.dataStore.edit { preferences ->
            preferences.clear()
        }
    }

    suspend fun getUserId(): Int? {
        var userId: Int? = null
        context.dataStore.edit { preferences ->
            userId = preferences[USER_ID]
        }
        return userId
    }

    // Notification settings
    val notificationsEnabledFlow: Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[NOTIFICATIONS_ENABLED] ?: false
    }

    suspend fun setNotificationsEnabled(enabled: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[NOTIFICATIONS_ENABLED] = enabled
        }
    }

    // Temperature thresholds
    val tempHighThresholdFlow: Flow<Float> = context.dataStore.data.map { preferences ->
        preferences[TEMP_HIGH_THRESHOLD] ?: 35f
    }

    val tempLowThresholdFlow: Flow<Float> = context.dataStore.data.map { preferences ->
        preferences[TEMP_LOW_THRESHOLD] ?: 10f
    }

    val tempAlertsEnabledFlow: Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[TEMP_ALERTS_ENABLED] ?: true
    }

    suspend fun setTempThresholds(high: Float, low: Float) {
        context.dataStore.edit { preferences ->
            preferences[TEMP_HIGH_THRESHOLD] = high
            preferences[TEMP_LOW_THRESHOLD] = low
        }
    }

    suspend fun setTempAlertsEnabled(enabled: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[TEMP_ALERTS_ENABLED] = enabled
        }
    }

    // Humidity thresholds
    val humidityHighThresholdFlow: Flow<Float> = context.dataStore.data.map { preferences ->
        preferences[HUMIDITY_HIGH_THRESHOLD] ?: 80f
    }

    val humidityLowThresholdFlow: Flow<Float> = context.dataStore.data.map { preferences ->
        preferences[HUMIDITY_LOW_THRESHOLD] ?: 30f
    }

    val humidityAlertsEnabledFlow: Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[HUMIDITY_ALERTS_ENABLED] ?: true
    }

    suspend fun setHumidityThresholds(high: Float, low: Float) {
        context.dataStore.edit { preferences ->
            preferences[HUMIDITY_HIGH_THRESHOLD] = high
            preferences[HUMIDITY_LOW_THRESHOLD] = low
        }
    }

    suspend fun setHumidityAlertsEnabled(enabled: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[HUMIDITY_ALERTS_ENABLED] = enabled
        }
    }

    // Noise threshold
    val noiseHighThresholdFlow: Flow<Float> = context.dataStore.data.map { preferences ->
        preferences[NOISE_HIGH_THRESHOLD] ?: 80f
    }

    val noiseAlertsEnabledFlow: Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[NOISE_ALERTS_ENABLED] ?: true
    }

    suspend fun setNoiseThreshold(high: Float) {
        context.dataStore.edit { preferences ->
            preferences[NOISE_HIGH_THRESHOLD] = high
        }
    }

    suspend fun setNoiseAlertsEnabled(enabled: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[NOISE_ALERTS_ENABLED] = enabled
        }
    }

    // Device offline alerts
    val deviceOfflineAlertsFlow: Flow<Boolean> = context.dataStore.data.map { preferences ->
        preferences[DEVICE_OFFLINE_ALERTS] ?: true
    }

    suspend fun setDeviceOfflineAlerts(enabled: Boolean) {
        context.dataStore.edit { preferences ->
            preferences[DEVICE_OFFLINE_ALERTS] = enabled
        }
    }

    // Get all threshold settings at once
    data class ThresholdSettings(
        val notificationsEnabled: Boolean,
        val tempAlertsEnabled: Boolean,
        val tempHighThreshold: Float,
        val tempLowThreshold: Float,
        val humidityAlertsEnabled: Boolean,
        val humidityHighThreshold: Float,
        val humidityLowThreshold: Float,
        val noiseAlertsEnabled: Boolean,
        val noiseHighThreshold: Float,
        val deviceOfflineAlerts: Boolean
    )

    val thresholdSettingsFlow: Flow<ThresholdSettings> = context.dataStore.data.map { preferences ->
        ThresholdSettings(
            notificationsEnabled = preferences[NOTIFICATIONS_ENABLED] ?: false,
            tempAlertsEnabled = preferences[TEMP_ALERTS_ENABLED] ?: true,
            tempHighThreshold = preferences[TEMP_HIGH_THRESHOLD] ?: 35f,
            tempLowThreshold = preferences[TEMP_LOW_THRESHOLD] ?: 10f,
            humidityAlertsEnabled = preferences[HUMIDITY_ALERTS_ENABLED] ?: true,
            humidityHighThreshold = preferences[HUMIDITY_HIGH_THRESHOLD] ?: 80f,
            humidityLowThreshold = preferences[HUMIDITY_LOW_THRESHOLD] ?: 30f,
            noiseAlertsEnabled = preferences[NOISE_ALERTS_ENABLED] ?: true,
            noiseHighThreshold = preferences[NOISE_HIGH_THRESHOLD] ?: 80f,
            deviceOfflineAlerts = preferences[DEVICE_OFFLINE_ALERTS] ?: true
        )
    }
}
