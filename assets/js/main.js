// HPERD · FMU — shared site behaviour
document.addEventListener('DOMContentLoaded', () => {

  /* Mobile drawer */
  const menuBtn = document.getElementById('menuBtn');
  const drawer = document.getElementById('mobileDrawer');
  const drawerOverlay = document.getElementById('drawerOverlay');
  const closeDrawerBtn = document.getElementById('closeDrawer');

  function openDrawer() {
    drawer?.classList.remove('translate-x-full');
    drawerOverlay?.classList.remove('opacity-0', 'pointer-events-none');
  }
  function closeDrawer() {
    drawer?.classList.add('translate-x-full');
    drawerOverlay?.classList.add('opacity-0', 'pointer-events-none');
  }
  menuBtn?.addEventListener('click', openDrawer);
  closeDrawerBtn?.addEventListener('click', closeDrawer);
  drawerOverlay?.addEventListener('click', closeDrawer);

  /* Sticky header shadow on scroll */
  const header = document.getElementById('siteHeader');
  const backToTop = document.getElementById('backToTop');
  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY > 12;
    header?.classList.toggle('shadow-md', scrolled);
    if (window.scrollY > 480) backToTop?.classList.add('show');
    else backToTop?.classList.remove('show');
  });
  backToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* Active nav link (matches current file name) */
  const current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link, .drawer-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === current) link.classList.add('active');
  });

  /* Scroll reveal — single, restrained pass */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in-view'));
  }

  /* Animated counters — count up once when scrolled into view */
  const counters = document.querySelectorAll('.counter');
  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10) || 0;
    const suffix = el.dataset.suffix || '';
    const duration = 1400;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = Math.round(eased * target) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  if (counters.length) {
    if ('IntersectionObserver' in window) {
      const counterIO = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterIO.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });
      counters.forEach(el => counterIO.observe(el));
    } else {
      counters.forEach(el => { el.textContent = (el.dataset.target || '0') + (el.dataset.suffix || ''); });
    }
  }

  /* Lazy image fade-in */
  document.querySelectorAll('img.lazy-fade').forEach(img => {
    if (img.complete) img.classList.add('loaded');
    else img.addEventListener('load', () => img.classList.add('loaded'));
  });

  /* Gallery category filter (gallery.html) */
  const filterBtns = document.querySelectorAll('.gallery-filter');
  const galleryItems = document.querySelectorAll('.masonry-item');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('bg-navy', 'text-white'));
      btn.classList.add('bg-navy', 'text-white');
      const cat = btn.dataset.filter;
      galleryItems.forEach(item => {
        item.style.display = (cat === 'all' || item.dataset.category === cat) ? '' : 'none';
      });
    });
  });

  /* Simple front-end validation for the contact form (contact.html) */
  const contactForm = document.getElementById('contactForm');
  contactForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const status = document.getElementById('formStatus');
    status.textContent = 'Thank you — your message has been received. The HPERD office will respond within 2 business days.';
    status.classList.remove('hidden');
    contactForm.reset();
  });

});

