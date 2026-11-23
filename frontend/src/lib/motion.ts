/**
 * FamDoc Motion System (Apple iOS / visionOS Inspired)
 * Single source of truth for motion design tokens, physics-based springs,
 * and reusable animation variants across the FamDoc application.
 */

import { type Transition, type Variants } from 'motion/react';

// ============================================================================
// 1. DESIGN TOKENS
// ============================================================================

/**
 * Standard duration tokens (seconds for Motion, milliseconds for CSS)
 */
export const durations = {
  instant: 0.1,  // 100ms - press feedback, tactile clicks
  fast: 0.18,    // 180ms - hover, dropdowns, tooltips, small state toggles
  base: 0.28,    // 280ms - cards, dialogs, modals, toasts
  slow: 0.42,    // 420ms - page transitions, large sheets, hero reveals
} as const;

/**
 * Apple-calibrated bezier curves and spring physics
 */
export const easings = {
  // Standard Apple ease-out: starts fast, lands with natural deceleration
  easeOut: [0.22, 1, 0.36, 1] as const,
  // Standard Apple ease-in-out: smooth symmetric acceleration/deceleration
  easeInOut: [0.45, 0, 0.55, 1] as const,
  // Gentle ease for continuous ambient floating
  ambient: [0.42, 0, 0.58, 1] as const,
} as const;

/**
 * Spring configurations (no artificial bounce, high physical damping)
 */
export const springs = {
  // Default balanced spring for general interface elements
  default: {
    type: 'spring',
    stiffness: 260,
    damping: 28,
    mass: 1,
  } as Transition,

  // Gentle spring for larger surfaces, modals, and mobile sheets
  gentle: {
    type: 'spring',
    stiffness: 200,
    damping: 26,
    mass: 1,
  } as Transition,

  // Snappy spring for quick responsive feedback (buttons, switches, tabs)
  snappy: {
    type: 'spring',
    stiffness: 400,
    damping: 30,
    mass: 0.8,
  } as Transition,

  // Success celebration spring (subtle controlled overshoot)
  success: {
    type: 'spring',
    stiffness: 300,
    damping: 20,
    mass: 0.9,
  } as Transition,
} as const;

/**
 * Distance & scale constants
 */
export const transforms = {
  entryTranslateY: 10,  // Subtle 10px vertical shift
  hoverLiftY: -2,       // Refined 2px lift on hover
  pressScale: 0.97,     // iOS tactile press depression
  modalInitialScale: 0.96, // Crisp modal scale-in
  staggerInterval: 0.035,  // 35ms between sibling items (capped at 400ms)
} as const;

// ============================================================================
// 2. REUSABLE ANIMATION VARIANTS
// ============================================================================

/**
 * Subtle fade in without translation
 */
export const fadeInVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: durations.fast, ease: easings.easeOut },
  },
  exit: {
    opacity: 0,
    transition: { duration: durations.instant, ease: easings.easeInOut },
  },
};

/**
 * Standard iOS calm fade-up with 10px translate
 */
export const fadeUpVariants: Variants = {
  initial: { opacity: 0, y: transforms.entryTranslateY },
  animate: {
    opacity: 1,
    y: 0,
    transition: { ...springs.default },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: durations.fast, ease: easings.easeInOut },
  },
};

/**
 * Scale-in for dialogs, cards, and focused overlays
 */
export const scaleInVariants: Variants = {
  initial: { opacity: 0, scale: transforms.modalInitialScale },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { ...springs.gentle },
  },
  exit: {
    opacity: 0,
    scale: transforms.modalInitialScale,
    transition: { duration: durations.fast, ease: easings.easeInOut },
  },
};

/**
 * Page route transition: soft fade with 8px vertical shift
 */
export const pageTransitionVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.base, ease: easings.easeOut },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: durations.fast, ease: easings.easeInOut },
  },
};

/**
 * Modal dialog & bottom sheet container variants
 */
export const modalBackdropVariants: Variants = {
  initial: { opacity: 0, backdropFilter: 'blur(0px)' },
  animate: {
    opacity: 1,
    backdropFilter: 'blur(12px)',
    transition: { duration: durations.base, ease: easings.easeOut },
  },
  exit: {
    opacity: 0,
    backdropFilter: 'blur(0px)',
    transition: { duration: durations.fast, ease: easings.easeInOut },
  },
};

export const modalDialogVariants: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 12 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { ...springs.gentle },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 8,
    transition: { duration: durations.fast, ease: easings.easeInOut },
  },
};

/**
 * Mobile Bottom Sheet variants (slides from bottom on mobile)
 */
export const bottomSheetVariants: Variants = {
  initial: { y: '100%', opacity: 0.5 },
  animate: {
    y: 0,
    opacity: 1,
    transition: { ...springs.gentle },
  },
  exit: {
    y: '100%',
    opacity: 0,
    transition: { duration: durations.base, ease: easings.easeInOut },
  },
};

/**
 * Dropdown Menu variants (origin-aware scale + fade)
 */
export const dropdownVariants: Variants = {
  initial: { opacity: 0, scale: 0.95, y: -4 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { ...springs.snappy },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -4,
    transition: { duration: durations.instant, ease: easings.easeInOut },
  },
};

/**
 * Toast / Capsule notification variants
 */
export const toastVariants: Variants = {
  initial: { opacity: 0, y: 16, scale: 0.96 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...springs.default },
  },
  exit: {
    opacity: 0,
    y: 12,
    scale: 0.96,
    transition: { duration: durations.fast, ease: easings.easeInOut },
  },
};

/**
 * Staggered container for list items & card grids
 */
export const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: transforms.staggerInterval,
      delayChildren: 0.02,
    },
  },
};

/**
 * Individual staggered child item
 */
export const staggerItemVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { ...springs.default },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: durations.fast, ease: easings.easeInOut },
  },
};

/**
 * Subtle floating loop for empty state illustrations (low amplitude 4px)
 */
export const emptyStateFloatVariants: Variants = {
  initial: { y: 0 },
  animate: {
    y: [-3, 3, -3],
    transition: {
      duration: 5,
      ease: easings.ambient,
      repeat: Infinity,
      repeatType: 'reverse',
    },
  },
};

/**
 * Error shake (subtle 4px horizontal spring)
 */
export const errorShakeAnimation = {
  x: [0, -4, 4, -3, 3, -1, 1, 0],
  transition: { duration: 0.35, ease: easings.easeInOut },
};

/**
 * Tactile button interactions
 */
export const tactilePress = {
  whileHover: { y: transforms.hoverLiftY, transition: { duration: durations.fast, ease: easings.easeOut } },
  whileTap: { scale: transforms.pressScale, transition: { duration: durations.instant, ease: easings.easeOut } },
};

/**
 * Tactile card interactions
 */
export const tactileCard = {
  whileHover: { y: -3, transition: { duration: durations.fast, ease: easings.easeOut } },
  whileTap: { scale: 0.98, transition: { duration: durations.instant, ease: easings.easeOut } },
};

/**
 * Safe variants helper that respects prefers-reduced-motion
 */
export function getReducedMotionVariants(variants: Variants, shouldReduceMotion: boolean | null): Variants {
  if (!shouldReduceMotion) return variants;

  const reduced: Variants = {};
  for (const [key, val] of Object.entries(variants)) {
    if (typeof val === 'object' && val !== null) {
      // Retain opacity, zero out transforms
      reduced[key] = {
        ...val,
        x: 0,
        y: 0,
        scale: 1,
        rotate: 0,
        transition: { duration: durations.fast },
      };
    } else {
      reduced[key] = val;
    }
  }
  return reduced;
}
