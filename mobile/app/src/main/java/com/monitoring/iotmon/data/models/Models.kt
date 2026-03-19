package com.monitoring.iotmon.data.models

import com.google.gson.annotations.SerializedName
import com.google.gson.annotations.JsonAdapter

// Authentication Models
data class AuthUser(
    val id: Int,
    val username: String,
    val email: String,
    val token: String? = null,
    val role: String? = null,
    @SerializedName("is_admin")
    @JsonAdapter(FlexibleIntAdapter::class)
    val isAdmin: Int,
    @SerializedName("invited_at")
    val invitedAt: String? = null,
    @SerializedName("must_change_password")
    @JsonAdapter(FlexibleIntAdapter::class)
    val mustChangePassword: Int = 0,
    @SerializedName("created_at")
    val createdAt: String? = null
)

data class LoginRequest(
    val email: String,
    val password: String
)

data class RegisterRequest(
    val username: String,
    val email: String,
    val password: String
)

data class UpdateProfileRequest(
    val username: String? = null,
    val email: String? = null
)

data class ChangePasswordRequest(
    val currentPassword: String,
    val newPassword: String
)

data class UserInviteRequest(
    val username: String,
    val email: String,
    val role: String = "user"
)

data class UserInviteResponse(
    val user: AuthUser,
    val tempPassword: String
)

data class UpdateUserRequest(
    val username: String? = null,
    val email: String? = null,
    val role: String? = null,
    @SerializedName("is_admin")
    val isAdmin: Boolean? = null,
    @SerializedName("must_change_password")
    val mustChangePassword: Boolean? = null
)

// Sensor Reading Models
data class Reading(
    val id: String? = null,
    @SerializedName("device_id")
    val deviceId: String,
    val ts: String,
    @SerializedName("temperature_c")
    val temperatureC: Double?,
    @SerializedName("humidity_pct")
    val humidityPct: Double?,
    val lux: Int?,
    val sound: Int?,
    @SerializedName("sound_dbfs")
    val soundDbfs: Double? = null,
    @SerializedName("sound_est_spl")
    val soundEstSpl: Double? = null,
    @SerializedName("air_quality_raw")
    val airQualityRaw: Double? = null,
    @SerializedName("air_baseline_pct")
    val airBaselinePct: Double? = null,
    @SerializedName("co2_ppm")
    val co2Ppm: Int? = null
)

// Controller Models
data class Controller(
    val id: Int,
    @SerializedName("device_id")
    val deviceId: String,
    val label: String?,
    @SerializedName("pairing_code")
    val pairingCode: String,
    @SerializedName("created_at")
    val createdAt: String
)

data class UserControllerAssignment(
    @SerializedName("user_id")
    val userId: Int,
    @SerializedName("controller_id")
    val controllerId: Int,
    @SerializedName("device_id")
    val deviceId: String,
    @SerializedName("controller_label")
    val controllerLabel: String?,
    @SerializedName("assignment_label")
    val assignmentLabel: String?,
    @SerializedName("pairing_code")
    val pairingCode: String,
    @SerializedName("created_at")
    val createdAt: String
)

data class ClaimDeviceRequest(
    val code: String,
    val label: String? = null
)

data class ClaimDeviceResponse(
    val controller: Controller
)

data class CreateControllerRequest(
    val deviceId: String,
    val label: String? = null
)

data class AssignControllerRequest(
    val controllerId: Int,
    val label: String? = null
)

data class UpdateAssignmentRequest(
    val label: String?
)

data class RemoveControllerRequest(
    val controllerId: Int
)

// Audit models
data class AuditLogEntry(
    val id: Int,
    @SerializedName("actor_id")
    val actorId: Int? = null,
    @SerializedName("actor_email")
    val actorEmail: String? = null,
    val action: String,
    @SerializedName("entity_type")
    val entityType: String,
    @SerializedName("entity_id")
    val entityId: String? = null,
    val metadata: Map<String, Any?>? = null,
    @SerializedName("ip_address")
    val ipAddress: String? = null,
    @SerializedName("user_agent")
    val userAgent: String? = null,
    @SerializedName("created_at")
    val createdAt: String
)

data class AuditLogQueryParams(
    val page: Int = 1,
    val limit: Int = 20,
    val actorId: Int? = null,
    val action: String? = null,
    val entityType: String? = null,
    val entityId: String? = null
)

// Health models
data class HealthStats(
    val serverTime: String,
    val uptimeSeconds: Long,
    val requests: HealthRequests,
    val database: HealthDatabase,
    val devices: HealthDevices,
    val users: HealthUsers
)

data class HealthRequests(
    val total: Int,
    val byStatus: Map<String, Int>,
    val byRoute: Map<String, Int>,
    val since: String
)

data class HealthDatabase(
    val sizeBytes: Long,
    val tableSizes: List<HealthTableSize>
)

data class HealthTableSize(
    val table: String,
    val bytes: Long,
    val rows: Int
)

data class HealthDevices(
    val totalControllers: Int,
    val distinctDevices: Int,
    val activeDevicesLast24h: Int,
    val totalReadings: Int,
    val latestReadingAt: String?
)

data class HealthUsers(
    val total: Int,
    val admins: Int,
    val invited: Int,
    val mustChangePassword: Int
)

// Pagination Models
data class PaginatedResponse<T>(
    val data: List<T>,
    val pagination: Pagination
)

data class Pagination(
    val page: Int,
    val limit: Int,
    val total: Int,
    val totalPages: Int
)

// API Response Wrappers
data class ApiError(
    val error: String
)
