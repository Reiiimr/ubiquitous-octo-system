window.CVAccounts = (function () {
  'use strict';
  const K = 'cityvet.accounts', CH = 'ABCDEFGHJKLMNPQRTUVWXYabcdefghjkmnpqrstuvwxy346789', TTL = 15 * 60 * 1000;
  const all = () => CV.read(K, []), save = a => { CV.write(K, a); window.dispatchEvent(new Event('cv-data')); };
  const rnd = n => { const out = []; const lim = 256 - (256 % CH.length); const b = new Uint8Array(32); while (out.length < n) { crypto.getRandomValues(b); for (const x of b) { if (x < lim && out.length < n) out.push(CH[x % CH.length]); } } return out.join(''); };
  const temp = () => rnd(4) + '-' + rnd(4);
  const hex = buf => [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');
  async function hash(pw, salt) { if (!(window.crypto && crypto.subtle)) throw new Error('Secure hashing needs https or localhost.'); return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + pw))); }
  const mkTmp = async () => { const pw = temp(), salt = rnd(16); return { pw, rec: { salt, hash: await hash(pw, salt), exp: Date.now() + TTL, attempts: 0 } }; };
  function status(a) { if (a.tmp) return a.tmp.attempts >= 3 ? 'Locked' : Date.now() > a.tmp.exp ? 'Temporary password expired' : 'Temporary password pending'; return 'Active'; }
  const sweep = () => { const a = all(); let ch = false; a.forEach(x => { if (x.tmp && Date.now() > x.tmp.exp) { x.tmp.hash = ''; ch = true; } }); if (ch) CV.write(K, a); };
  sweep(); setInterval(sweep, 30000);
  const publicRows = () => all().map(a => ({ key: a.key, type: a.type, name: a.name, barangay: a.barangay, mobile: a.mobile, status: status(a), created: a.created, linked: a.linked }));
  function nextKey(type, brg) { const b = CV.brInfo(brg), code = type === 'Paravet' ? 'PV' : 'US', n = 1 + all().filter(a => a.type === type && a.barangay === brg).length + (type === 'Paravet' ? (CVData.para0.slice(0, 8).filter(p => p.barangay === brg).length) : 0); return `${code}${new Date().getFullYear()}-${b.ac}${code[0]}${String(n).padStart(3, '0')}-${b.zip}`; }
  function showTemp(key, pw, exp) {
    return CVDialog.open({ title: 'Account created', kind: 'success', size: 'md', html: `<p>Give these sign-in details to the user. The temporary password is shown <strong>only once</strong> and expires in 15 minutes.</p><dl class="kv one"><div><dt>Account key</dt><dd><code>${key}</code></dd></div><div><dt>Temporary password</dt><dd><code class="tmp">${pw}</code></dd></div><div><dt>Expires in</dt><dd><strong id="tmpCd">15:00</strong></dd></div></dl><p class="muted">Demo simulation: real hashing (bcrypt/Argon2), server-side expiry and IP lockout need a backend.</p>`, actions: [{ label: 'Copy details', onClick: ov => { navigator.clipboard && navigator.clipboard.writeText(`Account key: ${key}\nTemporary password: ${pw}`); CVDialog.toast('Copied.', 'success'); return false; } }, { label: 'Done', primary: true, value: 1 }], onOpen: ov => { const t = setInterval(() => { const s = Math.max(0, Math.round((exp - Date.now()) / 1000)), el = ov.querySelector('#tmpCd'); if (!el || !ov.isConnected) return clearInterval(t); el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }, 1000); } });
  }
  async function createDemo(pre) {
    pre = pre || {};
    const pvs = CVData.D.paravets.rows.filter(p => p.acct === 'Manual census' && p.barangay !== 'All (rotating)');
    const v = await CVDialog.form({ title: pre.type === 'Paravet' ? 'Create Paravet account' : 'Add account', submitLabel: 'Create account', fields: [
      { k: 'type', label: 'Account type', type: 'select', options: ['Paravet', 'User'], value: pre.type || 'Paravet', req: true },
      { k: 'firstName', label: 'First name', req: true, value: pre.firstName || '' },
      { k: 'middleName', label: 'Middle name (optional)', value: '' },
      { k: 'lastName', label: 'Last name', req: true, value: pre.lastName || '' },
      { k: 'suffix', label: 'Suffix (optional)', value: '', placeholder: 'Jr., III' },
      { k: 'barangay', label: 'Barangay', type: 'barangay', req: true, value: pre.barangay || '' },
      { k: 'mobile', label: 'Mobile number', type: 'tel', req: true, placeholder: '09XX-XXX-XXXX', value: pre.mobile || '' },
      { k: 'linked', label: 'Link to Paravet record (optional)', type: 'select', options: ['— none —', ...pvs.map(p => `${p.id} · ${p.name}`)], wide: true, hint: 'Only Paravets still doing manual census are listed.' }
    ], validate: v => { const e = {}; if (!/^09\d{2}-?\d{3}-?\d{4}$/.test(v.mobile.replace(/\s/g, ''))) e.mobile = 'Use a PH mobile number like 0917-123-4567.'; const nm = v.lastName + ', ' + v.firstName; if (all().some(a => CV.norm(a.name) === CV.norm(nm) && a.barangay === CV.brFind(v.barangay) && a.type === v.type)) e.lastName = 'An account for this person already exists in this barangay.'; return e; } });
    if (!v) return;
    try {
      const key = nextKey(v.type, v.barangay), t = await mkTmp(), d = v.mobile.replace(/\D/g, '');
      const a = all(); a.push({ key, type: v.type, name: v.lastName + ', ' + v.firstName + (v.suffix ? ' ' + v.suffix : ''), firstName: v.firstName, middleName: v.middleName, lastName: v.lastName, suffix: v.suffix, barangay: v.barangay, mobile: `${d.slice(0, 4)}-${d.slice(4, 7)}-${d.slice(7)}`, created: new Date().toISOString().slice(0, 10), linked: v.linked.startsWith('PV-') ? v.linked.split(' ')[0] : '', tmp: t.rec, pw: null }); save(a);
      CV.log('Account created', `${key} (${v.type})`); CV.notify({ title: 'Account created', body: `${v.type} account ${key} was created for ${v.lastName}, ${v.firstName}.`, detail: `A ${v.type.toLowerCase()} account was created. The temporary password expires in 15 minutes and must be replaced at first sign-in.`, link: '#/accounts', from: 'Accounts' });
      await showTemp(key, t.pw, t.rec.exp);
    } catch (e) { CVDialog.alert('Could not create the account', e.message, 'error'); }
  }
  async function editDemo(row) {
    const a = all().find(x => x.key === row.key); if (!a) return CVDialog.alert('Sample account', 'Sample accounts are read-only in this demo. Create a new account to try editing.', 'info');
    const v = await CVDialog.form({ title: 'Edit account · ' + a.key, fields: [{ k: 'name', label: 'Full name', req: true, value: a.name }, { k: 'barangay', label: 'Barangay', type: 'barangay', req: true, value: a.barangay, hint: 'The account key does not change when the barangay is edited.' }, { k: 'mobile', label: 'Mobile number', type: 'tel', req: true, value: a.mobile }], validate: v => /^09\d{2}-?\d{3}-?\d{4}$/.test(v.mobile.replace(/\s/g, '')) ? {} : { mobile: 'Use a PH mobile number like 0917-123-4567.' } });
    if (!v) return; Object.assign(a, v); save(all().map(x => x.key === a.key ? a : x)); CV.log('Account edited', a.key); CVDialog.toast('Account updated.', 'success');
  }
  async function resetDemo(row) {
    const a = all().find(x => x.key === row.key); if (!a) return CVDialog.alert('Sample account', 'Sample accounts are read-only in this demo.', 'info');
    if (!(await CVDialog.confirm('Reset password', `Issue a new temporary password for ${a.key}? The current password stops working.`, { okLabel: 'Issue new password' }))) return;
    const t = await mkTmp(); a.tmp = t.rec; a.pw = null; save(all().map(x => x.key === a.key ? a : x)); CV.log('Temporary password reset', a.key); await showTemp(a.key, t.pw, t.rec.exp);
  }
  async function delDemo(row) {
    const a = all().find(x => x.key === row.key); if (!a) return CVDialog.alert('Sample account', 'Sample accounts are read-only in this demo.', 'info');
    if (!(await CVDialog.confirm('Delete account', `Delete account ${a.key} (${a.name})? This cannot be undone.`, { danger: true, okLabel: 'Delete' }))) return;
    save(all().filter(x => x.key !== a.key)); CV.log('Account deleted', a.key); CVDialog.toast('Account deleted.', 'success');
  }

  // ---- Live mode (real server). Falls back to the demo functions above when the API is not reachable. ----
  const isLive = async () => { if (!window.CVApi) return false; await CVApi.ready; return CVApi.live; };
  const apiErr = e => CVDialog.alert('Could not complete the request', e.message || 'Request failed', 'error');
  const staff = row => row.type === 'Admin' || row.type === 'Encoder';
  async function create(pre) {
    if (!(await isLive())) return createDemo(pre);
    pre = pre || {};
    const v = await CVDialog.form({ title: pre.type === 'Paravet' ? 'Create Paravet account' : 'Add account', submitLabel: 'Create account', fields: [
      { k: 'type', label: 'Account type', type: 'select', options: ['Paravet', 'User'], value: pre.type || 'Paravet', req: true },
      { k: 'firstName', label: 'First name', req: true }, { k: 'middleName', label: 'Middle name (optional)' },
      { k: 'lastName', label: 'Last name', req: true }, { k: 'suffix', label: 'Suffix (optional)', placeholder: 'Jr., III' },
      { k: 'barangay', label: 'Barangay', type: 'barangay', req: true }, { k: 'mobile', label: 'Mobile number', type: 'tel', req: true, placeholder: '09XX-XXX-XXXX' }
    ], validate: v => /^09\d{2}[-\s]?\d{3}[-\s]?\d{4}$/.test(v.mobile) ? {} : { mobile: 'Use a PH mobile number like 0917-123-4567.' } });
    if (!v) return;
    try {
      const r = await CVApi.request('POST', '/accounts', { accountType: v.type, firstName: v.firstName, middleName: v.middleName || undefined, lastName: v.lastName, suffix: v.suffix || undefined, mobile: v.mobile, barangay: v.barangay });
      CVApi.refreshAccounts(); await showTemp(r.account.accountKey, r.temporaryPassword, Date.now() + r.expiresInMinutes * 60000);
    } catch (e) { apiErr(e); }
  }
  async function edit(row) {
    if (!(await isLive())) return editDemo(row);
    if (staff(row)) return CVDialog.alert('Staff account', 'Staff accounts are managed in the database, not here.', 'info');
    try {
      const a = (await CVApi.request('GET', '/accounts/' + encodeURIComponent(row.key))).account;
      const v = await CVDialog.form({ title: 'Edit account · ' + a.accountKey, fields: [
        { k: 'firstName', label: 'First name', req: true, value: a.firstName }, { k: 'middleName', label: 'Middle name (optional)', value: a.middleName || '' },
        { k: 'lastName', label: 'Last name', req: true, value: a.lastName }, { k: 'suffix', label: 'Suffix (optional)', value: a.suffix || '' },
        { k: 'barangay', label: 'Barangay', type: 'barangay', req: true, value: a.barangay ? a.barangay.name : '', hint: 'The account key does not change when the barangay is edited.' },
        { k: 'mobile', label: 'Mobile number', type: 'tel', req: true, value: a.mobile || '' }] });
      if (!v) return;
      await CVApi.request('PATCH', '/accounts/' + encodeURIComponent(a.accountKey), { firstName: v.firstName, middleName: v.middleName || null, lastName: v.lastName, suffix: v.suffix || null, barangay: v.barangay, mobile: v.mobile });
      CVApi.refreshAccounts(); CVDialog.toast('Account updated.', 'success');
    } catch (e) { apiErr(e); }
  }
  async function reset(row) {
    if (!(await isLive())) return resetDemo(row);
    if (staff(row)) return CVDialog.alert('Staff account', 'Temporary passwords are only for Paravet and User accounts.', 'info');
    if (!(await CVDialog.confirm('Reset password', `Issue a new temporary password for ${row.key}? The current password stops working.`, { okLabel: 'Issue new password' }))) return;
    try { const r = await CVApi.request('POST', '/accounts/' + encodeURIComponent(row.key) + '/reset-password', {}); CVApi.refreshAccounts(); await showTemp(row.key, r.temporaryPassword, Date.now() + r.expiresInMinutes * 60000); } catch (e) { apiErr(e); }
  }
  async function del(row) {
    if (!(await isLive())) return delDemo(row);
    if (staff(row)) return CVDialog.alert('Staff account', 'Staff accounts cannot be deleted here.', 'info');
    if (!(await CVDialog.confirm('Delete account', `Delete account ${row.key}? This cannot be undone.`, { danger: true, okLabel: 'Delete' }))) return;
    try { await CVApi.request('DELETE', '/accounts/' + encodeURIComponent(row.key)); CVApi.refreshAccounts(); CVDialog.toast('Account deleted.', 'success'); } catch (e) { apiErr(e); }
  }
  const actions = row => (window.CVApi && CVApi.live && staff(row)) ? [] : [{ label: 'Edit', fn: edit }, { label: 'Reset temporary password', fn: reset }, { label: 'Delete account', danger: true, fn: del }];
  return { all, save, publicRows, create, actions, hash, rnd, status, TTL, K };
})();
