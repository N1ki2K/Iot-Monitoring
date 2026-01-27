package com.monitoring.iotmon.data.repository

import com.monitoring.iotmon.data.api.ApiClient
import com.monitoring.iotmon.data.api.ApiService
import com.monitoring.iotmon.data.models.*
import kotlinx.coroutines.test.runTest
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Response

private fun errorBody(message: String) = message.toResponseBody("text/plain".toMediaType())

private class FakeApiService : ApiService {
    var loginResponse: Response<AuthUser> = Response.error(500, errorBody("Login failed"))
    var registerResponse: Response<AuthUser> = Response.error(500, errorBody("Register failed"))
    var meResponse: Response<AuthUser> = Response.error(500, errorBody("Profile failed"))
    var updateProfileResponse: Response<AuthUser> = Response.error(500, errorBody("Update failed"))
    var changePasswordResponse: Response<Unit> = Response.error(500, errorBody("Password failed"))
    var deleteAccountResponse: Response<Unit> = Response.error(500, errorBody("Delete failed"))
    var getUsersResponse: Response<List<AuthUser>> = Response.error(500, errorBody("Users failed"))
    var getDevicesResponse: Response<List<String>> = Response.error(500, errorBody("Devices failed"))
    var getLatestResponse: Response<Reading?> = Response.error(500, errorBody("Latest failed"))
    var getHistoryResponse: Response<List<Reading>> = Response.error(500, errorBody("History failed"))
    var getReadingsResponse: Response<PaginatedResponse<Reading>> = Response.error(500, errorBody("Readings failed"))
    var getControllersResponse: Response<List<Controller>> = Response.error(500, errorBody("Controllers failed"))
    var availableDevicesResponse: Response<List<String>> = Response.error(500, errorBody("Available failed"))
    var createControllerResponse: Response<Controller> = Response.error(500, errorBody("Create failed"))
    var claimDeviceResponse: Response<ClaimDeviceResponse> = Response.error(500, errorBody("Claim failed"))
    var deleteControllerResponse: Response<Unit> = Response.error(500, errorBody("Delete controller failed"))
    var userControllersResponse: Response<List<UserControllerAssignment>> = Response.error(500, errorBody("User controllers failed"))
    var assignControllerResponse: Response<UserControllerAssignment> = Response.error(500, errorBody("Assign failed"))
    var updateAssignmentResponse: Response<UserControllerAssignment> = Response.error(500, errorBody("Update assignment failed"))
    var removeControllerResponse: Response<Unit> = Response.error(500, errorBody("Remove failed"))

    override suspend fun login(request: LoginRequest): Response<AuthUser> = loginResponse
    override suspend fun register(request: RegisterRequest): Response<AuthUser> = registerResponse
    override suspend fun getMe(): Response<AuthUser> = meResponse
    override suspend fun updateProfile(request: UpdateProfileRequest): Response<AuthUser> = updateProfileResponse
    override suspend fun changePassword(request: ChangePasswordRequest): Response<Unit> = changePasswordResponse
    override suspend fun deleteAccount(): Response<Unit> = deleteAccountResponse
    override suspend fun getUsers(): Response<List<AuthUser>> = getUsersResponse
    override suspend fun getDevices(): Response<List<String>> = getDevicesResponse
    override suspend fun getLatestReading(deviceId: String): Response<Reading?> = getLatestResponse
    override suspend fun getHistory(deviceId: String, hours: Int): Response<List<Reading>> = getHistoryResponse
    override suspend fun getReadings(
        page: Int,
        limit: Int,
        search: String,
        sortBy: String,
        sortOrder: String,
        device: String
    ): Response<PaginatedResponse<Reading>> = getReadingsResponse
    override suspend fun getControllers(): Response<List<Controller>> = getControllersResponse
    override suspend fun getAvailableDevices(): Response<List<String>> = availableDevicesResponse
    override suspend fun createController(request: CreateControllerRequest): Response<Controller> = createControllerResponse
    override suspend fun claimDevice(request: ClaimDeviceRequest): Response<ClaimDeviceResponse> = claimDeviceResponse
    override suspend fun deleteController(controllerId: Int): Response<Unit> = deleteControllerResponse
    override suspend fun getUserControllers(userId: Int): Response<List<UserControllerAssignment>> = userControllersResponse
    override suspend fun assignController(userId: Int, request: AssignControllerRequest): Response<UserControllerAssignment> = assignControllerResponse
    override suspend fun updateAssignment(userId: Int, controllerId: Int, request: UpdateAssignmentRequest): Response<UserControllerAssignment> = updateAssignmentResponse
    override suspend fun removeUserController(userId: Int, request: RemoveControllerRequest): Response<Unit> = removeControllerResponse
}

class IoTRepositoryTest {
    private lateinit var fakeApi: FakeApiService
    private lateinit var repository: IoTRepository

    @Before
    fun setup() {
        fakeApi = FakeApiService()
        repository = IoTRepository(fakeApi)
        ApiClient.setUserId(null)
    }

