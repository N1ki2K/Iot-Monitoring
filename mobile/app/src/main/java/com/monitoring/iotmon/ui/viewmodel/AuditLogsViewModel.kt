package com.monitoring.iotmon.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.monitoring.iotmon.data.models.AuditLogEntry
import com.monitoring.iotmon.data.models.AuditLogQueryParams
import com.monitoring.iotmon.data.models.PaginatedResponse
import com.monitoring.iotmon.data.repository.IoTRepository
import com.monitoring.iotmon.data.repository.Result
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AuditLogsState(
    val isLoading: Boolean = false,
    val data: PaginatedResponse<AuditLogEntry>? = null,
    val page: Int = 1,
    val limit: Int = 20,
    val actorId: String = "",
    val action: String = "",
    val entityType: String = "",
    val entityId: String = "",
    val purgeBefore: String = "",
    val error: String? = null
)

class AuditLogsViewModel : ViewModel() {
    private val repository = IoTRepository()
    private val _state = MutableStateFlow(AuditLogsState())
    val state: StateFlow<AuditLogsState> = _state.asStateFlow()

    fun loadLogs() {
        val current = _state.value
        val actorId = current.actorId.trim().toIntOrNull()
        viewModelScope.launch {
            _state.value = current.copy(isLoading = true, error = null)
            when (
                val result = repository.getAuditLogs(
                    AuditLogQueryParams(
                        page = current.page,
                        limit = current.limit,
                        actorId = actorId,
                        action = current.action.ifBlank { null },
                        entityType = current.entityType.ifBlank { null },
                        entityId = current.entityId.ifBlank { null }
                    )
                )
            ) {
                is Result.Success -> _state.value = _state.value.copy(isLoading = false, data = result.data)
                is Result.Error -> _state.value = _state.value.copy(isLoading = false, error = result.message)
            }
        }
    }

    fun updateFilters(actorId: String, action: String, entityType: String, entityId: String, limit: Int) {
        _state.value = _state.value.copy(
            actorId = actorId,
            action = action,
            entityType = entityType,
            entityId = entityId,
            limit = limit,
            page = 1
        )
    }

    fun setPurgeBefore(value: String) {
        _state.value = _state.value.copy(purgeBefore = value)
    }

    fun clearFilters() {
        _state.value = _state.value.copy(
            actorId = "",
            action = "",
            entityType = "",
            entityId = "",
            page = 1
        )
        loadLogs()
    }

    fun nextPage() {
        val totalPages = _state.value.data?.pagination?.totalPages ?: 1
        if (_state.value.page >= totalPages) return
        _state.value = _state.value.copy(page = _state.value.page + 1)
        loadLogs()
    }

    fun previousPage() {
        if (_state.value.page <= 1) return
        _state.value = _state.value.copy(page = _state.value.page - 1)
        loadLogs()
    }

    fun purgeAll() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            when (val result = repository.purgeAuditLogs(all = true)) {
                is Result.Success -> {
                    _state.value = _state.value.copy(isLoading = false, page = 1)
                    loadLogs()
                }
                is Result.Error -> _state.value = _state.value.copy(isLoading = false, error = result.message)
            }
        }
    }

    fun purgeBefore() {
        val before = _state.value.purgeBefore.ifBlank { return }
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            when (val result = repository.purgeAuditLogs(before = before)) {
                is Result.Success -> {
                    _state.value = _state.value.copy(isLoading = false, page = 1)
                    loadLogs()
                }
                is Result.Error -> _state.value = _state.value.copy(isLoading = false, error = result.message)
            }
        }
    }
}
