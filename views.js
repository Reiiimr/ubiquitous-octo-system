(function () {
  'use strict';
  const D = CVData.D, esc = CVDialog.esc, $ = id => document.getElementById(id), TODAY = CVData.TODAY;
  window.addEventListener('cv-api-error', event => CVDialog.toast(event.detail, 'error'));
  const live = k => { const d = D[k], A = new Set(CVData.archAll()[d.base || k] || []); return d.rows.filter(x => !A.has(x.id)); };
  const det = o => `data-details="${esc(JSON.stringify(o))}"`;
  const MS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], ML = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const cnt = (rows, f) => rows.reduce((m, x) => { const k = f(x); m[k] = (m[k] || 0) + 1; return m; }, {});
  const link = (txt, o) => `<a href="#/details" class="more" ${det(o)}>${txt}</a>`;
  const bars = (items, max) => `<div class="bars">${items.map(b => `<button type="button" class="bar-col" ${det(b.d)} aria-label="${esc(b.lab)}: ${b.n}"><span class="bar-val">${b.n}</span><span class="bar-track"><span class="bar-fill" style="height:${max ? Math.max(3, Math.round(b.n * 100 / max)) : 0}%"></span></span><span class="bar-lab">${esc(b.lab)}</span></button>`).join('')}</div>`;
  const donut = (items, total) => { const C = 2 * Math.PI * 45; let off = 0; const arcs = items.map((it, i) => { const l = total ? it.n / total * C : 0, s = `<circle class="dn c${i + 1}" cx="60" cy="60" r="45" stroke-dasharray="${l} ${C - l}" stroke-dashoffset="${-off}"/>`; off += l; return s; }).join(''); return `<div class="donut-wrap"><svg viewBox="0 0 120 120" role="img" aria-label="Stub status overview"><circle class="dn-bg" cx="60" cy="60" r="45"/>${arcs}<text x="60" y="58" text-anchor="middle" class="dn-n">${total}</text><text x="60" y="73" text-anchor="middle" class="dn-l">stubs</text></svg><ul class="legend">${items.map((it, i) => `<li><i class="sw c${i + 1}"></i><span>${it.lab}</span><strong>${it.n}</strong><br/>${link('more details', it.d)}</li>`).join('')}</ul></div>`; };
  const statusItems = () => { const s = live('stubs'), c = cnt(s, x => x.status); return ['Completed', 'Attended', 'Registered', 'Issued'].map(k => ({ lab: k, n: c[k] || 0, d: { ds: 'stubs', f: { status: k }, title: `Stubs · ${k}` } })); };
  const monthItems = () => { const s = live('stubs'), ms = []; for (let m = 4; m <= 9; m++) ms.push(m); return ms.map(m => ({ lab: MS[m - 1], n: s.filter(x => x.date.slice(0, 7) === '2026-' + String(m).padStart(2, '0')).length, d: { ds: 'stubs', y: '2026', m: String(m).padStart(2, '0'), title: `Stubs · ${ML[m - 1]} 2026` } })); };
  const svcItems = () => ['Kapon', 'Anti-rabies', 'Microchip'].map(k => ({ lab: k, n: live('services').filter(x => x.service === k && x.outcome === 'Completed').length, d: { ds: 'services', f: { service: k, outcome: 'Completed' }, title: `Completed services · ${k}` } }));
  function funnel() {
    const st = [['Census animals', 'animals'], ['Willing respondents', 'willing'], ['Stubs issued', 'stubs'], ['Registered', 'fnReg'], ['Attended', 'fnAtt'], ['Completed', 'fnComp']].map(([l, k]) => ({ l, k, n: live(k).length })), mx = Math.max(...st.map(x => x.n), 1);
    return st.map(x => `<div class="fn"><div class="paravet-head"><span>${x.l}</span><span class="count">${x.n.toLocaleString()} <span class="muted">(${Math.round(x.n * 100 / mx)}%)</span></span></div><div class="bar"><span style="width:${x.n * 100 / mx}%"></span></div>${link('more details', { ds: x.k, title: x.l })}</div>`).join('');
  }
  function sources() { const o = live('owners'), c = cnt(o, x => x.source); return CV.SRC.map(s => `<div class="srow"><div><strong>${s}</strong><div class="muted">${Math.round((c[s] || 0) * 100 / (o.length || 1))}% of owner records</div></div><div class="srow-n"><strong>${c[s] || 0}</strong>${link('more details', { ds: 'owners', f: { source: s }, title: `Owners · ${s}` })}</div></div>`).join(''); }
  function paravetCard() { const p = live('paravets'), w = p.filter(x => x.acct === 'Registered account').length; return [['Paravets', p.length, {}], ['With an account', w, { acct: 'Registered account' }], ['Manual census only', p.length - w, { acct: 'Manual census' }], ['Census pending', p.filter(x => x.census === 'Pending').length, { census: 'Pending' }]].map(([l, n, f]) => `<div class="srow"><div><strong>${l}</strong></div><div class="srow-n"><strong>${n}</strong>${link('more details', { ds: 'paravets', f, title: 'Paravets · ' + l })}</div></div>`).join(''); }
  function programsTable() { const p = live('programs').slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6); return `<table><thead><tr><th>Program ID</th><th>Barangay</th><th>Program</th><th>Date</th><th>Slots left</th><th>Status</th></tr></thead><tbody>${p.map(x => `<tr><td><a href="#/details" ${det({ ds: 'programs', q: x.id, title: 'Program ' + x.id })}>${x.id}</a></td><td>${x.barangay}</td><td>${x.program}</td><td>${x.date}</td><td>${x.left}</td><td><span class="pill ${['Active', 'Approved', 'Scheduled', 'Completed'].includes(x.status) ? 'ok' : x.status === 'Cancelled' ? 'due' : ''}">${x.status}</span></td></tr>`).join('')}</tbody></table><p>${link('more details', { ds: 'programs', title: 'All programs' })}</p>`; }
  let cal = { y: 2026, m: 9 };
  function calendar() {
    const ev = {}; live('programs').forEach(p => { (ev[p.date] = ev[p.date] || []).push(p); });
    const first = new Date(cal.y, cal.m, 1), days = new Date(cal.y, cal.m + 1, 0).getDate(), pad = n => String(n).padStart(2, '0');
    $('calTitle').textContent = `${ML[cal.m]} ${cal.y}`;
    let h = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => `<span class="cal-h">${d}</span>`).join('') + '<span></span>'.repeat(first.getDay());
    for (let d = 1; d <= days; d++) { const k = `${cal.y}-${pad(cal.m + 1)}-${pad(d)}`, e = ev[k] || []; h += e.length ? `<button type="button" class="cal-d has${k === TODAY ? ' today' : ''}" ${det({ ds: 'programs', q: k, title: 'Programs on ' + k })} title="${esc(e.map(x => x.program + ' · ' + x.barangay).join('; '))}">${d}<i></i></button>` : `<span class="cal-d${k === TODAY ? ' today' : ''}">${d}</span>`; }
    $('calGrid').innerHTML = h;
    const up = live('programs').filter(p => p.date >= TODAY && p.status !== 'Cancelled').sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
    $('calUp').innerHTML = up.map(p => `<a class="up" href="#/details" ${det({ ds: 'programs', q: p.id, title: 'Program ' + p.id })}><strong>${p.program}</strong> · ${p.barangay}<br/><span class="muted">${p.date} · ${p.left} slots left</span></a>`).join('') || '<p class="muted">No upcoming programs.</p>';
  }
  function dash() {
    if (!$('dashFunnel')) return;
    const items = statusItems(); $('dashDonut').innerHTML = donut(items, items.reduce((a, b) => a + b.n, 0));
    const m = monthItems(); $('dashBars1').innerHTML = bars(m, Math.max(...m.map(x => x.n)));
    const s = svcItems(); $('dashBars2').innerHTML = bars(s, Math.max(...s.map(x => x.n)));
    $('dashSources').innerHTML = sources(); $('dashParavets').innerHTML = paravetCard(); $('dashFunnel').innerHTML = funnel(); $('dashPrograms').innerHTML = programsTable(); calendar();
  }
  $('calPrev') && $('calPrev').addEventListener('click', () => { cal.m--; if (cal.m < 0) { cal.m = 11; cal.y--; } calendar(); });
  $('calNext') && $('calNext').addEventListener('click', () => { cal.m++; if (cal.m > 11) { cal.m = 0; cal.y++; } calendar(); });
  $('dashSearch') && $('dashSearch').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.value.trim()) CVDetails.open({ ds: 'owners', q: e.target.value.trim(), title: `Owners matching “${e.target.value.trim()}”` }); });
  const tiles = (id, arr) => { const el = $(id); if (el) el.innerHTML = arr.map(([n, l]) => `<div class="stat"><div class="num">${n}</div><div class="label">${l}</div></div>`).join(''); };
  function programs() {
    const p = live('programs'), up = p.filter(x => ['Approved', 'Scheduled', 'Pending approval'].includes(x.status) && x.date >= TODAY);
    tiles('pgStats', [[p.length, 'Programs'], [up.length, 'Upcoming (approved, scheduled or pending)'], [p.filter(x => x.booked < 150 && !['Completed', 'Cancelled'].includes(x.status)).length, 'Below the 150-pet minimum'], [up.reduce((a, x) => a + x.left, 0), 'Slots still available']]);
  }
  async function newProgram() {
    const v = await CVDialog.form({ title: 'New program', submitLabel: 'Create program', fields: [
      { k: 'program', label: 'Program', type: 'select', options: ['Kapon', 'Anti-rabies', 'Microchip', 'All of the above'], req: true },
      { k: 'barangay', label: 'Barangay', type: 'barangay', req: true },
      { k: 'date', label: 'Program day / date', type: 'date', req: true, min: TODAY },
      { k: 'slots', label: 'Number of slots (total)', type: 'number', req: true, min: 1, max: 500, hint: '“All of the above” uses one total; each stub records which services the pet gets.' }],
      validate: v => { const e = {}; if (v.date && v.date < TODAY) e.date = 'Choose today or a future date.'; if (live('programs').some(p => p.barangay === CV.brFind(v.barangay) && p.date === v.date && p.status !== 'Cancelled')) e.barangay = 'This barangay already has a program on that date.'; return e; } });
    if (!v) return;
    const program = { id: 'PRG-' + (window.crypto && crypto.randomUUID ? crypto.randomUUID().slice(0, 8).toUpperCase() : String(Date.now()).slice(-8)), barangay: v.barangay, program: v.program, date: v.date, slots: +v.slots, booked: 0, status: 'Scheduled', paravet: '—' };
    if (CVApi.live) await CVApi.saveRecords('programs', [program]);
    else { const x = CVData.ext(); x.programs = x.programs || []; x.programs.unshift(program); CV.write('cityvet.extra', x); }
    CV.log('Program created', `${v.program} · ${v.barangay} · ${v.date} · ${v.slots} slots`); CV.notify({ title: 'Program scheduled', body: `${v.program} in ${v.barangay} on ${v.date} (${v.slots} slots).`, detail: `A new program was added to the calendar with ${v.slots} total slots. Slots left will update as stubs are assigned.`, link: '#/programs', from: 'Programs' });
    CVDialog.toast('Program created. The calendar and slots were updated.', 'success'); window.dispatchEvent(new Event('cv-data'));
  }
  $('newProgram') && $('newProgram').addEventListener('click', () => newProgram().catch(e => CVDialog.toast(e.message, 'error')));
  const STEPS = ['Registration', 'Anesthetic', 'Clean up', 'Surgery', 'Recovery', 'Completed'];
  function programDay() {
    if (!$('pdInfo')) return;
    const ap = live('programs').find(p => p.status === 'Active'), pt = live('participants');
    if (!ap) { $('pdInfo').innerHTML = '<p class="muted">No program is currently active.</p>'; return; }
    const c = cnt(pt, x => x.stage), present = pt.length - (c['Not yet arrived'] || 0), prog = ['Registration', 'Anesthetic', 'Clean up', 'Surgery', 'Recovery'].reduce((a, k) => a + (c[k] || 0), 0);
    $('pdInfo').innerHTML = `<div class="pd-title"><div><span class="pill ok">Active</span> <strong>${ap.program}</strong> · Barangay ${ap.barangay}<div class="muted">${ap.date} · Paravet ${ap.paravet} · Sample ongoing program</div></div></div><div class="pd-steps">${STEPS.map((s, i) => `<a class="pd-step" href="#/details" ${det({ ds: 'participants', f: { stage: s }, title: 'Participants · ' + s })}><span class="pd-n">${i + 1}</span><strong>${s}</strong><span class="muted">${c[s] || 0} pets</span></a>`).join('')}</div>`;
    tiles('pdStats', [[ap.slots, 'Capacity'], [ap.booked, 'Expected (pet list)'], [present, 'Present'], [prog, 'In progress'], [c['Completed'] || 0, 'Completed'], [c['Incomplete'] || 0, 'Incomplete']]);
    $('pdView').dataset.details = JSON.stringify({ ds: 'participants', title: `Program day · ${ap.program} · ${ap.barangay}`, sub: 'Every participant of the current program day' });
  }
  async function newStub() {
    const pv = D.paravets.rows.map(p => p.name);
    const v = await CVDialog.form({ title: 'Record physical stub', submitLabel: 'Record stub', fields: [
      { k: 'paravet', label: 'Paravet', type: 'select', options: pv, req: true }, { k: 'barangay', label: 'Barangay', type: 'barangay', req: true },
      { k: 'owner', label: 'Owner name', req: true, placeholder: 'Last, First' }, { k: 'mobile', label: 'Mobile number', type: 'tel', req: true, placeholder: '09XX-XXX-XXXX' },
      { k: 'pet', label: 'Pet name', req: true }, { k: 'species', label: 'Species', type: 'select', options: ['Dog', 'Cat'], req: true },
      { k: 'sex', label: 'Sex', type: 'select', options: ['Male', 'Female'], req: true }, { k: 'age', label: 'Age (years)', type: 'number', min: 0, max: 30, req: true },
      { k: 'program', label: 'Program', type: 'select', options: ['Kapon', 'Anti-rabies', 'Microchip', 'All of the above'], req: true }, { k: 'date', label: 'Date issued', type: 'date', req: true, value: TODAY }],
      note: 'One physical stub per pet. The Paravet provides the paper copy; the owner signs it on program day.',
      validate: v => /^09\d{2}-?\d{3}-?\d{4}$/.test(v.mobile.replace(/\s/g, '')) ? {} : { mobile: 'Use a PH mobile number like 0917-123-4567.' } });
    if (!v) return;
    const x = CVData.ext(); x.stubs = x.stubs || []; const id = 'PS-2026-' + String(Date.now()).slice(-5);
    const stub = { id, type: 'Physical · 1 per pet', owner: v.owner, pets: v.pet, barangay: v.barangay, program: v.program, source: 'Paravet pre-listing', status: 'Issued', date: v.date, paravet: v.paravet, mobile: v.mobile, species: v.species, sex: v.sex, age: +v.age };
    if (CVApi.live) await CVApi.saveRecords('stubs', [stub]);
    else { x.stubs.unshift(stub); CV.write('cityvet.extra', x); }
    CV.log('Physical stub recorded', `${id} · ${v.owner} · ${v.pet}`); CVDialog.toast(`Stub ${id} recorded.`, 'success'); window.dispatchEvent(new Event('cv-data'));
  }
  $('newStub') && $('newStub').addEventListener('click', () => newStub().catch(e => CVDialog.toast(e.message, 'error')));
  function stubs() { const s = live('stubs'); tiles('stStats', [[s.length, 'Stubs issued'], [s.filter(x => x.type.startsWith('Digital')).length, 'Digital (one per owner, many pets)'], [s.filter(x => x.type.startsWith('Physical')).length, 'Physical (one per pet)'], [s.filter(x => x.status !== 'Issued').length, 'Registered or further']]); }
  function pvs() { const p = live('paravets'), w = p.filter(x => x.acct === 'Registered account').length; tiles('pvStats', [[p.length, 'Paravets'], [w, 'With an account'], [p.length - w, 'Manual census only'], [p.filter(x => x.census === 'Pending').length, 'Census summary pending']]); const a = live('accounts'); tiles('acStats', [[a.length, 'Accounts'], [a.filter(x => x.type === 'Paravet').length, 'Paravet accounts'], [a.filter(x => x.type === 'User').length, 'User accounts'], [a.filter(x => /Temporary/.test(x.status)).length, 'Awaiting first sign-in']]); }
  $('newParavetAcct') && $('newParavetAcct').addEventListener('click', () => CVAccounts.create({ type: 'Paravet' }));
  $('newAccount') && $('newAccount').addEventListener('click', () => CVAccounts.create({}));
  // Reports
  const MET = { stubs: ['Stub registrations', () => live('stubs')], services: ['Completed services', () => live('services').filter(x => x.outcome === 'Completed')], animals: ['Census animals', () => live('animals')], pets: ['Pets registered', () => live('pets').filter(x => x.status === 'Registered')], owners: ['Owners', () => live('owners')] };
  const MF = { stubs: {}, services: { outcome: 'Completed' }, animals: {}, pets: { status: 'Registered' }, owners: {} };
  const per = (y, m) => y + (m ? '-' + m : '');
  function reports() {
    if (!$('rpMetric')) return;
    const k = $('rpMetric').value, mode = $('rpMode').value, bg = CV.brFind($('rpBrg').value) || '';
    $('rpA_m').hidden = $('rpB_m').hidden = mode !== 'month';
    const pa = per($('rpA_y').value, mode === 'month' ? $('rpA_m').value : ''), pb = per($('rpB_y').value, mode === 'month' ? $('rpB_m').value : '');
    const base = MET[k][1]().filter(x => !bg || x.barangay === bg), A = base.filter(x => x.date.startsWith(pa)), B = base.filter(x => x.date.startsWith(pb));
    const d = B.length - A.length, pct = A.length ? Math.round(d * 100 / A.length) : 0, ps = p => p.length === 4 ? p : `${ML[+p.slice(5) - 1]} ${p.slice(0, 4)}`;
    const dd = (p, n) => ({ ds: k === 'stubs' ? 'stubs' : k, f: Object.assign({}, MF[k], bg ? { barangay: bg } : {}), y: p.slice(0, 4), m: p.slice(5) || '', title: `${MET[k][0]} · ${ps(p)}` });
    const mx = Math.max(A.length, B.length, 1);
    const by = {}; A.forEach(x => { (by[x.barangay] = by[x.barangay] || [0, 0])[0]++; }); B.forEach(x => { (by[x.barangay] = by[x.barangay] || [0, 0])[1]++; });
    const rows = Object.entries(by).sort((a, b) => b[1][0] + b[1][1] - a[1][0] - a[1][1]).slice(0, 12);
    $('rpCmp').innerHTML = `<div class="cmp"><a class="cmp-col" href="#/details" ${det(dd(pa))}><span class="muted">${ps(pa)}</span><strong>${A.length.toLocaleString()}</strong><span class="bar-track h"><span class="bar-fill" style="width:${A.length * 100 / mx}%"></span></span></a><a class="cmp-col" href="#/details" ${det(dd(pb))}><span class="muted">${ps(pb)}</span><strong>${B.length.toLocaleString()}</strong><span class="bar-track h"><span class="bar-fill alt" style="width:${B.length * 100 / mx}%"></span></span></a><div class="cmp-d ${d >= 0 ? 'up' : 'down'}"><span class="muted">Change</span><strong>${d >= 0 ? '+' : ''}${d} (${d >= 0 ? '+' : ''}${pct}%)</strong></div></div><div class="table-wrap"><table><thead><tr><th>Barangay</th><th>${ps(pa)}</th><th>${ps(pb)}</th><th>Change</th></tr></thead><tbody>${rows.map(([b, v]) => `<tr><td><a href="#/details" ${det(Object.assign(dd(pa), { f: Object.assign({}, MF[k], { barangay: b }) }))}>${esc(b)}</a></td><td>${v[0]}</td><td>${v[1]}</td><td>${v[1] - v[0] >= 0 ? '+' : ''}${v[1] - v[0]}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">No records in these periods.</td></tr>'}</tbody></table></div>`;
    tiles('rpStats', Object.entries(MET).map(([kk, v]) => [v[1]().length.toLocaleString(), `<a href="#/details" ${det({ ds: kk === 'stubs' ? 'stubs' : kk, f: MF[kk], title: v[0] })}>${v[0]}</a>`]));
    const it = statusItems(); $('rpDonut').innerHTML = donut(it, it.reduce((a, b) => a + b.n, 0)); const m = monthItems(); $('rpBars').innerHTML = bars(m, Math.max(...m.map(x => x.n)));
    const bk = CV.read('cityvet.basket', []); $('rpBasket').innerHTML = bk.length ? `<table><thead><tr><th>Dataset</th><th>Record</th><th>Label</th><th class="noprint"></th></tr></thead><tbody>${bk.map((b, i) => `<tr><td>${esc(b.kind)}</td><td>${esc(b.id)}</td><td>${esc(b.label)}</td><td class="noprint"><button class="cv-btn" data-rm="${i}">Remove</button></td></tr>`).join('')}</tbody></table>` : '<p class="muted">No records selected yet. Tick records in any list and choose “Use for report”.</p>';
    $('rpDate').textContent = new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'long', timeStyle: 'short' });
  }
  function initReports() {
    if (!$('rpMetric')) return;
    $('rpMetric').innerHTML = Object.entries(MET).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('');
    const ys = ['2026', '2025'], opt = a => a.map(y => `<option>${y}</option>`).join(''), mo = ML.map((m, i) => `<option value="${String(i + 1).padStart(2, '0')}">${m}</option>`).join('');
    ['rpA_y', 'rpB_y'].forEach((id, i) => { $(id).innerHTML = opt(ys); $(id).value = ys[i]; }); ['rpA_m', 'rpB_m'].forEach((id, i) => { $(id).innerHTML = mo; $(id).value = i ? '09' : '08'; });
    document.querySelectorAll('#rpControls select,#rpControls input').forEach(e => e.addEventListener('change', reports));
    $('rpPrint').addEventListener('click', () => window.print());
    $('rpClear').addEventListener('click', async () => { if (await CVDialog.confirm('Clear basket', 'Remove all records from the report basket?', { danger: true, okLabel: 'Clear' })) { CV.write('cityvet.basket', []); reports(); } });
    $('rpCsv').addEventListener('click', () => { const bk = CV.read('cityvet.basket', []); const t = ['Dataset,Record,Label', ...bk.map(b => [b.kind, b.id, b.label].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\r\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + t], { type: 'text/csv' })); a.download = 'report-basket.csv'; a.click(); URL.revokeObjectURL(a.href); });
    $('rpBasket').addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (!b) return; const bk = CV.read('cityvet.basket', []); bk.splice(+b.dataset.rm, 1); CV.write('cityvet.basket', bk); reports(); });
  }
  // Data quality
  function dq() {
    if (!$('dqIssues')) return;
    const iss = [['Possible duplicate owners', 'dupOwners', 'Same name in the same barangay', 'Review and merge by hand'], ['Owners missing a mobile number', 'noMobile', 'Contact needed for reminders', 'Ask the Paravet to confirm'], ['Pets missing an age', 'noAge', 'Needed for the 3-month anti-rabies rule', 'Complete at registration'], ['Pets with an unusual age', 'oddAge', 'Over 20 years', 'Verify with the owner']];
    $('dqIssues').innerHTML = `<table><thead><tr><th>Issue</th><th>Records</th><th>Why it matters</th><th>Suggested action</th><th></th></tr></thead><tbody>${iss.map(([t, k, w, a]) => `<tr><td>${t}</td><td>${live(k).length}</td><td>${w}</td><td>${a}</td><td>${link('more details', { ds: k, title: t })}</td></tr>`).join('')}</tbody></table>`;
    const ar = CVData.archAll(), na = Object.values(ar).reduce((a, b) => a + b.length, 0), lb = CV.read('cityvet.lastBackup', null), rp = CV.read('cityvet.restorepoint', null);
    tiles('dqStats', [[iss.reduce((a, [, k]) => a + live(k).length, 0), 'Records needing review'], [live('unregistered').length, 'Unregistered respondents'], [na, 'Archived records'], [lb ? new Date(lb).toLocaleDateString('en-PH') : 'Never', 'Last backup']]);
    $('dqRestore').disabled = !rp; $('dqRestoreInfo').textContent = rp ? `Restore point from ${new Date(rp.t).toLocaleString('en-PH')} (${rp.label}).` : 'No restore point yet. One is saved automatically before every import.';
  }
  $('dqRestore') && $('dqRestore').addEventListener('click', async () => { const rp = CV.read('cityvet.restorepoint', null); if (!rp || !(await CVDialog.confirm('Undo last import', 'Return imported and edited records to the state before the last import?', { danger: true, okLabel: 'Undo import' }))) return; try { if (rp.remote) await CVApi.undoImport(rp.dataset, rp.batchId); else { CV.write('cityvet.extra', rp.extra); CV.write('cityvet.overrides', rp.overrides); CV.write('cityvet.archived', rp.archived); } localStorage.removeItem('cityvet.restorepoint'); CV.log('Undo import', rp.label); CVDialog.toast('Previous state restored.', 'success'); window.dispatchEvent(new Event('cv-data')); } catch (e) { CVDialog.toast(e.message, 'error'); } });
  // Backup
  const EXC = ['cityvet.theme', 'cityvet.prototype.demoAccount', 'cityvet.importDs'];
  const sha = async t => crypto.subtle ? [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map(x => x.toString(16).padStart(2, '0')).join('') : '';
  const dl = (name, text, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); URL.revokeObjectURL(a.href); };
  $('bkExport') && $('bkExport').addEventListener('click', async () => {
    const keys = {}; Object.keys(localStorage).filter(k => k.startsWith('cityvet.') && !EXC.includes(k)).forEach(k => keys[k] = localStorage.getItem(k));
    const body = JSON.stringify(keys), pack = { app: 'cityvet-ekapon', version: 5, created: new Date().toISOString(), entries: Object.keys(keys).length, sha256: await sha(body), keys };
    CV.write('cityvet.lastBackup', pack.created); CV.log('Backup exported', `${pack.entries} entries`); dl(`cityvet-backup-${pack.created.slice(0, 16).replace(/[-:T]/g, '')}.json`, JSON.stringify(pack), 'application/json'); CVDialog.toast('Backup file downloaded.', 'success'); $('bkInfo').textContent = `Last backup: ${new Date(pack.created).toLocaleString('en-PH')}`;
  });
  let bad = 0;
  $('bkRestore') && $('bkRestore').addEventListener('click', async () => {
    const f = $('bkFile').files[0], acc = CV.read('cityvet.prototype.demoAccount', {}) || {};
    if (!f) return CVDialog.alert('Choose a backup file', 'Select a backup file exported from Admin settings.', 'error');
    if (bad >= 3) return CVDialog.alert('Restore locked', 'Too many wrong passwords. Reload the page to try again.', 'error');
    if ($('bkPw').value !== acc.password) { bad++; return CVDialog.alert('Incorrect password', `Retype the admin password to restore a backup. ${3 - bad} attempt${3 - bad === 1 ? '' : 's'} left.`, 'error'); }
    let pack; try { pack = JSON.parse(await f.text()); } catch (e) { return CVDialog.alert('Invalid file', 'This file is not a readable backup.', 'error'); }
    if (pack.app !== 'cityvet-ekapon' || !pack.keys) return CVDialog.alert('Invalid backup', 'This file was not exported by this system.', 'error');
    const h = await sha(JSON.stringify(pack.keys)); if (h && pack.sha256 && h !== pack.sha256) return CVDialog.alert('Backup is damaged', 'The file checksum does not match. It may have been edited or corrupted, so it was not restored.', 'error');
    if (!(await CVDialog.confirm('Restore backup', `This replaces all current progress with the backup from ${new Date(pack.created).toLocaleString('en-PH')} (${pack.entries} entries). The website will restart.`, { danger: true, okLabel: 'Restore and restart' }))) return;
    Object.keys(localStorage).filter(k => k.startsWith('cityvet.') && !EXC.includes(k)).forEach(k => localStorage.removeItem(k)); Object.entries(pack.keys).forEach(([k, v]) => localStorage.setItem(k, v));
    CV.log('Backup restored', pack.created); await CVDialog.open({ title: 'Restarting', kind: 'success', html: '<p>Backup restored. The website will restart now.</p>', actions: [{ label: 'Restart now', primary: true, value: 1 }] }); location.reload();
  });
  const bi = $('bkInfo'); if (bi) { const lb = CV.read('cityvet.lastBackup', null); bi.textContent = lb ? `Last backup: ${new Date(lb).toLocaleString('en-PH')}` : 'No backup has been exported yet.'; }
  function all() { dash(); programs(); programDay(); stubs(); pvs(); reports(); dq(); }
  const vis = id => $(id) && $(id).offsetParent !== null; let dirty = true;
  const run = () => { dirty = false; all(); };
  initReports(); run();
  ['cv-data', 'storage', 'cv-basket'].forEach(ev => window.addEventListener(ev, () => { if (document.hidden === false) run(); }));
  window.addEventListener('cv-show', () => { if (dirty) run(); });
})();