    @Test
    fun loginSuccessSetsUserId() = runTest {
        val user = AuthUser(1, "user", "user@example.com", 0)
        fakeApi.loginResponse = Response.success(user)

        val result = repository.login("user@example.com", "pw")

        assertTrue(result is Result.Success)
        assertEquals(1, (result as Result.Success).data.id)
        assertEquals(1, ApiClient.getUserId())
    }

    @Test
    fun loginErrorReturnsMessage() = runTest {
        fakeApi.loginResponse = Response.error(401, errorBody("invalid credentials"))

        val result = repository.login("user@example.com", "pw")

        assertTrue(result is Result.Error)
        assertEquals("invalid credentials", (result as Result.Error).message)
    }

    @Test
    fun registerSuccessSetsUserId() = runTest {
        val user = AuthUser(2, "new", "new@example.com", 0)
        fakeApi.registerResponse = Response.success(user)

        val result = repository.register("new", "new@example.com", "pw")

        assertTrue(result is Result.Success)
        assertEquals(2, (result as Result.Success).data.id)
        assertEquals(2, ApiClient.getUserId())
    }

    @Test
    fun getMeErrorReturnsDefault() = runTest {
        fakeApi.meResponse = Response.error(500, errorBody("nope"))

        val result = repository.getMe()

        assertTrue(result is Result.Error)
        assertEquals("Failed to get user profile", (result as Result.Error).message)
    }

    @Test
    fun updateProfileUsesErrorBody() = runTest {
        fakeApi.updateProfileResponse = Response.error(400, errorBody("bad update"))

        val result = repository.updateProfile("u", "e")

        assertTrue(result is Result.Error)
        assertEquals("bad update", (result as Result.Error).message)
    }

    @Test
    fun changePasswordSuccessReturnsUnit() = runTest {
        fakeApi.changePasswordResponse = Response.success(Unit)

        val result = repository.changePassword("old", "new")

        assertTrue(result is Result.Success)
    }

    @Test
    fun deleteAccountFailureReturnsError() = runTest {
        fakeApi.deleteAccountResponse = Response.error(500, errorBody("no delete"))

        val result = repository.deleteAccount()

        assertTrue(result is Result.Error)
        assertEquals("Failed to delete account", (result as Result.Error).message)
    }

    @Test
    fun getDevicesReturnsList() = runTest {
        fakeApi.getDevicesResponse = Response.success(listOf("dev1", "dev2"))

        val result = repository.getDevices()

        assertTrue(result is Result.Success)
        assertEquals(2, (result as Result.Success).data.size)
    }

    @Test
    fun getLatestReadingReturnsReading() = runTest {
        val reading = Reading(deviceId = "dev1", ts = "2024-01-01", temperatureC = 21.0, humidityPct = 40.0, lux = 10, sound = 2, co2Ppm = 500)
        fakeApi.getLatestResponse = Response.success(reading)

        val result = repository.getLatestReading("dev1")

        assertTrue(result is Result.Success)
        assertEquals("dev1", (result as Result.Success).data?.deviceId)
    }

    @Test
    fun getReadingsReturnsPagination() = runTest {
        val page = PaginatedResponse(
            data = emptyList(),
            pagination = Pagination(page = 1, limit = 20, total = 0, totalPages = 0)
        )
        fakeApi.getReadingsResponse = Response.success(page)

        val result = repository.getReadings()

        assertTrue(result is Result.Success)
        assertEquals(0, (result as Result.Success).data.pagination.total)
    }

    @Test
    fun claimDeviceReturnsController() = runTest {
        val controller = Controller(1, "dev1", "Lab", "12345", "2024-01-01")
        fakeApi.claimDeviceResponse = Response.success(ClaimDeviceResponse(controller))

        val result = repository.claimDevice("12345", "Lab")

        assertTrue(result is Result.Success)
        assertEquals("dev1", (result as Result.Success).data.deviceId)
    }

    @Test
    fun updateAssignmentLabelReturnsError() = runTest {
        fakeApi.updateAssignmentResponse = Response.error(500, errorBody("no label"))

        val result = repository.updateAssignmentLabel(1, 2, "Kitchen")

        assertTrue(result is Result.Error)
        assertEquals("Failed to update label", (result as Result.Error).message)
    }

    @Test
    fun removeDeviceReturnsUnit() = runTest {
        fakeApi.removeControllerResponse = Response.success(Unit)

        val result = repository.removeDevice(1, 2)

        assertTrue(result is Result.Success)
    }

    @Test
    fun getUsersReturnsList() = runTest {
        fakeApi.getUsersResponse = Response.success(listOf(AuthUser(1, "u", "e", 1)))

        val result = repository.getUsers()

        assertTrue(result is Result.Success)
        assertEquals(1, (result as Result.Success).data.size)
    }

    @Test
    fun getControllersReturnsList() = runTest {
        fakeApi.getControllersResponse = Response.success(listOf(Controller(1, "dev1", null, "12345", "2024-01-01")))

        val result = repository.getControllers()

        assertTrue(result is Result.Success)
        assertEquals(1, (result as Result.Success).data.size)
    }
}
