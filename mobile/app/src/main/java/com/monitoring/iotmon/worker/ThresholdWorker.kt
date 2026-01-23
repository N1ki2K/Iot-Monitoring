package com.monitoring.iotmon.worker

import android.content.Context
import android.util.Log
import androidx.work.*
import com.monitoring.iotmon.data.api.ApiClient
import com.monitoring.iotmon.data.preferences.UserPreferences
import com.monitoring.iotmon.util.NotificationHelper
import kotlinx.coroutines.flow.first
import java.util.concurrent.TimeUnit

class ThresholdWorker(
    context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    private val preferences = UserPreferences(context)
    private val notificationHelper = NotificationHelper(context)
    private val apiService = ApiClient.apiService

    companion object {
        const val TAG = "ThresholdWorker"
        const val WORK_NAME = "threshold_monitoring"

        // Keys for tracking last alert times to avoid spam
        private val lastAlertTimes = mutableMapOf<String, Long>()
        private const val ALERT_COOLDOWN_MS = 5 * 60 * 1000L // 5 minutes between alerts for same sensor

        fun schedule(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val request = PeriodicWorkRequestBuilder<ThresholdWorker>(
                15, TimeUnit.MINUTES // Check every 15 minutes
            )
                .setConstraints(constraints)
                .setBackoffCriteria(
                    BackoffPolicy.LINEAR,
                    WorkRequest.MIN_BACKOFF_MILLIS,
                    TimeUnit.MILLISECONDS
                )
                .build()

            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(
                    WORK_NAME,
                    ExistingPeriodicWorkPolicy.KEEP,
                    request
                )

            Log.d(TAG, "Threshold monitoring scheduled")
        }

        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
            Log.d(TAG, "Threshold monitoring cancelled")
        }

        // Run an immediate one-time check
        fun runOnce(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val request = OneTimeWorkRequestBuilder<ThresholdWorker>()
                .setConstraints(constraints)
                .build()

            WorkManager.getInstance(context).enqueue(request)
        }
    }

    override suspend fun doWork(): Result {
        Log.d(TAG, "Starting threshold check...")

        try {
            // Get threshold settings
            val settings = preferences.thresholdSettingsFlow.first()

            if (!settings.notificationsEnabled) {
                Log.d(TAG, "Notifications disabled, skipping check")
                return Result.success()
            }

            // Get user ID
            val userId = preferences.getUserId() ?: run {
                Log.d(TAG, "No user logged in, skipping check")
                return Result.success()
            }

            // Fetch user's controllers to get their devices
            val controllersResponse = apiService.getUserControllers(userId)

            if (!controllersResponse.isSuccessful) {
                Log.e(TAG, "Failed to fetch controllers: ${controllersResponse.code()}")
                return Result.retry()
            }

            val controllers = controllersResponse.body() ?: run {
                Log.d(TAG, "No controllers available")
                return Result.success()
            }

            // Fetch latest reading for each device
            for (controller in controllers) {
                val deviceId = controller.deviceId
                val deviceLabel = controller.assignmentLabel ?: controller.controllerLabel ?: deviceId

                try {
                    val readingResponse = apiService.getLatestReading(deviceId)

                    if (readingResponse.isSuccessful) {
                        val reading = readingResponse.body()
                        if (reading != null) {
                            checkTemperature(reading.temperatureC?.toFloat(), settings, deviceLabel)
                            checkHumidity(reading.humidityPct?.toFloat(), settings, deviceLabel)
                            checkNoise(reading.sound?.toFloat(), settings, deviceLabel)
                            checkDeviceStatus(reading.ts, deviceLabel, settings)
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error fetching reading for device $deviceId", e)
                }
            }

            Log.d(TAG, "Threshold check completed successfully")
            return Result.success()

        } catch (e: Exception) {
            Log.e(TAG, "Error during threshold check", e)
            return Result.retry()
        }
    }

    private fun checkTemperature(temp: Float?, settings: UserPreferences.ThresholdSettings, deviceLabel: String) {
        if (temp == null || !settings.tempAlertsEnabled) return

        val key = "temp_$deviceLabel"
        if (!canAlert(key)) return

        when {
            temp > settings.tempHighThreshold -> {
                notificationHelper.sendThresholdAlert(
                    title = "High Temperature - $deviceLabel",
                    message = "Temperature is ${temp.toInt()}C (above ${settings.tempHighThreshold.toInt()}C)",
                    sensorType = "Temperature",
                    currentValue = temp,
                    thresholdValue = settings.tempHighThreshold,
                    isHigh = true
                )
                markAlerted(key)
            }
            temp < settings.tempLowThreshold -> {
                notificationHelper.sendThresholdAlert(
                    title = "Low Temperature - $deviceLabel",
                    message = "Temperature is ${temp.toInt()}C (below ${settings.tempLowThreshold.toInt()}C)",
                    sensorType = "Temperature",
                    currentValue = temp,
                    thresholdValue = settings.tempLowThreshold,
                    isHigh = false
                )
                markAlerted(key)
            }
        }
    }

    private fun checkHumidity(humidity: Float?, settings: UserPreferences.ThresholdSettings, deviceLabel: String) {
        if (humidity == null || !settings.humidityAlertsEnabled) return

        val key = "humidity_$deviceLabel"
        if (!canAlert(key)) return

        when {
            humidity > settings.humidityHighThreshold -> {
                notificationHelper.sendThresholdAlert(
                    title = "High Humidity - $deviceLabel",
                    message = "Humidity is ${humidity.toInt()}% (above ${settings.humidityHighThreshold.toInt()}%)",
                    sensorType = "Humidity",
                    currentValue = humidity,
                    thresholdValue = settings.humidityHighThreshold,
                    isHigh = true
                )
                markAlerted(key)
            }
            humidity < settings.humidityLowThreshold -> {
                notificationHelper.sendThresholdAlert(
                    title = "Low Humidity - $deviceLabel",
                    message = "Humidity is ${humidity.toInt()}% (below ${settings.humidityLowThreshold.toInt()}%)",
                    sensorType = "Humidity",
                    currentValue = humidity,
                    thresholdValue = settings.humidityLowThreshold,
                    isHigh = false
                )
                markAlerted(key)
            }
        }
    }

    private fun checkNoise(noise: Float?, settings: UserPreferences.ThresholdSettings, deviceLabel: String) {
        if (noise == null || !settings.noiseAlertsEnabled) return

        val key = "noise_$deviceLabel"
        if (!canAlert(key)) return

        if (noise > settings.noiseHighThreshold) {
            notificationHelper.sendThresholdAlert(
                title = "High Noise Level - $deviceLabel",
                message = "Noise level is ${noise.toInt()} dB (above ${settings.noiseHighThreshold.toInt()} dB)",
                sensorType = "Noise",
                currentValue = noise,
                thresholdValue = settings.noiseHighThreshold,
                isHigh = true
            )
            markAlerted(key)
        }
    }

    private fun checkDeviceStatus(timestamp: String?, deviceLabel: String, settings: UserPreferences.ThresholdSettings) {
        if (timestamp == null || !settings.deviceOfflineAlerts) return

        val key = "device_$deviceLabel"
        if (!canAlert(key)) return

        try {
            val dateFormat = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.getDefault())
            dateFormat.timeZone = java.util.TimeZone.getTimeZone("UTC")

            val cleanTimestamp = timestamp
                .replace(Regex("\\.[0-9]+"), "")
                .replace("Z", "")
                .take(19)

            val readingDate = dateFormat.parse(cleanTimestamp)
            val now = java.util.Date()

            if (readingDate != null) {
                val diffMs = now.time - readingDate.time
                val diffMinutes = diffMs / 1000 / 60

                // Alert if device hasn't sent data in 10+ minutes
                if (diffMinutes >= 10) {
                    val lastSeen = when {
                        diffMinutes < 60 -> "${diffMinutes}m ago"
                        diffMinutes < 1440 -> "${diffMinutes / 60}h ago"
                        else -> "${diffMinutes / 1440}d ago"
                    }

                    notificationHelper.sendDeviceOfflineAlert(deviceLabel, lastSeen)
                    markAlerted(key)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error parsing timestamp for device status check", e)
        }
    }

    private fun canAlert(key: String): Boolean {
        val lastTime = lastAlertTimes[key] ?: 0L
        return System.currentTimeMillis() - lastTime > ALERT_COOLDOWN_MS
    }

    private fun markAlerted(key: String) {
        lastAlertTimes[key] = System.currentTimeMillis()
    }
}
