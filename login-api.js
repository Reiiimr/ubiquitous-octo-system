/* When the API is reachable, the staff sign-in form uses the real server login instead of the browser-only demo account. */
(function () {
  'use strict';
  const form = document.querySelector('[data-account-login]'); if (!form) return;
  CVApi.ready.then(live => {
    if (!live) return;
    const setup = document.querySelector('[data-account-setup]'), warn = document.querySelector('.demo-warning'), note = document.querySelector('[data-login-note]'), err = document.querySelector('[data-login-error]');
    if (setup) setup.hidden = true; if (warn) warn.textContent = 'Connected to the e-Kapon server. Use your staff username and password.';
    form.hidden = false; if (note) note.textContent = 'Sign in to continue.';
    form.addEventListener('submit', async e => {
      e.preventDefault(); e.stopImmediatePropagation(); if (err) err.textContent = '';
      try {
        const r = await CVApi.login(form.username.value.trim(), form.password.value);
        localStorage.setItem('cityvet.prototype.demoAccount', JSON.stringify({ username: r.account.username || r.account.accountKey, displayName: (r.account.name.split(', ')[1] || r.account.name) }));
        Object.keys(sessionStorage).filter(key => key.startsWith('cityvet.recent-prompt.')).forEach(key => sessionStorage.removeItem(key));
        sessionStorage.setItem('cityvet.prototype.demoSession', '1');
        const next = new URLSearchParams(location.search).get('next');
        location.href = /^[a-z0-9-]+\.html$/i.test(next || '') ? next : 'index.html';
      } catch (x) { if (err) err.textContent = x.message; }
    }, true);
  });
})();
