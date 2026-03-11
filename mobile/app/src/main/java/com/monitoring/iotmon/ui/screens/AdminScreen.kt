package com.monitoring.iotmon.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.QrCode2
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Router
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Surface
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.monitoring.iotmon.data.models.AuthUser
import com.monitoring.iotmon.data.models.Controller
import com.monitoring.iotmon.data.models.UserControllerAssignment
import com.monitoring.iotmon.ui.components.QRCodeDialog
import com.monitoring.iotmon.ui.theme.ErrorColor
import com.monitoring.iotmon.ui.theme.SuccessColor
import com.monitoring.iotmon.ui.theme.WarningColor

data class AdminState(
    val isLoading: Boolean = true,
    val users: List<AuthUser> = emptyList(),
    val controllers: List<Controller> = emptyList(),
    val assignments: List<UserControllerAssignment> = emptyList(),
    val availableDevices: List<String> = emptyList(),
    val selectedUserId: Int? = null,
    val error: String? = null,
    val successMessage: String? = null,
    val isSubmitting: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminScreen(
    state: AdminState,
    onBack: () -> Unit,
    onRefresh: () -> Unit,
    onInviteUser: (username: String, email: String, role: String) -> Unit,
    onDeleteUser: (userId: Int) -> Unit,
    onSelectUser: (userId: Int?) -> Unit,
    onAssignController: (controllerId: Int) -> Unit,
    onRemoveAssignment: (controllerId: Int) -> Unit,
    onCreateController: (deviceId: String, label: String?) -> Unit,
    onDeleteController: (controllerId: Int) -> Unit,
    onClearMessages: () -> Unit
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    var showInviteDialog by remember { mutableStateOf(false) }
    var showCreateControllerDialog by remember { mutableStateOf(false) }
    val tabs = listOf("Users", "Assignments", "Controllers")
    val colorScheme = MaterialTheme.colorScheme

    if (showInviteDialog) {
        InviteUserDialog(
            isSubmitting = state.isSubmitting,
            onDismiss = { showInviteDialog = false },
            onInvite = { username, email, role ->
                onInviteUser(username, email, role)
            }
        )
    }

    if (showCreateControllerDialog) {
        CreateControllerDialog(
            availableDevices = state.availableDevices,
            isSubmitting = state.isSubmitting,
            onDismiss = { showCreateControllerDialog = false },
            onCreate = { deviceId, label ->
                onCreateController(deviceId, label)
            }
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Admin Dashboard",
                        fontWeight = FontWeight.Bold
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back"
                        )
                    }
                },
                actions = {
                    IconButton(onClick = onRefresh) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = colorScheme.background,
                    titleContentColor = colorScheme.onBackground,
                    navigationIconContentColor = colorScheme.onBackground,
                    actionIconContentColor = colorScheme.onBackground
                )
            )
        },
        containerColor = colorScheme.background
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (state.error != null) {
                StatusBanner(
                    text = state.error,
                    isError = true,
                    onDismiss = onClearMessages
                )
            }

            if (state.successMessage != null) {
                StatusBanner(
                    text = state.successMessage,
                    isError = false,
                    onDismiss = onClearMessages
                )
            }

            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = colorScheme.surface,
                contentColor = colorScheme.primary
            ) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = {
                            Text(
                                title,
                                color = if (selectedTab == index) colorScheme.primary else colorScheme.onSurfaceVariant
                            )
                        },
                        icon = {
                            val icon = when (index) {
                                0 -> Icons.Default.People
                                1 -> Icons.Default.Person
                                else -> Icons.Default.Router
                            }
                            Icon(
                                icon,
                                contentDescription = null,
                                tint = if (selectedTab == index) colorScheme.primary else colorScheme.onSurfaceVariant
                            )
                        }
                    )
                }
            }

            if (state.isLoading) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = colorScheme.primary)
                }
            } else {
                when (selectedTab) {
                    0 -> UsersTab(
                        users = state.users,
                        isSubmitting = state.isSubmitting,
                        onInviteClick = { showInviteDialog = true },
                        onDeleteUser = onDeleteUser
                    )
                    1 -> AssignmentsTab(
                        users = state.users,
                        selectedUserId = state.selectedUserId,
                        controllers = state.controllers,
                        assignments = state.assignments,
                        isSubmitting = state.isSubmitting,
                        onSelectUser = onSelectUser,
                        onAssignController = onAssignController,
                        onRemoveAssignment = onRemoveAssignment
                    )
                    2 -> ControllersTab(
                        controllers = state.controllers,
                        isSubmitting = state.isSubmitting,
                        onCreateClick = { showCreateControllerDialog = true },
                        onDeleteController = onDeleteController
                    )
                }
            }
        }
    }
}

