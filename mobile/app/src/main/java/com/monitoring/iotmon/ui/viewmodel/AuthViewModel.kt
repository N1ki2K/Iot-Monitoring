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
    val isLoggedIn: Boolean = false
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
    }

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)

            when (val result = repository.login(email, password)) {
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
