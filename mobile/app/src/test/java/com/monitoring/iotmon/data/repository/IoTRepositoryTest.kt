package com.monitoring.iotmon.data.repository

import com.monitoring.iotmon.data.api.ApiClient
import com.monitoring.iotmon.data.api.ApiService
import com.monitoring.iotmon.data.models.AssignControllerRequest
import com.monitoring.iotmon.data.models.AuditLogEntry
import com.monitoring.iotmon.data.models.AuditLogQueryParams
import com.monitoring.iotmon.data.models.AuthUser
import com.monitoring.iotmon.data.models.ChangePasswordRequest
import com.monitoring.iotmon.data.models.ClaimDeviceRequest
import com.monitoring.iotmon.data.models.ClaimDeviceResponse
import com.monitoring.iotmon.data.models.Controller
import com.monitoring.iotmon.data.models.CreateControllerRequest
import com.monitoring.iotmon.data.models.HealthDatabase
import com.monitoring.iotmon.data.models.HealthDevices
import com.monitoring.iotmon.data.models.HealthRequests
import com.monitoring.iotmon.data.models.HealthStats
import com.monitoring.iotmon.data.models.HealthTableSize
import com.monitoring.iotmon.data.models.HealthUsers
import com.monitoring.iotmon.data.models.LoginRequest
import com.monitoring.iotmon.data.models.PaginatedResponse
import com.monitoring.iotmon.data.models.Pagination
import com.monitoring.iotmon.data.models.Reading
import com.monitoring.iotmon.data.models.RegisterRequest
import com.monitoring.iotmon.data.models.RemoveControllerRequest
import com.monitoring.iotmon.data.models.UpdateAssignmentRequest
import com.monitoring.iotmon.data.models.UpdateProfileRequest
import com.monitoring.iotmon.data.models.UpdateUserRequest
import com.monitoring.iotmon.data.models.UserControllerAssignment
import com.monitoring.iotmon.data.models.UserInviteRequest
import com.monitoring.iotmon.data.models.UserInviteResponse
import kotlinx.coroutines.test.runTest
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Response

private fun errorBody(message: String) = message.toResponseBody("text/plain".toMediaType())

private fun sampleUser(
    id: Int = 1,
    username: String = "user",
    email: String = "user@example.com",
    role: String? = "user",
    isAdmin: Int = 0
) = AuthUser(
    id = id,
    username = username,
    email = email,
    role = role,
    isAdmin = isAdmin
)

private fun sampleController(
    id: Int = 1,
    deviceId: String = "dev1",
    label: String? = "Lab"
) = Controller(
    id = id,
    deviceId = deviceId,
    label = label,
    pairingCode = "12345",
    createdAt = "2024-01-01T00:00:00Z"
)

private fun sampleAssignment(
    userId: Int = 1,
    controllerId: Int = 2,
    deviceId: String = "dev1"
) = UserControllerAssignment(
    userId = userId,
    controllerId = controllerId,
    deviceId = deviceId,
    controllerLabel = "Controller",
    assignmentLabel = "Kitchen",
    pairingCode = "12345",
    createdAt = "2024-01-01T00:00:00Z"
)

private fun sampleReading(
    deviceId: String = "dev1"
) = Reading(
    deviceId = deviceId,
    ts = "2024-01-01T00:00:00Z",
    temperatureC = 21.0,
    humidityPct = 40.0,
    lux = 10,
    sound = 2,
    soundDbfs = -14.5,
    soundEstSpl = 43.2,
    airQualityRaw = 312.0,
    airBaselinePct = 95.4,
    co2Ppm = 500
)

private fun sampleInviteResponse() = UserInviteResponse(
    user = sampleUser(id = 3, username = "invited", email = "invited@example.com"),
    tempPassword = "temp-1234"
)

private fun sampleHealthStats() = HealthStats(
    serverTime = "2024-01-01T00:00:00Z",
    uptimeSeconds = 1234,
    requests = HealthRequests(
        total = 100,
        byStatus = mapOf("200" to 90),
        byRoute = mapOf("/api/health" to 5),
        since = "2024-01-01T00:00:00Z"
    ),
    database = HealthDatabase(
        sizeBytes = 2048,
        tableSizes = listOf(HealthTableSize("readings", 1024, 12))
    ),
    devices = HealthDevices(
        totalControllers = 2,
        distinctDevices = 2,
        activeDevicesLast24h = 1,
        totalReadings = 50,
        latestReadingAt = "2024-01-01T00:00:00Z"
    ),
    users = HealthUsers(
        total = 5,
        admins = 1,
        invited = 2,
        mustChangePassword = 1
    )
)

