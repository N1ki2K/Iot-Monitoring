package com.monitoring.iotmon.util

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.monitoring.iotmon.MainActivity
import com.monitoring.iotmon.R

class NotificationHelper(private val context: Context) {

    companion object {
        const val CHANNEL_ID = "iot_monitor_alerts"
        const val CHANNEL_NAME = "Sensor Alerts"
        const val CHANNEL_DESCRIPTION = "Notifications for sensor threshold alerts"

        private var notificationId = 0

        fun getNextNotificationId(): Int {
            return ++notificationId
        }
    }

    init {
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, CHANNEL_NAME, importance).apply {
                description = CHANNEL_DESCRIPTION
                enableVibration(true)
                enableLights(true)
            }

            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    fun sendThresholdAlert(
        title: String,
        message: String,
        sensorType: String,
        currentValue: Float,
        thresholdValue: Float,
        isHigh: Boolean
    ) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val icon = when (sensorType.lowercase()) {
            "temperature" -> android.R.drawable.ic_menu_compass
            "humidity" -> android.R.drawable.ic_menu_info_details
            "noise" -> android.R.drawable.ic_lock_silent_mode_off
            else -> android.R.drawable.ic_dialog_alert
        }

        val direction = if (isHigh) "above" else "below"
        val expandedMessage = "$sensorType is $direction threshold!\n" +
                "Current: $currentValue, Threshold: $thresholdValue"

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle(title)
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(expandedMessage))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .build()

        if (ActivityCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            NotificationManagerCompat.from(context).notify(getNextNotificationId(), notification)
        }
    }

    fun sendDeviceOfflineAlert(deviceLabel: String, lastSeen: String) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("Device Offline")
            .setContentText("$deviceLabel is offline")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("$deviceLabel has gone offline. Last seen: $lastSeen")
            )
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .build()

        if (ActivityCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            NotificationManagerCompat.from(context).notify(getNextNotificationId(), notification)
        }
    }
}
