package com.monitoring.iotmon.data.repository

import com.monitoring.iotmon.data.api.ApiClient
import com.monitoring.iotmon.data.models.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val message: String) : Result<Nothing>()
}

class IoTRepository {

    private val api = ApiClient.apiService

    // Authentication
    suspend fun login(email: String, password: String): Result<AuthUser> = withContext(Dispatchers.IO) {
        try {
            val response = api.login(LoginRequest(email, password))
            if (response.isSuccessful && response.body() != null) {
                val user = response.body()!!
                ApiClient.setUserId(user.id)
                Result.Success(user)
            } else {
                val errorBody = response.errorBody()?.string()
                Result.Error(errorBody ?: "Login failed")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    suspend fun register(username: String, email: String, password: String): Result<AuthUser> = withContext(Dispatchers.IO) {
        try {
            val response = api.register(RegisterRequest(username, email, password))
            if (response.isSuccessful && response.body() != null) {
                val user = response.body()!!
                ApiClient.setUserId(user.id)
                Result.Success(user)
            } else {
                val errorBody = response.errorBody()?.string()
                Result.Error(errorBody ?: "Registration failed")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    suspend fun getMe(): Result<AuthUser> = withContext(Dispatchers.IO) {
        try {
            val response = api.getMe()
            if (response.isSuccessful && response.body() != null) {
                Result.Success(response.body()!!)
            } else {
                Result.Error("Failed to get user profile")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    suspend fun updateProfile(username: String?, email: String?): Result<AuthUser> = withContext(Dispatchers.IO) {
        try {
            val response = api.updateProfile(UpdateProfileRequest(username, email))
            if (response.isSuccessful && response.body() != null) {
                Result.Success(response.body()!!)
            } else {
                val errorBody = response.errorBody()?.string()
                Result.Error(errorBody ?: "Update failed")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    suspend fun changePassword(currentPassword: String, newPassword: String): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = api.changePassword(ChangePasswordRequest(currentPassword, newPassword))
            if (response.isSuccessful) {
                Result.Success(Unit)
            } else {
                val errorBody = response.errorBody()?.string()
                Result.Error(errorBody ?: "Password change failed")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    suspend fun deleteAccount(): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = api.deleteAccount()
            if (response.isSuccessful) {
                Result.Success(Unit)
            } else {
                Result.Error("Failed to delete account")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    // Devices
    suspend fun getDevices(): Result<List<String>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getDevices()
            if (response.isSuccessful) {
                Result.Success(response.body() ?: emptyList())
            } else {
                Result.Error("Failed to get devices")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    suspend fun getLatestReading(deviceId: String): Result<Reading?> = withContext(Dispatchers.IO) {
        try {
            val response = api.getLatestReading(deviceId)
            if (response.isSuccessful) {
                Result.Success(response.body())
            } else {
                Result.Error("Failed to get latest reading")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    suspend fun getHistory(deviceId: String, hours: Int = 1): Result<List<Reading>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getHistory(deviceId, hours)
            if (response.isSuccessful) {
                Result.Success(response.body() ?: emptyList())
            } else {
                Result.Error("Failed to get history")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    suspend fun getReadings(
        page: Int = 1,
        limit: Int = 20,
        search: String = "",
        sortBy: String = "ts",
        sortOrder: String = "DESC",
        device: String = ""
    ): Result<PaginatedResponse<Reading>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getReadings(page, limit, search, sortBy, sortOrder, device)
            if (response.isSuccessful && response.body() != null) {
                Result.Success(response.body()!!)
            } else {
                Result.Error("Failed to get readings")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    // Controllers
    suspend fun getUserControllers(userId: Int): Result<List<UserControllerAssignment>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getUserControllers(userId)
            if (response.isSuccessful) {
                Result.Success(response.body() ?: emptyList())
            } else {
                Result.Error("Failed to get controllers")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    suspend fun claimDevice(code: String, label: String?): Result<Controller> = withContext(Dispatchers.IO) {
        try {
            val response = api.claimDevice(ClaimDeviceRequest(code, label))
            if (response.isSuccessful && response.body() != null) {
                Result.Success(response.body()!!.controller)
            } else {
                val errorBody = response.errorBody()?.string()
                Result.Error(errorBody ?: "Failed to claim device")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    suspend fun updateAssignmentLabel(userId: Int, controllerId: Int, label: String?): Result<UserControllerAssignment> = withContext(Dispatchers.IO) {
        try {
            val response = api.updateAssignment(userId, controllerId, UpdateAssignmentRequest(label))
            if (response.isSuccessful && response.body() != null) {
                Result.Success(response.body()!!)
            } else {
                Result.Error("Failed to update label")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    suspend fun removeDevice(userId: Int, controllerId: Int): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = api.removeUserController(userId, RemoveControllerRequest(controllerId))
            if (response.isSuccessful) {
                Result.Success(Unit)
            } else {
                Result.Error("Failed to remove device")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    // Admin functions
    suspend fun getUsers(): Result<List<AuthUser>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getUsers()
            if (response.isSuccessful) {
                Result.Success(response.body() ?: emptyList())
            } else {
                Result.Error("Failed to get users")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    suspend fun getControllers(): Result<List<Controller>> = withContext(Dispatchers.IO) {
        try {
            val response = api.getControllers()
            if (response.isSuccessful) {
                Result.Success(response.body() ?: emptyList())
            } else {
                Result.Error("Failed to get controllers")
            }
        } catch (e: Exception) {
            Result.Error(e.message ?: "Network error")
        }
    }

    fun setUserId(userId: Int?) {
        ApiClient.setUserId(userId)
    }

    fun logout() {
        ApiClient.setUserId(null)
    }
}