private class FakeApiService : ApiService {
    var loginResponse: Response<AuthUser> = Response.error(500, errorBody("Login failed"))
    var registerResponse: Response<AuthUser> = Response.error(500, errorBody("Register failed"))
    var meResponse: Response<AuthUser> = Response.error(500, errorBody("Profile failed"))
    var updateProfileResponse: Response<AuthUser> = Response.error(500, errorBody("Update failed"))
    var changePasswordResponse: Response<Unit> = Response.error(500, errorBody("Password failed"))
    var deleteAccountResponse: Response<Unit> = Response.error(500, errorBody("Delete failed"))
    var getUsersResponse: Response<List<AuthUser>> = Response.error(500, errorBody("Users failed"))
    var inviteUserResponse: Response<UserInviteResponse> = Response.error(500, errorBody("Invite failed"))
    var referFriendResponse: Response<UserInviteResponse> = Response.error(500, errorBody("Referral failed"))
    var getUserResponse: Response<AuthUser> = Response.error(500, errorBody("Get user failed"))
    var updateUserResponse: Response<AuthUser> = Response.error(500, errorBody("Update user failed"))
    var deleteUserResponse: Response<Unit> = Response.error(500, errorBody("Delete user failed"))
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
    var auditLogsResponse: Response<PaginatedResponse<AuditLogEntry>> = Response.error(500, errorBody("Audit failed"))
    var purgeAuditLogsResponse: Response<Unit> = Response.error(500, errorBody("Purge failed"))
    var healthResponse: Response<HealthStats> = Response.error(500, errorBody("Health failed"))

    override suspend fun login(request: LoginRequest): Response<AuthUser> = loginResponse
    override suspend fun register(request: RegisterRequest): Response<AuthUser> = registerResponse
    override suspend fun getMe(): Response<AuthUser> = meResponse
    override suspend fun updateProfile(request: UpdateProfileRequest): Response<AuthUser> = updateProfileResponse
    override suspend fun changePassword(request: ChangePasswordRequest): Response<Unit> = changePasswordResponse
    override suspend fun deleteAccount(): Response<Unit> = deleteAccountResponse
    override suspend fun getUsers(): Response<List<AuthUser>> = getUsersResponse
    override suspend fun inviteUser(request: UserInviteRequest): Response<UserInviteResponse> = inviteUserResponse
    override suspend fun referFriend(request: UserInviteRequest): Response<UserInviteResponse> = referFriendResponse
    override suspend fun getUser(userId: Int): Response<AuthUser> = getUserResponse
    override suspend fun updateUser(userId: Int, request: UpdateUserRequest): Response<AuthUser> = updateUserResponse
    override suspend fun deleteUser(userId: Int): Response<Unit> = deleteUserResponse
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
    override suspend fun getAuditLogs(
        page: Int,
        limit: Int,
        actorId: Int?,
        action: String?,
        entityType: String?,
        entityId: String?
    ): Response<PaginatedResponse<AuditLogEntry>> = auditLogsResponse
    override suspend fun purgeAuditLogs(all: Boolean?, before: String?): Response<Unit> = purgeAuditLogsResponse
    override suspend fun getHealth(): Response<HealthStats> = healthResponse
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
        fakeApi.loginResponse = Response.success(sampleUser(id = 1))

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
        fakeApi.registerResponse = Response.success(sampleUser(id = 2, username = "new", email = "new@example.com"))

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
        fakeApi.getLatestResponse = Response.success(sampleReading())

        val result = repository.getLatestReading("dev1")

