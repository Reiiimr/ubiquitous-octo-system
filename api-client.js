/* Same-origin client for the Vercel API. Local demo mode is retained when no API is reachable. */
window.CVApi = (function () {
  'use strict';
  const base = '/api/v1';
  const datasets = ['owners', 'pets', 'paravets', 'respondents', 'households', 'animals', 'stubs', 'services', 'programs', 'participants'];
  const state = { live: false, accounts: [], accountArchived: [], records: {}, archived: {}, prelistings: [], censusSubmissions: [], barangays: [], activity: [], me: null, controls: null, dataReady: false, saveStatus: 'idle', lastSavedAt: null, saveError: '' };
  const apiError = error => window.dispatchEvent(new CustomEvent('cv-api-error', { detail: error && error.message ? error.message : 'The server request failed.' }));
  const emitStatus = () => window.dispatchEvent(new CustomEvent('cv-api-status', {
    detail: {
      connected: state.live,
      authenticated: Boolean(state.me),
      dataReady: state.dataReady,
      saveStatus: state.saveStatus,
      lastSavedAt: state.lastSavedAt,
      saveError: state.saveError,
    },
  }));
  function recordBatches(records) {
    const batches = [];
    let batch = [], bytes = 0;
    for (const record of records) {
      const size = new TextEncoder().encode(JSON.stringify(record)).length + 1;
      if (size > 20_000) throw new Error('Each record must be 20 KB or smaller.');
      if (batch.length && (batch.length >= 40 || bytes + size > 150_000)) {
        batches.push(batch);
        batch = [];
        bytes = 0;
      }
      batch.push(record);
      bytes += size;
    }
    if (batch.length) batches.push(batch);
    return batches;
  }

  async function request(method, path, body) {
    const isWrite = method !== 'GET';
    if (isWrite) {
      state.saveStatus = 'saving';
      state.saveError = '';
      emitStatus();
    }
    let r;
    try {
      r = await fetch(base + path, {
        method,
        credentials: 'same-origin',
        headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (error) {
      if (isWrite) {
        state.saveStatus = 'failed';
        state.saveError = error.message || 'The request could not reach the server.';
        emitStatus();
      }
      throw error;
    }
    let data = null;
    try { data = await r.json(); } catch (e) { /* empty body */ }
    if (!r.ok) {
      if (r.status === 401 && !/first-signin|auth\/login|set-password/.test(path) && state.live && !(path === '/auth/me' && /prelisting\.html$/.test(location.pathname))) {
        try { sessionStorage.removeItem('cityvet.prototype.demoSession'); } catch (e) {}
        if (!/login\.html$/.test(location.pathname)) location.href = 'login.html';
      }
      const err = new Error((data && data.error && data.error.message) || 'Request failed');
      err.status = r.status;
      err.code = data && data.error && data.error.code;
      err.details = data && data.error && data.error.details;
      if (isWrite) {
        state.saveStatus = 'failed';
        state.saveError = err.message;
        emitStatus();
      }
      throw err;
    }
    if (isWrite) {
      state.saveStatus = 'saved';
      state.lastSavedAt = new Date().toISOString();
      state.saveError = '';
      emitStatus();
    }
    return data;
  }

  async function checkConnection() {
    if (location.protocol === 'file:') return false;
    try {
      const c = new AbortController();
      setTimeout(() => c.abort(), 2500);
      const r = await fetch(base + '/health', { signal: c.signal, credentials: 'same-origin' });
      const j = await r.json().catch(() => null);
      state.live = r.ok && j && j.ok === true;
    } catch (e) { state.live = false; }
    emitStatus();
    return state.live;
  }

  const ready = checkConnection();

  const row = a => ({ id: a.id, key: a.accountKey || a.username, type: a.accountType, name: a.fullName, firstName: a.firstName, middleName: a.middleName, lastName: a.lastName, suffix: a.suffix, barangay: a.barangay ? a.barangay.name : '', mobile: a.mobile || '', status: a.status, created: a.createdOn, linked: a.paravetId ? 'PV-' + String(a.paravetId).padStart(3, '0') : '', staff: !a.accountKey });
  async function fetchPages(path) {
    const all = [];
    for (let page = 1; ; page++) {
      const response = await request('GET', `${path}${path.includes('?') ? '&' : '?'}page=${page}&pageSize=500`);
      all.push(...response.data);
      if (all.length >= response.total || response.data.length === 0) return all;
    }
  }
  async function refreshAccounts() {
    if (!state.live || !state.me || state.me.type !== 'SuperAdmin') return;
    try {
      const [active, archived] = await Promise.all([
        fetchPages('/accounts?sort=created&dir=desc&archived=false'),
        fetchPages('/accounts?sort=created&dir=desc&archived=true'),
      ]);
      state.accounts = [...active, ...archived].map(row);
      state.accountArchived = archived.map(account => account.id);
      window.dispatchEvent(new Event('cv-data'));
    } catch (e) { apiError(e); }
  }
  async function refreshData() {
    if (!state.live || !state.me) return;
    const roleDatasets = state.me.type === 'Paravet'
      ? ['owners', 'pets', 'respondents', 'households', 'animals']
      : datasets;
    const visibleDatasets = roleDatasets.filter(kind => {
      const feature = ['programs', 'participants', 'respondents', 'households', 'animals'].includes(kind) ? 'operations'
        : kind === 'paravets' ? 'field-team' : 'registry';
      return !state.controls || state.me.type === 'SuperAdmin'
        || state.controls.access[`${state.me.type}:${feature}`] !== false;
    });
    const loaded = await Promise.all(visibleDatasets.map(async kind => {
      const rows = await fetchPages(`/records/${kind}?archived=all`);
      return [kind, rows];
    }));
    const records = {}, archived = {};
    loaded.forEach(([kind, rows]) => {
      records[kind] = rows.map(row => {
        const { _archived, ...record } = row;
        if (_archived) (archived[kind] = archived[kind] || []).push(record.id);
        return record;
      });
    });
    state.records = records;
    state.archived = archived;
    state.prelistings = state.me.type !== 'Paravet' && (!state.controls || state.controls.access[`${state.me.type}:operations`] !== false)
      ? await fetchPages('/prelistings') : [];
    state.censusSubmissions = await fetchPages('/census/submissions?status=all');
    state.activity = state.me.type === 'Paravet' || state.controls?.access[`${state.me.type}:reports`] === false
      ? [] : (await request('GET', '/activity?page=1&pageSize=500')).data;
    state.dataReady = true;
    window.dispatchEvent(new Event('cv-data'));
  }
  async function refreshActivity() {
    if (!state.live || !state.me) return;
    const result = await request('GET', '/activity?page=1&pageSize=500');
    state.activity = result.data;
    window.dispatchEvent(new Event('cv-data'));
  }
  async function log(action, detail) {
    await request('POST', '/activity', { action, detail });
    state.activity.unshift({
      id: 'local-' + Date.now() + '-' + Math.floor(Math.random() * 100000),
      time: new Date().toISOString().slice(0, 19).replace('T', ' '),
      user: state.me.username || state.me.name,
      action,
      detail,
    });
    state.activity = state.activity.slice(0, 500);
    window.dispatchEvent(new Event('cv-data'));
  }
  async function loadBarangays() {
    const result = await request('GET', '/barangays');
    state.barangays = result.data;
    if (state.dataReady) window.dispatchEvent(new Event('cv-data'));
  }
  function refresh() {
    return Promise.all([refreshAccounts(), refreshData(), loadBarangays()]).catch(e => { apiError(e); });
  }
  ready.then(live => {
    if (!live) return;
    request('GET', '/auth/me').then(async r => {
      state.me = r.account;
      emitStatus();
      const controls = await request('GET', '/admin/controls');
      state.controls = {
        maintenanceMode: controls.maintenanceMode,
        role: controls.role,
        access: Object.fromEntries(controls.featureAccess.map(item => [`${item.accountType}:${item.featureKey}`, item.enabled])),
      };
      await refresh();
      emitStatus();
    }).catch(e => {
      if (e.status !== 401) apiError(e);
    });
    window.addEventListener('cv-show', () => {
      if (state.me && /#\/(accounts|paravets|dashboard|masterlist|census|programs|stubs|services|program-day|barangays)/.test(location.hash)) refresh();
    });
  });

  async function saveRecords(kind, records) {
    if (!state.live) throw new Error('The server is not connected.');
    for (const batch of recordBatches(records)) await request('POST', `/records/${kind}`, { records: batch });
    await refreshData();
  }
  async function submitCensusSubmission(label, records, submissionId = crypto.randomUUID()) {
    if (!state.live || state.me?.type !== 'Paravet') throw new Error('Only signed-in Paravets can submit census data.');
    for (const batch of recordBatches(records)) {
      await request('POST', '/census/submissions', {
        submissionId,
        label,
        records: batch.map(item => ({ dataset: item.dataset, record: item.record })),
      });
    }
    await refreshData();
    return submissionId;
  }
  async function reviewCensusSubmission(submissionId, decision, note = '') {
    await request('PUT', `/census/submissions/${encodeURIComponent(submissionId)}`, { decision, note });
    await refreshData();
  }
  async function archiveRecords(kind, ids, archived) {
    if (kind === 'accounts') {
      await request('POST', '/accounts/archive', { ids: ids.map(Number), restore: !archived });
      await refreshAccounts();
      return;
    }
    for (let i = 0; i < ids.length; i += 500) {
      await request('POST', `/records/${kind}/archive`, { ids: ids.slice(i, i + 500), archived });
    }
    await refreshData();
  }
  async function importRecords(kind, batchId, label, records) {
    let saved = false;
    try {
      for (const batch of recordBatches(records)) {
        await request('POST', `/records/${kind}/import`, { batchId, label, records: batch });
        saved = true;
      }
      await refreshData();
      return batchId;
    } catch (error) {
      if (saved) {
        try { await request('POST', `/records/${kind}/undo-import`, { batchId }); }
        catch (rollbackError) {
          apiError(rollbackError);
          throw new Error(`${error.message} The partial import could not be rolled back: ${rollbackError.message}`);
        }
      }
      throw error;
    }
  }
  async function undoImport(kind, batchId) {
    await request('POST', `/records/${kind}/undo-import`, { batchId });
    await refreshData();
  }
  async function undoImports(kind, batchIds) {
    for (const batchId of batchIds) await request('POST', `/records/${kind}/undo-import`, { batchId });
    await refreshData();
  }

  return {
    get live() { return state.live; },
    get dataReady() { return state.dataReady; },
    get me() { return state.me; },
    get controls() { return state.controls; },
    ready,
    checkConnection,
    status: () => ({
      connected: state.live,
      authenticated: Boolean(state.me),
      dataReady: state.dataReady,
      saveStatus: state.saveStatus,
      lastSavedAt: state.lastSavedAt,
      saveError: state.saveError,
    }),
    request,
    refreshAccounts,
    refreshData,
    accounts: () => state.accounts,
    records: kind => state.records[kind] || [],
    archived: () => Object.assign({}, state.archived, state.accountArchived.length ? { accounts: state.accountArchived } : {}),
    prelistings: () => state.prelistings,
    censusSubmissions: () => state.censusSubmissions,
    barangays: () => state.barangays,
    activity: () => state.activity,
    saveRecords,
    submitCensusSubmission,
    reviewCensusSubmission,
    archiveRecords,
    importRecords,
    undoImport,
    undoImports,
    log,
    submitPrelisting: body => request('POST', '/prelistings', body),
    login: (identifier, password) => request('POST', '/auth/login', { identifier, password }),
    logout: () => request('POST', '/auth/logout', {}).catch(() => {}),
    firstSignin: (accountKey, temporaryPassword) => request('POST', '/auth/first-signin', { accountKey, temporaryPassword }),
    setPassword: (newPassword, confirmPassword) => request('POST', '/auth/set-password', { newPassword, confirmPassword }),
  };
})();
