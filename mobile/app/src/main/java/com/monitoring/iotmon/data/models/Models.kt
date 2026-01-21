package com.monitoring.iotmon.data.models

import com.google.gson.annotations.SerializedName

// Authentication Models
data class AuthUser(
    val id: Int,
    val username: String,
    val email: String,
    @SerializedName("is_admin")
    val isAdmin: Int,
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
    @SerializedName("co2_ppm")
    val co2Ppm: Int?
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
