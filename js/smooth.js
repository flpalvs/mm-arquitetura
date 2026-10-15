/* Rolagem suave com inércia (mesma ideia do Lenis), sem biblioteca.
   Só no mouse/trackpad; teclado, barra de rolagem e toque continuam nativos. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (reduce || !fine) return;

  var root = document.documentElement;
  root.classList.add('smooth');
  var target = window.scrollY, current = target, raf = 0;
  var EASE = 0.085;
  var max = function () { return Math.max(0, root.scrollHeight - window.innerHeight); };
  var locked = function () { return document.body.classList.contains('menu-open') || document.body.style.overflow === 'hidden'; };

  function tick() {
    raf = 0;
    current += (target - current) * EASE;
    if (Math.abs(target - current) < 0.4) current = target;
    window.scrollTo(0, current);
    if (current !== target) raf = requestAnimationFrame(tick);
  }

  window.addEventListener('wheel', function (e) {
    if (e.ctrlKey || e.defaultPrevented || locked()) return;
    // não captura rolagem de dentro de áreas roláveis (ex.: menu)
    var el = e.target;
    while (el && el !== document.body) {
      if (el.scrollHeight > el.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(el).overflowY)) return;
      el = el.parentElement;
    }
    e.preventDefault();
    var d = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
    target = Math.min(max(), Math.max(0, target + d));
    if (!raf) raf = requestAnimationFrame(tick);
  }, { passive: false });

  // rolagem feita por outro meio (teclado, barra, âncora): acompanha a posição real
  window.addEventListener('scroll', function () {
    if (Math.abs(window.scrollY - current) > 2) current = target = window.scrollY;
  }, { passive: true });
  window.addEventListener('resize', function () { target = Math.min(target, max()); });

  // âncoras internas deslizam com a mesma suavidade
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href') === '#') return;
    var dest = document.getElementById(a.getAttribute('href').slice(1));
    if (!dest || locked()) return;
    e.preventDefault();
    target = Math.min(max(), dest.getBoundingClientRect().top + window.scrollY);
    if (!raf) raf = requestAnimationFrame(tick);
  });
})();
