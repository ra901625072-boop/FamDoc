package com.famdoc.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.famdoc.app.ui.animation.rememberShimmerBrush
import com.famdoc.app.ui.theme.Dimens

@Composable
fun LoadingSkeletonView(itemCount: Int = 5) {
    val isDark = isSystemInDarkTheme()
    val shimmerBrush = rememberShimmerBrush(isDark = isDark)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = Dimens.ScreenPaddingHorizontal, vertical = Dimens.Spacing8),
        verticalArrangement = Arrangement.spacedBy(Dimens.Spacing10)
    ) {
        repeat(itemCount) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(Dimens.RadiusLarge),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                elevation = CardDefaults.cardElevation(defaultElevation = Dimens.CardElevation)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(Dimens.Spacing12),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Avatar / Icon Skeleton
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(RoundedCornerShape(Dimens.RadiusMedium))
                            .background(shimmerBrush)
                    )
                    Spacer(modifier = Modifier.width(Dimens.Spacing14))
                    Column(modifier = Modifier.weight(1f)) {
                        // Title skeleton line
                        Box(
                            modifier = Modifier
                                .fillMaxWidth(0.65f)
                                .height(16.dp)
                                .clip(RoundedCornerShape(Dimens.RadiusExtraSmall))
                                .background(shimmerBrush)
                        )
                        Spacer(modifier = Modifier.height(Dimens.Spacing8))
                        // Subtitle skeleton line
                        Box(
                            modifier = Modifier
                                .fillMaxWidth(0.38f)
                                .height(12.dp)
                                .clip(RoundedCornerShape(Dimens.RadiusExtraSmall))
                                .background(shimmerBrush)
                        )
                    }
                }
            }
        }
    }
}
