package com.monitoring.iotmon.ui.components

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.QrCode
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.monitoring.iotmon.ui.theme.*

@Composable
fun ClaimDeviceDialog(
    isLoading: Boolean,
    error: String?,
    onDismiss: () -> Unit,
    onClaim: (code: String, label: String?) -> Unit
) {
    var code by remember { mutableStateOf("") }
    var label by remember { mutableStateOf("") }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(
                containerColor = Slate800
            )
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Claim Device",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                    IconButton(onClick = onDismiss) {
                        Icon(
                            Icons.Default.Close,
                            contentDescription = "Close",
                            tint = Slate400
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Enter the 5-digit pairing code from your device to add it to your account.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Slate400
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Pairing Code Input
                OutlinedTextField(
                    value = code,
                    onValueChange = {
                        if (it.length <= 5 && it.all { c -> c.isDigit() }) {
                            code = it
                        }
                    },
                    label = { Text("Pairing Code") },
                    placeholder = { Text("12345") },
                    leadingIcon = {
                        Icon(Icons.Default.QrCode, contentDescription = null)
                    },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Number
                    ),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Cyan500,
                        focusedLabelColor = Cyan500,
                        cursorColor = Cyan500
                    ),
                    textStyle = MaterialTheme.typography.headlineSmall.copy(
                        textAlign = TextAlign.Center,
                        fontWeight = FontWeight.Bold
                    )
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Label Input (optional)
                OutlinedTextField(
                    value = label,
                    onValueChange = { label = it },
                    label = { Text("Device Label (optional)") },
                    placeholder = { Text("e.g., Living Room Sensor") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Cyan500,
                        focusedLabelColor = Cyan500,
                        cursorColor = Cyan500
                    )
                )

                // Error message
                if (error != null) {
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = error,
                        color = ErrorColor,
                        style = MaterialTheme.typography.bodySmall,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = Slate400
                        )
                    ) {
                        Text("Cancel")
                    }

                    Button(
                        onClick = {
                            onClaim(code, label.ifBlank { null })
                        },
                        modifier = Modifier.weight(1f),
                        enabled = code.length == 5 && !isLoading,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Cyan500
                        )
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = MaterialTheme.colorScheme.onPrimary,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text("Claim Device")
                        }
                    }
                }
            }
        }
    }
}
