package com.famdoc.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.famdoc.app.core.network.Resource
import com.famdoc.app.data.models.DashboardStats
import com.famdoc.app.data.repository.DashboardRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class DashboardViewModel(private val dashboardRepository: DashboardRepository) : ViewModel() {

    private val _statsState = MutableStateFlow<Resource<DashboardStats>>(Resource.Loading())
    val statsState: StateFlow<Resource<DashboardStats>> = _statsState.asStateFlow()

    fun loadStats() {
        viewModelScope.launch {
            _statsState.value = Resource.Loading()
            _statsState.value = dashboardRepository.getStats()
        }
    }
}
