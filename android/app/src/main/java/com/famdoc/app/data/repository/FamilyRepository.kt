package com.famdoc.app.data.repository

import com.famdoc.app.core.network.ApiClient
import com.famdoc.app.core.network.Resource
import com.famdoc.app.core.utils.ErrorTranslator
import com.famdoc.app.data.models.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class FamilyRepository(private val apiClient: ApiClient) {

    suspend fun getMembers(): Resource<List<FamilyMember>> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.familyApi.getMembers()
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun removeMember(userId: Int): Resource<String> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.familyApi.removeMember(userId)
            if (response.isSuccessful) {
                Resource.Success("Member removed successfully")
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun getFamilyDetails(): Resource<FamilyDetailsResponse> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.familyApi.getFamilyDetails()
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun regenerateCode(name: String, maxMembers: Int = 10): Resource<RegenerateCodeResponse> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.familyApi.regenerateCode(SetupFamilyRequest(name, maxMembers))
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }

    suspend fun setupFamily(name: String, maxMembers: Int = 10): Resource<Family> = withContext(Dispatchers.IO) {
        try {
            val response = apiClient.familyApi.setupFamily(SetupFamilyRequest(name, maxMembers))
            if (response.isSuccessful && response.body() != null) {
                Resource.Success(response.body()!!)
            } else {
                Resource.Error(ErrorTranslator.translate(response))
            }
        } catch (e: Exception) {
            Resource.Error(ErrorTranslator.translate(e), e)
        }
    }
}
