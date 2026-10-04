(function () {
  'use strict';
  const card = document.querySelector('.login-card'); if (!card) return;
  const box = document.createElement('div'); box.className = 'first-login';
  box.innerHTML = '<details><summary>Paravet or user? Sign in with an account key</summary><form class="login-form" id="flForm" novalidate><label>Account key<input name="key" placeholder="PV2026-TMP001-3023" autocomplete="off"/></label><label>Temporary or permanent password<input name="pw" type="password" autocomplete="off"/></label><button class="cv-btn primary login-submit" type="submit">Sign in</button><p class="login-error" id="flErr" aria-live="polite"></p><p class="muted">Demo simulation only. Temporary passwords expire after 15 minutes and lock after 3 wrong tries.</p></form></details>';
  card.appendChild(box);
  const err = m => { box.querySelector('#flErr').textContent = m; };
  box.querySelector('#flForm').addEventListener('submit', async e => {
    e.preventDefault(); err(''); const f = e.target, key = f.key.value.trim().toUpperCase(), pw = f.pw.value;
    if (window.CVApi) { await CVApi.ready; if (CVApi.live) return liveFirst(key, pw); }
    const all = CVAccounts.all(), a = all.find(x => x.key === key);
    if (!a || !pw) return err('The account key or password is incorrect.');
    try {
      if (a.tmp) {
        if (a.tmp.attempts >= 3) return err('This account is locked after 3 wrong attempts. Ask the administrator for a new temporary password.');
        if (Date.now() > a.tmp.exp) { a.tmp.hash = ''; CVAccounts.save(all); return err('The temporary password has expired. Ask the administrator for a new one.'); }
        if (await CVAccounts.hash(pw, a.tmp.salt) !== a.tmp.hash) { a.tmp.attempts++; CVAccounts.save(all); return err(a.tmp.attempts >= 3 ? 'Too many wrong attempts. The account is now locked.' : `Incorrect. ${3 - a.tmp.attempts} attempt${3 - a.tmp.attempts === 1 ? '' : 's'} left.`); }
        return mustReset(a, all);
      }
      if (!a.pw || await CVAccounts.hash(pw, a.pw.salt) !== a.pw.hash) return err('The account key or password is incorrect.');
      portal(a);
    } catch (x) { err(x.message); }
  });
  async function liveFirst(key, pw) {
    try { await CVApi.firstSignin(key, pw); } catch (x) { return err(x.status === 401 && x.details && x.details.attemptsLeft != null ? `${x.message} ${x.details.attemptsLeft} attempt${x.details.attemptsLeft === 1 ? '' : 's'} left.` : x.message); }
    card.innerHTML = `<img class="login-logo" src="images.jpg" alt=""/><p class="login-eyebrow">One-time temporary password accepted</p><h1>Create a new password</h1><p class="login-intro">You cannot continue until you set a permanent password.</p><form class="login-form" id="npForm" novalidate><label>New password<input name="p1" type="password" autocomplete="new-password"/></label><label>Confirm new password<input name="p2" type="password" autocomplete="new-password"/></label><button class="cv-btn primary login-submit" type="submit">Save password</button><p class="login-error" id="npErr" aria-live="polite"></p><p class="muted">At least 8 characters with a letter and a number.</p></form>`;
    card.querySelector('#npForm').addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target, e1 = card.querySelector('#npErr');
      try { const r = await CVApi.setPassword(f.p1.value, f.p2.value); portal({ type: r.account.type, key: r.account.accountKey, name: r.account.name }); } catch (x) { e1.textContent = x.message; }
    });
  }
  function mustReset(a, all) {
    card.innerHTML = `<img class="login-logo" src="images.jpg" alt=""/><p class="login-eyebrow">One-time temporary password accepted</p><h1>Create a new password</h1><p class="login-intro">You cannot continue until you set a permanent password.</p><form class="login-form" id="npForm" novalidate><label>New password<input name="p1" type="password" autocomplete="new-password"/></label><label>Confirm new password<input name="p2" type="password" autocomplete="new-password"/></label><button class="cv-btn primary login-submit" type="submit">Save password</button><p class="login-error" id="npErr" aria-live="polite"></p><p class="muted">At least 8 characters with a letter and a number.</p></form>`;
    card.querySelector('#npForm').addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target, e1 = card.querySelector('#npErr');
      if (f.p1.value.length < 8 || !/[A-Za-z]/.test(f.p1.value) || !/\d/.test(f.p1.value)) return e1.textContent = 'Use at least 8 characters with a letter and a number.';
      if (f.p1.value !== f.p2.value) return e1.textContent = 'The passwords do not match.';
      const salt = CVAccounts.rnd(16); a.pw = { salt, hash: await CVAccounts.hash(f.p1.value, salt) }; a.tmp = null; CVAccounts.save(all); CV.log('Password set', a.key); portal(a);
    });
  }
  function portal(a) { card.innerHTML = `<img class="login-logo" src="images.jpg" alt=""/><p class="login-eyebrow">${a.type} account · ${a.key}</p><h1>You’re signed in, ${CVDialog.esc(a.name)}</h1><p class="login-intro">The ${a.type.toLowerCase()} dashboard is not part of this prototype yet. Your account and permanent password are set.</p><a class="cv-btn primary login-submit" href="login.html">Sign out</a>`; }
})();
