/**
 * Family Settings View Manager (Consolidates family.html)
 */
(function() {
  window.FamDocViews = window.FamDocViews || {};

  let familyMembers = [];
  let currentUser = null;

  window.FamDocViews.family = function(params) {
    const mount = document.getElementById("view-mount-point");
    if (!mount) return;

    mount.innerHTML = `
      <div class="content-header fd-fade-in">
        <div>
          <h1 class="page-title">Family Group & Settings</h1>
          <p class="page-subtitle">Manage vault members and access privileges.</p>
        </div>
      </div>

      <!-- Single Full-Width Card for Member Roster -->
      <div class="famdoc-card fd-fade-up">
        <h2 style="font-family: var(--font-serif); font-size: 1.5rem; margin-bottom: 1.5rem;">
          <i class="fas fa-users-cog" style="color: var(--accent-brand); margin-right: 0.5rem;"></i>Family Roster
        </h2>

        <div class="famdoc-table-wrapper">
          <table class="famdoc-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th id="th-actions" style="text-align: right; display: none;">Actions</th>
              </tr>
            </thead>
            <tbody id="members-table-body">
              <!-- Skeleton Loading State -->
              <tr class="fd-skel-table-row">
                <td data-label="Member"><div class="fd-skel fd-skel-text md"></div></td>
                <td data-label="Email"><div class="fd-skel fd-skel-text lg"></div></td>
                <td data-label="Role"><div class="fd-skel skel-badge"></div></td>
                <td data-label="Joined"><div class="fd-skel fd-skel-text sm"></div></td>
                <td data-label="Actions" style="text-align: right;"><div class="fd-skel skel-btn" style="margin-left: auto;"></div></td>
              </tr>
              <tr class="fd-skel-table-row">
                <td data-label="Member"><div class="fd-skel fd-skel-text md"></div></td>
                <td data-label="Email"><div class="fd-skel fd-skel-text lg"></div></td>
                <td data-label="Role"><div class="fd-skel skel-badge"></div></td>
                <td data-label="Joined"><div class="fd-skel fd-skel-text sm"></div></td>
                <td data-label="Actions" style="text-align: right;"><div class="fd-skel skel-btn" style="margin-left: auto;"></div></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    setupEvents();
    loadProfileAndRoster();
  };

  async function loadProfileAndRoster() {
    currentUser = await window.FamDocApp.getUser();
    if (!currentUser) return;

    if (currentUser.role === "admin") {
      const thActions = document.getElementById("th-actions");
      if (thActions) thActions.style.display = "table-cell";
    }

    await loadMembers();
  }

  async function loadMembers() {
    const tbody = document.getElementById("members-table-body");
    if (!tbody) return;

    try {
      familyMembers = await FamDocAPI.family.getMembers();
      tbody.innerHTML = "";

      const isAdmin = currentUser.role === "admin";

      familyMembers.forEach((member, index) => {
        const tr = document.createElement("tr");
        tr.className = "fd-fade-up fd-stagger";
        tr.style.setProperty("--fd-delay", `${index * 0.05}s`);
        
        const joinedDate = FamDocAPI.utils.formatDate(member.joined_at);
        const isCurrentUser = member.user_id === currentUser.id;
        const roleBadge = member.role === "admin" 
          ? '<span class="badge badge-primary">Admin</span>' 
          : '<span class="badge badge-success">Member</span>';

        const actionsHtml = isAdmin
          ? `<td data-label="Actions" style="text-align: right;">
              ${isCurrentUser 
                ? '<span style="font-size: 0.8rem; color: var(--text-ink-muted); font-style: italic;">You</span>' 
                : `<button class="btn btn-danger" data-action="remove" data-id="${member.user_id}" style="padding: 0.35rem 0.65rem; font-size: 0.75rem;">
                    <i class="fas fa-user-minus"></i> Remove
                   </button>`
              }
             </td>`
          : "";

        tr.innerHTML = `
          <td data-label="Member">
            <div style="font-weight: 600;">${member.username || 'Unknown'}</div>
          </td>
          <td data-label="Email" style="font-family: var(--font-mono); font-size: 0.85rem;">${member.email || '—'}</td>
          <td data-label="Role">${roleBadge}</td>
          <td data-label="Joined">${joinedDate.split(',')[0]}</td>
          ${actionsHtml}
        `;
        tbody.appendChild(tr);
      });

    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--warning-red);">Failed to retrieve members roster.</td></tr>`;
    }
  }

  async function removeMember(userId, name) {
    if (confirm(`Are you sure you want to remove "${name}" from the family vault? They will immediately lose all access rights.`)) {
      try {
        await FamDocAPI.family.removeMember(userId);
        FamDocAPI.utils.showToast(`Removed "${name}" from family group.`, "success");
        await loadMembers();
      } catch (err) {
        FamDocAPI.utils.showToast(err.message, "error");
      }
    }
  }

  function setupEvents() {
    const tbody = document.getElementById("members-table-body");
    if (tbody) {
      tbody.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-action='remove']");
        if (!btn) return;

        const id = parseInt(btn.getAttribute("data-id"));
        const member = familyMembers.find(m => m.user_id === id);
        if (member) {
          removeMember(member.user_id, member.username);
        }
      });
    }
  }
})();
