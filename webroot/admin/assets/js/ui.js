// HPERD CMS — shared UI helpers.

function toast(message, type = 'success') {
  const wrap = document.getElementById('toastWrap');
  const el = document.createElement('div');
  const colors = {
    success: 'bg-navy text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-ink text-white',
  };
  el.className = `toast-item ${colors[type] || colors.info} rounded-xl px-4 py-3 text-sm shadow-lift flex items-center gap-2`;
  el.textContent = message;
  wrap.appendChild(el);
  requestAnimationFrame(() => el.classList.add('toast-in'));
  setTimeout(() => {
    el.classList.remove('toast-in');
    setTimeout(() => el.remove(), 250);
  }, 3200);
}

/** Returns a Promise<boolean> resolved true/false based on the user's choice. */
function confirmModal({ title, message, confirmLabel = 'Delete', danger = true }) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('confirmModal');
    overlay.querySelector('[data-role="title"]').textContent = title;
    overlay.querySelector('[data-role="message"]').textContent = message;
    const confirmBtn = overlay.querySelector('[data-role="confirm"]');
    confirmBtn.textContent = confirmLabel;
    confirmBtn.className = `rounded-lg px-4 py-2 text-sm font-medium text-white transition ${
      danger ? 'bg-red-600 hover:bg-red-700' : 'bg-navy hover:bg-navy-deep'
    }`;

    overlay.classList.remove('hidden');
    function cleanup(result) {
      overlay.classList.add('hidden');
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', onCancel);
      resolve(result);
    }
    function onConfirm() { cleanup(true); }
    function onCancel() { cleanup(false); }
    const cancelBtn = overlay.querySelector('[data-role="cancel"]');
    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
  });
}

function skeletonRows(count = 4, colClass = 'h-16') {
  return Array.from({ length: count })
    .map(() => `<div class="animate-pulse bg-navy/5 rounded-xl ${colClass}"></div>`)
    .join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
