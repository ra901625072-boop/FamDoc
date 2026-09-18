package com.famdoc.app.core.security

import android.content.Context
import androidx.appcompat.app.AppCompatActivity
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_STRONG
import androidx.biometric.BiometricManager.Authenticators.DEVICE_CREDENTIAL
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat

sealed interface BiometricResult {
    data object HardwareUnavailable : BiometricResult
    data object FeatureUnavailable : BiometricResult
    data object AuthenticationNotSet : BiometricResult
    data object AuthenticationFailed : BiometricResult
    data object AuthenticationSuccess : BiometricResult
    data class AuthenticationError(val errorCode: Int, val errString: CharSequence) : BiometricResult
}

class BiometricPromptManager(
    private val context: Context
) {
    private val biometricManager = BiometricManager.from(context)

    fun canAuthenticate(): BiometricResult? {
        val authenticators = BIOMETRIC_STRONG or DEVICE_CREDENTIAL
        return when (biometricManager.canAuthenticate(authenticators)) {
            BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE -> BiometricResult.HardwareUnavailable
            BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE -> BiometricResult.FeatureUnavailable
            BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> BiometricResult.AuthenticationNotSet
            BiometricManager.BIOMETRIC_SUCCESS -> null
            else -> BiometricResult.FeatureUnavailable
        }
    }

    fun showBiometricPrompt(
        activity: AppCompatActivity,
        title: String = "FamDoc Vault Authentication",
        subtitle: String = "Verify your fingerprint or face to unlock",
        description: String = "Confirm your identity to access family records",
        onResult: (BiometricResult) -> Unit
    ) {
        val status = canAuthenticate()
        if (status != null) {
            onResult(status)
            return
        }

        val executor = ContextCompat.getMainExecutor(activity)
        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setSubtitle(subtitle)
            .setDescription(description)
            .setAllowedAuthenticators(BIOMETRIC_STRONG or DEVICE_CREDENTIAL)
            .build()

        val prompt = BiometricPrompt(
            activity,
            executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    super.onAuthenticationError(errorCode, errString)
                    onResult(BiometricResult.AuthenticationError(errorCode, errString))
                }

                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    super.onAuthenticationSucceeded(result)
                    onResult(BiometricResult.AuthenticationSuccess)
                }

                override fun onAuthenticationFailed() {
                    super.onAuthenticationFailed()
                    onResult(BiometricResult.AuthenticationFailed)
                }
            }
        )

        prompt.authenticate(promptInfo)
    }
}
