package com.monitoring.iotmon.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.monitoring.iotmon.data.models.AuthUser
import com.monitoring.iotmon.data.models.Controller
import com.monitoring.iotmon.ui.components.QRCodeDialog
import com.monitoring.iotmon.ui.theme.*

data class AdminState(
    val isLoading: Boolean = true,
    val users: List<AuthUser> = emptyList(),
    val controllers: List<Controller> = emptyList(),
    val error: String? = null
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminScreen(
    state: AdminState,
    onBack: () -> Unit,
    onRefresh: () -> Unit
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Users", "Controllers")

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
                    containerColor = Slate950
                )
            )
        },
        containerColor = Slate950
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Tabs
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = Slate900,
                contentColor = Cyan500
            ) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = {
                            Text(
                                title,
                                color = if (selectedTab == index) Cyan500 else Slate400
                            )
                        },
                        icon = {
                            Icon(
                                if (index == 0) Icons.Default.People else Icons.Default.Router,
                                contentDescription = null,
                                tint = if (selectedTab == index) Cyan500 else Slate400
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
                    CircularProgressIndicator(color = Cyan500)
                }
            } else if (state.error != null) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Card(
                        colors = CardDefaults.cardColors(
                            containerColor = ErrorColor.copy(alpha = 0.1f)
                        )
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Error, null, tint = ErrorColor)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(state.error, color = ErrorColor)
                        }
                    }
                }
            } else {
                when (selectedTab) {
                    0 -> UsersTab(users = state.users)
                    1 -> ControllersTab(controllers = state.controllers)
                }
            }
        }
    }
}

@Composable
fun UsersTab(users: List<AuthUser>) {
    if (users.isEmpty()) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            contentAlignment = Alignment.Center
        ) {
            Text("No users found", color = Slate400)
        }
    } else {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(users) { user ->
                UserCard(user = user)
            }
        }
    }
}

@Composable
fun UserCard(user: AuthUser) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Slate800)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Avatar
            Surface(
                modifier = Modifier.size(48.dp),
                shape = RoundedCornerShape(24.dp),
                color = if (user.isAdmin == 1) Cyan500.copy(alpha = 0.2f) else Slate700
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        if (user.isAdmin == 1) Icons.Default.AdminPanelSettings else Icons.Default.Person,
                        contentDescription = null,
                        tint = if (user.isAdmin == 1) Cyan500 else Slate400
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = user.username,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    if (user.isAdmin == 1) {
                        Spacer(modifier = Modifier.width(8.dp))
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = Cyan500.copy(alpha = 0.2f)
                        ) {
                            Text(
                                text = "Admin",
                                style = MaterialTheme.typography.labelSmall,
                                color = Cyan500,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
                Text(
                    text = user.email,
                    style = MaterialTheme.typography.bodySmall,
                    color = Slate400
                )
                user.createdAt?.let {
                    Text(
                        text = "Joined: ${it.take(10)}",
                        style = MaterialTheme.typography.labelSmall,
                        color = Slate600
                    )
                }
            }
        }
    }
}

@Composable
fun ControllersTab(controllers: List<Controller>) {
    var selectedController by remember { mutableStateOf<Controller?>(null) }

    // QR Code Dialog
    selectedController?.let { controller ->
        QRCodeDialog(
            title = controller.label ?: "Device",
            code = controller.pairingCode,
            deviceId = controller.deviceId,
            onDismiss = { selectedController = null }
        )
    }

    if (controllers.isEmpty()) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            contentAlignment = Alignment.Center
        ) {
            Text("No controllers found", color = Slate400)
        }
    } else {
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(controllers) { controller ->
                ControllerCard(
                    controller = controller,
                    onClick = { selectedController = controller }
                )
            }
        }
    }
}

@Composable
fun ControllerCard(
    controller: Controller,
    onClick: () -> Unit = {}
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Slate800)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Icon
            Surface(
                modifier = Modifier.size(48.dp),
                shape = RoundedCornerShape(24.dp),
                color = SuccessColor.copy(alpha = 0.2f)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.Default.Router,
                        contentDescription = null,
                        tint = SuccessColor
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = controller.label ?: controller.deviceId,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = controller.deviceId,
                    style = MaterialTheme.typography.bodySmall,
                    color = Slate400
                )
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(top = 4.dp)
                ) {
                    Icon(
                        Icons.Default.Key,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = WarningColor
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "Code: ${controller.pairingCode}",
                        style = MaterialTheme.typography.labelMedium,
                        color = WarningColor
                    )
                }
            }

            // QR Code indicator
            Icon(
                Icons.Default.QrCode2,
                contentDescription = "View QR Code",
                tint = Cyan500,
                modifier = Modifier.size(24.dp)
            )
        }
    }
}
