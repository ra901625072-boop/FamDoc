package com.famdoc.app.ui.viewmodel

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.famdoc.app.core.network.Resource
import com.famdoc.app.data.models.FileItem
import com.famdoc.app.data.models.FolderItem
import com.famdoc.app.data.models.ShareLink
import com.famdoc.app.data.repository.VaultRepository
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.io.File

@OptIn(FlowPreview::class)
class VaultViewModel(private val vaultRepository: VaultRepository) : ViewModel() {

    private val _currentFolder = MutableStateFlow<FolderItem?>(null)
    val currentFolder: StateFlow<FolderItem?> = _currentFolder.asStateFlow()

    private val _breadcrumbs = MutableStateFlow<List<FolderItem>>(emptyList())
    val breadcrumbs: StateFlow<List<FolderItem>> = _breadcrumbs.asStateFlow()

    private val _foldersState = MutableStateFlow<Resource<List<FolderItem>>>(Resource.Loading())
    val foldersState: StateFlow<Resource<List<FolderItem>>> = _foldersState.asStateFlow()

    private val _filesState = MutableStateFlow<Resource<List<FileItem>>>(Resource.Loading())
    val filesState: StateFlow<Resource<List<FileItem>>> = _filesState.asStateFlow()

    private val _uploadState = MutableStateFlow<Resource<FileItem>>(Resource.Idle)
    val uploadState: StateFlow<Resource<FileItem>> = _uploadState.asStateFlow()

    private val _downloadState = MutableStateFlow<Resource<File>>(Resource.Idle)
    val downloadState: StateFlow<Resource<File>> = _downloadState.asStateFlow()

    private val _shareLinksState = MutableStateFlow<Resource<List<ShareLink>>>(Resource.Idle)
    val shareLinksState: StateFlow<Resource<List<ShareLink>>> = _shareLinksState.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _selectedCategory = MutableStateFlow<String?>(null)
    val selectedCategory: StateFlow<String?> = _selectedCategory.asStateFlow()

    val selectedFiles = MutableStateFlow<Set<Int>>(emptySet())
    val selectedFolders = MutableStateFlow<Set<Int>>(emptySet())

    init {
        // Reactive debounced search pipeline
        viewModelScope.launch {
            combine(_searchQuery, _selectedCategory) { query, category ->
                query to category
            }
            .debounce { (query, _) -> if (query.isEmpty()) 0L else 300L }
            .distinctUntilChanged()
            .collectLatest { (query, category) ->
                if (query.isNotBlank() || category != null) {
                    _filesState.value = Resource.Loading()
                    val result = vaultRepository.searchFiles(
                        query = query.ifBlank { null },
                        category = category
                    )
                    _filesState.value = result
                }
            }
        }
    }

    fun loadVaultContent() {
        val folderId = _currentFolder.value?.id
        loadFolders()
        loadFiles(folderId)
    }

    fun loadFolders() {
        viewModelScope.launch {
            _foldersState.value = Resource.Loading()
            _foldersState.value = vaultRepository.getFolders()
        }
    }

    fun loadFiles(folderId: Int? = null) {
        viewModelScope.launch {
            _filesState.value = Resource.Loading()
            _filesState.value = vaultRepository.getFiles(folderId)
        }
    }

    fun navigateToFolder(folder: FolderItem) {
        _currentFolder.value = folder
        val currentCrumbs = _breadcrumbs.value.toMutableList()
        val existingIndex = currentCrumbs.indexOfFirst { it.id == folder.id }
        if (existingIndex != -1) {
            _breadcrumbs.value = currentCrumbs.subList(0, existingIndex + 1)
        } else {
            currentCrumbs.add(folder)
            _breadcrumbs.value = currentCrumbs
        }
        clearSelection()
        _searchQuery.value = ""
        _selectedCategory.value = null
        loadFiles(folder.id)
    }

    fun navigateToRoot() {
        _currentFolder.value = null
        _breadcrumbs.value = emptyList()
        clearSelection()
        _searchQuery.value = ""
        _selectedCategory.value = null
        loadFiles(null)
    }

    fun navigateUp() {
        val crumbs = _breadcrumbs.value
        if (crumbs.size > 1) {
            val parentFolder = crumbs[crumbs.size - 2]
            _currentFolder.value = parentFolder
            _breadcrumbs.value = crumbs.dropLast(1)
            clearSelection()
            _searchQuery.value = ""
            _selectedCategory.value = null
            loadFiles(parentFolder.id)
        } else if (crumbs.isNotEmpty() || _currentFolder.value != null) {
            navigateToRoot()
        }
    }