@Composable
private fun StatusBanner(
    text: String,
    isError: Boolean,
    onDismiss: () -> Unit
) {
    val icon = if (isError) Icons.Default.Error else Icons.Default.CheckCircle
    val tint = if (isError) ErrorColor else SuccessColor
    val background = if (isError) ErrorColor.copy(alpha = 0.12f) else SuccessColor.copy(alpha = 0.12f)

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        colors = CardDefaults.cardColors(containerColor = background)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, contentDescription = null, tint = tint)
            Spacer(modifier = Modifier.size(8.dp))
            Text(
                text = text,
                modifier = Modifier.weight(1f),
                color = MaterialTheme.colorScheme.onSurface
            )
            TextButton(onClick = onDismiss) {
                Text("Dismiss")
            }
        }
    }
}

@Composable
private fun UsersTab(
    users: List<AuthUser>,
    isSubmitting: Boolean,
    onInviteClick: () -> Unit,
    onDeleteUser: (userId: Int) -> Unit
) {
    if (users.isEmpty()) {
        EmptyState(
            title = "No users found",
            actionLabel = "Invite User",
            onAction = onInviteClick
        )
        return
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            SectionHeader(
                title = "User management",
                subtitle = "Invite new users and remove accounts that should no longer have access.",
                actionLabel = "Invite User",
                onAction = onInviteClick
            )
        }

        items(users) { user ->
            UserCard(
                user = user,
                isSubmitting = isSubmitting,
                onDelete = { onDeleteUser(user.id) }
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun AssignmentsTab(
    users: List<AuthUser>,
    selectedUserId: Int?,
    controllers: List<Controller>,
    assignments: List<UserControllerAssignment>,
    isSubmitting: Boolean,
    onSelectUser: (userId: Int?) -> Unit,
    onAssignController: (controllerId: Int) -> Unit,
    onRemoveAssignment: (controllerId: Int) -> Unit
) {
    val assignedControllerIds = assignments.map { it.controllerId }.toSet()
    val availableControllers = controllers.filterNot { assignedControllerIds.contains(it.id) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            SectionHeader(
                title = "Controller assignments",
                subtitle = "Pick a user, assign controllers, and remove assignments when needed."
            )
        }

        item {
            SectionCard {
                Text(
                    text = "Select user",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.height(12.dp))
                if (users.isEmpty()) {
                    Text(
                        text = "No users available for assignment.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                } else {
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        users.forEach { user ->
                            val selected = selectedUserId == user.id
                            FilterChip(
                                selected = selected,
                                onClick = { onSelectUser(user.id) },
                                label = { Text(user.username) },
                                leadingIcon = {
                                    Icon(
                                        imageVector = if ((user.role == "admin") || user.isAdmin == 1) {
                                            Icons.Default.AdminPanelSettings
                                        } else {
                                            Icons.Default.Person
                                        },
                                        contentDescription = null,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            )
                        }
                    }
                }
            }
        }

        item {
            SectionCard {
                Text(
                    text = "Assign controller",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.height(12.dp))
                if (selectedUserId == null) {
                    Text(
                        text = "Choose a user first.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                } else if (availableControllers.isEmpty()) {
                    Text(
                        text = "No unassigned controllers are available.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                } else {
                    ControllerPicker(
                        controllers = availableControllers,
                        enabled = !isSubmitting,
                        buttonLabel = "Assign",
                        onConfirm = onAssignController
                    )
                }
            }
        }

        if (assignments.isEmpty()) {
            item {
                EmptyState(title = "No assignments for this user")
            }
        } else {
            items(assignments) { assignment ->
                AssignmentCard(
                    assignment = assignment,
                    isSubmitting = isSubmitting,
                    onRemove = { onRemoveAssignment(assignment.controllerId) }
                )
            }
        }
    }
}

@Composable
private fun ControllersTab(
    controllers: List<Controller>,
    isSubmitting: Boolean,
    onCreateClick: () -> Unit,
    onDeleteController: (controllerId: Int) -> Unit
) {
    var selectedController by remember { mutableStateOf<Controller?>(null) }

    selectedController?.let { controller ->
        QRCodeDialog(
            title = controller.label ?: "Device",
            code = controller.pairingCode,
            deviceId = controller.deviceId,
            onDismiss = { selectedController = null }
        )
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            SectionHeader(
                title = "Controllers",
                subtitle = "Create controllers from discovered devices and manage pairing codes.",
                actionLabel = "Create Controller",
                onAction = onCreateClick
            )
        }

        if (controllers.isEmpty()) {
            item {
                EmptyState(
                    title = "No controllers found",
                    actionLabel = "Create Controller",
                    onAction = onCreateClick
                )
            }
        } else {
            items(controllers) { controller ->
                ControllerCard(
                    controller = controller,
                    isSubmitting = isSubmitting,
                    onClick = { selectedController = controller },
                    onDelete = { onDeleteController(controller.id) }
                )
            }
        }
    }
}

@Composable
private fun SectionHeader(
    title: String,
    subtitle: String,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }

        if (actionLabel != null && onAction != null) {
            Button(onClick = onAction) {
                Icon(Icons.Default.Add, contentDescription = null)
                Spacer(modifier = Modifier.size(8.dp))
                Text(actionLabel)
            }
        }
    }
}

@Composable
private fun SectionCard(content: @Composable ColumnScope.() -> Unit) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            content = content
        )
    }
}

