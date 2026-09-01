package com.famdoc.app.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

// =========================================================================
// Light Theme Tokens: Crisp Pure White + Calming Mint / Sage Green
// =========================================================================
val MintPrimary = Color(0xFF047857)            // Deep Emerald Forest
val MintPrimaryLight = Color(0xFF10B981)       // Bright Mint Accent
val MintPrimaryDark = Color(0xFF064E3B)        // Deep Spruce
val MintSecondary = Color(0xFF0D9488)          // Sage Teal
val MintSecondaryContainer = Color(0xFFD1FAE5) // Soft Mint Highlight Pill
val MintBackground = Color(0xFFF2FBF6)         // Combination of Pure White + Soft Light Green
val MintSurface = Color(0xFFFFFFFF)            // Pure Crisp White Surface Cards
val MintSurfaceVariant = Color(0xFFE8F7EE)     // Subtle Mint Tint Surface
val MintTextPrimary = Color(0xFF0B291D)        // Deep Emerald Black Text (High readability)
val MintTextSecondary = Color(0xFF436B59)      // Balanced Sage Slate Text
val MintBorder = Color(0xFFCBEAD7)             // Delicate Mint / Jade Border
val MintCardBorder = Color(0x3310B981)         // Subtle Emerald Card Glow Border

// =========================================================================
// Dark Theme Tokens: Pure AMOLED Black + Elevated Obsidian (#000000)
// =========================================================================
val DarkAmoledBackground = Color(0xFF000000)   // Pure AMOLED Black (0% OLED battery drain)
val DarkSurface = Color(0xFF111113)            // Elevated Dark Obsidian Surface
val DarkSurfaceVariant = Color(0xFF191A1E)     // Elevated Dark Charcoal Tint
val DarkCardBackground = Color(0xFF141416)     // Deep Elevated Card Surface
val DarkBorder = Color(0xFF26262B)             // Minimalist Dark Charcoal Border
val DarkTextPrimary = Color(0xFFF4F4F5)        // Pure Crisp White Text
val DarkTextSecondary = Color(0xFFA1A1AA)      // Balanced Cool Slate
val DarkPrimary = Color(0xFF34D399)            // Luminous Mint / Neon Emerald Accent
val DarkPrimaryLight = Color(0xFF6EE7B7)       // Bright Luminous Mint
val DarkPrimaryDark = Color(0xFF000000)        // Pure Black Header
val DarkCardBorder = Color(0x3334D399)         // Glowing Accent Border

// Shared Universal Brand Accents
val BrandAccent = Color(0xFFF59E0B)            // Warm Keepsake Amber
val BrandAccentLight = Color(0xFFFBBF24)       // Radiant Gold
val BrandSuccess = Color(0xFF10B981)           // Emerald Success
val BrandError = Color(0xFFEF4444)             // Crimson Alert
val BrandWarning = Color(0xFFF97316)           // Radiant Orange
val BrandPurple = Color(0xFF8B5CF6)            // Vault Violet

// Legacy Brand Colors (Mapped to modern dynamic theme tokens)
val BrandPrimary = MintPrimary
val BrandPrimaryLight = MintPrimaryLight
val BrandPrimaryDark = MintPrimaryDark
val BrandSecondary = MintSecondary
val BrandSecondaryLight = Color(0xFF14B8A6)

// Surface Tokens (Light)
val SurfaceLight = MintSurface
val BackgroundLight = MintBackground
val CardBackgroundLight = MintSurface
val TextPrimaryLight = MintTextPrimary
val TextSecondaryLight = MintTextSecondary
val BorderLight = MintBorder
val TintLight = MintSurfaceVariant

// Surface Tokens (Dark)
val SurfaceDark = DarkSurface
val BackgroundDark = DarkAmoledBackground
val CardBackgroundDark = DarkCardBackground
val TextPrimaryDark = DarkTextPrimary
val TextSecondaryDark = DarkTextSecondary
val BorderDark = DarkBorder
val TintDark = DarkSurfaceVariant

// Shimmer Tokens
val ShimmerBaseLight = Color(0xFFE1EFE7)
val ShimmerHighlightLight = Color(0xFFF5FCF8)
val ShimmerBaseDark = Color(0xFF141417)
val ShimmerHighlightDark = Color(0xFF24242A)

// Gradients
val PrimaryGradient = Brush.linearGradient(
    colors = listOf(Color(0xFF047857), Color(0xFF0D9488))
)

val HeroVaultGradient = Brush.verticalGradient(
    colors = listOf(Color(0xFF000000), Color(0xFF111827), Color(0xFF0A0F1D))
)

val KeepsakeGoldGradient = Brush.linearGradient(
    colors = listOf(Color(0xFFF59E0B), Color(0xFFD97706), Color(0xFFFBBF24))
)

val CardGlowBorderLight = MintCardBorder
val CardGlowBorderDark = DarkCardBorder
