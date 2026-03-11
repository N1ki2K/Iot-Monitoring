package com.monitoring.iotmon.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.monitoring.iotmon.data.models.HealthStats
import com.monitoring.iotmon.data.repository.IoTRepository
import com.monitoring.iotmon.data.repository.Result
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class SystemHealthState(
    val isLoading: Boolean = false,
    val data: HealthStats? = null,
    val error: String? = null
)

class SystemHealthViewModel : ViewModel() {
    private val repository = IoTRepository()
    private val _state = MutableStateFlow(SystemHealthState())
    val state: StateFlow<SystemHealthState> = _state.asStateFlow()

    fun loadHealth() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            when (val result = repository.getHealth()) {
                is Result.Success -> _state.value = SystemHealthState(data = result.data)
                is Result.Error -> _state.value = SystemHealthState(error = result.message)
            }
        }
    }
}