@Composable
private fun EmptyState(
    title: String,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null
) {
    SectionCard {
        Text(
            text = title,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        if (actionLabel != null && onAction != null) {
            Spacer(modifier = Modifier.height(12.dp))
            OutlinedButton(onClick = onAction) {
                Text(actionLabel)
            }
        }
    }
}

@Composable
private fun UserCard(
    user: AuthUser,
    isSubmitting: Boolean,
    onDelete: () -> Unit
) {
    val colorScheme = MaterialTheme.colorScheme
    val isAdmin = user.role == "admin" || user.isAdmin == 1

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = colorScheme.surface)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                modifier = Modifier.size(48.dp),
                shape = RoundedCornerShape(24.dp),
                color = if (isAdmin) colorScheme.primaryContainer else colorScheme.surfaceVariant
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        if (isAdmin) Icons.Default.AdminPanelSettings else Icons.Default.Person,
                        contentDescription = null,
                        tint = if (isAdmin) colorScheme.primary else colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.size(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = user.username,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    if (isAdmin) {
                        Spacer(modifier = Modifier.size(8.dp))
                        Surface(
                            shape = RoundedCornerShape(999.dp),
                            color = colorScheme.primaryContainer
                        ) {
                            Text(
                                text = "Admin",
                                style = MaterialTheme.typography.labelSmall,
                                color = colorScheme.primary,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
                Text(
                    text = user.email,
                    style = MaterialTheme.typography.bodyMedium,
                    color = colorScheme.onSurfaceVariant
                )
                if (user.invitedAt != null) {
                    Text(
                        text = "Invited: ${user.invitedAt.take(16)}",
                        style = MaterialTheme.typography.labelMedium,
                        color = colorScheme.onSurfaceVariant
                    )
                } else if (user.createdAt != null) {
                    Text(
                        text = "Joined: ${user.createdAt.take(16)}",
                        style = MaterialTheme.typography.labelMedium,
                        color = colorScheme.onSurfaceVariant
                    )
                }
            }

            OutlinedButton(
                onClick = onDelete,
                enabled = !isSubmitting,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.error)
            ) {
                Icon(Icons.Default.Delete, contentDescription = null, tint = MaterialTheme.colorScheme.error)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ControllerPicker(
    controllers: List<Controller>,
    enabled: Boolean,
    buttonLabel: String,
    onConfirm: (controllerId: Int) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    var selectedController by remember(controllers) { mutableStateOf(controllers.firstOrNull()) }

    Column {
        ExposedDropdownMenuBox(
            expanded = expanded,
            onExpandedChange = { if (enabled) expanded = !expanded }
        ) {
            OutlinedTextField(
                value = selectedController?.let { controller ->
                    buildString {
                        append(controller.label ?: controller.deviceId)
                        append(" • ")
                        append(controller.deviceId)
                    }
                } ?: "",
                onValueChange = {},
                modifier = Modifier
                    .fillMaxWidth()
                    .menuAnchor(MenuAnchorType.PrimaryNotEditable, enabled),
                readOnly = true,
                enabled = enabled,
                label = { Text("Controller") },
                trailingIcon = {
                    ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded)
                }
            )
            ExposedDropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false }
            ) {
                controllers.forEach { controller ->
                    androidx.compose.material3.DropdownMenuItem(
                        text = {
                            Text(
                                text = buildString {
                                    append(controller.label ?: controller.deviceId)
                                    append(" • ")
                                    append(controller.deviceId)
                                }
                            )
                        },
                        onClick = {
                            selectedController = controller
                            expanded = false
                        }
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        Button(
            onClick = { selectedController?.let { onConfirm(it.id) } },
            enabled = enabled && selectedController != null,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(buttonLabel)
        }
    }
}

@Composable
private fun AssignmentCard(
    assignment: UserControllerAssignment,
    isSubmitting: Boolean,
    onRemove: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Text(
                text = assignment.assignmentLabel ?: assignment.controllerLabel ?: assignment.deviceId,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold
            )
            Text(
                text = "Device: ${assignment.deviceId}",
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = "Pairing code: ${assignment.pairingCode}",
                color = WarningColor,
                style = MaterialTheme.typography.bodyMedium
            )
            Text(
                text = "Assigned: ${assignment.createdAt.take(16)}",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(4.dp))
            OutlinedButton(
                onClick = onRemove,
                enabled = !isSubmitting,
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.error)
            ) {
                Icon(Icons.Default.Delete, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                Spacer(modifier = Modifier.size(8.dp))
                Text("Remove", color = MaterialTheme.colorScheme.error)
            }
        }
    }
}

@Composable
private fun ControllerCard(
    controller: Controller,
    isSubmitting: Boolean,
    onClick: () -> Unit,
    onDelete: () -> Unit
) {
    val colorScheme = MaterialTheme.colorScheme

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = colorScheme.surface)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                modifier = Modifier.size(48.dp),
                shape = RoundedCornerShape(24.dp),
                color = SuccessColor.copy(alpha = 0.18f)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.Default.Router,
                        contentDescription = null,
                        tint = SuccessColor
                    )
                }
            }

            Spacer(modifier = Modifier.size(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = controller.label ?: controller.deviceId,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = controller.deviceId,
                    style = MaterialTheme.typography.bodyMedium,
                    color = colorScheme.onSurfaceVariant
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.Key,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = WarningColor
                    )
                    Spacer(modifier = Modifier.size(4.dp))
                    Text(
                        text = controller.pairingCode,
                        style = MaterialTheme.typography.labelMedium,
                        color = WarningColor
                    )
                }
            }

            Icon(
                Icons.Default.QrCode2,
                contentDescription = "Show QR Code",
                tint = colorScheme.primary,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.size(8.dp))
            IconButton(onClick = onDelete, enabled = !isSubmitting) {
                Icon(Icons.Default.Delete, contentDescription = "Delete controller", tint = MaterialTheme.colorScheme.error)
            }
        }
    }
}

