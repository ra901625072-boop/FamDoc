package com.famdoc.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.famdoc.app.core.network.Resource
import com.famdoc.app.data.models.FamilyDetailsResponse
import com.famdoc.app.data.models.FamilyMember
import com.famdoc.app.data.models.RegenerateCodeResponse
import com.famdoc.app.data.repository.FamilyRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class FamilyViewModel(private val familyRepository: FamilyRepository) : ViewModel() {

    private val _membersState = MutableStateFlow<Resource<List<FamilyMember>>>(Resource.Loading())
    val membersState: StateFlow<Resource<List<FamilyMember>>> = _membersState.asStateFlow()

    private val _familyDetailsState = MutableStateFlow<Resource<FamilyDetailsResponse>>(Resource.Loading())
    val familyDetailsState: StateFlow<Resource<FamilyDetailsResponse>> = _familyDetailsState.asStateFlow()

    private val _generatedSecretCode = MutableStateFlow<String?>(null)
    val generatedSecretCode: StateFlow<String?> = _generatedSecretCode.asStateFlow()

    private val _actionMessage = MutableStateFlow<String?>(null)
    val actionMessage: StateFlow<String?> = _actionMessage.asStateFlow()

    fun loadFamilyData() {
        loadMembers()
        loadFamilyDetails()
    }

    fun loadMembers() {
        viewModelScope.launch {
            _membersState.value = Resource.Loading()
            _membersState.value = familyRepository.getMembers()
        }
    }

    fun loadFamilyDetails() {
        viewModelScope.launch {
            _familyDetailsState.value = Resource.Loading()
            _familyDetailsState.value = familyRepository.getFamilyDetails()
        }
    }

    fun removeMember(userId: Int) {
        viewModelScope.launch {
            val result = familyRepository.removeMember(userId)
            if (result is Resource.Success) {
                _actionMessage.value = result.data
                loadMembers()
            } else if (result is Resource.Error) {
                _actionMessage.value = result.message
            }
        }
    }

    fun regenerateCode(name: String, maxMembers: Int = 10) {
        viewModelScope.launch {
            val result = familyRepository.regenerateCode(name, maxMembers)
            if (result is Resource.Success) {
                val newCode = result.data.secretCode
                _generatedSecretCode.value = newCode
                _actionMessage.value = "New Invitation Code Generated: $newCode"
                loadFamilyDetails()
            } else if (result is Resource.Error) {
                _actionMessage.value = result.message
            }
        }
    }

    fun clearGeneratedCode() {
        _generatedSecretCode.value = null
    }

    fun clearActionMessage() {
        _actionMessage.value = null
    }
}
