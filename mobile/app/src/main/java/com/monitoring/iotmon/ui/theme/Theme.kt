package com.monitoring.iotmon.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

// Light theme colors
private val LightSlate50 = Color(0xFFF8FAFC)
private val LightSlate100 = Color(0xFFF1F5F9)
private val LightSlate200 = Color(0xFFE2E8F0)
private val LightSlate300 = Color(0xFFCBD5E1)
private val LightSlate700 = Color(0xFF334155)
private val LightSlate800 = Color(0xFF1E293B)

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

// IoT Monitoring light theme
private val IotLightColorScheme = lightColorScheme(
    primary = Cyan600,
    onPrimary = Color.White,
    primaryContainer = Cyan400,
    onPrimaryContainer = Cyan700,
    secondary = LightSlate300,
    onSecondary = LightSlate800,
    secondaryContainer = LightSlate200,
    onSecondaryContainer = LightSlate700,
    tertiary = Cyan500,
    onTertiary = Color.White,
    background = LightSlate50,
    onBackground = LightSlate800,
    surface = Color.White,
    onSurface = LightSlate800,
    surfaceVariant = LightSlate100,
    onSurfaceVariant = LightSlate700,
    outline = LightSlate300,
    outlineVariant = LightSlate200,
    error = ErrorColor,
    onError = Color.White,
    errorContainer = Color(0xFFFFDAD6),
    onErrorContainer = Color(0xFF93000A)
)

@Composable
fun IotMonTheme(
    darkTheme: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) IotDarkColorScheme else IotLightColorScheme

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            if (darkTheme) {
                window.statusBarColor = Slate950.toArgb()
                window.navigationBarColor = Slate950.toArgb()
                WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
                WindowCompat.getInsetsController(window, view).isAppearanceLightNavigationBars = false
            } else {
                window.statusBarColor = LightSlate50.toArgb()
                window.navigationBarColor = LightSlate50.toArgb()
                WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = true
                WindowCompat.getInsetsController(window, view).isAppearanceLightNavigationBars = true
            }
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