@Composable
private fun InviteUserDialog(
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onInvite: (username: String, email: String, role: String) -> Unit
) {
    var username by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var roleIndex by remember { mutableIntStateOf(0) }
    val roles = listOf("user", "admin")

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Invite User") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = username,
                    onValueChange = { username = it },
                    label = { Text("Username") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Email") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    modifier = Modifier.fillMaxWidth()
                )
                Text(
                    text = "Role",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                    roles.forEachIndexed { index, role ->
                        SegmentedButton(
                            shape = SegmentedButtonDefaults.itemShape(index = index, count = roles.size),
                            selected = roleIndex == index,
                            onClick = { roleIndex = index }
                        ) {
                            Text(role.replaceFirstChar { it.uppercase() })
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onInvite(username.trim(), email.trim(), roles[roleIndex]) },
                enabled = !isSubmitting && username.isNotBlank() && email.isNotBlank()
            ) {
                Icon(Icons.Default.PersonAdd, contentDescription = null)
                Spacer(modifier = Modifier.size(8.dp))
                Text("Invite")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isSubmitting) {
                Text("Cancel")
            }
        }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CreateControllerDialog(
    availableDevices: List<String>,
    isSubmitting: Boolean,
    onDismiss: () -> Unit,
    onCreate: (deviceId: String, label: String?) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    var deviceId by remember(availableDevices) { mutableStateOf(availableDevices.firstOrNull().orEmpty()) }
    var label by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Create Controller") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                if (availableDevices.isEmpty()) {
                    Text(
                        text = "No available devices were found.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                } else {
                    ExposedDropdownMenuBox(
                        expanded = expanded,
                        onExpandedChange = { if (!isSubmitting) expanded = !expanded }
                    ) {
                        OutlinedTextField(
                            value = deviceId,
                            onValueChange = {},
                            label = { Text("Device ID") },
                            readOnly = true,
                            enabled = !isSubmitting,
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor(MenuAnchorType.PrimaryNotEditable, !isSubmitting),
                            trailingIcon = {
                                ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded)
                            }
                        )
                        ExposedDropdownMenu(
                            expanded = expanded,
                            onDismissRequest = { expanded = false }
                        ) {
                            availableDevices.forEach { device ->
                                androidx.compose.material3.DropdownMenuItem(
                                    text = { Text(device) },
                                    onClick = {
                                        deviceId = device
                                        expanded = false
                                    }
                                )
                            }
                        }
                    }
                }

                OutlinedTextField(
                    value = label,
                    onValueChange = { label = it },
                    label = { Text("Label (optional)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !isSubmitting
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onCreate(deviceId.trim(), label.trim().ifBlank { null }) },
                enabled = !isSubmitting && deviceId.isNotBlank()
            ) {
                Text("Create")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss, enabled = !isSubmitting) {
                Text("Cancel")
            }
        }
    )
}
