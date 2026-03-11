package com.monitoring.iotmon.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.monitoring.iotmon.data.models.AuthUser
import com.monitoring.iotmon.data.models.Controller
import com.monitoring.iotmon.data.models.UpdateUserRequest
import com.monitoring.iotmon.data.repository.IoTRepository
import com.monitoring.iotmon.data.repository.Result
import com.monitoring.iotmon.ui.screens.AdminState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class AdminViewModel : ViewModel() {

    private val repository = IoTRepository()

    private val _state = MutableStateFlow(AdminState())
    val state: StateFlow<AdminState> = _state.asStateFlow()

    fun loadData() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)

            // Load users and controllers in parallel
            val usersResult = repository.getUsers()
            val controllersResult = repository.getControllers()
            val availableDevicesResult = repository.getAvailableDevices()

            val users = when (usersResult) {
                is Result.Success -> usersResult.data
                is Result.Error -> {
                    _state.value = _state.value.copy(
                        isLoading = false,
                        error = usersResult.message
                    )
                    return@launch
                }
            }

            val controllers = when (controllersResult) {
                is Result.Success -> controllersResult.data
                is Result.Error -> {
                    _state.value = _state.value.copy(
                        isLoading = false,
                        error = controllersResult.message
                    )
                    return@launch
                }
            }

            val availableDevices = when (availableDevicesResult) {
                is Result.Success -> availableDevicesResult.data
                is Result.Error -> emptyList()
            }

            val selectedUserId = users.firstOrNull()?.id
            val assignments = if (selectedUserId != null) {
                when (val assignmentsResult = repository.getUserControllers(selectedUserId)) {
                    is Result.Success -> assignmentsResult.data
                    is Result.Error -> emptyList()
                }
            } else {
                emptyList()
            }

            _state.value = _state.value.copy(
                isLoading = false,
                users = users,
                controllers = controllers,
                availableDevices = availableDevices,
                selectedUserId = selectedUserId,
                assignments = assignments
            )
        }
    }

    fun refresh() {
        loadData()
    }

    fun selectUser(userId: Int?) {
        _state.value = _state.value.copy(selectedUserId = userId)
        if (userId == null) {
            _state.value = _state.value.copy(assignments = emptyList())
            return
        }
        viewModelScope.launch {
            when (val result = repository.getUserControllers(userId)) {
                is Result.Success -> _state.value = _state.value.copy(assignments = result.data)
                is Result.Error -> _state.value = _state.value.copy(error = result.message)
            }
        }
    }

    fun inviteUser(username: String, email: String, role: String = "user") {
        viewModelScope.launch {
            _state.value = _state.value.copy(isSubmitting = true, error = null, successMessage = null)
            when (val result = repository.inviteUser(username, email, role)) {
                is Result.Success -> {
                    _state.value = _state.value.copy(
                        isSubmitting = false,
                        successMessage = "Invite created for ${result.data.user.email}. Temp password: ${result.data.tempPassword}"
                    )
                    loadData()
                }
                is Result.Error -> _state.value = _state.value.copy(isSubmitting = false, error = result.message)
            }
        }
    }

    fun deleteUser(userId: Int) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isSubmitting = true, error = null, successMessage = null)
            when (val result = repository.deleteUser(userId)) {
                is Result.Success -> {
                    _state.value = _state.value.copy(isSubmitting = false, successMessage = "User deleted")
                    loadData()
                }
                is Result.Error -> _state.value = _state.value.copy(isSubmitting = false, error = result.message)
            }
        }
    }

    fun assignController(controllerId: Int) {
        val userId = _state.value.selectedUserId ?: return
        viewModelScope.launch {
            _state.value = _state.value.copy(isSubmitting = true, error = null, successMessage = null)
            when (val result = repository.assignController(userId, controllerId)) {
                is Result.Success -> {
                    _state.value = _state.value.copy(isSubmitting = false, successMessage = "Controller assigned")
                    selectUser(userId)
                }
                is Result.Error -> _state.value = _state.value.copy(isSubmitting = false, error = result.message)
            }
        }
    }

    fun removeAssignment(controllerId: Int) {
        val userId = _state.value.selectedUserId ?: return
        viewModelScope.launch {
            _state.value = _state.value.copy(isSubmitting = true, error = null, successMessage = null)
            when (val result = repository.removeDevice(userId, controllerId)) {
                is Result.Success -> {
                    _state.value = _state.value.copy(isSubmitting = false, successMessage = "Assignment removed")
                    selectUser(userId)
                }
                is Result.Error -> _state.value = _state.value.copy(isSubmitting = false, error = result.message)
            }
        }
    }

    fun createController(deviceId: String, label: String?) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isSubmitting = true, error = null, successMessage = null)
            when (val result = repository.createController(deviceId, label)) {
                is Result.Success -> {
                    _state.value = _state.value.copy(isSubmitting = false, successMessage = "Controller created")
                    loadData()
                }
                is Result.Error -> _state.value = _state.value.copy(isSubmitting = false, error = result.message)
            }
        }
    }

    fun deleteController(controllerId: Int) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isSubmitting = true, error = null, successMessage = null)
            when (val result = repository.deleteController(controllerId)) {
                is Result.Success -> {
                    _state.value = _state.value.copy(isSubmitting = false, successMessage = "Controller deleted")
                    loadData()
                }
                is Result.Error -> _state.value = _state.value.copy(isSubmitting = false, error = result.message)
            }
        }
    }

    fun clearMessages() {
        _state.value = _state.value.copy(error = null, successMessage = null)
    }
}
