(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s), esc = CVDialog.esc;
  const acct = () => CV.read('cityvet.prototype.demoAccount', {}) || {};
  const GREET = ['Welcome, {u}!', 'Great day, {u}!', 'Good to see you, {u}!', 'Hello again, {u}!', 'Ready when you are, {u}!', 'Let’s get things done, {u}!', 'Nice to have you back, {u}!'];
  const greet = GREET[Math.floor(Math.random() * GREET.length)];
  function tick() {
    const d = new Date(), o = { timeZone: 'Asia/Manila' };
    const a = $('#nowDate'), b = $('#nowTime'), u = $('#adminName'), g = $('#greet');
    if (a) a.textContent = d.toLocaleDateString('en-PH', Object.assign({ weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }, o));
    if (b) b.textContent = d.toLocaleTimeString('en-PH', Object.assign({ hour: 'numeric', minute: '2-digit' }, o));
    if (u) u.textContent = acct().username || 'admin';
    if (g) g.textContent = greet.replace('{u}', acct().displayName || acct().username || 'admin');
  }
  tick(); setInterval(tick, 15000); window.addEventListener('cv-show', tick);
  document.addEventListener('click', async e => {
    if (e.target.closest('[data-signout]')) { if (await CVDialog.confirm('Sign out', 'Sign out of the City Vet admin?', { okLabel: 'Sign out' })) { CV.log('Sign out', ''); if (window.CVApi && CVApi.live) await CVApi.logout(); try { sessionStorage.removeItem('cityvet.prototype.demoSession'); } catch (x) {} location.href = 'login.html'; } }
  });
  // Notifications: fixed-size, two-pane, Gmail-style
  let ov = null, opener = null; const S = { tab: 'unread', q: '', sort: 'new', year: '', sel: null };
  const when = t => new Date(t).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  const F = { unread: n => !n.read && !n.archived, read: n => n.read && !n.archived, saved: n => n.saved && !n.archived, archived: n => n.archived };
  const save = a => { CV.write('cityvet.notifications', a); badge(); };
  function badge() { const c = CV.notes().filter(F.unread).length; document.querySelectorAll('[data-bell-badge]').forEach(b => { b.hidden = !c; b.textContent = c > 9 ? '9+' : c; }); document.querySelectorAll('[data-bell]').forEach(b => b.setAttribute('aria-label', `Notifications, ${c} unread`)); }
  function list() {
    const q = S.q.trim().toLowerCase();
    let a = CV.notes().filter(F[S.tab]).filter(n => (!S.year || n.time.slice(0, 4) === S.year) && (!q || (n.title + ' ' + n.body + ' ' + (n.detail || '')).toLowerCase().includes(q)));
    a.sort((x, y) => S.sort === 'new' ? y.time.localeCompare(x.time) : S.sort === 'old' ? x.time.localeCompare(y.time) : S.sort === 'az' ? x.title.localeCompare(y.title) : y.title.localeCompare(x.title));
    return a;
  }
  function draw(keepSearch) {
    const all = CV.notes(), items = list(), cur = all.find(n => n.id === S.sel);
    $('.nt-tabs', ov).innerHTML = [['unread', 'Unread'], ['read', 'Read'], ['saved', 'Saved'], ['archived', 'Archived']].map(([k, l]) => `<button type="button" class="tab${k === S.tab ? ' active' : ''}" data-nt-tab="${k}">${l} (${all.filter(F[k]).length})</button>`).join('');
    const ys = [...new Set(all.map(n => n.time.slice(0, 4)))].sort().reverse();
    $('.nt-year', ov).innerHTML = '<option value="">All years</option>' + ys.map(y => `<option${S.year === y ? ' selected' : ''}>${y}</option>`).join('');
    $('.nt-sort', ov).value = S.sort;
    $('.nt-list', ov).innerHTML = items.length ? items.map(n => `<button type="button" class="nt-row${n.read ? '' : ' unread'}${n.id === S.sel ? ' sel' : ''}" data-id="${n.id}"><strong>${esc(n.title)}</strong><span class="nt-snip">${esc(n.body)}</span><span class="muted">${when(n.time)}${n.saved ? ' · ★ Saved' : ''}</span></button>`).join('') : `<p class="muted nt-empty">No ${S.tab} messages${S.q ? ' match your search' : ''}.</p>`;
    $('.nt-detail', ov).innerHTML = cur ? `<div class="nt-dhead"><h3>${esc(cur.title)}</h3><p class="muted">From ${esc(cur.from || 'System')} · ${when(cur.time)}</p><div class="nt-actions"><button class="cv-btn" data-a="read">${cur.read ? 'Mark unread' : 'Mark read'}</button><button class="cv-btn" data-a="save">${cur.saved ? 'Unsave' : 'Save'}</button><button class="cv-btn" data-a="archive">${cur.archived ? 'Unarchive' : 'Archive'}</button><button class="cv-btn danger" data-a="delete">Delete</button></div></div><div class="nt-dbody"><p>${esc(cur.detail || cur.body)}</p>${cur.link ? `<p><a class="btn" href="${cur.link}" data-a="open" style="text-decoration:none">Open related page</a></p>` : ''}</div>` : '<p class="muted nt-empty">Select a message to read it here.</p>';
    badge();
  }
  function open(btn) {
    opener = btn; ov = document.createElement('div'); ov.className = 'dlg-overlay';
    ov.innerHTML = '<div class="nt-modal" role="dialog" aria-modal="true" aria-label="Notifications"><div class="dlg-head"><h2>Notifications</h2><span class="nt-top"><button class="cv-btn" data-a="all">Mark all read</button><button class="dlg-x" type="button" data-a="close" aria-label="Close"><img src="close.png" alt=""/></button></span></div><div class="nt-body"><div class="nt-left"><input class="nt-q" type="search" placeholder="Search messages…" aria-label="Search messages"/><div class="nt-filters"><select class="nt-sort" aria-label="Sort"><option value="new">Newest first</option><option value="old">Oldest first</option><option value="az">Title A → Z</option><option value="za">Title Z → A</option></select><select class="nt-year" aria-label="Year"></select></div><div class="tabs nt-tabs"></div><div class="nt-list"></div></div><div class="nt-detail"></div></div></div>';
    document.body.appendChild(ov); draw(); $('.nt-q', ov).focus();
  }
  function close() { if (ov) { ov.remove(); ov = null; if (opener) opener.focus(); } }
  document.addEventListener('click', async e => {
    const bell = e.target.closest('[data-bell]'); if (bell) { open(bell); return; }
    if (!ov || ![...document.querySelectorAll('.dlg-overlay')].pop() === ov) return;
    if (e.target === ov) return close();
    const t = e.target.closest('[data-nt-tab]'); if (t) { S.tab = t.dataset.ntTab; S.sel = null; return draw(); }
    const row = e.target.closest('.nt-row'); if (row) { S.sel = row.dataset.id; const all = CV.notes(), n = all.find(x => x.id === S.sel); if (n && !n.read) { n.read = true; save(all); } return draw(); }
    const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
    if (a === 'close') return close(); if (a === 'open') { close(); return; }
    const all = CV.notes();
    if (a === 'all') all.forEach(n => { if (!n.archived) n.read = true; });
    else { const n = all.find(x => x.id === S.sel); if (!n) return;
      if (a === 'read') n.read = !n.read; else if (a === 'save') n.saved = !n.saved; else if (a === 'archive') { n.archived = !n.archived; if (n.archived) n.read = true; S.sel = null; }
      else if (a === 'delete') { if (!(await CVDialog.confirm('Delete message', 'Delete this notification permanently? This cannot be undone.', { danger: true, okLabel: 'Delete' }))) return; all.splice(all.indexOf(n), 1); S.sel = null; CV.log('Notification deleted', n.title); } }
    save(all); draw();
  });
  document.addEventListener('input', e => { if (ov && e.target.matches('.nt-q')) { S.q = e.target.value; const p = e.target.selectionStart; draw(); e.target.focus(); e.target.setSelectionRange(p, p); } });
  document.addEventListener('change', e => { if (!ov) return; if (e.target.matches('.nt-sort')) { S.sort = e.target.value; draw(); } if (e.target.matches('.nt-year')) { S.year = e.target.value; draw(); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && ov && [...document.querySelectorAll('.dlg-overlay')].pop() === ov) close(); });
  ['cv-notes', 'storage', 'focus'].forEach(ev => window.addEventListener(ev, () => { badge(); if (ov) draw(); }));
  badge();
  const roleUi = document.createElement('script');
  roleUi.src = 'role-dashboard.js';
  document.body.appendChild(roleUi);
})();
