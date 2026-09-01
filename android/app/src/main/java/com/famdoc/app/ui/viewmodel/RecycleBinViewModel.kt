package com.famdoc.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.famdoc.app.core.network.Resource
import com.famdoc.app.data.models.RecycleBinResponse
import com.famdoc.app.data.repository.RecycleBinRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class RecycleBinViewModel(private val recycleBinRepository: RecycleBinRepository) : ViewModel() {

    private val _recycleBinState = MutableStateFlow<Resource<RecycleBinResponse>>(Resource.Loading())
    val recycleBinState: StateFlow<Resource<RecycleBinResponse>> = _recycleBinState.asStateFlow()

    private val _actionMessage = MutableStateFlow<String?>(null)
    val actionMessage: StateFlow<String?> = _actionMessage.asStateFlow()

    val selectedFiles = MutableStateFlow<Set<Int>>(emptySet())
    val selectedFolders = MutableStateFlow<Set<Int>>(emptySet())

    fun loadRecycleBin() {
        viewModelScope.launch {
            _recycleBinState.value = Resource.Loading()
            _recycleBinState.value = recycleBinRepository.getRecycleBin()
        }
    }

    fun restoreItem(itemType: String, itemId: Int) {
        viewModelScope.launch {
            val result = recycleBinRepository.restoreItem(itemType, itemId)
            if (result is Resource.Success) {
                _actionMessage.value = result.data
                loadRecycleBin()
            }
        }
    }

    fun purgeItem(itemType: String, itemId: Int) {
        viewModelScope.launch {
            val result = recycleBinRepository.purgeItem(itemType, itemId)
            if (result is Resource.Success) {
                _actionMessage.value = result.data
                loadRecycleBin()
            }
        }
    }

    fun restoreSelected() {
        viewModelScope.launch {
            selectedFolders.value.forEach { id ->
                recycleBinRepository.restoreItem("folder", id)
            }
            selectedFiles.value.forEach { id ->
                recycleBinRepository.restoreItem("file", id)
            }
            clearSelection()
            loadRecycleBin()
            _actionMessage.value = "Selected items restored"
        }
    }

    fun purgeSelected() {
        viewModelScope.launch {
            selectedFolders.value.forEach { id ->
                recycleBinRepository.purgeItem("folder", id)
            }
            selectedFiles.value.forEach { id ->
                recycleBinRepository.purgeItem("file", id)
            }
            clearSelection()
            loadRecycleBin()
            _actionMessage.value = "Selected items permanently purged"
        }
    }

    fun toggleFileSelection(fileId: Int) {
        val current = selectedFiles.value.toMutableSet()
        if (current.contains(fileId)) current.remove(fileId) else current.add(fileId)
        selectedFiles.value = current
    }

    fun toggleFolderSelection(folderId: Int) {
        val current = selectedFolders.value.toMutableSet()
        if (current.contains(folderId)) current.remove(folderId) else current.add(folderId)
        selectedFolders.value = current
    }

    fun clearSelection() {
        selectedFiles.value = emptySet()
        selectedFolders.value = emptySet()
    }

    fun clearActionMessage() {
        _actionMessage.value = null
    }
}
