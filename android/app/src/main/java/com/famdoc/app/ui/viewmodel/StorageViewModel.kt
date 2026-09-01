package com.famdoc.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.famdoc.app.core.network.Resource
import com.famdoc.app.data.models.DashboardStats
import com.famdoc.app.data.models.FamilyMember
import com.famdoc.app.data.models.StorageAccount
import com.famdoc.app.data.models.StorageConfigResponse
import com.famdoc.app.data.repository.DashboardRepository
import com.famdoc.app.data.repository.FamilyRepository
import com.famdoc.app.data.repository.StorageRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class StorageViewModel(
    private val storageRepository: StorageRepository,
    private val familyRepository: FamilyRepository? = null,
    private val dashboardRepository: DashboardRepository? = null
) : ViewModel() {

    private val _storageConfigState = MutableStateFlow<Resource<StorageConfigResponse>>(Resource.Loading())
    val storageConfigState: StateFlow<Resource<StorageConfigResponse>> = _storageConfigState.asStateFlow()

    private val _accountsState = MutableStateFlow<Resource<List<StorageAccount>>>(Resource.Loading())
    val accountsState: StateFlow<Resource<List<StorageAccount>>> = _accountsState.asStateFlow()

    private val _familyMembersState = MutableStateFlow<Resource<List<FamilyMember>>>(Resource.Loading())
    val familyMembersState: StateFlow<Resource<List<FamilyMember>>> = _familyMembersState.asStateFlow()

    private val _dashboardStatsState = MutableStateFlow<Resource<DashboardStats>>(Resource.Loading())
    val dashboardStatsState: StateFlow<Resource<DashboardStats>> = _dashboardStatsState.asStateFlow()

    private val _oauthUrlState = MutableStateFlow<Resource<String>>(Resource.Idle)
    val oauthUrlState: StateFlow<Resource<String>> = _oauthUrlState.asStateFlow()

    private val _actionMessage = MutableStateFlow<String?>(null)
    val actionMessage: StateFlow<String?> = _actionMessage.asStateFlow()

    fun loadStorageData() {
        viewModelScope.launch {
            _storageConfigState.value = Resource.Loading()
            val configResult = storageRepository.getStorageConfig()
            _storageConfigState.value = configResult
            if (configResult is Resource.Success) {
                _accountsState.value = Resource.Success(configResult.data.accounts)
            } else if (configResult is Resource.Error) {
                _accountsState.value = Resource.Error(configResult.message)
            }
        }

        familyRepository?.let { repo ->
            viewModelScope.launch {
                _familyMembersState.value = Resource.Loading()
                _familyMembersState.value = repo.getMembers()
            }
        }

        dashboardRepository?.let { repo ->
            viewModelScope.launch {
                _dashboardStatsState.value = Resource.Loading()
                _dashboardStatsState.value = repo.getStats()
            }
        }
    }

    fun updateStorageMode(mode: String) {
        viewModelScope.launch {
            val currentConfig = (_storageConfigState.value as? Resource.Success)?.data
            val activeAccounts = currentConfig?.accounts?.filter { it.status == "active" } ?: emptyList()

            if (mode == "google" && activeAccounts.isEmpty() && currentConfig?.googleConfigured != true) {
                _actionMessage.value = "Please tap '+ Connect Drive' first to link Google Drive before enabling this mode."
                return@launch
            }

            val result = storageRepository.updateStorageMode(mode)
            if (result is Resource.Success) {
                _actionMessage.value = "Storage mode updated to $mode"
                loadStorageData()
            } else if (result is Resource.Error) {
                _actionMessage.value = result.message
            }
        }
    }

    fun getGoogleOAuthUrl(clientId: String? = null, clientSecret: String? = null, action: String = "add") {
        viewModelScope.launch {
            _oauthUrlState.value = Resource.Loading("Generating Google authorization link...")
            val result = storageRepository.getGoogleOAuthUrl(clientId, clientSecret)
            _oauthUrlState.value = result
            if (result is Resource.Error) {
                _actionMessage.value = result.message
            }
        }
    }

    fun updateAccountLabel(accountId: Int, label: String) {
        viewModelScope.launch {
            val result = storageRepository.updateAccount(accountId = accountId, label = label.trim())
            if (result is Resource.Success) {
                _actionMessage.value = "Drive label updated successfully"
                loadStorageData()
            } else if (result is Resource.Error) {
                _actionMessage.value = result.message
            }
        }
    }

    fun assignAccountMember(accountId: Int, userId: Int?) {
        viewModelScope.launch {
            // userId 0 or null is treated as unassign
            val targetUserId = if (userId != null && userId > 0) userId else 0
            val result = storageRepository.updateAccount(accountId = accountId, userId = targetUserId)
            if (result is Resource.Success) {
                _actionMessage.value = "Drive assigned to family member successfully"
                loadStorageData()
            } else if (result is Resource.Error) {
                _actionMessage.value = result.message
            }
        }
    }

    fun disconnectAccount(accountId: Int) {
        viewModelScope.launch {
            val result = storageRepository.disconnectAccount(accountId)
            if (result is Resource.Success) {
                _actionMessage.value = result.data
                loadStorageData()
            } else if (result is Resource.Error) {
                _actionMessage.value = result.message
            }
        }
    }

    fun deleteAccount(accountId: Int) {
        viewModelScope.launch {
            val result = storageRepository.deleteAccount(accountId)
            if (result is Resource.Success) {
                _actionMessage.value = result.data
                loadStorageData()
            } else if (result is Resource.Error) {
                _actionMessage.value = result.message
            }
        }
    }

    fun clearActionMessage() {
        _actionMessage.value = null
        _oauthUrlState.value = Resource.Idle
    }
}
