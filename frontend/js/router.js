/**
 * FamDoc SPA Hash Router
 */
(function() {
  const routes = {};

  window.FamDocRouter = {
    // Register route handlers
    add: function(path, handler, options = {}) {
      routes[path] = {
        handler: handler,
        requiresAuth: options.requiresAuth || false,
        guestOnly: options.guestOnly || false
      };
    },

    // Programmatically navigate
    navigate: function(path) {
      window.location.hash = path;
    },

    // Get current hash route path
    getRoutePath: function() {
      const hash = window.location.hash || '#/';
      return hash.substring(1).split('?')[0] || '/';
    },

    // Parse path parameters for routes like /shared/:token
    matchRoute: function(currentPath) {
      const currentSegments = currentPath.split('/').filter(Boolean);

      for (const routePath in routes) {
        const routeSegments = routePath.split('/').filter(Boolean);
        if (routeSegments.length !== currentSegments.length) continue;

        const params = {};
        let isMatch = true;

        for (let i = 0; i < routeSegments.length; i++) {
          if (routeSegments[i].startsWith(':')) {
            const paramName = routeSegments[i].slice(1);
            params[paramName] = currentSegments[i];
          } else if (routeSegments[i] !== currentSegments[i]) {
            isMatch = false;
            break;
          }
        }

        if (isMatch) {
          return { route: routes[routePath], params: params, path: routePath };
        }
      }

      return null;
    },

    // Resolve and execute route handler
    resolve: async function() {
      const currentPath = this.getRoutePath();
      const match = this.matchRoute(currentPath);

      if (!match) {
        console.warn(`Route not found: ${currentPath}. Redirecting to dashboard.`);
        this.navigate('/dashboard');
        return;
      }

      const token = sessionStorage.getItem("famdoc_token");
      const requiresAuth = match.route.requiresAuth;
      const guestOnly = match.route.guestOnly;

      // 1. Auth Guard Checks
      if (requiresAuth && !token) {
        console.log("Authentication required, redirecting to landing.");
        this.navigate('/');
        return;
      }

      if (guestOnly && token) {
        console.log("Authenticated user on guest route, redirecting to dashboard.");
        this.navigate('/dashboard');
        return;
      }

      // 2. Render Page Frame Wrapper
      const layoutContainer = document.getElementById("famdoc-layout-container");
      if (layoutContainer) {
        if (requiresAuth) {
          // Injects sidebar, mobile headers, and layout structure if not already rendered
          await window.FamDocApp.ensureLayoutInjected();
        } else {
          // Destroys/removes layout wrapper shell to render full-screen guest views
          window.FamDocApp.destroyLayoutShell();
        }
      }

      // 3. Execute view renderer
      try {
        // Reset scroll position on route change to prevent cut-off headers
        window.scrollTo(0, 0);
        
        await match.route.handler(match.params);
        
        // Synchronize toggle icons to the current active theme after page content loads
        if (window.FamDocTheme) {
          window.FamDocTheme.updateToggleIcons(window.FamDocTheme.getCurrentTheme());
        }
      } catch (err) {
        console.error(`Error rendering view for route ${currentPath}:`, err);
        FamDocAPI.utils.showToast("Failed to render page view.", "error");
      }
    },

    init: function() {
      // Listen to navigation events
      window.addEventListener('hashchange', () => this.resolve());
      window.addEventListener('load', () => this.resolve());
    }
  };
})();
