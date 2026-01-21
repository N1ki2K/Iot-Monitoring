package com.monitoring.iotmon.data.api

import com.monitoring.iotmon.data.models.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    // Authentication
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthUser>

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<AuthUser>

    // User Profile
    @GET("me")
    suspend fun getMe(): Response<AuthUser>

    @PATCH("me")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): Response<AuthUser>

    @PATCH("me/password")
    suspend fun changePassword(@Body request: ChangePasswordRequest): Response<Unit>

    @DELETE("me")
    suspend fun deleteAccount(): Response<Unit>

    // Users (Admin)
    @GET("users")
    suspend fun getUsers(): Response<List<AuthUser>>

    // Devices
    @GET("devices")
    suspend fun getDevices(): Response<List<String>>

    @GET("latest/{deviceId}")
    suspend fun getLatestReading(@Path("deviceId") deviceId: String): Response<Reading?>

    @GET("history/{deviceId}")
    suspend fun getHistory(
        @Path("deviceId") deviceId: String,
        @Query("hours") hours: Int = 24
    ): Response<List<Reading>>

    @GET("readings")
    suspend fun getReadings(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("search") search: String = "",
        @Query("sortBy") sortBy: String = "ts",
        @Query("sortOrder") sortOrder: String = "DESC",
        @Query("device") device: String = ""
    ): Response<PaginatedResponse<Reading>>

    // Controllers (Admin)
    @GET("controllers")
    suspend fun getControllers(): Response<List<Controller>>

    @GET("controllers/available-devices")
    suspend fun getAvailableDevices(): Response<List<String>>

    @POST("controllers")
    suspend fun createController(@Body request: CreateControllerRequest): Response<Controller>

    @POST("controllers/claim")
    suspend fun claimDevice(@Body request: ClaimDeviceRequest): Response<ClaimDeviceResponse>

    @DELETE("controllers/{controllerId}")
    suspend fun deleteController(@Path("controllerId") controllerId: Int): Response<Unit>

    // User Controllers
    @GET("users/{userId}/controllers")
    suspend fun getUserControllers(
        @Path("userId") userId: Int
    ): Response<List<UserControllerAssignment>>

    @POST("users/{userId}/controllers")
    suspend fun assignController(
        @Path("userId") userId: Int,
        @Body request: AssignControllerRequest
    ): Response<UserControllerAssignment>

    @PATCH("users/{userId}/controllers/{controllerId}")
    suspend fun updateAssignment(
        @Path("userId") userId: Int,
        @Path("controllerId") controllerId: Int,
        @Body request: UpdateAssignmentRequest
    ): Response<UserControllerAssignment>

    @HTTP(method = "DELETE", path = "users/{userId}/controllers", hasBody = true)
    suspend fun removeUserController(
        @Path("userId") userId: Int,
        @Body request: RemoveControllerRequest
    ): Response<Unit>
}
