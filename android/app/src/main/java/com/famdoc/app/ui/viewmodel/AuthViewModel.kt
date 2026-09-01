package com.famdoc.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.famdoc.app.core.network.Resource
import com.famdoc.app.data.models.User
import com.famdoc.app.data.repository.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class AuthViewModel(private val authRepository: AuthRepository) : ViewModel() {

    private val _authState = MutableStateFlow<Resource<User>>(Resource.Idle)
    val authState: StateFlow<Resource<User>> = _authState.asStateFlow()

    private val _currentUser = MutableStateFlow<User?>(authRepository.getCachedUser())
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    private val _passwordResetState = MutableStateFlow<Resource<String>>(Resource.Idle)
    val passwordResetState: StateFlow<Resource<String>> = _passwordResetState.asStateFlow()

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _authState.value = Resource.Loading("Opening Vault...")
            val result = authRepository.login(email, password)
            _authState.value = result
            if (result is Resource.Success) {
                _currentUser.value = result.data
            }
        }
    }

    fun register(username: String, email: String, password: String) {
        viewModelScope.launch {
            _authState.value = Resource.Loading("Creating Family Vault...")
            val result = authRepository.register(username, email, password)
            if (result is Resource.Success) {
                // Auto login after registration
                login(email, password)
            } else if (result is Resource.Error) {
                _authState.value = result
            }
        }
    }

    fun joinFamily(username: String, email: String, secretCode: String, password: String? = null) {
        viewModelScope.launch {
            _authState.value = Resource.Loading("Joining Family Vault...")
            val result = authRepository.joinFamily(username, email, secretCode, password)
            _authState.value = result
            if (result is Resource.Success) {
                _currentUser.value = result.data
            }
        }
    }

    fun loadCurrentUser() {
        viewModelScope.launch {
            val result = authRepository.getCurrentUser()
            if (result is Resource.Success) {
                _currentUser.value = result.data
            }
        }
    }

    fun updateProfile(username: String?, password: String?) {
        viewModelScope.launch {
            _authState.value = Resource.Loading("Updating profile...")
            val result = authRepository.updateProfile(username, password)
            _authState.value = result
            if (result is Resource.Success) {
                _currentUser.value = result.data
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            _currentUser.value = null
            _authState.value = Resource.Idle
        }
    }

    fun requestPasswordReset(email: String) {
        viewModelScope.launch {
            _passwordResetState.value = Resource.Loading("Sending OTP...")
            _passwordResetState.value = authRepository.requestPasswordReset(email)
        }
    }

    fun verifyResetOTP(email: String, otpCode: String) {
        viewModelScope.launch {
            _passwordResetState.value = Resource.Loading("Verifying OTP...")
            _passwordResetState.value = authRepository.verifyResetOTP(email, otpCode)
        }
    }

    fun confirmPasswordReset(email: String, otpCode: String, newPassword: String) {
        viewModelScope.launch {
            _passwordResetState.value = Resource.Loading("Resetting password...")
            _passwordResetState.value = authRepository.confirmPasswordReset(email, otpCode, newPassword)
        }
    }

    fun clearAuthState() {
        _authState.value = Resource.Idle
        _passwordResetState.value = Resource.Idle
    }

    fun isLoggedIn(): Boolean = authRepository.isLoggedIn()
}
