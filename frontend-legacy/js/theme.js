/**
 * FamDoc Theme & Interaction Manager
 * Matches Android App Theme Architecture:
 * - 3 Theme Modes: 'system' (Auto), 'light', 'dark'
 * - Reactive OS prefers-color-scheme syncing when in 'system' mode
 * - Minimalist 3-way Segmented Theme Switcher Component
 * - Tactile interaction delegation (password visibility, clipboard copies)
 */
(function() {
  window.FamDocTheme = {
    // Current Mode ('system' | 'light' | 'dark')
    getThemeMode: function() {
      return localStorage.getItem('famdoc-theme-mode') || 
             localStorage.getItem('famdoc-theme') || 
             'system';
    },

    // Effective applied theme ('light' | 'dark')
    getEffectiveTheme: function(mode) {
      const activeMode = mode || this.getThemeMode();
      if (activeMode === 'dark') return 'dark';
      if (activeMode === 'light') return 'light';
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    },

    getCurrentTheme: function() {
      return document.documentElement.getAttribute('data-theme') || this.getEffectiveTheme();
    },

    // Set theme mode (system, light, dark)
    setThemeMode: function(mode) {
      const validModes = ['system', 'light', 'dark'];
      const targetMode = validModes.includes(mode) ? mode : 'system';
      
      localStorage.setItem('famdoc-theme-mode', targetMode);
      localStorage.setItem('famdoc-theme', targetMode); // backwards compat

      document.documentElement.classList.add('theme-transitioning');
      const effectiveTheme = this.getEffectiveTheme(targetMode);
      document.documentElement.setAttribute('data-theme', effectiveTheme);

      this.updateAllControls(targetMode, effectiveTheme);

      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 350);
    },

    // Quick toggle between light and dark (with debounce guard to prevent double-trigger)
    toggleTheme: function() {
      if (this._isToggling) return;
      this._isToggling = true;
      setTimeout(() => { this._isToggling = false; }, 200);

      const currentEffective = this.getCurrentTheme();
      const nextMode = currentEffective === 'dark' ? 'light' : 'dark';
      this.setThemeMode(nextMode);
    },

    // HTML Generator for the 3-Mode Segmented Selector (matches ThemeSelector.kt)
    renderSegmentedSelectorHTML: function(idPrefix = 'drawer') {
      const currentMode = this.getThemeMode();
      return `
        <div class="fd-theme-selector" id="${idPrefix}-theme-selector" role="group" aria-label="Theme mode selector">
          <button type="button" class="fd-theme-option ${currentMode === 'system' ? 'active' : ''}" data-theme-mode="system" aria-label="Auto (system) theme">
            <i class="fas fa-magic"></i>
            <span>Auto</span>
          </button>
          <button type="button" class="fd-theme-option ${currentMode === 'light' ? 'active' : ''}" data-theme-mode="light" aria-label="Light theme">
            <i class="fas fa-sun"></i>
            <span>Light</span>
          </button>
          <button type="button" class="fd-theme-option ${currentMode === 'dark' ? 'active' : ''}" data-theme-mode="dark" aria-label="Dark theme">
            <i class="fas fa-moon"></i>
            <span>Dark</span>
          </button>
        </div>
      `;
    },

    // Update active indicators across all theme selectors and quick icons
    updateAllControls: function(mode, effectiveTheme) {
      const currentMode = mode || this.getThemeMode();
      const currentEffective = effectiveTheme || this.getEffectiveTheme(currentMode);

      // 1. Update 3-way segmented buttons
      document.querySelectorAll('.fd-theme-selector .fd-theme-option').forEach(btn => {
        const btnMode = btn.getAttribute('data-theme-mode');
        btn.classList.toggle('active', btnMode === currentMode);
      });

      // 2. Update quick toggle icons (mobile header, guest view, landing page)
      const iconClass = currentEffective === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
      document.querySelectorAll('#mobileThemeToggle i, #desktopThemeToggle i, #landingThemeToggle i, .guest-theme-toggle i').forEach(icon => {
        icon.className = iconClass;
      });
    },

    // Backward compatibility helper for existing view renders
    updateToggleIcons: function(effectiveTheme) {
      this.updateAllControls(this.getThemeMode(), effectiveTheme);
    },

    init: function() {
      const mode = this.getThemeMode();
      const effectiveTheme = this.getEffectiveTheme(mode);
      document.documentElement.setAttribute('data-theme', effectiveTheme);
      this.updateAllControls(mode, effectiveTheme);

      // Global delegation for theme interactions
      document.body.addEventListener('click', (e) => {
        // 1. Segmented Theme Option Click
        const optionBtn = e.target.closest('.fd-theme-option');
        if (optionBtn) {
          e.preventDefault();
          const chosenMode = optionBtn.getAttribute('data-theme-mode');
          if (chosenMode) {
            this.setThemeMode(chosenMode);
          }
          return;
        }

        // 2. Quick Theme Toggle Buttons
        const quickBtn = e.target.closest('#mobileThemeToggle, #desktopThemeToggle, #landingThemeToggle, .guest-theme-toggle');
        if (quickBtn) {
          e.preventDefault();
          this.toggleTheme();
          return;
        }

        // 3. Password visibility toggles
        const passwordBtn = e.target.closest('.password-toggle-btn');
        if (passwordBtn) {
          e.preventDefault();
          const wrapper = passwordBtn.closest('.password-input-wrapper');
          if (wrapper) {
            const input = wrapper.querySelector('input');
            if (input) {
              const isPassword = input.type === 'password';
              input.type = isPassword ? 'text' : 'password';
              const icon = passwordBtn.querySelector('i');
              if (icon) {
                icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
              }
            }
          }
          return;
        }

        // 4. Clipboard copy buttons
        const copyBtn = e.target.closest('[data-copy-text]');
        if (copyBtn) {
          e.preventDefault();
          const text = copyBtn.getAttribute('data-copy-text');
          navigator.clipboard.writeText(text).then(() => {
            const icon = copyBtn.querySelector('i');
            const span = copyBtn.querySelector('span');
            
            const originalIconClass = icon ? icon.className : '';
            const originalText = span ? span.textContent : '';
            
            if (icon) icon.className = 'fas fa-check';
            if (span) span.textContent = 'Copied!';
            
            if (window.FamDocAPI && window.FamDocAPI.utils) {
              window.FamDocAPI.utils.showToast("Copied to clipboard!", "success");
            }
            
            copyBtn.classList.add('copy-success');
            setTimeout(() => {
              if (icon) icon.className = originalIconClass;
              if (span) span.textContent = originalText;
              copyBtn.classList.remove('copy-success');
            }, 2000);
          }).catch(err => {
            console.error("Failed to copy text:", err);
            if (window.FamDocAPI && window.FamDocAPI.utils) {
              window.FamDocAPI.utils.showToast("Failed to copy to clipboard", "error");
            }
          });
        }
      });

      // Listen for OS system theme changes
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (this.getThemeMode() === 'system') {
          const freshEffective = this.getEffectiveTheme('system');
          document.documentElement.setAttribute('data-theme', freshEffective);
          this.updateAllControls('system', freshEffective);
        }
      });
    }
  };

  // Auto initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.FamDocTheme.init());
  } else {
    window.FamDocTheme.init();
  }
})();
