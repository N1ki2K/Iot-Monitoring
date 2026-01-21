package com.monitoring.iotmon

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.*
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.NavType
import androidx.navigation.navArgument
import com.monitoring.iotmon.ui.components.ClaimDeviceDialog
import com.monitoring.iotmon.ui.components.SensorType
import com.monitoring.iotmon.ui.navigation.Screen
import com.monitoring.iotmon.ui.screens.AdminScreen
import com.monitoring.iotmon.ui.screens.AuthScreen
import com.monitoring.iotmon.ui.screens.DashboardScreen
import com.monitoring.iotmon.ui.screens.SensorDetailScreen
import com.monitoring.iotmon.ui.screens.SettingsScreen
import com.monitoring.iotmon.ui.theme.IotMonTheme
import com.monitoring.iotmon.ui.viewmodel.AdminViewModel
import com.monitoring.iotmon.ui.viewmodel.AuthViewModel
import com.monitoring.iotmon.ui.viewmodel.DashboardViewModel
import com.monitoring.iotmon.ui.viewmodel.SettingsViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            IotMonTheme {
                IoTMonitorApp()
            }
        }
    }
}

@Composable
fun IoTMonitorApp() {
    val navController = rememberNavController()
    val authViewModel: AuthViewModel = viewModel()
    val dashboardViewModel: DashboardViewModel = viewModel()
    val settingsViewModel: SettingsViewModel = viewModel()
    val adminViewModel: AdminViewModel = viewModel()

    val authState by authViewModel.state.collectAsState()
    val dashboardState by dashboardViewModel.state.collectAsState()
    val settingsState by settingsViewModel.state.collectAsState()
    val adminState by adminViewModel.state.collectAsState()

    var showClaimDialog by remember { mutableStateOf(false) }

    // Determine start destination based on auth state
    val startDestination = if (authState.isLoggedIn) Screen.Dashboard.route else Screen.Auth.route

    // Effect to navigate when auth state changes
    LaunchedEffect(authState.isLoggedIn) {
        if (authState.isLoggedIn) {
            navController.navigate(Screen.Dashboard.route) {
                popUpTo(Screen.Auth.route) { inclusive = true }
            }
            // Load initial data
            authState.user?.let { user ->
                dashboardViewModel.loadDevices(user.id, user.isAdmin == 1)
                settingsViewModel.loadControllers(user.id)
            }
        } else {
            navController.navigate(Screen.Auth.route) {
                popUpTo(0) { inclusive = true }
            }
        }
    }

    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(Screen.Auth.route) {
            AuthScreen(
                state = authState,
                onLogin = { email, password ->
                    authViewModel.login(email, password)
                },
                onRegister = { username, email, password ->
                    authViewModel.register(username, email, password)
                },
                onClearError = { authViewModel.clearError() }
            )
        }

        composable(Screen.Dashboard.route) {
            val user = authState.user
            if (user != null) {
                DashboardScreen(
                    user = user,
                    state = dashboardState,
                    onDeviceSelected = { deviceId ->
                        dashboardViewModel.selectDevice(deviceId)
                    },
                    onRefresh = { dashboardViewModel.refresh() },
                    onSettingsClick = {
                        settingsViewModel.loadControllers(user.id)
                        navController.navigate(Screen.Settings.route)
                    },
                    onAdminClick = {
                        adminViewModel.loadData()
                        navController.navigate(Screen.Admin.route)
                    },
                    onClaimDevice = { showClaimDialog = true },
                    onLogout = { authViewModel.logout() },
                    onSensorClick = { sensorType ->
                        navController.navigate(Screen.SensorDetail.createRoute(sensorType.name))
                    }
                )

                // Claim Device Dialog
                if (showClaimDialog) {
                    ClaimDeviceDialog(
                        isLoading = settingsState.isClaimingDevice,
                        error = settingsState.claimError,
                        onDismiss = {
                            showClaimDialog = false
                            settingsViewModel.clearError()
                        },
                        onClaim = { code, label ->
                            settingsViewModel.claimDevice(code, label, user.id) {
                                showClaimDialog = false
                                // Reload devices after claiming
                                dashboardViewModel.loadDevices(user.id, user.isAdmin == 1)
                            }
                        }
                    )
                }
            }
        }

        composable(Screen.Settings.route) {
            val user = authState.user
            if (user != null) {
                SettingsScreen(
                    user = user,
                    state = settingsState,
                    onBack = { navController.popBackStack() },
                    onUpdateProfile = { username, email ->
                        settingsViewModel.updateProfile(username, email) { updatedUser ->
                            authViewModel.updateUser(updatedUser)
                        }
                    },
                    onChangePassword = { current, new ->
                        settingsViewModel.changePassword(current, new) {
                            // Password changed successfully
                        }
                    },
                    onDeleteAccount = {
                        settingsViewModel.deleteAccount {
                            authViewModel.logout()
                        }
                    },
                    onUpdateDeviceLabel = { controllerId, label ->
                        settingsViewModel.updateDeviceLabel(user.id, controllerId, label)
                    },
                    onRemoveDevice = { controllerId ->
                        settingsViewModel.removeDevice(user.id, controllerId)
                        // Reload devices after removal
                        dashboardViewModel.loadDevices(user.id, user.isAdmin == 1)
                    },
                    onClearError = { settingsViewModel.clearError() },
                    onClearSuccess = { settingsViewModel.clearSuccessMessage() }
                )
            }
        }

        composable(Screen.Admin.route) {
            val user = authState.user
            if (user != null && user.isAdmin == 1) {
                AdminScreen(
                    state = adminState,
                    onBack = { navController.popBackStack() },
                    onRefresh = { adminViewModel.refresh() }
                )
            }
        }

        composable(
            route = Screen.SensorDetail.route,
            arguments = listOf(navArgument("sensorType") { type = NavType.StringType })
        ) { backStackEntry ->
            val sensorTypeArg = backStackEntry.arguments?.getString("sensorType") ?: "TEMPERATURE"
            val sensorType = try {
                SensorType.valueOf(sensorTypeArg)
            } catch (e: IllegalArgumentException) {
                SensorType.TEMPERATURE
            }

            SensorDetailScreen(
                sensorType = sensorType,
                readings = dashboardState.history,
                isLoading = dashboardState.isLoading,
                onBack = { navController.popBackStack() }
            )
        }
    }
}
