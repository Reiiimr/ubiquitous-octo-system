(function () {
  'use strict';
  const button = document.querySelector('#database-test-run');
  const status = document.querySelector('#database-test-status');
  if (!button || !status) return;

  button.addEventListener('click', async () => {
    button.disabled = true;
    status.textContent = 'Checking connection…';
    try {
      const response = await fetch('/api/v1/health', {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result || result.ok !== true) {
        throw new Error(`The API/database check failed (HTTP ${response.status}).`);
      }
      status.textContent = 'Connected: the API completed a read-only database query successfully.';
    } catch (error) {
      status.textContent = error instanceof Error
        ? error.message
        : 'The check failed. Verify the deployment and its database configuration.';
    } finally {
      button.disabled = false;
    }
  });
})();
