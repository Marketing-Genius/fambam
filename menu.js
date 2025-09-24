// menu.js — generic dropdown controller for .menu-wrap blocks
(function () {
  function setupMenu(root) {
    const btn = root.querySelector('.hamburger');
    const dd  = root.querySelector('.menu-dd');
    if (!btn || !dd) return;

    let isOpen = false;

    const open = () => {
      if (isOpen) return;
      dd.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      dd.setAttribute('aria-hidden', 'false');
      isOpen = true;
    };

    const close = () => {
      if (!isOpen) return;
      dd.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      dd.setAttribute('aria-hidden', 'true');
      isOpen = false;
    };

    // Toggle on click
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      isOpen ? close() : open();
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!isOpen) return;
      if (!root.contains(e.target)) close();
    });

    // Keyboard niceties
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        open();
        const first = dd.querySelector('button,[role="menuitem"],[tabindex="0"]');
        first && first.focus();
      }
    });
    dd.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        close();
        btn.focus();
      }
    });

    // Emit a custom event with the clicked action (data-mi or data-action)
    dd.addEventListener('click', (e) => {
      const item = e.target.closest('[data-mi],[data-action],[role="menuitem"]');
      if (!item) return;
      const action = item.dataset.mi || item.dataset.action || '';
      root.dispatchEvent(new CustomEvent('menu:select', { detail: { action, target: item } }));
      close();
    });
  }

  // Auto-init all menus on the page
  function initAllMenus() {
    document.querySelectorAll('.menu-wrap').forEach(setupMenu);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllMenus, { once: true });
  } else {
    initAllMenus();
  }
})();
