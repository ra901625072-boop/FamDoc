package com.famdoc.app.ui.components

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.famdoc.app.ui.animation.bounceClick
import com.famdoc.app.ui.theme.Dimens

@Composable
fun ConfirmDialog(
    title: String,
    message: String,
    confirmText: String = "Confirm",
    cancelText: String = "Cancel",
    isDestructive: Boolean = false,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        shape = RoundedCornerShape(Dimens.RadiusLarge),
        title = { Text(text = title, fontWeight = FontWeight.Bold) },
        text = { Text(text = message, style = MaterialTheme.typography.bodyMedium) },
        confirmButton = {
            Button(
                onClick = onConfirm,
                colors = if (isDestructive) {
                    ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                } else {
                    ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                },
                shape = RoundedCornerShape(Dimens.RadiusMedium),
                modifier = Modifier.bounceClick(scaleDown = 0.95f, onClick = onConfirm)
            ) {
                Text(confirmText, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(
                onClick = onDismiss,
                shape = RoundedCornerShape(Dimens.RadiusMedium),
                modifier = Modifier.bounceClick(scaleDown = 0.95f, onClick = onDismiss)
            ) {
                Text(cancelText)
            }
        }
    )
}
