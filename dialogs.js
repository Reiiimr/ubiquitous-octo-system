window.CVDialog = (function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ICON = { info: 'i', error: '!', warn: '!', success: '✓' };
  function open(o) {
    return new Promise(res => {
      const ov = document.createElement('div'), acts = o.actions || [];
      ov.className = 'dlg-overlay';
      ov.innerHTML = `<div class="dlg dlg-${o.size || 'md'}${o.kind ? ' dlg-' + o.kind : ''}" role="dialog" aria-modal="true" aria-label="${esc(o.title)}"><div class="dlg-head"><h2>${o.kind ? `<span class="dlg-ico">${ICON[o.kind]}</span>` : ''}${esc(o.title)}</h2><button class="dlg-x" type="button" data-dlg-close aria-label="Close"><img src="close.png" alt=""/></button></div><div class="dlg-body">${o.html || ''}</div>${acts.length ? `<div class="dlg-foot">${acts.map((a, i) => `<button type="button" class="${a.primary ? 'btn' : 'cv-btn'}${a.danger ? ' danger' : ''}" data-dlg-act="${i}">${esc(a.label)}</button>`).join('')}</div>` : ''}</div>`;
      const prev = document.activeElement; document.body.appendChild(ov);
      const done = v => { ov.remove(); document.removeEventListener('keydown', key, true); if (prev && prev.focus) prev.focus(); res(v); };
      const key = e => { if (e.key === 'Escape' && [...document.querySelectorAll('.dlg-overlay')].pop() === ov) { e.stopPropagation(); done(undefined); } };
      document.addEventListener('keydown', key, true);
      ov.addEventListener('click', e => {
        if (e.target === ov || e.target.closest('[data-dlg-close]')) return done(undefined);
        const b = e.target.closest('[data-dlg-act]'); if (!b) return;
        const a = acts[+b.dataset.dlgAct]; if (a.onClick && a.onClick(ov, done) === false) return; done(a.value);
      });
      if (o.onOpen) o.onOpen(ov, done);
      const f = ov.querySelector('input:not([type=checkbox]),select,textarea,.dlg-foot button'); if (f) f.focus();
    });
  }
  const alert = (title, msg, kind) => open({ title, kind: kind || 'info', html: `<p>${esc(msg)}</p>`, actions: [{ label: 'OK', primary: true, value: true }] });
  const confirm = (title, msg, o) => { o = o || {}; return open({ title, kind: o.danger ? 'warn' : 'info', html: `<p>${esc(msg)}</p>`, actions: [{ label: o.cancelLabel || 'Cancel', value: false }, { label: o.okLabel || 'Confirm', primary: !o.danger, danger: !!o.danger, value: true }] }).then(v => v === true); };
  function toast(msg, kind) {
    let box = document.getElementById('toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const t = document.createElement('div'); t.className = 'toast toast-' + (kind || 'info'); t.textContent = msg; box.appendChild(t); setTimeout(() => t.remove(), 3800);
  }
  // form({title, fields:[{k,label,type,options,req,min,max,value,hint}], submitLabel, validate}) -> values | undefined
  function form(o) {
    const fs = o.fields.map(f => {
      const id = 'ff_' + f.k, v = f.value == null ? '' : f.value; let ctl;
      if (f.type === 'select') ctl = `<select id="${id}" name="${f.k}">${f.options.map(x => `<option${x === v ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>`;
      else if (f.type === 'barangay') ctl = `<input id="${id}" name="${f.k}" list="brList" value="${esc(v)}" placeholder="Type to search a barangay" autocomplete="off"/>`;
      else if (f.type === 'textarea') ctl = `<textarea id="${id}" name="${f.k}" rows="3">${esc(v)}</textarea>`;
      else ctl = `<input id="${id}" name="${f.k}" type="${f.type || 'text'}" value="${esc(v)}"${f.min != null ? ` min="${f.min}"` : ''}${f.max != null ? ` max="${f.max}"` : ''}${f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : ''}/>`;
      return `<label class="ff${f.wide ? ' wide' : ''}"><span>${esc(f.label)}${f.req ? ' <b aria-hidden="true">*</b>' : ''}</span>${ctl}${f.hint ? `<small class="muted">${esc(f.hint)}</small>` : ''}<small class="ff-err" data-err="${f.k}"></small></label>`;
    }).join('');
    return open({
      title: o.title, size: 'lg', html: `<form class="ff-grid" novalidate>${fs}</form>${o.note ? `<p class="muted">${esc(o.note)}</p>` : ''}`,
      actions: [{ label: 'Cancel', value: undefined }, { label: o.submitLabel || 'Save', primary: true, value: 'ok', onClick: (ov, done) => {
        const vals = {}, errs = {}; ov.querySelectorAll('[name]').forEach(el => { vals[el.name] = el.value.trim(); });
        o.fields.forEach(f => { const v = vals[f.k]; if (f.req && !v) errs[f.k] = 'This field is required.'; else if (f.type === 'number' && v && (isNaN(+v) || (f.min != null && +v < f.min) || (f.max != null && +v > f.max))) errs[f.k] = `Enter a number from ${f.min} to ${f.max}.`; else if (f.type === 'barangay' && v && !CV.brFind(v)) errs[f.k] = 'Choose a barangay from the list.'; else if (f.type === 'date' && f.req && v && isNaN(new Date(v))) errs[f.k] = 'Enter a valid date.'; });
        if (o.validate) Object.assign(errs, o.validate(vals) || {});
        ov.querySelectorAll('[data-err]').forEach(n => { n.textContent = errs[n.dataset.err] || ''; });
        if (Object.keys(errs).length) { const first = ov.querySelector('[data-err]:not(:empty)'); if (first) first.closest('label').querySelector('input,select,textarea').focus(); return false; }
        if (o.fields.some(f => f.type === 'barangay')) o.fields.forEach(f => { if (f.type === 'barangay') vals[f.k] = CV.brFind(vals[f.k]); });
        ov.__vals = vals; done(vals); return false;
      } }]
    });
  }
  return { open, alert, confirm, toast, form, esc };
})();
