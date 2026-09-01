(function () {
  'use strict';

  const STORAGE_KEY = 'unitrus_cookie_consent_v1';
  const CONSENT_VERSION = '2026-09-01';
  const CONSENT_LIFETIME_MS = 365 * 24 * 60 * 60 * 1000;
  const METRIKA_ID = 107053501;
  let lastFocusedElement = null;
  let metrikaLoaded = false;

  function readChoice() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      const isCurrentVersion = saved && saved.version === CONSENT_VERSION;
      const isNotExpired = saved && Number(saved.expiresAt) > Date.now();
      return isCurrentVersion && isNotExpired ? saved.choice : null;
    } catch (error) {
      return null;
    }
  }

  function saveChoice(choice) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        choice: choice,
        version: CONSENT_VERSION,
        updatedAt: new Date().toISOString(),
        expiresAt: Date.now() + CONSENT_LIFETIME_MS
      }));
    } catch (error) {
      // Если хранилище браузера недоступно, выбор действует только до обновления страницы.
    }
  }

  function loadMetrika() {
    if (metrikaLoaded || readChoice() !== 'analytics') return;
    metrikaLoaded = true;

    window.ym = window.ym || function () {
      (window.ym.a = window.ym.a || []).push(arguments);
    };
    window.ym.l = Date.now();

    window.ym(METRIKA_ID, 'init', {
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true
    });

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://mc.yandex.ru/metrika/tag.js?id=' + METRIKA_ID;
    document.head.appendChild(script);
  }

  function clearFirstPartyMetrikaCookies() {
    document.cookie.split(';').forEach(function (cookie) {
      const name = cookie.split('=')[0].trim();
      if (/^_ym_|^yandexuid$|^yuidss$|^_yasc$/.test(name)) {
        document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax';
        document.cookie = name + '=; Max-Age=0; path=/; domain=.unitrus.ru; SameSite=Lax';
      }
    });
  }

  function createDialog() {
    const wrapper = document.createElement('div');
    wrapper.className = 'cookie-consent';
    wrapper.id = 'cookie-consent';
    wrapper.setAttribute('role', 'presentation');
    wrapper.innerHTML = [
      '<div class="cookie-consent__dialog" role="dialog" aria-modal="true" aria-labelledby="cookie-consent-title" aria-describedby="cookie-consent-text">',
      '  <p class="cookie-consent__eyebrow">Настройки приватности</p>',
      '  <h2 class="cookie-consent__title" id="cookie-consent-title">Использование cookies</h2>',
      '  <p class="cookie-consent__text" id="cookie-consent-text">Сайт использует необходимое локальное хранилище, чтобы запомнить ваш выбор. Яндекс.Метрика и аналитические cookies включатся только с вашего согласия. Вы можете отказаться — сайт продолжит работать. Подробнее в <a href="/cookies.html" target="_blank" rel="noopener">правилах использования cookies</a> и <a href="/privacy.html" target="_blank" rel="noopener">политике обработки данных</a>.</p>',
      '  <div class="cookie-consent__actions">',
      '    <button class="cookie-consent__button" type="button" data-cookie-choice="necessary">Только необходимые</button>',
      '    <button class="cookie-consent__button cookie-consent__button--accept" type="button" data-cookie-choice="analytics">Принять аналитические cookies</button>',
      '  </div>',
      '</div>'
    ].join('');
    document.body.appendChild(wrapper);
    return wrapper;
  }

  function showDialog(dialog) {
    lastFocusedElement = document.activeElement;
    dialog.hidden = false;
    document.body.classList.add('cookie-consent-open');
    Array.from(document.body.children).forEach(function (element) {
      if (element !== dialog && element.tagName !== 'SCRIPT') element.inert = true;
    });
    const firstButton = dialog.querySelector('[data-cookie-choice="necessary"]');
    if (firstButton) firstButton.focus();
  }

  function hideDialog(dialog) {
    dialog.hidden = true;
    document.body.classList.remove('cookie-consent-open');
    Array.from(document.body.children).forEach(function (element) {
      if (element !== dialog && element.tagName !== 'SCRIPT') element.inert = false;
    });
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  }

  function applyChoice(choice, dialog) {
    const previousChoice = readChoice();
    saveChoice(choice);

    if (choice === 'analytics') {
      hideDialog(dialog);
      loadMetrika();
      return;
    }

    clearFirstPartyMetrikaCookies();
    hideDialog(dialog);

    // После отзыва перезагружаем страницу, чтобы остановить уже запущенный счётчик.
    if (previousChoice === 'analytics' && metrikaLoaded) {
      window.location.reload();
    }
  }

  function init() {
    const dialog = createDialog();
    const choice = readChoice();

    dialog.querySelectorAll('[data-cookie-choice]').forEach(function (button) {
      button.addEventListener('click', function () {
        applyChoice(button.getAttribute('data-cookie-choice'), dialog);
      });
    });

    document.querySelectorAll('[data-cookie-settings]').forEach(function (button) {
      button.addEventListener('click', function () {
        showDialog(dialog);
      });
    });

    if (choice === 'analytics') {
      dialog.hidden = true;
      loadMetrika();
    } else if (choice === 'necessary') {
      dialog.hidden = true;
    } else {
      showDialog(dialog);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
