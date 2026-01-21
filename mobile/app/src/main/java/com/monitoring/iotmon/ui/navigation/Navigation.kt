package com.monitoring.iotmon.ui.navigation

sealed class Screen(val route: String) {
    data object Auth : Screen("auth")
    data object Dashboard : Screen("dashboard")
    data object Settings : Screen("settings")
    data object Admin : Screen("admin")
}
