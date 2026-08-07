/**
 * FamDoc Theme & Interaction Manager
 * Manages theme state, persistence, event listeners, and OS preference sync,
 * as well as global SPA click interactions (password toggles, copies).
 */
(function() {
  // Expose theme toggling globally
  window.FamDocTheme = {
    getCurrentTheme: function() {
      return document.documentElement.getAttribute('data-theme') || 'light';
    },
    setTheme: function(theme) {
      document.documentElement.classList.add('theme-transitioning');
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('famdoc-theme', theme);
      this.updateToggleIcons(theme);
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 350);
    },
    toggleTheme: function() {
      const current = this.getCurrentTheme();
      const next = current === 'dark' ? 'light' : 'dark';
      this.setTheme(next);
    },
    updateToggleIcons: function(theme) {
      const iconClass = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
      const btns = document.querySelectorAll('#mobileThemeToggle i, #desktopThemeToggle i, .guest-theme-toggle i');
      btns.forEach(icon => {
        icon.className = iconClass;
      });
    },
    init: function() {
      // Run initial icon update
      const theme = this.getCurrentTheme();
      this.updateToggleIcons(theme);

      // Bind event listeners using delegation for global SPA patterns
      document.body.addEventListener('click', (e) => {
        // 1. Theme toggle buttons
        const themeBtn = e.target.closest('#mobileThemeToggle, #desktopThemeToggle, .guest-theme-toggle');
        if (themeBtn) {
          e.preventDefault();
          this.toggleTheme();
          return;
        }

        // 2. Password visibility toggles
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

        // 3. Clipboard copy buttons
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

      // Listen for OS changes (only if user hasn't explicitly set a preference)
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem('famdoc-theme')) {
          const nextTheme = e.matches ? 'dark' : 'light';
          this.setTheme(nextTheme);
        }
      });
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.FamDocTheme.init());
  } else {
    window.FamDocTheme.init();
  }
})();

