package com.monitoring.iotmon.ui.navigation

sealed class Screen(val route: String) {
    data object Auth : Screen("auth")
    data object Dashboard : Screen("dashboard")
    data object Settings : Screen("settings")
    data object Admin : Screen("admin")
    data object NotificationSettings : Screen("notification_settings")
    data object SensorDetail : Screen("sensor/{sensorType}") {
        fun createRoute(sensorType: String) = "sensor/$sensorType"
    }
}
