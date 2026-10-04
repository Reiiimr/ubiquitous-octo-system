(function () {
  'use strict';
  const BR = CV.BR, SRC = CV.SRC, esc = CVDialog.esc, TODAY = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  const FN = ['Alex', 'Bea', 'Carlo', 'Dani', 'Elena', 'Francis', 'Gia', 'Hana', 'Ivan', 'Jamie', 'Kai', 'Lara', 'Marco', 'Nina', 'Paolo', 'Rosa', 'Sam', 'Tina', 'Vince', 'Yna'];
  const LN = ['Aguilar', 'Bautista', 'Castillo', 'Dela Cruz', 'Flores', 'Garcia', 'Lopez', 'Mendoza', 'Navarro', 'Reyes', 'Santiago', 'Torres', 'Valdez', 'Marasigan', 'Santos'];
  const PN = ['Bantay', 'Mochi', 'Buddy', 'Whiskers', 'Luna', 'Tom', 'Coco', 'Pepper', 'Nala', 'Puti', 'Brownie', 'Mingming', 'Kiko', 'Max', 'Bella'];
  let seed = 11;
  const r = n => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) >> 8) % n;
  const pick = a => a[r(a.length)], pad = (n, l) => String(n).padStart(l, '0');
  const person = () => `${pick(LN)}, ${pick(FN)}`, mobile = () => `09${pad(r(100), 2)}-${pad(r(1000), 3)}-${pad(r(10000), 4)}`;
  const dt = () => { const y = 2025 + r(2), m = 1 + r(y === 2026 ? 9 : 12); return `${y}-${pad(m, 2)}-${pad(1 + r(28), 2)}`; };
  const wpick = (a, w) => { let x = r(100), s = 0; for (let i = 0; i < a.length; i++) { s += w[i]; if (x < s) return a[i]; } return a[a.length - 1]; };
  const owners0 = []; for (let i = 0; i < 600; i++) { const d = i > 0 && i % 37 === 0; owners0.push({ id: 'OWN-' + pad(i + 1, 4), name: d ? owners0[i - 1].name : person(), barangay: d ? owners0[i - 1].barangay : pick(BR), mobile: r(100) < 6 ? '' : mobile(), pets: 1 + r(3), status: r(10) < 7 ? 'Registered' : 'Unregistered', source: pick(SRC), date: dt() }); }
  const pets0 = Array.from({ length: 900 }, (_, i) => { const o = owners0[r(owners0.length)]; return { id: 'PET-' + pad(i + 1, 4), name: pick(PN), species: r(10) < 5 ? 'Dog' : 'Cat', sex: pick(['Male', 'Female']), age: r(100) < 4 ? '' : (r(100) < 2 ? 25 : +(0.3 + r(90) / 10).toFixed(1)), owner: o.name, barangay: o.barangay, status: o.status, sterilized: pick(['Yes', 'No', 'No', 'Scheduled']), rabies: pick(['Up to date', 'Due soon', 'Not vaccinated']), source: o.source, date: dt() }; });
  const para0 = Array.from({ length: 21 }, (_, i) => { const m = i >= 18; return { id: 'PV-' + pad(i + 1, 3), name: person(), type: m ? 'Mobile Paravet' : 'Barangay Paravet', barangay: m ? 'All (rotating)' : BR[(i * 3) % 62], mobile: mobile(), census: r(10) < 8 ? 'Submitted' : 'Pending', animals: 60 + r(240), date: dt() }; });
  const resp0 = Array.from({ length: 900 }, (_, i) => ({ id: 'RSP-' + pad(i + 1, 4), name: person(), barangay: pick(BR), animals: 1 + r(4), condition: pick(['Vaccinated', 'Caged', 'Tied', 'Free', 'Stray']), interest: wpick(['Willing', 'Undecided', 'Not interested'], [38, 27, 35]), source: pick(SRC), registered: r(10) < 5, date: dt() }));
  const hh0 = Array.from({ length: 600 }, (_, i) => ({ id: 'HH-' + pad(i + 1, 4), name: person(), barangay: pick(BR), paravet: pick(para0.slice(0, 18)).name, animals: r(5), source: pick(['Paravet census', 'Paravet census', 'Paravet pre-listing']), date: dt() }));
  const anm0 = Array.from({ length: 1400 }, (_, i) => ({ id: 'ANM-' + pad(i + 1, 4), species: r(10) < 5 ? 'Dog' : 'Cat', sex: pick(['Male', 'Female']), condition: pick(['Vaccinated', 'Caged', 'Tied', 'Free', 'Stray']), owner: pick(resp0).name, barangay: pick(BR), source: pick(SRC), date: dt() }));
  const PRGS = ['Kapon', 'Anti-rabies', 'Microchip', 'All of the above'];
  const stubs0 = Array.from({ length: 300 }, (_, i) => { const d = r(10) < 4, o = pick(owners0); return { id: (d ? 'DS-' : 'PS-') + '2026-' + pad(i + 1, 4), type: d ? 'Digital · 1 per owner' : 'Physical · 1 per pet', owner: o.name, pets: d && r(2) ? pick(PN) + ', ' + pick(PN) : pick(PN), barangay: o.barangay, program: wpick(PRGS, [60, 15, 5, 20]), source: d ? wpick(['User pre-listing', 'Paravet pre-listing'], [60, 40]) : 'Paravet pre-listing', status: wpick(['Issued', 'Registered', 'Attended', 'Completed'], [30, 20, 20, 30]), date: dt() }; });
  const svc0 = Array.from({ length: 700 }, (_, i) => ({ id: 'SV-' + pad(i + 1, 4), date: dt(), barangay: pick(BR), owner: person(), pet: pick(PN), species: r(10) < 5 ? 'Dog' : 'Cat', service: wpick(['Kapon', 'Anti-rabies', 'Microchip'], [35, 40, 25]), outcome: r(100) < 5 ? 'Incomplete' : 'Completed' }));
  const STAGES = ['Not yet arrived', 'Registration', 'Anesthetic', 'Clean up', 'Surgery', 'Recovery', 'Completed', 'Incomplete'];
  const prt0 = Array.from({ length: 120 }, (_, i) => ({ id: (i % 3 ? 'PS-' : 'DS-') + 'MZ-' + pad(101 + i, 4), owner: person(), mobile: mobile(), pet: pick(PN), species: r(10) < 4 ? 'Dog' : 'Cat', sex: pick(['Male', 'Female']), age: +(0.5 + r(80) / 10).toFixed(1), service: wpick(['Kapon', 'Kapon + Anti-rabies + Microchip'], [30, 70]), source: i % 3 ? 'Paravet pre-listing' : 'User pre-listing', stage: wpick(STAGES, [12, 8, 8, 8, 10, 14, 36, 4]), date: TODAY }));
  const prg0 = [['PRG-001', 'Graceville', 'Kapon', '2026-09-26', 180, 171, 'Completed', 'R. Pascual'], ['PRG-002', 'Muzon Proper', 'All of the above', TODAY, 200, 184, 'Active', 'A. Ramos'], ['PRG-003', 'San Isidro', 'Kapon', '2026-10-24', 180, 162, 'Approved', 'L. Dizon'], ['PRG-004', 'San Rafael III', 'All of the above', '2026-11-07', 160, 143, 'Pending approval', 'R. Pascual'], ['PRG-005', 'Tungkong Mangga', 'Anti-rabies', '2026-11-14', 200, 196, 'Approved', 'M. Salonga'], ['PRG-006', 'Gaya-Gaya', 'Kapon', '2026-12-05', 150, 31, 'Draft', 'C. Bernardo'], ['PRG-007', 'Citrus', 'Microchip', '2026-10-10', 120, 120, 'Scheduled', 'J. Villanueva'], ['PRG-008', 'Fatima III', 'Kapon', '2026-09-12', 150, 150, 'Completed', 'D. Cruz'], ['PRG-009', 'Minuyan Proper', 'Kapon', '2026-08-29', 160, 60, 'Cancelled', 'E. Reyes']].map(p => ({ id: p[0], barangay: p[1], program: p[2], date: p[3], slots: p[4], booked: p[5], status: p[6], paravet: p[7] }));
  const brg0 = CV.BRX.map((b, i) => { const p = 40 + r(180); return { id: 'BRG-' + pad(i + 1, 2), name: b.name, ac: b.ac, district: b.district, zip: b.zip, paravets: 2 + r(2), pets: p, animals: p + r(120), date: dt() }; });
  // persistence layer
  const ov = () => CV.read('cityvet.overrides', {}), ext = () => CV.read('cityvet.extra', {}), archAll = () => window.CVApi && CVApi.live && CVApi.dataReady ? CVApi.archived() : CV.read('cityvet.archived', {});
  const withOv = (k, rows) => { const o = ov()[k]; return o ? rows.map(x => o[x.id] ? Object.assign({}, x, o[x.id]) : x) : rows; };
  const imp = (k, base) => window.CVApi && CVApi.live ? (CVApi.dataReady ? CVApi.records(k) : []) : [...(ext()[k] || []), ...withOv(k, base)];
  const pl = () => window.CVApi && CVApi.live ? (CVApi.dataReady ? CVApi.prelistings() : []) : CV.read('cityvet.prelistings', []);
  const plOwners = () => pl().map(x => ({ id: 'OWN-' + x.ref.replace(/[^A-Za-z0-9]/g, ''), name: x.owner, barangay: x.barangay, mobile: x.mobile, pets: x.pets.length, status: 'Unregistered', source: 'User pre-listing', date: x.date }));
  const plPets = () => pl().flatMap(x => x.pets.map((p, i) => ({ id: 'PET-' + x.ref.replace(/[^A-Za-z0-9]/g, '') + '-' + String(i + 1).padStart(2, '0'), name: p.name, species: p.species, sex: p.sex, age: p.age, owner: x.owner, barangay: x.barangay, status: 'Unregistered', sterilized: 'No', rabies: 'Not vaccinated', source: 'User pre-listing', date: x.date })));
  const plStubs = () => pl().map(x => ({ id: x.ref, type: 'Digital · 1 per owner', owner: x.owner, pets: x.pets.map(p => p.name).join(', '), barangay: x.barangay, program: x.program, source: 'User pre-listing', status: 'Issued', date: x.date }));
  const seedAcc = () => para0.slice(0, 8).map((p, i) => { const b = CV.brInfo(p.barangay); return { key: `PV2026-${b.ac}P001-${b.zip}`, type: 'Paravet', name: p.name, barangay: p.barangay, mobile: p.mobile, status: 'Active', created: '2026-0' + (1 + i % 9) + '-1' + i, linked: p.id }; });
  const accRows = () => (window.CVApi && CVApi.live ? CVApi.accounts() : [...(window.CVAccounts ? CVAccounts.publicRows() : []), ...seedAcc()]).map(a => ({ id: window.CVApi && CVApi.live ? a.id : a.key, key: a.key, type: a.type, name: a.name, barangay: a.barangay, mobile: a.mobile, status: a.status, created: a.created, date: a.created, linked: a.linked || '—' }));
  const paraRows = () => { const acc = accRows(); return imp('paravets', para0).map(p => { const a = acc.find(x => x.linked === p.id); return Object.assign({}, p, { account: p.account || (a ? a.key : '—'), acct: p.acct || (a ? 'Registered account' : 'Manual census') }); }); };
  const ownersAll = () => [...plOwners(), ...imp('owners', owners0)], petsAll = () => [...plPets(), ...imp('pets', pets0)], respAll = () => imp('respondents', resp0);
  const stubsAll = () => [...plStubs(), ...imp('stubs', stubs0)], prgAll = () => imp('programs', prg0).map(p => Object.assign({}, p, { left: p.slots - p.booked, ready: p.booked >= 150 ? 'Ready' : 'Below 150' }));
  const log = () => window.CVApi && CVApi.live ? (CVApi.dataReady ? CVApi.activity() : []) : CV.read('cityvet.log', []);
  const C = { src: ['source', 'Source'], dt: l => ['date', l] };
  const D = {};
  const def = (k, label, rows, cols, filters, extra) => { D[k] = Object.assign({ label, get rows() { return rows(); }, cols, filters }, extra); };
  const OC = [['id', 'Owner ID'], ['name', 'Name'], ['barangay', 'Barangay'], ['mobile', 'Mobile'], ['pets', 'Pets', 'n'], ['status', 'Registration'], C.src, C.dt('Date registered')];
  def('owners', 'Owners', ownersAll, OC, ['barangay', 'status', 'source'], { importable: 1 });
  def('pets', 'Pets', petsAll, [['id', 'Pet ID'], ['name', 'Name'], ['species', 'Species'], ['sex', 'Sex'], ['age', 'Age (yrs)', 'n'], ['owner', 'Owner'], ['barangay', 'Barangay'], ['status', 'Registration'], ['sterilized', 'Sterilized'], ['rabies', 'Anti-rabies'], C.src, C.dt('Date registered')], ['species', 'sex', 'barangay', 'status', 'sterilized', 'rabies', 'source'], { importable: 1 });
  def('paravets', 'Paravets', paraRows, [['id', 'ID'], ['name', 'Name'], ['type', 'Type'], ['barangay', 'Barangay'], ['mobile', 'Mobile'], ['acct', 'Account'], ['account', 'Account key'], ['census', 'Census summary'], ['animals', 'Animals recorded', 'n'], C.dt('Date submitted')], ['type', 'barangay', 'acct', 'census'], { importable: 1 });
  const RC = [['id', 'Ref'], ['name', 'Respondent'], ['barangay', 'Barangay'], ['animals', 'Animals', 'n'], ['condition', 'Animal condition'], ['interest', 'Program interest'], C.src, C.dt('Census date')], RF = ['barangay', 'condition', 'interest', 'source'];
  def('unregistered', 'Unregistered', () => respAll().filter(x => !x.registered), RC, RF, { base: 'respondents' });
  def('respondents', 'Respondents', respAll, RC, RF, { importable: 1 });
  def('willing', 'Willing', () => respAll().filter(x => x.interest === 'Willing'), RC, RF, { base: 'respondents' });
  def('undecided', 'Undecided', () => respAll().filter(x => x.interest === 'Undecided'), RC, RF, { base: 'respondents' });
  def('notint', 'Not interested', () => respAll().filter(x => x.interest === 'Not interested'), RC, RF, { base: 'respondents' });
  def('households', 'Households visited', () => imp('households', hh0), [['id', 'Ref'], ['name', 'Household head'], ['barangay', 'Barangay'], ['paravet', 'Paravet'], ['animals', 'Animals', 'n'], C.src, C.dt('Visit date')], ['barangay', 'paravet', 'source']);
  def('animals', 'Animals recorded', () => imp('animals', anm0), [['id', 'Ref'], ['species', 'Species'], ['sex', 'Sex'], ['condition', 'Condition'], ['owner', 'Owner'], ['barangay', 'Barangay'], C.src, C.dt('Census date')], ['species', 'sex', 'condition', 'barangay', 'source']);
  const SC = [['id', 'Stub ref'], ['type', 'Type'], ['owner', 'Owner'], ['pets', 'Pet(s)'], ['barangay', 'Barangay'], ['program', 'Program'], C.src, ['status', 'Status'], C.dt('Date issued')], SF = ['type', 'program', 'barangay', 'source', 'status'];
  def('stubs', 'Stubs', stubsAll, SC, SF);
  def('fnReg', 'Registered stubs', () => stubsAll().filter(x => x.status !== 'Issued'), SC, SF, { base: 'stubs' });
  def('fnAtt', 'Attended stubs', () => stubsAll().filter(x => x.status === 'Attended' || x.status === 'Completed'), SC, SF, { base: 'stubs' });
  def('fnComp', 'Completed stubs', () => stubsAll().filter(x => x.status === 'Completed'), SC, SF, { base: 'stubs' });
  const VC = [['id', 'Record'], ['date', 'Date'], ['barangay', 'Barangay'], ['owner', 'Owner'], ['pet', 'Pet'], ['species', 'Species'], ['service', 'Service'], ['outcome', 'Outcome']], VF = ['service', 'outcome', 'species', 'barangay'];
  def('services', 'Services', () => imp('services', svc0), VC, VF);
  ['Kapon', 'Anti-rabies', 'Microchip'].forEach(s => def('sv' + s, s, () => D.services.rows.filter(x => x.service === s), VC, VF, { base: 'services' }));
  def('svInc', 'Incomplete outcomes', () => D.services.rows.filter(x => x.outcome === 'Incomplete'), VC, VF, { base: 'services' });
  def('programs', 'Programs', prgAll, [['id', 'Program ID'], ['barangay', 'Barangay'], ['program', 'Program'], C.dt('Program date'), ['slots', 'Slots', 'n'], ['booked', 'Booked', 'n'], ['left', 'Slots left', 'n'], ['ready', 'Readiness'], ['status', 'Status'], ['paravet', 'Paravet']], ['program', 'barangay', 'status', 'ready']);
  def('participants', 'Program-day participants', () => imp('participants', prt0), [['id', 'Stub ref'], ['owner', 'Owner'], ['mobile', 'Mobile'], ['pet', 'Pet'], ['species', 'Species'], ['sex', 'Sex'], ['age', 'Age (yrs)', 'n'], ['service', 'Services'], ['source', 'Source'], ['stage', 'Stage'], C.dt('Program date')], ['species', 'sex', 'service', 'source', 'stage']);
  def('barangays', 'Barangays', () => {
    if (!window.CVApi || !CVApi.live) return brg0.map(b => Object.assign({ ready: b.pets >= 150 ? 'Ready' : 'Below 150' }, b));
    const official = CVApi.barangays(), paravets = D.paravets.rows, pets = D.pets.rows, animals = D.animals.rows;
    return official.map(b => {
      const pv = paravets.filter(x => x.barangay === b.name).length, petCount = pets.filter(x => x.barangay === b.name).length;
      const animalRows = animals.filter(x => x.barangay === b.name), latest = animalRows.map(x => x.date).filter(Boolean).sort().pop() || '';
      return { id: b.acronym, name: b.name, ac: b.acronym, district: b.district, zip: b.zip, paravets: pv, pets: petCount, animals: animalRows.length, ready: petCount >= 150 ? 'Ready' : 'Below 150', date: latest };
    });
  }, [['id', 'Code'], ['name', 'Barangay'], ['ac', 'Acronym'], ['district', 'District'], ['zip', 'ZIP'], ['paravets', 'Paravets', 'n'], ['pets', 'Pets listed', 'n'], ['animals', 'Animals recorded', 'n'], ['ready', 'Readiness'], C.dt('Last census')], ['district', 'zip', 'ready']);
  def('accounts', 'Accounts', accRows, [['key', 'Account key'], ['type', 'Type'], ['name', 'Name'], ['barangay', 'Barangay'], ['mobile', 'Mobile'], ['status', 'Status'], ['linked', 'Linked Paravet'], C.dt('Created')], ['type', 'barangay', 'status']);
  def('log', 'Activity log', () => log().map(x => Object.assign({ date: x.time.slice(0, 10) }, x)), [['time', 'Time'], ['user', 'User'], ['action', 'Action'], ['detail', 'Detail']], ['user', 'action']);
  const dupKeys = () => { const m = {}; ownersAll().forEach(x => { const k = CV.norm(x.name + '|' + x.barangay); (m[k] = m[k] || []).push(x); }); return m; };
  def('dupOwners', 'Possible duplicate owners', () => Object.values(dupKeys()).filter(a => a.length > 1).flat(), OC, ['barangay', 'status', 'source'], { base: 'owners' });
  def('noMobile', 'Owners missing a mobile number', () => ownersAll().filter(x => !x.mobile), OC, ['barangay', 'status', 'source'], { base: 'owners' });
  def('noAge', 'Pets missing an age', () => petsAll().filter(x => x.age === '' || x.age == null), D.pets.cols, D.pets.filters, { base: 'pets' });
  def('oddAge', 'Pets with an unusual age (over 20 years)', () => petsAll().filter(x => +x.age > 20), D.pets.cols, D.pets.filters, { base: 'pets' });
  D.accounts.actions = row => window.CVAccounts ? CVAccounts.actions(row) : [];
  window.CVData = { D, TODAY, rowsOf: k => D[k].rows, ext, ov, archAll, para0, prg0 };
  const MN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const cmp = (a, b, n) => n ? (Number(a) || 0) - (Number(b) || 0) : String(a).localeCompare(String(b), 'en', { numeric: true, sensitivity: 'base' });
  const pill = v => ['Registered', 'Ready', 'Completed', 'Active', 'Approved', 'Scheduled', 'Submitted', 'Registered account'].includes(v) ? `<span class="pill ok">${v}</span>` : ['Unregistered', 'Below 150', 'Incomplete', 'Cancelled', 'Pending'].includes(v) ? `<span class="pill due">${v}</span>` : esc(v == null ? '' : v);
  const toCsv = (cols, rows) => [cols.map(c => `"${c[1]}"`).join(','), ...rows.map(x => cols.map(c => `"${String(x[c[0]] == null ? '' : x[c[0]]).replace(/"/g, '""')}"`).join(','))].join('\r\n');
  const download = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + text], { type: 'text/csv' })); a.download = name; a.click(); URL.revokeObjectURL(a.href); };
  const ctl = {};
  function mount(P, T, o) {
    const $ = id => document.getElementById(P + id); o = o || {};
    if (!$('Table')) return;
    const st = { tab: o.first, q: o.search ? (new URLSearchParams(location.search).get('search') || '') : '', f: {}, y: '', m: '', key: null, dir: 1, page: 1, sel: new Set(), arch: false };
    const per = o.per || 15, T0 = () => T[st.tab], bs = () => T0().base || st.tab, col = k => T0().cols.find(c => c[0] === k) || [], isNum = k => col(k)[2] === 'n';
    const archSet = () => new Set(archAll()[bs()] || []);
    const rows = () => {
      const q = st.q.trim().toLowerCase(), A = archSet();
      let out = T0().rows.filter(x => (st.arch ? A.has(x.id) : !A.has(x.id)) && (!q || Object.values(x).join(' ').toLowerCase().includes(q)) && Object.entries(st.f).every(([k, v]) => !v || (k === 'barangay' ? CV.norm(x[k]) === CV.norm(v) : String(x[k]) === v)) && (!st.y || (x.date || '').slice(0, 4) === st.y) && (!st.m || (x.date || '').slice(5, 7) === st.m));
      if (st.key) out = out.slice().sort((a, b) => st.dir * cmp(a[st.key], b[st.key], isNum(st.key)));
      return out;
    };
    const live = k => { const A = new Set(archAll()[T[k].base || k] || []); return T[k].rows.filter(x => !A.has(x.id)).length; };
    function render(anim) {
      const t = T0(), all = t.rows, out = rows(), pages = Math.max(1, Math.ceil(out.length / per)); st.page = Math.min(st.page, pages);
      if (o.tabs !== false) $('Tabs').innerHTML = Object.entries(T).map(([k, v]) => o.tiles ? `<button class="stat${k === st.tab ? ' active' : ''}" type="button" role="tab" aria-selected="${k === st.tab}" data-t="${k}"><div class="num">${live(k).toLocaleString()}</div><div class="label">${v.label}</div></button>` : `<button class="tab${k === st.tab ? ' active' : ''}" type="button" data-t="${k}">${v.label} (${live(k)})</button>`).join('');
      $('Filters').innerHTML = t.filters.map(k => k === 'barangay' ? `<input list="brList" data-f="barangay" value="${esc(st.f.barangay || '')}" placeholder="All barangays — type to search" aria-label="Barangay"/>` : `<select data-f="${k}" aria-label="${col(k)[1]}"><option value="">All ${col(k)[1].toLowerCase()}</option>${[...new Set(all.map(x => x[k]))].sort((a, b) => cmp(a, b, typeof a === 'number')).map(v => `<option${st.f[k] === String(v) ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select>`).join('');
      const ys = [...new Set(all.map(x => (x.date || '').slice(0, 4)).filter(Boolean))].sort().reverse();
      $('Year').innerHTML = '<option value="">All years</option>' + ys.map(y => `<option${st.y === y ? ' selected' : ''}>${y}</option>`).join('');
      $('Month').innerHTML = '<option value="">All months</option>' + MN.map((m, i) => `<option value="${pad(i + 1, 2)}"${st.m === pad(i + 1, 2) ? ' selected' : ''}>${m}</option>`).join('');
      $('Sort').innerHTML = '<option value="">Sort by…</option>' + t.cols.map(c => `<option value="${c[0]}"${st.key === c[0] ? ' selected' : ''}>${c[1]}</option>`).join('');
      $('Dir').textContent = st.key === 'date' ? (st.dir > 0 ? 'Oldest → Newest' : 'Newest → Oldest') : st.dir > 0 ? (isNum(st.key) ? '1 → 9' : 'A → Z') : (isNum(st.key) ? '9 → 1' : 'Z → A');
      $('Search').value = st.q; if ($('Arch')) $('Arch').checked = st.arch; if ($('Imp')) $('Imp').hidden = !t.importable;
      const pageRows = out.slice((st.page - 1) * per, st.page * per), allSel = pageRows.length && pageRows.every(x => st.sel.has(x.id));
      $('Table').innerHTML = `<thead><tr><th class="chk"><input type="checkbox" data-all aria-label="Select all rows on this page"${allSel ? ' checked' : ''}/></th>${t.cols.map(c => `<th class="sortable" data-k="${c[0]}" tabindex="0" aria-sort="${st.key === c[0] ? (st.dir > 0 ? 'ascending' : 'descending') : 'none'}">${c[1]}<span class="sort-ind">${st.key === c[0] ? (st.dir > 0 ? ' ▲' : ' ▼') : ''}</span></th>`).join('')}</tr></thead><tbody>${pageRows.map(x => `<tr class="clickable${st.sel.has(x.id) ? ' selected' : ''}" data-id="${esc(x.id)}"><td class="chk"><input type="checkbox" data-row aria-label="Select row"${st.sel.has(x.id) ? ' checked' : ''}/></td>${t.cols.map(c => `<td>${pill(x[c[0]])}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${t.cols.length + 1}" class="muted">No records match the current filters.</td></tr>`}</tbody>`;
      $('Count').textContent = `Showing ${out.length ? (st.page - 1) * per + 1 : 0}–${Math.min(st.page * per, out.length)} of ${out.length.toLocaleString()} ${t.label.toLowerCase()}${st.arch ? ' (archived)' : ''}`;
      $('Pager').innerHTML = `<button class="cv-btn" type="button" data-p="-1"${st.page <= 1 ? ' disabled' : ''}>Previous</button><span class="muted">Page ${st.page} of ${pages}</span><button class="cv-btn" type="button" data-p="1"${st.page >= pages ? ' disabled' : ''}>Next</button>`;
      const n = st.sel.size; $('Sel').hidden = !n;
      $('Sel').innerHTML = n ? `<strong>${n} selected</strong>${out.length > n ? `<button class="cv-btn" data-b="all">Select all ${out.length.toLocaleString()} results</button>` : ''}<button class="cv-btn" data-b="view">View details</button>${['owners', 'pets', 'paravets', 'respondents', 'households', 'animals', 'stubs', 'services', 'programs', 'participants', 'accounts'].includes(bs()) ? `<button class="cv-btn" data-b="arch">${st.arch ? 'Restore from archive' : 'Move to archive'}</button>` : ''}<button class="cv-btn" data-b="rep">Use for report</button><button class="cv-btn" data-b="clr">Clear selection</button>` : '';
      if (anim) { const w = $('Wrap'); w.classList.remove('enter'); void w.offsetWidth; w.classList.add('enter'); }
    }
    const sel = () => T0().rows.filter(x => st.sel.has(x.id));
    function detail(row) {
      const t = T0(), acts = (t.actions ? t.actions(row) : []).map(a => ({ label: a.label, danger: a.danger, value: a }));
      CVDialog.open({ title: `${t.label.replace(/s$/, '')} details · ${row.id}`, size: 'lg', html: `<dl class="kv">${t.cols.map(c => `<div><dt>${c[1]}</dt><dd>${pill(row[c[0]]) || '—'}</dd></div>`).join('')}</dl>`, actions: [...acts, { label: 'Close', primary: true, value: 'x' }] }).then(a => { if (a && a.fn) a.fn(row); });
    }
    function batch(act) {
      const rs = sel(), t = T0(), b = bs();
      if (act === 'view') return CVDialog.open({ title: `${rs.length} selected record${rs.length > 1 ? 's' : ''}`, size: 'xl', html: `<div class="table-wrap"><table><thead><tr>${t.cols.map(c => `<th>${c[1]}</th>`).join('')}</tr></thead><tbody>${rs.slice(0, 300).map(x => `<tr>${t.cols.map(c => `<td>${pill(x[c[0]])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>${rs.length > 300 ? '<p class="muted">Showing the first 300.</p>' : ''}`, actions: [{ label: 'Close', primary: true, value: 1 }] });
      if (act === 'arch') return CVDialog.confirm(st.arch ? 'Restore records' : 'Move to archive', `${st.arch ? 'Restore' : 'Archive'} ${rs.length} record${rs.length > 1 ? 's' : ''}? ${st.arch ? '' : 'Archived records are hidden from lists and reports, but not deleted. You can restore them later.'}`, { okLabel: st.arch ? 'Restore' : 'Archive' }).then(async ok => { if (!ok) return; try { if (CVApi.live) await CVApi.archiveRecords(b, rs.map(x => x.id), !st.arch); else { const a = archAll(), s = new Set(a[b] || []); rs.forEach(x => st.arch ? s.delete(x.id) : s.add(x.id)); a[b] = [...s]; CV.write('cityvet.archived', a); } CV.log(st.arch ? 'Restore' : 'Archive', `${rs.length} ${t.label.toLowerCase()}`); st.sel.clear(); CVDialog.toast(`${rs.length} record${rs.length > 1 ? 's' : ''} ${st.arch ? 'restored' : 'archived'}.`, 'success'); window.dispatchEvent(new Event('cv-data')); } catch (e) { CVDialog.toast(e.message, 'error'); } });
      if (act === 'rep') { const bk = CV.read('cityvet.basket', []); let n = 0; rs.forEach(x => { if (!bk.some(y => y.ds === b && y.id === x.id)) { bk.push({ ds: b, id: x.id, label: x.name || x.owner || x.id, kind: t.label }); n++; } }); CV.write('cityvet.basket', bk); CV.log('Report basket', `${n} added from ${t.label}`); CVDialog.toast(`${n} record${n === 1 ? '' : 's'} added to the report basket.`, 'success'); window.dispatchEvent(new Event('cv-basket')); }
    }
    const sortBy = k => { st.dir = st.key === k ? -st.dir : 1; st.key = k; st.page = 1; render(); };
    if (o.tabs !== false) $('Tabs').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) apply({ tab: b.dataset.t }, true); });
    function apply(p, anim) { Object.assign(st, { tab: p.tab || st.tab, f: Object.assign({}, p.f), y: p.y || '', m: p.m || '', q: p.q || '', key: null, dir: 1, page: 1, arch: false, sel: new Set() }); render(anim !== false); }
    ctl[P] = { apply };
    $('Filters').addEventListener('change', e => { const k = e.target.dataset.f, v = e.target.value.trim(); st.f[k] = e.target.tagName === 'INPUT' ? CV.brFind(v) : v; st.page = 1; render(); });
    $('Year').addEventListener('change', e => { st.y = e.target.value; st.page = 1; render(); });
    $('Month').addEventListener('change', e => { st.m = e.target.value; st.page = 1; render(); });
    $('Search').addEventListener('input', e => { st.q = e.target.value; st.page = 1; const p = e.target.selectionStart; render(); e.target.focus(); e.target.setSelectionRange(p, p); });
    $('Sort').addEventListener('change', e => { st.key = e.target.value || null; st.page = 1; render(); });
    $('Dir').addEventListener('click', () => { st.dir = -st.dir; render(); });
    $('Clear').addEventListener('click', () => { Object.assign(st, { q: '', f: {}, y: '', m: '', key: null, dir: 1, page: 1 }); render(); });
    if ($('Arch')) $('Arch').addEventListener('change', e => { st.arch = e.target.checked; st.sel.clear(); st.page = 1; render(); });
    if ($('Imp')) $('Imp').addEventListener('click', () => { try { sessionStorage.setItem('cityvet.importDs', st.tab === 'unregistered' ? 'respondents' : st.tab); } catch (x) {} location.hash = '#/import-export'; });
    $('Table').addEventListener('click', e => {
      const h = e.target.closest('th[data-k]'); if (h) return sortBy(h.dataset.k);
      if (e.target.matches('[data-all]')) { const ids = rows().slice((st.page - 1) * per, st.page * per).map(x => x.id); ids.forEach(i => e.target.checked ? st.sel.add(i) : st.sel.delete(i)); return render(); }
      const tr = e.target.closest('tr[data-id]'); if (!tr) return;
      if (e.target.matches('[data-row]')) { e.target.checked ? st.sel.add(tr.dataset.id) : st.sel.delete(tr.dataset.id); return render(); }
      const row = T0().rows.find(x => String(x.id) === tr.dataset.id); if (row) detail(row);
    });
    $('Table').addEventListener('keydown', e => { const h = e.target.closest('th[data-k]'); if (h && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); sortBy(h.dataset.k); } });
    $('Pager').addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (b) { st.page += +b.dataset.p; render(); } });
    $('Sel').addEventListener('click', e => { const b = e.target.closest('[data-b]'); if (!b) return; const a = b.dataset.b; if (a === 'clr') { st.sel.clear(); render(); } else if (a === 'all') { rows().forEach(x => st.sel.add(x.id)); render(); } else batch(a); });
    $('Csv').addEventListener('click', () => { const t = T0(), rs = st.sel.size ? sel() : rows(); download(`${o.name || P}-${st.tab}.csv`, toCsv(t.cols, rs)); CV.log('Export CSV', `${rs.length} ${t.label.toLowerCase()}`); });
    let dirty = false; const vis = () => $('Table').offsetParent !== null;
    ['cv-data', 'storage'].forEach(ev => window.addEventListener(ev, () => { if (vis()) render(); else dirty = true; }));
    window.addEventListener('cv-show', () => { if (dirty && vis()) { dirty = false; render(); } });
    render();
  }
  const ML = { owners: D.owners, pets: D.pets, paravets: D.paravets, unregistered: D.unregistered };
  mount('ml', ML, { first: 'owners', name: 'masterlist', search: 1 });
  mount('cs', { households: D.households, respondents: D.respondents, animals: D.animals, willing: D.willing, undecided: D.undecided, notint: D.notint }, { first: 'households', tiles: true, name: 'census' });
  mount('sv', { svKapon: D.svKapon, 'svAnti-rabies': D['svAnti-rabies'], svMicrochip: D.svMicrochip, svInc: D.svInc }, { first: 'svKapon', tiles: true, name: 'services' });
  mount('st', { stubs: D.stubs }, { first: 'stubs', tabs: false, name: 'stubs' });
  mount('pg', { programs: D.programs }, { first: 'programs', tabs: false, name: 'programs' });
  mount('pd', { participants: D.participants }, { first: 'participants', tabs: false, name: 'program-day', per: 12 });
  mount('pv', { paravets: D.paravets }, { first: 'paravets', tabs: false, name: 'paravets' });
  mount('bg', { barangays: D.barangays }, { first: 'barangays', tabs: false, name: 'barangays', per: 20 });
  mount('ac', { accounts: D.accounts }, { first: 'accounts', tabs: false, name: 'accounts' });
  mount('lg', { log: D.log }, { first: 'log', tabs: false, name: 'activity-log' });
  mount('dt', D, { first: 'owners', tabs: false, name: 'details', per: 20 });
  window.CVDetails = { open(p) { if (!D[p.ds]) return; const t = document.getElementById('dtTitle'), s = document.getElementById('dtSub'); if (t) t.textContent = p.title || D[p.ds].label; if (s) s.textContent = p.sub || 'Interactive datasheet · sort, filter, search, select records'; ctl.dt.apply({ tab: p.ds, f: p.f, y: p.y, m: p.m, q: p.q }, true); location.hash = '#/details'; } };
  document.addEventListener('click', e => { const l = e.target.closest('[data-details]'); if (l) { e.preventDefault(); const p = JSON.parse(l.dataset.details); CVDetails.open(p); } });
})();
