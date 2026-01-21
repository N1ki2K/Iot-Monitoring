package com.monitoring.iotmon.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

// IoT Monitoring dark theme matching web frontend
private val IotDarkColorScheme = darkColorScheme(
    primary = Cyan500,
    onPrimary = Color.White,
    primaryContainer = Cyan700,
    onPrimaryContainer = Cyan400,
    secondary = Slate600,
    onSecondary = Color.White,
    secondaryContainer = Slate700,
    onSecondaryContainer = Slate300,
    tertiary = Cyan400,
    onTertiary = Slate950,
    background = Slate950,
    onBackground = Slate200,
    surface = Slate900,
    onSurface = Slate200,
    surfaceVariant = Slate800,
    onSurfaceVariant = Slate400,
    outline = Slate600,
    outlineVariant = Slate700,
    error = ErrorColor,
    onError = Color.White,
    errorContainer = Color(0xFF93000A),
    onErrorContainer = Color(0xFFFFDAD6)
)

@Composable
fun IotMonTheme(
    darkTheme: Boolean = true, // Force dark theme like web frontend
    content: @Composable () -> Unit
) {
    val colorScheme = IotDarkColorScheme

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = Slate950.toArgb()
            window.navigationBarColor = Slate950.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
            WindowCompat.getInsetsController(window, view).isAppearanceLightNavigationBars = false
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
