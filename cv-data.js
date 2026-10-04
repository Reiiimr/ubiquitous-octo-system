window.CV = (function () {
  'use strict';
  const BRX = 'Assumption|AS|2,Bagong Buhay I|B1|2,Bagong Buhay II|B2|2,Bagong Buhay III|B3|2,Citrus|CT|2,Ciudad Real|CR|1,Dulong Bayan|DB|1,Fatima I|F1|2,Fatima II|F2|2,Fatima III|F3|2,Fatima IV|F4|2,Fatima V|F5|2,Francisco Homes–Guijo|FG|1,Francisco Homes–Mulawin|FM|1,Francisco Homes–Narra|FN|1,Francisco Homes–Yakal|FY|1,Gaya-Gaya|GG|1,Graceville|GV|1,Gumaoc Central|GC|1,Gumaoc East|GE|1,Gumaoc West|GW|1,Kaybanban|KB|1,Kaypian|KP|1,Lawang Pari|LP|2,Maharlika|MH|1,Minuyan I|M1|2,Minuyan II|M2|2,Minuyan III|M3|2,Minuyan IV|M4|2,Minuyan Proper|MP|2,Minuyan V|M5|2,Muzon East|ME|1,Muzon Proper|MZ|1,Muzon South|MS|1,Muzon West|MW|1,Paradise III|PI|1,Poblacion|PB|1,Poblacion I|P1|1,San Isidro|SI|1,San Manuel|SM|1,San Martin I|S1|2,San Martin II|S2|2,San Martin III|S3|2,San Martin IV|S4|2,San Martin de Porres|SP|2,San Pedro|SD|2,San Rafael I|R1|2,San Rafael II|R2|2,San Rafael III|R3|2,San Rafael IV|R4|2,San Rafael V|R5|2,San Roque|SR|1,Santa Cruz I|C1|2,Santa Cruz II|C2|2,Santa Cruz III|C3|2,Santa Cruz IV|C4|2,Santa Cruz V|C5|2,Santo Cristo|SC|1,Santo Niño I|N1|2,Santo Niño II|N2|2,Sapang Palay Proper|SPP|2,Tungkong Mangga|TM|1'.split(',').map(x => { const p = x.split('|'); return { name: p[0], ac: p[1], district: p[2] === '1' ? '1st District' : '2nd District', zip: p[2] === '1' ? '3023' : '3024' }; });
  const BR = BRX.map(b => b.name);
  const norm = v => String(v == null ? '' : v).toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
  const brFind = v => BR.find(b => norm(b) === norm(v)) || '';
  const brInfo = n => BRX.find(b => b.name === n) || {};
  const SRC = ['Paravet census', 'Paravet pre-listing', 'User pre-listing'];
  const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const seed0 = () => [
    ['Paravet census submitted', 'Barangay Graceville census summary is ready for review.', '2026-10-02T08:40', 0],
    ['New user pre-listing', 'An owner pre-listed 2 pets for Kapon in Muzon Proper.', '2026-10-02T07:15', 0],
    ['Program request received', 'Barangay San Rafael III requested a Kapon program (pet list: 143).', '2026-10-01T16:30', 0],
    ['Pet list below 150', 'Gaya-gaya has 31 pets listed; the minimum before a program is about 150.', '2026-10-01T10:05', 0],
    ['Paravet pre-listing batch', 'A Paravet encoded 18 pre-listings for Tungkong Mangga.', '2026-09-30T14:20', 1],
    ['Data quality check', '27 possible duplicate owners were found in the last scan.', '2026-09-29T09:00', 1],
    ['Program completed', 'Kapon program in Graceville is marked completed.', '2026-09-26T17:45', 1]
  ].map((n, i) => ({ id: 's' + i, title: n[0], body: n[1], time: n[2], read: !!n[3], saved: false, archived: false, from: 'System', detail: n[1] + ' Open the related list to review the records, verify the details, and take action. This is sample content for the demo.', link: ['#/census', '#/masterlist', '#/programs', '#/programs', '#/masterlist', '#/data-quality', '#/programs'][i] }));
  const seed = seed0;
  const notes = () => { let a = read('cityvet.notifications', null); if (!a) { a = seed(); write('cityvet.notifications', a); } return a; };
  const notify = n => { const a = notes(); a.unshift(Object.assign({ id: 'n' + Date.now() + Math.floor(Math.random() * 99), time: new Date().toISOString().slice(0, 16), read: false, saved: false, archived: false }, n)); write('cityvet.notifications', a); window.dispatchEvent(new Event('cv-notes')); };
  const log = (action, detail) => { if (window.CVApi && CVApi.live) { CVApi.log(action, detail).catch(error => window.dispatchEvent(new CustomEvent('cv-api-error', { detail: error.message }))); return; } const a = read('cityvet.log', []); const u = (read('cityvet.prototype.demoAccount', {}) || {}).username || 'admin'; a.unshift({ id: 'L' + Date.now() + Math.floor(Math.random() * 99), time: new Date().toISOString().slice(0, 19).replace('T', ' '), user: u, action, detail }); write('cityvet.log', a.slice(0, 500)); };
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('#f');
    if (!form || window.CVApi) return;
    const submit = form.querySelector('[type="submit"]');
    if (submit) submit.disabled = true;
    const client = document.createElement('script');
    client.src = 'api-client.js';
    client.onload = () => CVApi.ready.then(live => {
      if (!live) { if (submit) submit.disabled = false; return; }
      const note = document.querySelector('.pl > p em');
      if (note) note.textContent = 'Your submission is securely sent to the City Veterinary Office.';
      if (submit) submit.disabled = false;
      form.addEventListener('submit', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        const barangayInput = form.elements.b, barangay = brFind(barangayInput.value.trim());
        if (!barangay) { barangayInput.setCustomValidity('Please choose a barangay from the list'); barangayInput.reportValidity(); return; }
        barangayInput.setCustomValidity('');
        const pets = [...document.querySelectorAll('.pet')].map(card => {
          const fields = card.querySelectorAll('input,select');
          return { name: fields[0].value.trim(), species: /Aso/.test(fields[1].value) ? 'Dog' : 'Cat', sex: /Babae/.test(fields[2].value) ? 'Female' : 'Male', age: parseFloat(fields[3].value) || 0 };
        });
        CVApi.submitPrelisting({ owner: form.elements.o.value.trim(), mobile: form.elements.m.value.trim(), barangay, program: form.elements.p.value, pets })
          .then(result => {
            document.getElementById('ref').textContent = result.ref;
            form.hidden = true;
            document.getElementById('ok').hidden = false;
          })
          .catch(error => window.CVDialog ? CVDialog.alert('Submission failed', error.message, 'error') : window.alert(error.message));
      }, true);
    });
    client.onerror = () => { if (submit) submit.disabled = false; };
    document.head.appendChild(client);
  });
  return { BR, BRX, SRC, read, write, notes, notify, norm, brFind, brInfo, log };
})();