        assertTrue(result is Result.Success)
        assertEquals("dev1", (result as Result.Success).data?.deviceId)
    }

    @Test
    fun getHistoryReturnsItems() = runTest {
        fakeApi.getHistoryResponse = Response.success(listOf(sampleReading()))

        val result = repository.getHistory("dev1", hours = 6)

        assertTrue(result is Result.Success)
        assertEquals(1, (result as Result.Success).data.size)
    }

    @Test
    fun getReadingsReturnsPagination() = runTest {
        val page = PaginatedResponse(
            data = listOf(sampleReading()),
            pagination = Pagination(page = 1, limit = 20, total = 1, totalPages = 1)
        )
        fakeApi.getReadingsResponse = Response.success(page)

        val result = repository.getReadings()

        assertTrue(result is Result.Success)
        assertEquals(1, (result as Result.Success).data.pagination.total)
    }

    @Test
    fun claimDeviceReturnsController() = runTest {
        val controller = sampleController()
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
        fakeApi.getUsersResponse = Response.success(listOf(sampleUser(id = 1, isAdmin = 1)))

        val result = repository.getUsers()

        assertTrue(result is Result.Success)
        assertEquals(1, (result as Result.Success).data.size)
    }

    @Test
    fun inviteUserReturnsResponse() = runTest {
        fakeApi.inviteUserResponse = Response.success(sampleInviteResponse())

        val result = repository.inviteUser("invited", "invited@example.com", "user")

        assertTrue(result is Result.Success)
        assertEquals("temp-1234", (result as Result.Success).data.tempPassword)
    }

    @Test
    fun referFriendUsesErrorBody() = runTest {
        fakeApi.referFriendResponse = Response.error(400, errorBody("referral failed"))

        val result = repository.referFriend("friend", "friend@example.com")

        assertTrue(result is Result.Error)
        assertEquals("referral failed", (result as Result.Error).message)
    }

    @Test
    fun getUserReturnsUser() = runTest {
        fakeApi.getUserResponse = Response.success(sampleUser(id = 4, username = "detail"))

        val result = repository.getUser(4)

        assertTrue(result is Result.Success)
        assertEquals("detail", (result as Result.Success).data.username)
    }

    @Test
    fun updateUserReturnsUpdatedUser() = runTest {
        fakeApi.updateUserResponse = Response.success(sampleUser(id = 5, username = "updated"))

        val result = repository.updateUser(5, UpdateUserRequest(username = "updated"))

        assertTrue(result is Result.Success)
        assertEquals("updated", (result as Result.Success).data.username)
    }

    @Test
    fun deleteUserReturnsUnit() = runTest {
        fakeApi.deleteUserResponse = Response.success(Unit)

        val result = repository.deleteUser(7)

        assertTrue(result is Result.Success)
    }

    @Test
    fun getControllersReturnsList() = runTest {
        fakeApi.getControllersResponse = Response.success(listOf(sampleController()))

        val result = repository.getControllers()

        assertTrue(result is Result.Success)
        assertEquals(1, (result as Result.Success).data.size)
    }

    @Test
    fun getAvailableDevicesReturnsList() = runTest {
        fakeApi.availableDevicesResponse = Response.success(listOf("dev1", "dev2"))

        val result = repository.getAvailableDevices()

        assertTrue(result is Result.Success)
        assertEquals(2, (result as Result.Success).data.size)
    }

    @Test
    fun createControllerReturnsController() = runTest {
        fakeApi.createControllerResponse = Response.success(sampleController(id = 8, deviceId = "dev8"))

        val result = repository.createController("dev8", "Lab 8")

        assertTrue(result is Result.Success)
        assertEquals("dev8", (result as Result.Success).data.deviceId)
    }

    @Test
    fun deleteControllerReturnsErrorOnFailure() = runTest {
        fakeApi.deleteControllerResponse = Response.error(500, errorBody("bad delete"))

        val result = repository.deleteController(8)

        assertTrue(result is Result.Error)
        assertEquals("Failed to delete controller", (result as Result.Error).message)
    }

    @Test
    fun getUserControllersReturnsAssignments() = runTest {
        fakeApi.userControllersResponse = Response.success(listOf(sampleAssignment()))

        val result = repository.getUserControllers(1)

        assertTrue(result is Result.Success)
        assertEquals(1, (result as Result.Success).data.size)
    }

    @Test
    fun assignControllerReturnsAssignment() = runTest {
        fakeApi.assignControllerResponse = Response.success(sampleAssignment())

        val result = repository.assignController(1, 2, "Kitchen")

        assertTrue(result is Result.Success)
        assertEquals(2, (result as Result.Success).data.controllerId)
    }

    @Test
    fun getAuditLogsReturnsPage() = runTest {
        val page = PaginatedResponse(
            data = listOf(
                AuditLogEntry(
                    id = 1,
                    actorId = 1,
                    actorEmail = "admin@example.com",
                    action = "controller.assign",
                    entityType = "controller",
                    entityId = "2",
                    metadata = emptyMap(),
                    ipAddress = "127.0.0.1",
                    userAgent = "JUnit",
                    createdAt = "2024-01-01T00:00:00Z"
                )
            ),
            pagination = Pagination(page = 1, limit = 20, total = 1, totalPages = 1)
        )
        fakeApi.auditLogsResponse = Response.success(page)

        val result = repository.getAuditLogs(AuditLogQueryParams(limit = 20))

        assertTrue(result is Result.Success)
        assertEquals(1, (result as Result.Success).data.data.size)
    }

    @Test
    fun purgeAuditLogsReturnsUnit() = runTest {
        fakeApi.purgeAuditLogsResponse = Response.success(Unit)

        val result = repository.purgeAuditLogs(all = true)

        assertTrue(result is Result.Success)
    }

    @Test
    fun getHealthReturnsStats() = runTest {
        fakeApi.healthResponse = Response.success(sampleHealthStats())

        val result = repository.getHealth()

        assertTrue(result is Result.Success)
        assertEquals(100, (result as Result.Success).data.requests.total)
    }

    @Test
    fun setUserIdAndLogoutControlApiClient() {
        repository.setUserId(99)
        assertEquals(99, ApiClient.getUserId())

        repository.logout()
        assertNull(ApiClient.getUserId())
    }
}
