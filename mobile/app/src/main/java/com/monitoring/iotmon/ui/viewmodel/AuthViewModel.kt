package com.monitoring.iotmon.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.monitoring.iotmon.data.api.ApiClient
import com.monitoring.iotmon.data.models.AuthUser
import com.monitoring.iotmon.data.preferences.UserPreferences
import com.monitoring.iotmon.data.repository.IoTRepository
import com.monitoring.iotmon.data.repository.Result
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AuthState(
    val isLoading: Boolean = false,
    val user: AuthUser? = null,
    val error: String? = null,
    val isLoggedIn: Boolean = false,
    val biometricEnabled: Boolean = false,
    val hasSavedCredentials: Boolean = false
)

class AuthViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = IoTRepository()
    private val preferences = UserPreferences(application)

    private val _state = MutableStateFlow(AuthState())
    val state: StateFlow<AuthState> = _state.asStateFlow()

    init {
        // Check for saved user session
        viewModelScope.launch {
            preferences.userFlow.collect { user ->
                if (user != null) {
                    ApiClient.setUserId(user.id)
                    _state.value = _state.value.copy(
                        user = user,
                        isLoggedIn = true
                    )
                }
            }
        }

        // Check biometric settings
        viewModelScope.launch {
            preferences.biometricEnabledFlow.collect { enabled ->
                _state.value = _state.value.copy(biometricEnabled = enabled)
            }
        }

        // Check for saved credentials
        viewModelScope.launch {
            val (email, password) = preferences.getCredentials()
            _state.value = _state.value.copy(
                hasSavedCredentials = email != null && password != null
            )
        }
    }

    fun login(email: String, password: String, saveForBiometric: Boolean = false) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)

            when (val result = repository.login(email, password)) {
                is Result.Success -> {
                    preferences.saveUser(result.data)
                    // Save credentials for biometric login if enabled
                    if (saveForBiometric || _state.value.biometricEnabled) {
                        preferences.saveCredentials(email, password)
                        _state.value = _state.value.copy(hasSavedCredentials = true)
                    }
                    _state.value = _state.value.copy(
                        isLoading = false,
                        user = result.data,
                        isLoggedIn = true,
                        error = null
                    )
                }
                is Result.Error -> {
                    _state.value = _state.value.copy(
                        isLoading = false,
                        error = result.message
                    )
                }
            }
        }
    }

    fun loginWithBiometric() {
        viewModelScope.launch {
            val (email, password) = preferences.getCredentials()
            if (email != null && password != null) {
                login(email, password)
            } else {
                _state.value = _state.value.copy(
                    error = "No saved credentials. Please login with password first."
                )
            }
        }
    }

    fun enableBiometric(email: String, password: String) {
        viewModelScope.launch {
            preferences.setBiometricEnabled(true)
            preferences.saveCredentials(email, password)
            _state.value = _state.value.copy(
                biometricEnabled = true,
                hasSavedCredentials = true
            )
        }
    }

    fun disableBiometric() {
        viewModelScope.launch {
            preferences.setBiometricEnabled(false)
            preferences.clearCredentials()
            _state.value = _state.value.copy(
                biometricEnabled = false,
                hasSavedCredentials = false
            )
        }
    }

    fun register(username: String, email: String, password: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)

            when (val result = repository.register(username, email, password)) {
                is Result.Success -> {
                    preferences.saveUser(result.data)
                    _state.value = _state.value.copy(
                        isLoading = false,
                        user = result.data,
                        isLoggedIn = true,
                        error = null
                    )
                }
                is Result.Error -> {
                    _state.value = _state.value.copy(
                        isLoading = false,
                        error = result.message
                    )
                }
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            preferences.clearUser()
            preferences.clearCredentials()
            repository.logout()
            _state.value = AuthState()
        }
    }

    fun updateUser(user: AuthUser) {
        viewModelScope.launch {
            preferences.updateUser(user)
            _state.value = _state.value.copy(user = user)
        }
    }

    fun clearError() {
        _state.value = _state.value.copy(error = null)
    }
}
