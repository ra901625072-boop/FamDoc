/**
 * Authentication View Manager (Login / Register / Join)
 */
(function() {
  window.FamDocViews = window.FamDocViews || {};
  window.FamDocViews.auth = {
    
    // ----------------------------------------------------
    // LOGIN ROUTE
    // ----------------------------------------------------
    login: function() {
      const mount = document.getElementById("view-mount-point");
      if (!mount) return;

      mount.innerHTML = `
        <div class="guest-wrapper">
          <button class="theme-toggle-btn guest-theme-toggle" aria-label="Toggle dark mode">
            <i class="fas fa-moon"></i>
          </button>
          <div id="auth-card" class="famdoc-card auth-card fd-pop-in">
            <div class="auth-header">
              <a href="#/" class="auth-logo">
                <img src="/img/logo.svg" alt="FamDoc Logo" class="famdoc-logo-img">
                <span class="brand-text">Fam<span class="highlight">Doc</span></span>
              </a>
              <p class="auth-subtitle">Enter your family keepsake vault</p>
            </div>

            <div id="error-alert" class="famdoc-alert warning" style="display: none;">
              <i class="fas fa-exclamation-triangle" style="margin-top: 2px;"></i>
              <div id="error-message">Error message details go here.</div>
            </div>

            <form id="login-form">
              <div class="form-group">
                <label for="email" class="form-label">Email Address</label>
                <input type="email" id="email" class="form-control" placeholder="you@example.com" required>
              </div>

              <div class="form-group">
                <label for="password" class="form-label">Password</label>
                <div class="password-input-wrapper">
                  <input type="password" id="password" class="form-control" placeholder="••••••••" required>
                  <button type="button" class="password-toggle-btn" aria-label="Toggle visibility">
                    <i class="fas fa-eye"></i>
                  </button>
                </div>
              </div>

              <button type="submit" id="btn-submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">
                <i class="fas fa-sign-in-alt"></i>
                <span>Enter Vault</span>
              </button>
            </form>

            <div class="auth-footer" style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 2rem;">
              <div>New to FamDoc? <a href="#/register">Create a Vault</a></div>
              <div>Invited by family? <a href="#/join">Join with Code</a></div>
            </div>
          </div>
        </div>
      `;

      if (window.FamDocTheme) {
        window.FamDocTheme.updateToggleIcons(window.FamDocTheme.getCurrentTheme());
      }

      // Bind Login submit
      document.getElementById("login-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const emailInput = document.getElementById("email");
        const passwordInput = document.getElementById("password");
        const errorAlert = document.getElementById("error-alert");
        const submitBtn = document.getElementById("btn-submit");

        errorAlert.style.display = "none";

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
          showError("Please fill in all fields.");
          return;
        }

        try {
          submitBtn.disabled = true;
          submitBtn.querySelector("span").textContent = "Opening Vault...";

          // Login request
          await FamDocAPI.auth.login(email, password);

          // Get fresh profile details
          const user = await FamDocAPI.auth.me();
          sessionStorage.setItem("famdoc_user", JSON.stringify(user));

          FamDocAPI.utils.showToast(`Welcome back, ${user.username}!`, "success");

          setTimeout(() => {
            window.FamDocRouter.navigate('/dashboard');
          }, 800);
        } catch (err) {
          showError(err.message || "Invalid email or password.");
          submitBtn.disabled = false;
          submitBtn.querySelector("span").textContent = "Enter Vault";
        }
      });

      function showError(msg) {
        const errorAlert = document.getElementById("error-alert");
        const errorMessage = document.getElementById("error-message");
        errorMessage.textContent = msg;
        errorAlert.style.display = "flex";

        const card = document.getElementById("auth-card");
        card.classList.remove("fd-shake");
        void card.offsetWidth; // Reflow
        card.classList.add("fd-shake");
        card.addEventListener("animationend", () => {
          card.classList.remove("fd-shake");
        }, { once: true });
      }
    },

    // ----------------------------------------------------
    // REGISTER ROUTE
    // ----------------------------------------------------
    register: function() {
      const mount = document.getElementById("view-mount-point");
      if (!mount) return;

      mount.innerHTML = `
        <div class="guest-wrapper">
          <button class="theme-toggle-btn guest-theme-toggle" aria-label="Toggle dark mode">
            <i class="fas fa-moon"></i>
          </button>
          <div id="auth-card" class="famdoc-card auth-card fd-pop-in">
            <div class="auth-header">
              <a href="#/" class="auth-logo">
                <img src="/img/logo.svg" alt="FamDoc Logo" class="famdoc-logo-img">
                <span class="brand-text">Fam<span class="highlight">Doc</span></span>
              </a>
              <p class="auth-subtitle">Create a new family keepsake vault</p>
            </div>

            <div id="error-alert" class="famdoc-alert warning" style="display: none;">
              <i class="fas fa-exclamation-triangle" style="margin-top: 2px;"></i>
              <div id="error-message">Error message details go here.</div>
            </div>

            <form id="register-form" novalidate>
              <div class="form-group">
                <label for="username" class="form-label">Username</label>
                <input type="text" id="username" class="form-control" placeholder="e.g. johndoe" required minlength="3" maxlength="20" pattern="^[a-zA-Z0-9_]+$">
                <span style="font-size: 0.75rem; color: var(--text-ink-muted);">3-20 characters (letters, numbers, underscores)</span>
              </div>

              <div class="form-group">
                <label for="email" class="form-label">Email Address</label>
                <input type="email" id="email" class="form-control" placeholder="you@example.com" required>
              </div>

              <div class="form-group">
                <label for="password" class="form-label">Password</label>
                <div class="password-input-wrapper">
                  <input type="password" id="password" class="form-control" placeholder="••••••••" required>
                  <button type="button" class="password-toggle-btn" aria-label="Toggle visibility">
                    <i class="fas fa-eye"></i>
                  </button>
                </div>
                <span style="font-size: 0.75rem; color: var(--text-ink-muted); display: block; margin-top: 0.25rem;">Min. 8 characters with 1 uppercase letter and 1 number</span>
              </div>

              <button type="submit" id="btn-submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">
                <i class="fas fa-plus"></i>
                <span>Create Admin Account</span>
              </button>
            </form>

            <div class="auth-footer">
              Already have a vault? <a href="#/login">Log In</a>
            </div>
          </div>
        </div>
      `;

      if (window.FamDocTheme) {
        window.FamDocTheme.updateToggleIcons(window.FamDocTheme.getCurrentTheme());
      }

      // Bind Register submit
      document.getElementById("register-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const usernameInput = document.getElementById("username");
        const emailInput = document.getElementById("email");
        const passwordInput = document.getElementById("password");
        const errorAlert = document.getElementById("error-alert");
        const submitBtn = document.getElementById("btn-submit");

        errorAlert.style.display = "none";

        const username = usernameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username)) {
          showError("Username must be between 3 and 20 characters and contain only letters, numbers, or underscores.");
          return;
        }

        if (!email || !email.includes("@")) {
          showError("Please enter a valid email address.");
          return;
        }

        if (password.length < 8) {
          showError("Password must be at least 8 characters long.");
          return;
        }
        if (!/[A-Z]/.test(password)) {
          showError("Password must contain at least one uppercase letter.");
          return;
        }
        if (!/[0-9]/.test(password)) {
          showError("Password must contain at least one number.");
          return;
        }

        try {
          submitBtn.disabled = true;
          submitBtn.querySelector("span").textContent = "Creating Account...";

          await FamDocAPI.auth.register(username, email, password);
          await FamDocAPI.auth.login(email, password);

          const user = await FamDocAPI.auth.me();
          sessionStorage.setItem("famdoc_user", JSON.stringify(user));

          FamDocAPI.utils.showToast("Account created successfully!", "success");

          setTimeout(() => {
            window.FamDocRouter.navigate('/dashboard');
          }, 1000);
        } catch (err) {
          showError(err.message || "Failed to create account.");
          submitBtn.disabled = false;
          submitBtn.querySelector("span").textContent = "Create Admin Account";
        }
      });

      function showError(msg) {
        const errorAlert = document.getElementById("error-alert");
        const errorMessage = document.getElementById("error-message");
        errorMessage.textContent = msg;
        errorAlert.style.display = "flex";

        const card = document.getElementById("auth-card");
        card.classList.remove("fd-shake");
        void card.offsetWidth;
        card.classList.add("fd-shake");
        card.addEventListener("animationend", () => {
          card.classList.remove("fd-shake");
        }, { once: true });
      }
    },

    // ----------------------------------------------------
    // JOIN ROUTE
    // ----------------------------------------------------
    join: function() {
      const mount = document.getElementById("view-mount-point");
      if (!mount) return;

      mount.innerHTML = `
        <div class="guest-wrapper">
          <button class="theme-toggle-btn guest-theme-toggle" aria-label="Toggle dark mode">
            <i class="fas fa-moon"></i>
          </button>
          <div id="auth-card" class="famdoc-card auth-card fd-pop-in">
            <div class="auth-header">
              <a href="#/" class="auth-logo">
                <img src="/img/logo.svg" alt="FamDoc Logo" class="famdoc-logo-img">
                <span class="brand-text">Fam<span class="highlight">Doc</span></span>
              </a>
              <p class="auth-subtitle">Join an existing family vault</p>
            </div>

            <div id="error-alert" class="famdoc-alert warning" style="display: none;">
              <i class="fas fa-exclamation-triangle" style="margin-top: 2px;"></i>
              <div id="error-message">Error details go here.</div>
            </div>

            <form id="join-form">
              <div class="form-group">
                <label for="username" class="form-label">Your Name / Username</label>
                <input type="text" id="username" class="form-control" placeholder="e.g. Alice" required minlength="3" maxlength="20">
              </div>

              <div class="form-group">
                <label for="email" class="form-label">Email Address</label>
                <input type="email" id="email" class="form-control" placeholder="alice@example.com" required>
              </div>

              <div class="form-group">
                <label for="secret-code" class="form-label">Family Secret Code</label>
                <input type="text" id="secret-code" class="form-control" placeholder="XXXX-XXXX" maxlength="9" style="font-family: var(--font-mono); letter-spacing: 2px; text-transform: uppercase;" required>
                <span style="font-size: 0.75rem; color: var(--text-ink-muted);">Enter the 8-character invitation code from your family administrator</span>
              </div>

              <div class="form-group">
                <label for="password" class="form-label">Create Password</label>
                <div class="password-input-wrapper">
                  <input type="password" id="password" class="form-control" placeholder="Choose a strong password" required minlength="8">
                  <button type="button" class="password-toggle-btn" aria-label="Toggle visibility">
                    <i class="fas fa-eye"></i>
                  </button>
                </div>
                <span style="font-size: 0.75rem; color: var(--text-ink-muted);">Must be at least 8 characters and contain at least one uppercase letter and one number</span>
              </div>

              <button type="submit" id="btn-submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">
                <i class="fas fa-key"></i>
                <span>Join Family Vault</span>
              </button>
            </form>

            <div class="auth-footer">
              Looking to create a new vault? <a href="#/register">Create one</a>
            </div>
          </div>
        </div>
      `;

      if (window.FamDocTheme) {
        window.FamDocTheme.updateToggleIcons(window.FamDocTheme.getCurrentTheme());
      }

      const codeInput = document.getElementById("secret-code");

      // Auto-format secret code keypresses: XXXX-XXXX
      codeInput.addEventListener("input", (e) => {
        let val = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        if (val.length > 8) {
          val = val.substring(0, 8);
        }
        if (val.length > 4) {
          val = val.substring(0, 4) + "-" + val.substring(4);
        }
        e.target.value = val;
      });

      // Bind Join submit
      document.getElementById("join-form").addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const usernameInput = document.getElementById("username");
        const emailInput = document.getElementById("email");
        const passwordInput = document.getElementById("password");
        const errorAlert = document.getElementById("error-alert");
        const submitBtn = document.getElementById("btn-submit");

        errorAlert.style.display = "none";

        const username = usernameInput.value.trim();
        const email = emailInput.value.trim();
        const secretCode = codeInput.value.trim();
        const password = passwordInput.value;

        if (!username || !email || !secretCode || !password) {
          showError("Please fill in all fields.");
          return;
        }

        if (secretCode.length !== 9 || !secretCode.includes("-")) {
          showError("Secret code must be exactly 8 characters (format: XXXX-XXXX).");
          return;
        }

        if (password.length < 8) {
          showError("Password must be at least 8 characters long.");
          return;
        }
        if (!/[A-Z]/.test(password)) {
          showError("Password must contain at least one uppercase letter.");
          return;
        }
        if (!/[0-9]/.test(password)) {
          showError("Password must contain at least one number.");
          return;
        }

        try {
          submitBtn.disabled = true;
          submitBtn.querySelector("span").textContent = "Connecting to Vault...";

          await FamDocAPI.auth.joinFamily(username, email, secretCode, password);

          const user = await FamDocAPI.auth.me();
          sessionStorage.setItem("famdoc_user", JSON.stringify(user));

          FamDocAPI.utils.showToast(`Joined family vault successfully! Welcome, ${user.username}.`, "success");

          setTimeout(() => {
            window.FamDocRouter.navigate('/dashboard');
          }, 1000);
        } catch (err) {
          showError(err.message || "Failed to join family vault.");
          submitBtn.disabled = false;
          submitBtn.querySelector("span").textContent = "Join Family Vault";
        }
      });

      function showError(msg) {
        const errorAlert = document.getElementById("error-alert");
        const errorMessage = document.getElementById("error-message");
        errorMessage.textContent = msg;
        errorAlert.style.display = "flex";

        const card = document.getElementById("auth-card");
        card.classList.remove("fd-shake");
        void card.offsetWidth;
        card.classList.add("fd-shake");
        card.addEventListener("animationend", () => {
          card.classList.remove("fd-shake");
        }, { once: true });
      }
    }
  };
})();
