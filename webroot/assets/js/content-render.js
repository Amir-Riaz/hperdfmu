// HPERD public site — pulls published content from the CMS API.
// Fails silently (keeping the static placeholder markup) if the API/DB
// isn't reachable yet, so the site never breaks before the backend is deployed.
(function () {
  const API_BASE = 'api';
  const IMG_FALLBACK = 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=900&auto=format&fit=crop';

  async function fetchPosts(params) {
    const qs = new URLSearchParams({ status: 'published', ...params }).toString();
    const res = await fetch(`${API_BASE}/posts/list.php?${qs}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Request failed');
    return json.data.posts;
  }

  function fmtDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function excerpt(text, len = 130) {
    if (!text) return '';
    const plain = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return plain.length > len ? plain.slice(0, len).trim() + '…' : plain;
  }

  function announcementCard(p) {
    return `
      <article class="card overflow-hidden reveal in-view">
        <img class="w-full h-44 object-cover" src="${p.cover_image ? '..' + p.cover_image : IMG_FALLBACK}" alt="${escapeAttr(p.title)}" loading="lazy">
        <div class="p-5">
          <p class="text-xs text-teal font-medium">${fmtDate(p.created_at)}</p>
          <h3 class="font-display font-semibold text-navy mt-2 leading-snug">${escapeAttr(p.title)}</h3>
          <p class="text-sm text-ink-soft mt-2 leading-relaxed">${excerpt(p.meta_description)}</p>
          <a href="post.html?slug=${encodeURIComponent(p.slug)}" class="inline-flex items-center gap-1.5 text-sm text-navy font-medium mt-4 hover:text-teal transition">Read more</a>
        </div>
      </article>`;
  }

  function eventCard(p) {
    return `
      <article class="card overflow-hidden reveal in-view">
        <img class="w-full h-40 object-cover" src="${p.cover_image ? '..' + p.cover_image : IMG_FALLBACK}" alt="${escapeAttr(p.title)}" loading="lazy">
        <div class="p-5">
          <p class="text-xs text-teal font-medium">${fmtDate(p.event_date)}${p.venue ? ' · ' + escapeAttr(p.venue) : ''}</p>
          <h3 class="font-display font-semibold text-navy mt-2 leading-snug">${escapeAttr(p.title)}</h3>
          <p class="text-sm text-ink-soft mt-2 leading-relaxed">${excerpt(p.meta_description)}</p>
          <a href="post.html?slug=${encodeURIComponent(p.slug)}" class="btn-teal inline-block rounded-full px-5 py-2 text-sm mt-4">Details</a>
        </div>
      </article>`;
  }

  function pastEventCard(p) {
    return `
      <div class="card p-5 reveal in-view opacity-90">
        <p class="text-xs text-ink-soft">${fmtDate(p.event_date)}</p>
        <h4 class="font-display font-semibold text-navy text-sm mt-2">${escapeAttr(p.title)}</h4>
      </div>`;
  }

  function timelineItem(p) {
    const d = p.event_date ? new Date(p.event_date) : null;
    const day = d ? d.getDate() : '--';
    const monYear = d ? d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '';
    return `
      <div class="relative pb-10 reveal in-view">
        <span class="timeline-dot absolute -left-8 top-1.5 w-3.5 h-3.5 rounded-full"></span>
        <div class="card p-6 flex flex-col sm:flex-row sm:items-center gap-5">
          <div class="sm:w-28 shrink-0">
            <p class="text-3xl font-display font-semibold text-navy">${day}</p>
            <p class="text-sm text-ink-soft">${monYear}</p>
          </div>
          <div class="flex-1">
            <h3 class="font-display font-semibold text-navy">${escapeAttr(p.title)}</h3>
            <p class="text-sm text-ink-soft mt-1">${escapeAttr(p.venue || '')}</p>
          </div>
          <a href="post.html?slug=${encodeURIComponent(p.slug)}" class="btn-teal rounded-full px-5 py-2.5 text-sm shrink-0 text-center">Details</a>
        </div>
      </div>`;
  }

  function noticeCard(p) {
    return `
      <div class="card p-5 flex items-center justify-between gap-4 reveal in-view">
        <div>
          <p class="text-xs text-ink-soft">${fmtDate(p.created_at)}</p>
          <h4 class="font-display font-semibold text-navy text-sm mt-1">${escapeAttr(p.title)}</h4>
        </div>
        <a href="post.html?slug=${encodeURIComponent(p.slug)}" class="btn-outline-sm shrink-0 rounded-full border border-navy/20 text-navy text-xs font-medium px-3 py-1.5 hover:bg-navy hover:text-white transition">View</a>
      </div>`;
  }

  function escapeAttr(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  async function fillContainer(id, params, renderFn, emptyMessage) {
    const el = document.getElementById(id);
    if (!el) return; // page doesn't have this section
    try {
      const posts = await fetchPosts(params);
      if (posts.length === 0) {
        if (emptyMessage) el.innerHTML = `<p class="text-ink-soft text-sm col-span-full">${emptyMessage}</p>`;
        return; // otherwise leave the static placeholder markup in place
      }
      el.innerHTML = posts.map(renderFn).join('');
    } catch (err) {
      // API/DB not reachable yet — silently keep the existing static markup.
      console.warn('[HPERD CMS] content-render:', id, err.message);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    fillContainer('announcement-loop', { type: 'announcement', limit: 6 }, announcementCard);
    fillContainer('events-timeline-items', { type: 'event', when: 'upcoming', limit: 5 }, timelineItem);
    fillContainer('upcoming-events-loop', { type: 'event', when: 'upcoming', limit: 6 }, eventCard);
    fillContainer('past-events-loop', { type: 'event', when: 'past', limit: 8 }, pastEventCard);
    fillContainer('notices-loop', { type: 'notice', limit: 4 }, noticeCard);
  });
})();
