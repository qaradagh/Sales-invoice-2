/* Compact navigation. Invoice values and calculations remain in app.js. */
(function () {
  'use strict';
  var tabs = Array.from(document.querySelectorAll('[data-tab]'));
  function activate(tab, focus) {
    tabs.forEach(function (item) {
      var selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () { activate(tab); });
    tab.addEventListener('keydown', function (event) {
      var next;
      if (event.key === 'ArrowLeft') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowRight') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); activate(tabs[next], true); }
    });
  });
  document.querySelectorAll('[data-view]').forEach(function (button) {
    if (button.tagName !== 'BUTTON') return;
    button.addEventListener('click', function () {
      document.body.dataset.view = button.dataset.view;
      document.querySelectorAll('button[data-view]').forEach(function (item) {
        item.setAttribute('aria-pressed', String(item === button));
      });
      window.dispatchEvent(new Event('resize'));
    });
  });
  var menu = document.getElementById('moreMenu');
  var trigger = menu.querySelector('summary');
  menu.addEventListener('click', function (event) {
    if (!event.target.closest('button')) return;
    menu.open = false;
  }, true);
  document.addEventListener('click', function (event) {
    if (!menu.contains(event.target)) menu.open = false;
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && menu.open) { menu.open = false; trigger.focus(); }
    if (event.key !== 'Tab') return;
    var modal = document.querySelector('.modal:not([hidden])');
    if (!modal) return;
    var focusable = Array.from(modal.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]')).filter(function (item) {
      return !item.disabled && item.getClientRects().length;
    });
    if (!focusable.length) return;
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  document.querySelectorAll('.modal').forEach(function (modal) {
    new MutationObserver(function () {
      if (modal.hidden && menu.contains(document.activeElement)) trigger.focus();
    }).observe(modal, { attributes: true, attributeFilter: ['hidden'] });
  });
})();
