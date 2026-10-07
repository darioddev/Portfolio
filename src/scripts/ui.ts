// Small client behaviors: theme toggle, language menu and mobile navigation. Everything else is static HTML.

const root = document.documentElement;
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

function isDark(): boolean {
  const explicit = root.dataset.theme;
  return explicit ? explicit === 'dark' : darkQuery.matches;
}

function setupThemeToggle() {
  const button = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
  if (!button) return;
  const sync = () => button.setAttribute('aria-pressed', String(isDark()));
  sync();
  darkQuery.addEventListener('change', sync);
  button.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    root.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
      // storage can be unavailable (private mode); the choice then lasts for this visit only
    }
    sync();
  });
}

function setupLanguageMenu() {
  const menu = document.querySelector<HTMLDetailsElement>('[data-lang-menu]');
  if (!menu) return;
  const summary = menu.querySelector('summary');

  menu.querySelectorAll<HTMLAnchorElement>('a[data-locale]').forEach((link) => {
    link.addEventListener('click', () => {
      try {
        localStorage.setItem('locale', link.dataset.locale ?? '');
      } catch {
        // see theme toggle
      }
    });
  });

  document.addEventListener('click', (event) => {
    if (menu.open && !menu.contains(event.target as Node)) menu.open = false;
  });
  menu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.open) {
      menu.open = false;
      summary?.focus();
    }
  });
}

function setupNav() {
  const button = document.querySelector<HTMLButtonElement>('[data-nav-toggle]');
  const nav = document.querySelector<HTMLElement>('[data-nav]');
  if (!button || !nav) return;

  const setOpen = (open: boolean) => {
    button.setAttribute('aria-expanded', String(open));
    nav.toggleAttribute('data-open', open);
  };

  button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      button.focus();
    }
  });
  window.matchMedia('(min-width: 768px)').addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  });
}

setupThemeToggle();
setupLanguageMenu();
setupNav();
