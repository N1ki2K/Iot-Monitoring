package com.monitoring.iotmon.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.widget.RemoteViews
import com.monitoring.iotmon.MainActivity
import com.monitoring.iotmon.R
import com.monitoring.iotmon.data.api.ApiClient
import com.monitoring.iotmon.data.repository.IoTRepository
import com.monitoring.iotmon.data.repository.Result
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors

class SensorWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_REFRESH = "com.monitoring.iotmon.widget.ACTION_REFRESH"
        private const val PREFS_NAME = "widget_prefs"
        private const val PREF_DEVICE_ID = "widget_device_id"
        private const val PREF_TEMP = "widget_temp"
        private const val PREF_HUMIDITY = "widget_humidity"
        private const val PREF_LIGHT = "widget_light"
        private const val PREF_SOUND = "widget_sound"
        private const val PREF_LAST_UPDATE = "widget_last_update"
        private const val PREF_IS_ONLINE = "widget_is_online"

        private val executor = Executors.newSingleThreadExecutor()

        fun updateAllWidgets(context: Context) {
            val intent = Intent(context, SensorWidgetProvider::class.java).apply {
                action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val ids = appWidgetManager.getAppWidgetIds(
                    ComponentName(context, SensorWidgetProvider::class.java)
                )
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            }
            context.sendBroadcast(intent)
        }

        fun getSelectedDeviceId(context: Context): String? {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return prefs.getString(PREF_DEVICE_ID, null)
        }

        fun setSelectedDeviceId(context: Context, deviceId: String) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(PREF_DEVICE_ID, deviceId).apply()
        }

        private fun saveCachedData(
            context: Context,
            temp: String,
            humidity: String,
            light: String,
            sound: String,
            lastUpdate: String,
            isOnline: Boolean
        ) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit()
                .putString(PREF_TEMP, temp)
                .putString(PREF_HUMIDITY, humidity)
                .putString(PREF_LIGHT, light)
                .putString(PREF_SOUND, sound)
                .putString(PREF_LAST_UPDATE, lastUpdate)
                .putBoolean(PREF_IS_ONLINE, isOnline)
                .apply()
        }

        private fun getCachedData(context: Context): CachedWidgetData {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            return CachedWidgetData(
                temp = prefs.getString(PREF_TEMP, "--") ?: "--",
                humidity = prefs.getString(PREF_HUMIDITY, "--") ?: "--",
                light = prefs.getString(PREF_LIGHT, "--") ?: "--",
                sound = prefs.getString(PREF_SOUND, "--") ?: "--",
                lastUpdate = prefs.getString(PREF_LAST_UPDATE, "Tap to refresh") ?: "Tap to refresh",
                isOnline = prefs.getBoolean(PREF_IS_ONLINE, false)
            )
        }
    }

    data class CachedWidgetData(
        val temp: String,
        val humidity: String,
        val light: String,
        val sound: String,
        val lastUpdate: String,
        val isOnline: Boolean
    )

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        if (intent.action == ACTION_REFRESH) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val componentName = ComponentName(context, SensorWidgetProvider::class.java)
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)

            // Show loading state
            for (appWidgetId in appWidgetIds) {
                val views = RemoteViews(context.packageName, R.layout.widget_sensor)
                views.setTextViewText(R.id.widget_last_updated, "Refreshing...")
                appWidgetManager.updateAppWidget(appWidgetId, views)
            }

            // Fetch data in background
            executor.execute {
                fetchDataAndUpdate(context, appWidgetManager, appWidgetIds)
            }
        }
    }

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
    }

    override fun onDisabled(context: Context) {
        super.onDisabled(context)
    }

    private fun updateAppWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        val views = RemoteViews(context.packageName, R.layout.widget_sensor)

        // Set click intent to open app
        val openAppIntent = Intent(context, MainActivity::class.java)
        val openAppPendingIntent = PendingIntent.getActivity(
            context, 0, openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_container, openAppPendingIntent)

        // Set refresh intent on last updated text
        val refreshIntent = Intent(context, SensorWidgetProvider::class.java).apply {
            action = ACTION_REFRESH
        }
        val refreshPendingIntent = PendingIntent.getBroadcast(
            context, 0, refreshIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_last_updated, refreshPendingIntent)

        // Load cached data
        val cached = getCachedData(context)
        val deviceId = getSelectedDeviceId(context) ?: "IoT Monitor"

        views.setTextViewText(R.id.widget_device_name, deviceId)
        views.setTextViewText(R.id.widget_temperature, cached.temp)
        views.setTextViewText(R.id.widget_humidity, cached.humidity)
        views.setTextViewText(R.id.widget_light, cached.light)
        views.setTextViewText(R.id.widget_sound, cached.sound)
        views.setTextViewText(R.id.widget_last_updated, cached.lastUpdate)

        // Set status indicator
        val statusDrawable = if (cached.isOnline) {
            R.drawable.widget_status_online
        } else {
            R.drawable.widget_status_offline
        }
        views.setImageViewResource(R.id.widget_status_indicator, statusDrawable)

        // Update widget
        appWidgetManager.updateAppWidget(appWidgetId, views)

        // Fetch fresh data in background
        executor.execute {
            fetchDataAndUpdate(context, appWidgetManager, intArrayOf(appWidgetId))
        }
    }

    private fun fetchDataAndUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        val repository = IoTRepository()

        try {
            // Use runBlocking alternative - direct API call
            val thread = Thread {
                try {
                    val devicesResult = kotlinx.coroutines.runBlocking {
                        repository.getDevices()
                    }

                    if (devicesResult is Result.Success && devicesResult.data.isNotEmpty()) {
                        val savedDeviceId = getSelectedDeviceId(context)
                        val deviceId = if (savedDeviceId != null && devicesResult.data.contains(savedDeviceId)) {
                            savedDeviceId
                        } else {
                            devicesResult.data.first().also {
                                setSelectedDeviceId(context, it)
                            }
                        }

                        val readingResult = kotlinx.coroutines.runBlocking {
                            repository.getLatestReading(deviceId)
                        }

                        if (readingResult is Result.Success && readingResult.data != null) {
                            val reading = readingResult.data

                            val temp = reading.temperatureC?.let { "%.1f".format(it) } ?: "--"
                            val humidity = reading.humidityPct?.let { "%.0f".format(it) } ?: "--"
                            val light = reading.lux?.toString() ?: "--"
                            val sound = reading.sound?.toString() ?: "--"
                            val isOnline = isDeviceOnline(reading.ts)

                            val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
                            val lastUpdate = "Updated ${timeFormat.format(Date())}"

                            // Save to cache
                            saveCachedData(context, temp, humidity, light, sound, lastUpdate, isOnline)

                            // Update widgets on main thread
                            Handler(Looper.getMainLooper()).post {
                                for (appWidgetId in appWidgetIds) {
                                    val views = RemoteViews(context.packageName, R.layout.widget_sensor)

                                    // Re-set click intents
                                    val openAppIntent = Intent(context, MainActivity::class.java)
                                    val openAppPendingIntent = PendingIntent.getActivity(
                                        context, 0, openAppIntent,
                                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                                    )
                                    views.setOnClickPendingIntent(R.id.widget_container, openAppPendingIntent)

                                    val refreshIntent = Intent(context, SensorWidgetProvider::class.java).apply {
                                        action = ACTION_REFRESH
                                    }
                                    val refreshPendingIntent = PendingIntent.getBroadcast(
                                        context, 0, refreshIntent,
                                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                                    )
                                    views.setOnClickPendingIntent(R.id.widget_last_updated, refreshPendingIntent)

                                    views.setTextViewText(R.id.widget_device_name, deviceId)
                                    views.setTextViewText(R.id.widget_temperature, temp)
                                    views.setTextViewText(R.id.widget_humidity, humidity)
                                    views.setTextViewText(R.id.widget_light, light)
                                    views.setTextViewText(R.id.widget_sound, sound)
                                    views.setTextViewText(R.id.widget_last_updated, lastUpdate)

                                    val statusDrawable = if (isOnline) {
                                        R.drawable.widget_status_online
                                    } else {
                                        R.drawable.widget_status_offline
                                    }
                                    views.setImageViewResource(R.id.widget_status_indicator, statusDrawable)

                                    appWidgetManager.updateAppWidget(appWidgetId, views)
                                }
                            }
                        } else {
                            updateWithError(context, appWidgetManager, appWidgetIds, "No data")
                        }
                    } else {
                        updateWithError(context, appWidgetManager, appWidgetIds, "No devices")
                    }
                } catch (e: Exception) {
                    updateWithError(context, appWidgetManager, appWidgetIds, "Error")
                }
            }
            thread.start()
        } catch (e: Exception) {
            updateWithError(context, appWidgetManager, appWidgetIds, "Error")
        }
    }

    private fun updateWithError(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
        message: String
    ) {
        Handler(Looper.getMainLooper()).post {
            for (appWidgetId in appWidgetIds) {
                val views = RemoteViews(context.packageName, R.layout.widget_sensor)

                val openAppIntent = Intent(context, MainActivity::class.java)
                val openAppPendingIntent = PendingIntent.getActivity(
                    context, 0, openAppIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_container, openAppPendingIntent)

                val refreshIntent = Intent(context, SensorWidgetProvider::class.java).apply {
                    action = ACTION_REFRESH
                }
                val refreshPendingIntent = PendingIntent.getBroadcast(
                    context, 0, refreshIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.widget_last_updated, refreshPendingIntent)

                views.setTextViewText(R.id.widget_device_name, "IoT Monitor")
                views.setTextViewText(R.id.widget_temperature, "--")
                views.setTextViewText(R.id.widget_humidity, "--")
                views.setTextViewText(R.id.widget_light, "--")
                views.setTextViewText(R.id.widget_sound, "--")
                views.setTextViewText(R.id.widget_last_updated, message)
                views.setInt(R.id.widget_status_indicator, "setBackgroundResource", R.drawable.widget_status_offline)

                appWidgetManager.updateAppWidget(appWidgetId, views)
            }
        }
    }

    private fun isDeviceOnline(timestamp: String): Boolean {
        return try {
            val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
            dateFormat.timeZone = java.util.TimeZone.getTimeZone("UTC")

            val cleanTimestamp = timestamp
                .replace(Regex("\\.[0-9]+"), "")
                .replace("Z", "")
                .take(19)

            val readingDate = dateFormat.parse(cleanTimestamp)
            val now = Date()

            if (readingDate != null) {
                val diffMs = now.time - readingDate.time
                val diffMinutes = diffMs / 1000 / 60
                diffMinutes < 2
            } else {
                false
            }
        } catch (e: Exception) {
            false
        }
    }
}
