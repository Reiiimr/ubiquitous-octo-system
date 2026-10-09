(function () {
  'use strict';
  const $ = (selector, root) => (root || document).querySelector(selector);
  const routeGroups = [
    ['Overview', ['dashboard']],
    ['Records', ['masterlist', 'stubs']],
    ['Field operations', ['census', 'program-day', 'paravets']],
    ['Programs & services', ['programs', 'services']],
    ['Reports & insights', ['reports', 'data-quality']],
    ['Administration', ['accounts', 'barangays', 'settings']],
    ['Data management', ['import-export']],
  ];
  const routeLabels = {
    dashboard: 'Dashboard',
    masterlist: 'Pet & owner records',
    stubs: 'Registration & stubs',
    census: 'Census',
    'program-day': 'Program day',
    paravets: 'Paravet directory',
    programs: 'Programs & requests',
    services: 'Services',
    reports: 'Reports & analytics',
    'data-quality': 'Data quality',
    accounts: 'Accounts & roles',
    barangays: 'Barangays',
    settings: 'System settings',
    'import-export': 'Import / export',
  };
  const routeFeatures = {
    programs: 'operations', 'program-day': 'operations', census: 'operations',
    masterlist: 'registry', stubs: 'registry', services: 'registry',
    paravets: 'field-team', barangays: 'registry',
    reports: 'reports', 'data-quality': 'data-quality', 'import-export': 'data-management',
    accounts: 'settings', settings: 'settings',
  };
  const allowedByRole = {
    SuperAdmin: new Set(routeGroups.flatMap(([, routes]) => routes)),
    Admin: new Set(['dashboard', 'programs', 'program-day', 'census', 'masterlist', 'stubs', 'services', 'paravets', 'barangays', 'reports', 'data-quality', 'import-export']),
    Paravet: new Set(['dashboard', 'census', 'masterlist']),
  };
  const featureLabels = {
    operations: 'Programs and field operations',
    registry: 'Masterlist and records',
    'field-team': 'Paravet directory',
    reports: 'Reports and activity',
    'data-quality': 'Data quality review',
    'data-management': 'Import and data management',
    settings: 'Account administration',
  };

  const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));

  function buildNavigation(account, controls) {
    const nav = $('#cityvet-navigation');
    if (!nav) return;
    const links = new Map([...nav.querySelectorAll('a[data-route]')].map((link) => [link.dataset.route, link]));
    const currentRoute = location.hash.replace(/^#\/?/, '') || 'dashboard';
    const allowed = allowedByRole[account.type] || new Set();
    const featureAccess = Object.fromEntries((controls.featureAccess || []).map((entry) => [
      `${entry.accountType}:${entry.featureKey}`, entry.enabled,
    ]));
    nav.replaceChildren();
    for (const [label, routes] of routeGroups) {
      const visible = routes.filter((route) => {
        if (!allowed.has(route)) return false;
        const feature = routeFeatures[route];
        return !feature || featureAccess[`${account.type}:${feature}`] !== false;
      });
      if (!visible.length) continue;
      const group = document.createElement('details');
      group.className = 'nav-group';
      group.open = routes.includes(currentRoute);
      const heading = document.createElement('summary');
      heading.className = 'nav-group-title';
      heading.textContent = label;
      group.appendChild(heading);
      const items = document.createElement('div');
      items.className = 'nav-group-items';
      visible.forEach((route) => {
        const link = links.get(route);
        if (link) {
          link.textContent = routeLabels[route] || link.textContent;
          items.appendChild(link);
        }
      });
      group.appendChild(items);
      nav.appendChild(group);
    }
    if (account.type !== 'Paravet') {
      const intake = document.createElement('details');
      intake.className = 'nav-group';
      const heading = document.createElement('summary');
      heading.className = 'nav-group-title';
      heading.textContent = 'Public services';
      intake.appendChild(heading);
      const items = document.createElement('div');
      items.className = 'nav-group-items';
      const link = document.createElement('a');
      link.href = 'prelisting.html';
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = 'Owner pre-listing page ↗';
      items.appendChild(link);
      intake.appendChild(items);
      nav.appendChild(intake);
    }
    updateActiveNavigation(nav, currentRoute);
  }

  function updateActiveNavigation(nav, route) {
    nav.querySelectorAll('.nav-group').forEach((group) => {
      let active = false;
      group.querySelectorAll('a[data-route]').forEach((link) => {
        const isActive = link.dataset.route === route;
        link.classList.toggle('active', isActive);
        if (isActive) {
          link.setAttribute('aria-current', 'page');
          active = true;
        } else {
          link.removeAttribute('aria-current');
        }
      });
      group.classList.toggle('active', active);
      if (active) group.open = true;
    });
  }

  function isRouteAvailable(route, account, controls) {
    if (!(allowedByRole[account.type] || new Set()).has(route)) return false;
    const feature = routeFeatures[route];
    return !feature || !(controls.featureAccess || []).some((entry) =>
      entry.accountType === account.type && entry.featureKey === feature && !entry.enabled);
  }

  function dashboardRecords(kind) {
    return window.CVData?.D?.[kind]?.rows || [];
  }

  function updateSystemStatus() {
    const root = $('[data-system-status]');
    if (!root) return;
    const api = window.CVApi;
    const status = api?.status ? api.status() : { connected: false, authenticated: false, dataReady: false };
    const label = $('[data-status-label]', root);
    const retry = $('[data-status-retry]', root);
    if (!api) {
      label.textContent = 'Preview mode · changes are not connected to a database.';
      root.dataset.state = 'offline';
      retry.hidden = true;
      return;
    }
    if (!status.connected) {
      label.textContent = 'Connection unavailable · database changes cannot be saved.';
      root.dataset.state = 'offline';
      retry.hidden = false;
      return;
    }
    retry.hidden = false;
    if (status.saveStatus === 'saving') {
      label.textContent = 'Saving change…';
      root.dataset.state = 'saving';
    } else if (status.saveStatus === 'failed') {
      label.textContent = `Unable to save · ${status.saveError || 'Retry the action.'}`;
      root.dataset.state = 'error';
    } else if (status.saveStatus === 'saved' && status.lastSavedAt) {
      label.textContent = `Saved to database · ${new Date(status.lastSavedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
      root.dataset.state = 'saved';
    } else if (!status.authenticated || !status.dataReady) {
      label.textContent = 'Service connected · live records are not loaded for this session.';
      root.dataset.state = 'connected';
    } else {
      label.textContent = 'Connected · live database records loaded.';
      root.dataset.state = 'connected';
    }
  }

  function updateAttention(account) {
    const root = $('[data-attention-items]');
    if (!root) return;
    const live = window.CVApi?.status?.().dataReady === true;
    const allowed = allowedByRole[account.type] || new Set();
    const items = [];
    if (allowed.has('programs')) {
      const pendingPrograms = dashboardRecords('programs').filter((record) => record.status === 'Pending approval');
      if (pendingPrograms.length) {
        items.push({
          label: 'Program requests awaiting review',
          count: pendingPrograms.length,
          route: 'programs',
        });
      }
    }
    if (allowed.has('paravets')) {
      const pendingCensus = dashboardRecords('paravets').filter((record) => record.census === 'Pending');
      if (pendingCensus.length) {
        items.push({
          label: 'Paravet census summaries marked pending',
          count: pendingCensus.length,
          route: 'paravets',
        });
      }
    }
    if (!items.length) {
      root.innerHTML = `<p class="muted">${live
        ? 'No items with a supported pending status were found in the loaded records.'
        : 'Preview/sample records only. Pending items here are examples, not live work.'}</p>`;
      return;
    }
    root.innerHTML = items.map((item) => `
      <a class="attention-item" href="#/${item.route}">
        <span><strong>${item.count.toLocaleString()}</strong> ${escape(item.label)}</span>
        <span class="attention-open">Review <span aria-hidden="true">→</span></span>
      </a>`).join('');
    if (!live) {
      root.insertAdjacentHTML('beforeend', '<p class="muted preview-note">Preview/sample counts only; verify live records before acting.</p>');
    }
  }

  function mountDashboardOverview(account) {
    const dashboard = $('[data-view="dashboard"]');
    const grid = $('.dash-grid', dashboard);
    if (!dashboard || !grid) return;
    let status = $('[data-system-status]', dashboard);
    if (!status) {
      status = document.createElement('section');
      status.className = 'dashboard-system-status';
      status.dataset.systemStatus = '';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      status.innerHTML = '<span data-status-label></span><button class="cv-btn" type="button" data-status-retry>Retry connection</button>';
      grid.before(status);
      $('[data-status-retry]', status).addEventListener('click', async (event) => {
        const button = event.currentTarget;
        button.disabled = true;
        try {
          await window.CVApi?.checkConnection?.();
          updateSystemStatus();
        } finally {
          button.disabled = false;
        }
      });
    }
    let quick = $('[data-quick-access]', dashboard);
    if (!quick) {
      quick = document.createElement('section');
      quick.className = 'dcard dashboard-quick-access';
      quick.dataset.quickAccess = '';
      quick.innerHTML = '<h2>Quick access</h2><div class="quick-action-list"></div>';
      status.after(quick);
    }
    const actions = [
      { label: 'Search owners', kind: 'search' },
      { label: 'Pet & owner records', route: 'masterlist' },
      { label: 'Census encoding', route: 'census' },
      { label: 'Registration & stubs', route: 'stubs' },
      { label: 'Programs & requests', route: 'programs' },
      { label: 'Record services', route: 'services' },
      { label: 'Reports & analytics', route: 'reports' },
      { label: 'Import / export', route: 'import-export' },
    ].filter((action) => {
      if (action.kind === 'search') return true;
      if (!(allowedByRole[account.type] || new Set()).has(action.route)) return false;
      const feature = routeFeatures[action.route];
      return !feature || window.CVApi?.controls?.access?.[`${account.type}:${feature}`] !== false;
    });
    const list = $('.quick-action-list', quick);
    list.replaceChildren(...actions.map((action) => {
      const link = document.createElement('a');
      link.className = 'quick-action';
      link.textContent = action.label;
      if (action.kind === 'search') {
        link.href = '#/dashboard';
        link.addEventListener('click', (event) => {
          event.preventDefault();
          $('#dashSearch')?.focus();
        });
      } else {
        link.href = `#/${action.route}`;
      }
      return link;
    }));
    let attention = $('[data-attention-card]', dashboard);
    if (!attention) {
      attention = document.createElement('section');
      attention.className = 'dcard dashboard-attention';
      attention.dataset.attentionCard = '';
      attention.innerHTML = '<h2>Needs your attention</h2><div data-attention-items></div>';
      quick.after(attention);
    }
    updateSystemStatus();
    updateAttention(account);
    if (!dashboard.dataset.overviewEventsBound) {
      dashboard.dataset.overviewEventsBound = 'true';
      window.addEventListener('cv-api-status', updateSystemStatus);
      window.addEventListener('cv-data', () => updateAttention(account));
    }
  }

  function moveDashboardPanels() {
    const analyticsView = $('[data-view="reports"]');
    if (!analyticsView || $('.analytics-deep-dive', analyticsView)) return;
    const container = document.createElement('section');
    container.className = 'analytics-deep-dive';
    const live = document.createElement('section');
    live.className = 'card live-analytics';
    live.innerHTML = '<h2>Live trends and planning</h2><div id="rpLiveAnalytics"></div>';
    container.appendChild(live);
    const heading = document.createElement('h2');
    heading.textContent = 'Program and participation analysis';
    container.appendChild(heading);
    const panels = ['dashFunnel', 'dashPrograms'].map((id) => document.getElementById(id)?.closest('.dcard'));
    if (panels.some((panel) => !panel)) return;
    panels.forEach((panel) => container.appendChild(panel));
    analyticsView.appendChild(container);
  }

  function mountControls() {
    const settings = $('[data-view="settings"]');
    if (!settings || $('.superadmin-controls', settings)) return;
    const rolesHeading = [...settings.querySelectorAll('h2')].find((heading) => heading.textContent.trim() === 'Users & roles (proposed)');
    const rolesTable = rolesHeading?.nextElementSibling;
    if (rolesHeading && rolesTable?.tagName === 'TABLE') {
      rolesHeading.textContent = 'Dashboard roles and permissions';
      const rows = rolesTable.querySelector('tbody');
      if (rows) rows.innerHTML = '<tr><td>SuperAdmin</td><td>Full system, account, data, backup, maintenance, and feature access controls</td></tr><tr><td>Admin</td><td>City Vet encoding, registry, field operations, reports, and data management</td></tr><tr><td>Paravet</td><td>Barangay-scoped census encoding and masterlist access</td></tr>';
      const note = rolesTable.nextElementSibling;
      if (note?.classList.contains('muted')) note.remove();
    }
    const card = document.createElement('section');
    card.className = 'card superadmin-controls';
    card.innerHTML = '<h2>System access controls</h2><p class="muted">Changes take effect on the next protected API request.</p><div class="system-maintenance"></div><div class="feature-controls"></div><div class="system-backup"><h3>Database backup</h3><p class="muted">Download persisted application data and audit history. Credential hashes are excluded.</p><button class="cv-btn" type="button" data-backup>Download database backup</button></div>';
    const topbar = $('.topbar', settings);
    settings.insertBefore(card, topbar ? topbar.nextSibling : settings.firstChild);
  }

  function mountCensusWorkflow(account) {
    const census = $('[data-view="census"]');
    if (account.type === 'Paravet' && census && !$('.paravet-census-workflow', census)) {
      const card = document.createElement('section');
      card.className = 'card paravet-census-workflow';
      card.innerHTML = `
        <h2>Submit a digital census form</h2>
        <p class="muted">Your submission is limited to ${escape(account.barangay || 'your assigned barangay')} and will remain pending until City Vet review.</p>
        <form data-census-form>
          <label>Household head <input name="household" required maxlength="120"/></label>
          <label>Visit date <input name="visitDate" type="date" required/></label>
          <div class="census-form-animals"><h3>Animals in this household</h3><div data-animal-rows></div></div>
          <div class="toolbar"><button class="cv-btn" type="button" data-add-animal>Add animal</button><button class="btn" type="submit">Submit for Admin review</button></div>
        </form>
        <h3>Your recent submissions</h3><div data-own-submissions></div>`;
      const topbar = $('.topbar', census);
      census.insertBefore(card, topbar ? topbar.nextSibling : census.firstChild);
      const form = $('[data-census-form]', card);
      const rows = $('[data-animal-rows]', card);
      const addAnimal = () => {
        const row = document.createElement('div');
        row.className = 'census-animal-row';
        row.innerHTML = '<label>Species <select name="species"><option>Dog</option><option>Cat</option></select></label><label>Sex <select name="sex"><option>Unknown</option><option>Male</option><option>Female</option></select></label><label>Condition <input name="condition" maxlength="80" placeholder="Optional"/></label><button class="cv-btn" type="button" data-remove-animal aria-label="Remove animal">Remove</button>';
        rows.appendChild(row);
      };
      $('[data-add-animal]', card).addEventListener('click', addAnimal);
      card.addEventListener('click', (event) => {
        if (event.target.closest('[data-remove-animal]')) {
          const items = rows.querySelectorAll('.census-animal-row');
          if (items.length > 1) event.target.closest('.census-animal-row').remove();
        }
      });
      addAnimal();
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const submit = form.querySelector('[type="submit"]');
        submit.disabled = true;
        try {
          if (!account.barangay) throw new Error('Your account must have an assigned barangay before submitting census data.');
          const values = new FormData(form);
          const head = String(values.get('household') || '').trim();
          const visitDate = String(values.get('visitDate') || '');
          const householdId = `CEN-${crypto.randomUUID()}`;
          const animals = [...rows.querySelectorAll('.census-animal-row')].map((row) => ({
            id: `CEN-${crypto.randomUUID()}`,
            household_id: householdId,
            species: row.querySelector('[name="species"]').value,
            sex: row.querySelector('[name="sex"]').value,
            condition: row.querySelector('[name="condition"]').value.trim(),
            owner: head,
            barangay: account.barangay,
            date: visitDate,
            source: 'Paravet census',
          }));
          const records = [
            {
              dataset: 'households',
              record: {
                id: householdId,
                name: head,
                household_head: head,
                animals: animals.length,
                barangay: account.barangay,
                paravet: account.name,
                date: visitDate,
                source: 'Paravet census',
              },
            },
            ...animals.map((record) => ({ dataset: 'animals', record })),
          ];
          await CVApi.submitCensusSubmission(`${head} · ${visitDate}`, records);
          form.reset();
          rows.replaceChildren();
          addAnimal();
          CVDialog.toast('Census submitted for Admin review. It has not been added to approved records.', 'success');
        } catch (error) {
          CVDialog.toast(error.message, 'error');
        } finally {
          submit.disabled = false;
        }
      });
    }

    const quality = $('[data-view="data-quality"]');
    if (account.type !== 'Paravet' && quality && !$('.census-review-workflow', quality)) {
      const card = document.createElement('section');
      card.className = 'card census-review-workflow';
      card.innerHTML = '<h2>Census submissions awaiting review</h2><p class="muted">Approval adds new records to the approved registry. If a record ID already exists, approval is stopped so the match can be reviewed safely.</p><div data-census-review-list></div><section data-census-review-detail hidden></section>';
      const topbar = $('.topbar', quality);
      quality.insertBefore(card, topbar ? topbar.nextSibling : quality.firstChild);
      const detail = $('[data-census-review-detail]', card);
      card.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-census-action]');
        if (!button) return;
        const { censusAction: action, submissionId } = button.dataset;
        if (action === 'open') {
          button.disabled = true;
          try {
            const result = await CVApi.request('GET', `/census/submissions/${encodeURIComponent(submissionId)}`);
            const submission = result.submission;
            detail.dataset.submissionId = submission.id;
            detail.hidden = false;
            detail.innerHTML = `<h3>${escape(submission.label)} · ${escape(submission.barangay)}</h3><p>Submitted by ${escape(submission.submitter)} on ${escape(new Date(submission.createdAt).toLocaleString())} · ${submission.records.length} records</p><pre data-census-records></pre><label>Review note (optional)<textarea data-review-note maxlength="500"></textarea></label><div class="toolbar"><button class="cv-btn" type="button" data-census-action="reject" data-submission-id="${escape(submission.id)}">Reject</button><button class="btn" type="button" data-census-action="approve" data-submission-id="${escape(submission.id)}">Approve and apply</button></div>`;
            $('[data-census-records]', detail).textContent = JSON.stringify(submission.records, null, 2);
          } catch (error) {
            CVDialog.toast(error.message, 'error');
          } finally {
            button.disabled = false;
          }
          return;
        }
        if (!['approve', 'reject'].includes(action)) return;
        const note = $('[data-review-note]', detail)?.value || '';
        if (action === 'approve' && !(await CVDialog.confirm(
          'Approve and apply census records?',
          'New records will be added. If a submitted record ID already exists, that approved record will be replaced.',
          { danger: true, okLabel: 'Approve and apply' },
        ))) return;
        button.disabled = true;
        try {
          await CVApi.reviewCensusSubmission(submissionId, action, note);
          detail.hidden = true;
          CVDialog.toast(action === 'approve' ? 'Submission approved and applied.' : 'Submission rejected.', 'success');
        } catch (error) {
          CVDialog.toast(error.message, 'error');
        } finally {
          button.disabled = false;
        }
      });
    }

    const render = () => {
      const submissions = CVApi.censusSubmissions?.() || [];
      if (account.type === 'Paravet') {
        const target = $('[data-own-submissions]', census || document);
        if (!target) return;
        target.replaceChildren();
        if (!submissions.length) {
          target.textContent = 'No census forms submitted yet.';
          return;
        }
        submissions.slice(0, 10).forEach((submission) => {
          const item = document.createElement('p');
          item.textContent = `${submission.label} · ${submission.status} · ${submission.recordCount} records`;
          target.appendChild(item);
        });
      } else {
        const target = $('[data-census-review-list]', quality || document);
        if (!target) return;
        target.replaceChildren();
        const pending = submissions.filter((submission) => submission.status === 'pending');
        if (!pending.length) {
          target.textContent = 'There are no pending census submissions.';
          return;
        }
        const list = document.createElement('div');
        list.className = 'census-review-list';
        pending.forEach((submission) => {
          const row = document.createElement('div');
          row.className = 'census-review-row';
          const text = document.createElement('span');
          text.textContent = `${submission.label} · ${submission.barangay} · ${submission.submitter} · ${submission.recordCount} records`;
          const open = document.createElement('button');
          open.type = 'button';
          open.className = 'cv-btn';
          open.textContent = 'Review';
          open.dataset.censusAction = 'open';
          open.dataset.submissionId = submission.id;
          row.append(text, open);
          list.appendChild(row);
        });
        target.appendChild(list);
      }
    };
    render();
    window.addEventListener('cv-data', render);
  }

  async function loadControls(account, settings) {
    const root = $('.superadmin-controls');
    if (!root) return;
    const data = await CVApi.request('GET', '/admin/controls');
    const maintenance = $('.system-maintenance', root);
    const features = $('.feature-controls', root);
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = `cv-btn${data.maintenanceMode ? ' danger' : ''}`;
    toggle.textContent = data.maintenanceMode ? 'Disable maintenance mode' : 'Enable maintenance mode';
    toggle.addEventListener('click', async () => {
      const enable = !data.maintenanceMode;
      if (!(await CVDialog.confirm(
        enable ? 'Enable maintenance mode?' : 'Disable maintenance mode?',
        enable ? 'Admin and Paravet accounts will be blocked from the dashboard. SuperAdmin access will remain available.' : 'Admin and Paravet dashboard access will be restored.',
        { danger: enable, okLabel: enable ? 'Enable maintenance' : 'Disable maintenance' },
      ))) return;
      try {
        await CVApi.request('PUT', '/admin/controls', { maintenanceMode: enable });
        CVDialog.toast('Maintenance setting saved.', 'success');
        window.location.reload();
      } catch (error) {
        CVDialog.toast(error.message, 'error');
      }
    });
    const label = document.createElement('p');
    label.textContent = data.maintenanceMode ? 'Maintenance mode is ON.' : 'Maintenance mode is off.';
    maintenance.replaceChildren(label, toggle);

    const selected = new Map((data.featureAccess || []).map((item) => [
      `${item.accountType}:${item.featureKey}`, item.enabled,
    ]));
    const table = document.createElement('div');
    table.className = 'feature-control-list';
    ['Admin', 'Paravet'].forEach((role) => {
      const title = document.createElement('h3');
      title.textContent = `${role} feature access`;
      table.appendChild(title);
      Object.entries(featureLabels).forEach(([feature, featureLabel]) => {
        const key = `${role}:${feature}`;
        const row = document.createElement('label');
        row.className = 'feature-control-row';
        const check = document.createElement('input');
        check.type = 'checkbox';
        check.checked = selected.get(key) !== false;
        check.addEventListener('change', async () => {
          check.disabled = true;
          try {
            await CVApi.request('PUT', '/admin/controls', {
              featureAccess: [{ accountType: role, featureKey: feature, enabled: check.checked }],
            });
            CVDialog.toast(`${role} access updated.`, 'success');
            window.dispatchEvent(new Event('cv-show'));
          } catch (error) {
            check.checked = !check.checked;
            CVDialog.toast(error.message, 'error');
          } finally {
            check.disabled = false;
          }
        });
        const text = document.createElement('span');
        text.textContent = featureLabel;
        row.append(check, text);
        table.appendChild(row);
      });
    });
    features.replaceChildren(table);
    const backup = $('[data-backup]', root);
    backup?.addEventListener('click', async () => {
      backup.disabled = true;
      try {
        const response = await fetch('/api/v1/admin/backup', { credentials: 'same-origin', cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result?.error?.message || 'Backup download failed.');
        const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `cityvet-database-backup-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        try {
          await CVApi.log('Database backup exported', `${result.contains.dashboardRecords} dashboard records`);
          CVDialog.toast('Database backup downloaded.', 'success');
        } catch (error) {
          CVDialog.toast(`Backup downloaded, but the export could not be recorded in activity: ${error.message}`, 'error');
        }
      } catch (error) {
        CVDialog.toast(error.message, 'error');
      } finally {
        backup.disabled = false;
      }
    }, { once: true });
    if (account.type !== 'SuperAdmin') root.hidden = true;
    settings.dataset.controlsLoaded = 'true';
  }

  function showMaintenance() {
    const main = $('main');
    if (!main) return;
    const notice = document.createElement('div');
    notice.className = 'maintenance-screen';
    notice.innerHTML = '<section class="login-card"><h1>Under maintenance</h1><p>The dashboard is temporarily unavailable. Please try again later.</p><button type="button" class="cv-btn" data-signout>Sign out</button></section>';
    main.replaceChildren(notice);
    const sidebar = $('.sidebar');
    if (sidebar) sidebar.hidden = true;
  }

  function wireRecentWork(account) {
    const key = `cityvet.recent-route.${account.id}`;
    const promptKey = `cityvet.recent-prompt.${account.id}`;
    const allowed = allowedByRole[account.type] || new Set();
    const currentRoute = () => location.hash.replace(/^#\/?/, '') || 'dashboard';
    const priorRoute = (() => {
      try { return localStorage.getItem(key) || ''; } catch { return ''; }
    })();
    window.addEventListener('hashchange', () => {
      const route = currentRoute();
      if (route !== 'dashboard' && allowed.has(route)) {
        try { localStorage.setItem(key, route); } catch { /* Browser storage may be disabled. */ }
      }
    });
    const sessionKey = sessionStorage.getItem('cityvet.prototype.demoSession');
    if (!sessionKey || sessionStorage.getItem(promptKey)) return;
    sessionStorage.setItem(promptKey, '1');
    const safePrior = allowed.has(priorRoute) ? priorRoute : '';
    const priorView = safePrior && $(`[data-view="${CSS.escape(safePrior)}"]`);
    const priorTitle = priorView?.querySelector('h1')?.textContent || 'your recent section';
    const activity = (CVApi.activity() || [])[0];
    const detail = activity
      ? `<p class="muted">Last recorded activity: ${escape(activity.action)}${activity.detail ? ` · ${escape(activity.detail)}` : ''}</p>`
      : '';
    CVDialog.open({
      title: 'Welcome back',
      html: `<p>${safePrior ? `Continue where you left off in <strong>${escape(priorTitle)}</strong>?` : 'Open your dashboard to get started.'}</p>${detail}`,
      actions: [
        ...(safePrior ? [{ label: 'Return to recent work', primary: true, value: 'recent' }] : []),
        { label: 'Go to dashboard', primary: !safePrior, value: 'dashboard' },
      ],
    }).then((choice) => {
      if (choice === 'recent') location.hash = `#/${safePrior}`;
      else location.hash = '#/dashboard';
    });
  }

  async function start() {
    if (!window.CVApi) {
      const previewAccount = { type: 'SuperAdmin' };
      buildNavigation(previewAccount, { featureAccess: [] });
      mountDashboardOverview(previewAccount);
      moveDashboardPanels();
      return;
    }
    if (!(await CVApi.ready)) {
      const previewAccount = { type: 'SuperAdmin' };
      buildNavigation(previewAccount, { featureAccess: [] });
      mountDashboardOverview(previewAccount);
      moveDashboardPanels();
      return;
    }
    let controls;
    try {
      controls = await CVApi.request('GET', '/admin/controls');
    } catch (error) {
      if (error.status !== 401) {
        window.dispatchEvent(new CustomEvent('cv-api-error', { detail: `Dashboard controls could not be loaded: ${error.message}` }));
      }
      return;
    }
    let account = CVApi.me;
    if (!account) {
      try { account = (await CVApi.request('GET', '/auth/me')).account; } catch { /* Maintenance mode intentionally blocks regular dashboard sessions. */ }
    }
    account = account || (controls.role ? { type: controls.role } : null);
    if (!account || !allowedByRole[account.type]) return;
    buildNavigation(account, controls);
    mountDashboardOverview(account);
    moveDashboardPanels();
    mountControls();
    mountCensusWorkflow(account);
    const nav = $('#cityvet-navigation');
    const initialRoute = location.hash.replace(/^#\/?/, '') || 'dashboard';
    if (!isRouteAvailable(initialRoute, account, controls)) {
      location.hash = '#/dashboard';
      CVDialog.toast('That dashboard section is not available to your account.', 'error');
    } else if (nav) {
      updateActiveNavigation(nav, initialRoute);
    }
    if (controls.maintenanceMode && account.type !== 'SuperAdmin') {
      showMaintenance();
      return;
    }
    if (account.type === 'SuperAdmin') {
      loadControls(account).catch((error) => window.dispatchEvent(new CustomEvent('cv-api-error', { detail: error.message })));
    }
    const pills = document.querySelectorAll('.role-pill');
    pills.forEach((pill) => { pill.textContent = `Signed in as ${account.type}`; });
    wireRecentWork(account);
    window.addEventListener('beforeunload', (event) => {
      if (!sessionStorage.getItem('cityvet.prototype.demoSession')) return;
      event.preventDefault();
      event.returnValue = '';
    });
    window.addEventListener('hashchange', () => {
      const route = location.hash.replace(/^#\/?/, '') || 'dashboard';
      if (!isRouteAvailable(route, account, controls)) {
        location.hash = '#/dashboard';
        CVDialog.toast('That dashboard section is not available to your account.', 'error');
        return;
      }
      if (nav) updateActiveNavigation(nav, route);
    });
    window.dispatchEvent(new Event('cv-data'));
    window.dispatchEvent(new Event('cv-show'));
  }

  const style = document.createElement('style');
  style.textContent = `
    .nav-group{display:grid;gap:2px;margin:8px 0 12px}
    .nav-group-title{padding:8px 12px 4px;color:var(--muted);font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;list-style-position:inside}
    .nav-group-title:focus-visible{outline:2px solid var(--green);outline-offset:2px;border-radius:4px}
    .nav-group.active>.nav-group-title{color:var(--green-dark)}
    .nav-group-items{display:grid;gap:2px}
    .analytics-deep-dive{display:grid;gap:12px;margin:20px 0}
    .dashboard-system-status{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:12px 0;padding:11px 14px;border:1px solid var(--line);border-left:4px solid var(--blue);border-radius:9px;background:var(--surface);color:var(--ink);font-size:13px}
    .dashboard-system-status[data-state="connected"],.dashboard-system-status[data-state="saved"]{border-left-color:var(--green)}
    .dashboard-system-status[data-state="saving"]{border-left-color:var(--gold)}
    .dashboard-system-status[data-state="offline"],.dashboard-system-status[data-state="error"]{border-left-color:#d93025}
    .dashboard-system-status button[hidden]{display:none}
    .dashboard-quick-access{margin-bottom:16px}
    .quick-action-list{display:flex;flex-wrap:wrap;gap:8px}
    .quick-action{display:inline-flex;align-items:center;min-height:38px;padding:7px 12px;border:1px solid var(--line);border-radius:8px;background:var(--surface-alt);color:var(--green-dark);font-weight:600;text-decoration:none}
    .quick-action:hover,.attention-item:hover{background:var(--sidebar-hover)}
    .dashboard-attention{margin-bottom:18px}
    .attention-item{display:flex;justify-content:space-between;gap:12px;padding:11px 12px;border:1px solid var(--line);border-radius:8px;color:var(--ink);text-decoration:none}
    .attention-item+.attention-item{margin-top:8px}
    .attention-open{color:var(--green-dark);font-weight:600;white-space:nowrap}
    .preview-note{margin:10px 0 0;font-size:12px}
    .feature-control-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:4px 18px}
    .feature-control-list h3{grid-column:1/-1;margin:14px 0 4px}
    .feature-control-row{display:flex;align-items:center;gap:10px;padding:7px 0}
    .paravet-census-workflow form{display:grid;gap:12px;max-width:760px}
    .paravet-census-workflow label,.census-review-workflow label{display:grid;gap:5px;font-weight:600}
    .paravet-census-workflow input,.paravet-census-workflow select,.census-review-workflow textarea{min-height:38px;padding:7px 9px;border:1px solid var(--line);border-radius:7px;background:var(--surface);color:var(--ink);font:inherit}
    .census-animal-row{display:grid;grid-template-columns:repeat(3,minmax(120px,1fr)) auto;align-items:end;gap:10px;margin:8px 0}
    .census-review-list{display:grid;gap:8px}
    .census-review-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px;border:1px solid var(--line);border-radius:8px}
    .census-review-workflow pre{max-height:320px;overflow:auto;padding:12px;background:var(--surface-alt);white-space:pre-wrap}
    .census-review-workflow textarea{width:100%;min-height:72px}
    @media(max-width:600px){.census-animal-row{grid-template-columns:1fr 1fr}.census-review-row{align-items:flex-start;flex-direction:column}}
    .maintenance-screen{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:24px;background:var(--bg,#f4f7f4)}
  `;
  document.head.appendChild(style);
  void start();
})();
