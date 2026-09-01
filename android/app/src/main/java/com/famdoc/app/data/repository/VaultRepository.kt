package com.famdoc.app.data.repository

import android.content.Context
import android.net.Uri
import android.os.Environment
import com.famdoc.app.core.network.ApiClient
import com.famdoc.app.core.network.Resource
import com.famdoc.app.core.utils.ErrorTranslator
import com.famdoc.app.core.utils.FileUtils
import com.famdoc.app.data.models.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.ResponseBody
import java.io.File
import java.io.FileOutputStream

class VaultRepository(
    private val context: Context,
    private val apiClient: ApiClient
) {

    suspend fun getFolders(): Resource<List<FolderItem>> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.foldersApi.getFolders()
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun createFolder(name: String, parentId: Int? = null): Resource<FolderItem> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.foldersApi.createFolder(CreateFolderRequest(name, parentId))
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun renameFolder(folderId: Int, newName: String): Resource<FolderItem> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.foldersApi.renameFolder(folderId, RenameFolderRequest(newName))
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun moveFolder(folderId: Int, targetParentId: Int?): Resource<FolderItem> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.foldersApi.moveFolder(folderId, MoveFolderRequest(targetParentId))
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun deleteFolder(folderId: Int): Resource<String> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.foldersApi.deleteFolder(folderId)
            if (response.isSuccessful) {
                Resource.Success(response.body()?.message ?: "Folder deleted successfully")
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun getFiles(folderId: Int? = null): Resource<List<FileItem>> = withContext(Dispatchers.IO) {
        try {
            val folderQuery = if (folderId == null || folderId == 0) "root" else folderId.toString()
            val response = apiClient.filesApi.getFiles(folderQuery)
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun uploadFile(uri: Uri, folderId: Int? = null): Resource<FileItem> = withContext(Dispatchers.IO) {
        try {
            val part = FileUtils.prepareMultipartPart(context, uri)
            val folderPart = FileUtils.createFolderIdRequestBody(folderId)

            val response = apiClient.filesApi.uploadFile(part, folderPart)
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun renameFile(fileId: Int, newFilename: String): Resource<FileItem> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.filesApi.renameFile(fileId, RenameFileRequest(newFilename))
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun moveFile(fileId: Int, targetFolderId: Int?): Resource<FileItem> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.filesApi.moveFile(fileId, MoveFileRequest(targetFolderId))
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun deleteFile(fileId: Int): Resource<String> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.filesApi.deleteFile(fileId)
            if (response.isSuccessful) {
                Resource.Success(response.body()?.message ?: "File moved to recycle bin")
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun downloadAndSaveFile(fileId: Int, filename: String): Resource<File> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.filesApi.downloadFile(fileId)
            if (response.isSuccessful && response.body() != null) {
                val downloadsDir = File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: context.cacheDir, "downloads").apply { mkdirs() }
                val targetFile = File(downloadsDir, filename)
                
                response.body()!!.byteStream().use { input ->
                    FileOutputStream(targetFile).use { output ->
                        input.copyTo(output)
                    }
                }
                FileUtils.notifyMediaScanner(context, targetFile)
                Resource.Success(targetFile)
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun getPreviewToken(fileId: Int): Resource<String> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.filesApi.getPreviewToken(fileId)
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!.token)
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun searchFiles(
        query: String? = null,
        category: String? = null,
        uploader: String? = null,
        startDate: String? = null,
        endDate: String? = null
    ): Resource<List<FileItem>> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.searchApi.searchFiles(query, category, uploader, startDate, endDate)
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun createShareLink(
        fileId: Int,
        password: String? = null,
        expiresAt: String? = null,
        maxDownloads: Int? = null
    ): Resource<ShareLink> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.shareApi.createShareLink(
                fileId,
                CreateShareLinkRequest(password, expiresAt, maxDownloads)
            )
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun getShareLinks(fileId: Int): Resource<List<ShareLink>> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.shareApi.getFileShareLinks(fileId)
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun revokeShareLink(token: String): Resource<Unit> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.shareApi.revokeShareLink(token)
            if (response.isSuccessful) {
                Resource.Success(Unit)
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }
}
