package com.monitoring.iotmon.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.monitoring.iotmon.data.models.AuthUser
import com.monitoring.iotmon.data.models.Controller
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

            _state.value = _state.value.copy(
                isLoading = false,
                users = users,
                controllers = controllers
            )
        }
    }

    fun refresh() {
        loadData()
    }
}
