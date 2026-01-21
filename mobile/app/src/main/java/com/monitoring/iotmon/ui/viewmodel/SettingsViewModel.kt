package com.monitoring.iotmon.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.monitoring.iotmon.data.models.AuthUser
import com.monitoring.iotmon.data.models.UserControllerAssignment
import com.monitoring.iotmon.data.repository.IoTRepository
import com.monitoring.iotmon.data.repository.Result
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class SettingsState(
    val isLoading: Boolean = false,
    val controllers: List<UserControllerAssignment> = emptyList(),
    val error: String? = null,
    val successMessage: String? = null,
    val isUpdatingProfile: Boolean = false,
    val isChangingPassword: Boolean = false,
    val isDeletingAccount: Boolean = false,
    val isClaimingDevice: Boolean = false,
    val claimError: String? = null
)

class SettingsViewModel : ViewModel() {

    private val repository = IoTRepository()

    private val _state = MutableStateFlow(SettingsState())
    val state: StateFlow<SettingsState> = _state.asStateFlow()

    fun loadControllers(userId: Int) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)

            when (val result = repository.getUserControllers(userId)) {
                is Result.Success -> {
                    _state.value = _state.value.copy(
                        isLoading = false,
                        controllers = result.data
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

    fun updateProfile(
        username: String,
        email: String,
        onSuccess: (AuthUser) -> Unit
    ) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isUpdatingProfile = true, error = null)

            when (val result = repository.updateProfile(username, email)) {
                is Result.Success -> {
                    _state.value = _state.value.copy(
                        isUpdatingProfile = false,
                        successMessage = "Profile updated successfully"
                    )
                    onSuccess(result.data)
                }
                is Result.Error -> {
                    _state.value = _state.value.copy(
                        isUpdatingProfile = false,
                        error = result.message
                    )
                }
            }
        }
    }

    fun changePassword(
        currentPassword: String,
        newPassword: String,
        onSuccess: () -> Unit
    ) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isChangingPassword = true, error = null)

            when (val result = repository.changePassword(currentPassword, newPassword)) {
                is Result.Success -> {
                    _state.value = _state.value.copy(
                        isChangingPassword = false,
                        successMessage = "Password changed successfully"
                    )
                    onSuccess()
                }
                is Result.Error -> {
                    _state.value = _state.value.copy(
                        isChangingPassword = false,
                        error = result.message
                    )
                }
            }
        }
    }

    fun deleteAccount(onSuccess: () -> Unit) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isDeletingAccount = true, error = null)

            when (val result = repository.deleteAccount()) {
                is Result.Success -> {
                    _state.value = _state.value.copy(isDeletingAccount = false)
                    onSuccess()
                }
                is Result.Error -> {
                    _state.value = _state.value.copy(
                        isDeletingAccount = false,
                        error = result.message
                    )
                }
            }
        }
    }

    fun updateDeviceLabel(
        userId: Int,
        controllerId: Int,
        label: String?
    ) {
        viewModelScope.launch {
            when (val result = repository.updateAssignmentLabel(userId, controllerId, label)) {
                is Result.Success -> {
                    // Reload controllers
                    loadControllers(userId)
                    _state.value = _state.value.copy(successMessage = "Device label updated")
                }
                is Result.Error -> {
                    _state.value = _state.value.copy(error = result.message)
                }
            }
        }
    }

    fun removeDevice(userId: Int, controllerId: Int) {
        viewModelScope.launch {
            when (val result = repository.removeDevice(userId, controllerId)) {
                is Result.Success -> {
                    loadControllers(userId)
                    _state.value = _state.value.copy(successMessage = "Device removed")
                }
                is Result.Error -> {
                    _state.value = _state.value.copy(error = result.message)
                }
            }
        }
    }

    fun claimDevice(code: String, label: String?, userId: Int, onSuccess: () -> Unit) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isClaimingDevice = true, claimError = null)

            when (val result = repository.claimDevice(code, label)) {
                is Result.Success -> {
                    _state.value = _state.value.copy(
                        isClaimingDevice = false,
                        successMessage = "Device claimed successfully"
                    )
                    loadControllers(userId)
                    onSuccess()
                }
                is Result.Error -> {
                    _state.value = _state.value.copy(
                        isClaimingDevice = false,
                        claimError = result.message
                    )
                }
            }
        }
    }

    fun clearError() {
        _state.value = _state.value.copy(error = null, claimError = null)
    }

    fun clearSuccessMessage() {
        _state.value = _state.value.copy(successMessage = null)
    }
}