    fun createFolder(name: String) {
        viewModelScope.launch {
            val parentId = _currentFolder.value?.id
            val result = vaultRepository.createFolder(name, parentId)
            if (result is Resource.Success) {
                loadFolders()
            }
        }
    }

    fun renameFolder(folderId: Int, newName: String) {
        viewModelScope.launch {
            val result = vaultRepository.renameFolder(folderId, newName)
            if (result is Resource.Success) {
                loadFolders()
            }
        }
    }

    fun moveFolder(folderId: Int, targetParentId: Int?) {
        viewModelScope.launch {
            val result = vaultRepository.moveFolder(folderId, targetParentId)
            if (result is Resource.Success) {
                loadVaultContent()
            }
        }
    }

    fun deleteFolder(folderId: Int) {
        viewModelScope.launch {
            val result = vaultRepository.deleteFolder(folderId)
            if (result is Resource.Success) {
                loadFolders()
                loadFiles(_currentFolder.value?.id)
            }
        }
    }

    fun moveFile(fileId: Int, targetFolderId: Int?) {
        viewModelScope.launch {
            val result = vaultRepository.moveFile(fileId, targetFolderId)
            if (result is Resource.Success) {
                loadVaultContent()
            }
        }
    }

    fun bulkMove(targetFolderId: Int?) {
        viewModelScope.launch {
            selectedFiles.value.forEach { fileId ->
                vaultRepository.moveFile(fileId, targetFolderId)
            }
            selectedFolders.value.forEach { folderId ->
                if (folderId != targetFolderId) {
                    vaultRepository.moveFolder(folderId, targetFolderId)
                }
            }
            clearSelection()
            loadVaultContent()
        }
    }

    fun bulkDelete() {
        viewModelScope.launch {
            selectedFiles.value.forEach { fileId ->
                vaultRepository.deleteFile(fileId)
            }
            selectedFolders.value.forEach { folderId ->
                vaultRepository.deleteFolder(folderId)
            }
            clearSelection()
            loadVaultContent()
        }
    }

    fun uploadFile(uri: Uri) {
        viewModelScope.launch {
            _uploadState.value = Resource.Loading("Uploading file...")
            val folderId = _currentFolder.value?.id
            val result = vaultRepository.uploadFile(uri, folderId)
            _uploadState.value = result
            if (result is Resource.Success) {
                loadFiles(folderId)
                loadFolders()
            }
        }
    }

    fun renameFile(fileId: Int, newFilename: String) {
        viewModelScope.launch {
            val result = vaultRepository.renameFile(fileId, newFilename)
            if (result is Resource.Success) {
                loadFiles(_currentFolder.value?.id)
            }
        }
    }

    fun deleteFile(fileId: Int) {
        viewModelScope.launch {
            val result = vaultRepository.deleteFile(fileId)
            if (result is Resource.Success) {
                loadFiles(_currentFolder.value?.id)
                loadFolders()
            }
        }
    }

    fun downloadFile(file: FileItem) {
        viewModelScope.launch {
            _downloadState.value = Resource.Loading("Downloading ${file.filename}...")
            _downloadState.value = vaultRepository.downloadAndSaveFile(file.id, file.filename)
        }
    }

    fun search(query: String, category: String? = null) {
        _searchQuery.value = query
        _selectedCategory.value = category
        if (query.isBlank() && category == null) {
            loadFiles(_currentFolder.value?.id)
        }
    }

    fun createShareLink(fileId: Int, password: String?, expiresAt: String?, maxDownloads: Int?) {
        viewModelScope.launch {
            val result = vaultRepository.createShareLink(fileId, password, expiresAt, maxDownloads)
            if (result is Resource.Success) {
                loadShareLinks(fileId)
            }
        }
    }

    fun loadShareLinks(fileId: Int) {
        viewModelScope.launch {
            _shareLinksState.value = Resource.Loading()
            _shareLinksState.value = vaultRepository.getShareLinks(fileId)
        }
    }

    fun revokeShareLink(token: String, fileId: Int? = null) {
        viewModelScope.launch {
            val result = vaultRepository.revokeShareLink(token)
            if (result is Resource.Success && fileId != null) {
                loadShareLinks(fileId)
            }
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

    fun clearUploadState() {
        _uploadState.value = Resource.Idle
    }

    fun clearDownloadState() {
        _downloadState.value = Resource.Idle
    }
}
