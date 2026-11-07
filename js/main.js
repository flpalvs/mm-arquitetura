(() => {
  'use strict';
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ---------- Abertura: logo + frase digitada ---------- */
  const introEl = $('.intro-screen');
  if (introEl && root.classList.contains('intro-on')) {
    const phrase = 'Arquitetura com propósito.';
    const out = $('.typed', introEl);
    let n = 0;
    let closing = false;
    const finish = () => {
      if (closing) return;
      closing = true;
      try { sessionStorage.setItem('mm-intro', '1'); } catch (e) {}
      // círculo que se abre do centro, revelando o hero por trás
      const end = Math.hypot(window.innerWidth, window.innerHeight) / 2 + 60;
      const DUR = 2600;
      const t0 = performance.now();
      const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
      const step = (now) => {
        const p = Math.min((now - t0) / DUR, 1);
        introEl.style.setProperty('--r', (-40 + (end + 40) * ease(p)).toFixed(1) + 'px');
        if (p < 1) requestAnimationFrame(step); else { introEl.remove(); root.classList.remove('intro-on'); }
      };
      requestAnimationFrame(step);
    };
    const type = () => {
      out.textContent = phrase.slice(0, ++n);
      if (n < phrase.length) setTimeout(type, 70 + Math.random() * 40);
      else setTimeout(finish, 1100);
    };
    setTimeout(type, 1300);
    setTimeout(finish, 9000); // segurança
  }

  /* ---------- Cabeçalho ---------- */
  const header = $('.header');
  const onHeader = () => {
    const counter = $('[data-counter]');
    const hero = $('.hero');
    const menuOpen = document.body.classList.contains('menu-open');
    let solid = window.scrollY > 60;
    let fade = 1;
    if (counter && hero) {
      // home: o navbar some aos poucos ao sair do hero (sem fundo), fica oculto na seção +600 e volta depois dela
      const past = counter.getBoundingClientRect().bottom <= window.innerHeight * 0.6;
      solid = past;
      fade = past ? 1 : Math.min(1, Math.max(0, 1 - window.scrollY / (hero.offsetHeight * 0.55)));
      const ch = $('[data-chapters]');
      if (ch && solid) { const r = ch.getBoundingClientRect(); if (r.top <= 1 && r.bottom > window.innerHeight * 0.5) solid = false; }
    }
    if (menuOpen) fade = 1;
    header.classList.toggle('is-solid', solid);
    header.classList.toggle('is-away', fade < 0.05);
    header.style.setProperty('--fade', fade.toFixed(3));
  };

  /* ---------- Menu mobile ---------- */
  const burger = $('.burger');
  const setMenu = (open) => {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    onHeader();
  };
  burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('.nav a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- Hero: fotos passando devagar ---------- */
  const slides = $$('.hero__slide');
  if (slides.length > 1) {
    const SLIDE_MS = 6500;
    const counter = $('.hero__count');
    const bar = $('.hero__bar i');
    let i = 0;
    let timer;

    // carrega as fotos do hero uma de cada vez (só a próxima), para a abertura ser leve
    const loadSlide = (k) => {
      const img = $('img', slides[(k + slides.length) % slides.length]);
      if (img && img.dataset.srcset) { img.srcset = img.dataset.srcset; img.removeAttribute('data-srcset'); }
    };
    const warm = () => loadSlide(1);
    if (document.readyState === 'complete') warm(); else window.addEventListener('load', warm);

    const show = (n) => {
      const prev = slides[i];
      prev.classList.remove('is-active');
      prev.classList.add('is-leaving');
      setTimeout(() => prev.classList.remove('is-leaving'), 2800);
      i = (n + slides.length) % slides.length;
      slides[i].classList.add('is-active');
      loadSlide(i + 1);
      if (counter) counter.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
      if (bar) { bar.classList.remove('run'); void bar.offsetWidth; bar.classList.add('run'); }
    };
    const start = () => { clearInterval(timer); timer = setInterval(() => { const nx = $('img', slides[(i + 1) % slides.length]); if (nx && nx.dataset.srcset) loadSlide(i + 1); if (nx && !nx.complete) return; show(i + 1); }, SLIDE_MS); if (bar) { bar.classList.remove('run'); void bar.offsetWidth; bar.classList.add('run'); } };
    root.style.setProperty('--slide', SLIDE_MS + 'ms');
    if (counter) counter.textContent = '01 / ' + String(slides.length).padStart(2, '0');
    if (!reduce) {
      start();
      document.addEventListener('visibilitychange', () => (document.hidden ? clearInterval(timer) : start()));
    } else if (bar) bar.parentElement.hidden = true;
  }

  /* ---------- Título do hero (TechText) ---------- */
  const techTitle = $('[data-techtext]');
  if (techTitle && window.TechText) {
    const lines = techTitle.dataset.techtext.split('|');
    const wrap = document.createElement('div');
    wrap.className = 'techtext-hero';
    wrap.setAttribute('aria-hidden', 'true');
    techTitle.after(wrap);
    techTitle.classList.add('hero__title--tech');
    const FONT = '"Instrument Sans", "Helvetica Neue", Arial, sans-serif';
    const WEIGHT = 500, SPACING = -0.03, LINE_H = 1.25;
    const instances = lines.map((text) => {
      const el = document.createElement('div');
      wrap.appendChild(el);
      return { el, api: window.TechText(el, {
        text, fontFamily: FONT, fontWeight: WEIGHT, letterSpacing: SPACING,
        color: '#f7f3ec', accentColor: '#f7f3ec', align: 'left', heightFit: 0.8,
        reveal: 'letter', reach: 200, specks: 0, dashLength: 4, dashGap: 2, strokeWidth: 1.5,
        sweep: false, draggable: true
      }) };
    });
    // mesmo tamanho de fonte em todas as linhas: o maior que cabe na largura e na altura
    const probe = document.createElement('canvas').getContext('2d');
    const layout = () => {
      probe.font = WEIGHT + ' 100px ' + FONT;
      if ('letterSpacing' in probe) probe.letterSpacing = (SPACING * 100) + 'px';
      const unit = Math.max(...lines.map((l) => probe.measureText(l).width)) / 100;
      const avail = wrap.clientWidth || window.innerWidth;
      const maxByHeight = window.innerHeight * 0.17;
      const fs = Math.max(34, Math.min(150, (avail * 0.94) / unit, maxByHeight));
      instances.forEach(({ el, api }) => {
        el.style.height = (fs * LINE_H).toFixed(1) + 'px';
        api.update({ fontSize: fs });
      });
    };
    layout();
    if (document.fonts) document.fonts.load(WEIGHT + ' 100px ' + FONT).then(layout, layout);
    window.addEventListener('resize', layout);

    // uma letra ativa por vez, passando de letra em letra pelas linhas
    let hover = false, step = 0;
    wrap.addEventListener('pointerenter', () => { hover = true; instances.forEach(({ api }) => api.highlight(-1)); });
    wrap.addEventListener('pointerleave', () => { hover = false; });
    if (!reduce) {
      setInterval(() => {
        if (hover || document.hidden || window.scrollY > window.innerHeight * 0.8) return;
        const order = [];
        instances.forEach(({ api }, li) => { for (let g = 0; g < api.count(); g++) order.push([li, g]); });
        if (!order.length) return;
        const [li, g] = order[step++ % order.length];
        instances.forEach(({ api }, k) => api.highlight(k === li ? g : -1));
      }, 1100);
    }
  }

  /* ---------- Residencial + Comercial: a foto se abre em tela cheia; a 2ª cena cobre a 1ª ---------- */
  $$('[data-chapters]').forEach((sec) => {
    const panels = $$('[data-panel]', sec).map((el) => ({ el, media: $('.cpanel__media', el), img: $('.cpanel__media img', el) }));
    const idx = $('.chapters__index', sec);
    if (panels.length < 2) return;
    if (reduce) { panels.forEach((pn) => pn.el.classList.add('is-in')); return; }
    const [a, b] = panels;
    let target = 0, current = 0, raf = 0, near = false;
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const seg = (p, s, e) => clamp((p - s) / (e - s), 0, 1);
    const io3 = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const read = () => {
      const r = sec.getBoundingClientRect(), vh = window.innerHeight;
      // -1 … 0: entrando por baixo · 0 … 1: fixa na tela
      target = r.top > 0 ? -clamp(r.top / vh, 0, 1) : clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
    };
    const frame = () => {
      raf = 0;
      current += (target - current) * 0.1;
      if (Math.abs(target - current) < 0.0004) current = target;
      const p = current;
      // abertura: a foto chega recortada nas laterais e se abre até as bordas
      const open = io3(clamp(1 + p, 0, 1));
      a.media.style.clipPath = open >= 1 ? '' : 'inset(0 ' + ((1 - open) * 7).toFixed(2) + 'vw round ' + ((1 - open) * 6).toFixed(1) + 'px)';
      // troca: a 2ª cena sobe por cima; a 1ª afunda e escurece
      const c = io3(seg(p, 0.2, 0.7));
      b.el.style.clipPath = 'inset(' + ((1 - c) * 100).toFixed(2) + '% 0 0 0)';
      b.el.style.visibility = c > 0 ? 'visible' : 'hidden';
      a.img.style.transform = 'translate3d(0,' + (-c * 8).toFixed(2) + '%,0) scale(' + (1.16 - 0.16 * open).toFixed(4) + ')';
      a.media.style.setProperty('--dim', (c * 0.6).toFixed(3));
      b.img.style.transform = 'translate3d(0,' + ((1 - c) * 14).toFixed(2) + '%,0) scale(' + (1.1 - 0.1 * c).toFixed(4) + ')';
      a.el.classList.toggle('is-in', p > -0.3 && c < 0.4);
      b.el.classList.toggle('is-in', c > 0.6);
      if (idx) idx.style.setProperty('--p', clamp(p, 0, 1).toFixed(3));
      if (current !== target && near) raf = requestAnimationFrame(frame);
    };
    const kick = () => { read(); if (!raf) raf = requestAnimationFrame(frame); };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((e) => { near = e[0].isIntersecting; if (near) kick(); }, { rootMargin: '40% 0px' }).observe(sec);
    } else near = true;
    window.addEventListener('scroll', () => { if (near) kick(); }, { passive: true });
    window.addEventListener('resize', kick);
    read(); current = target; frame();
  });

  /* ---------- Projetos: a rolagem vertical move a faixa de cards para o lado ---------- */
  $$('[data-hscroll]').forEach((sec) => {
    const track = $('.hscroll__track', sec);
    const bar = $('.hscroll__bar', sec);
    const cards = $$('.pcard', sec);
    if (!track || !cards.length) return;
    cards.forEach((c, i) => c.style.setProperty('--d', (i * 0.09).toFixed(2) + 's'));
    if ('IntersectionObserver' in window && !reduce) {
      const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) { sec.classList.add('is-in'); io.disconnect(); } }, { threshold: 0.2 });
      io.observe(sec);
    } else sec.classList.add('is-in');
    if (reduce) return;
    sec.classList.add('is-pinned');
    let dist = 0, target = 0, current = 0, raf = 0, near = false, items = [];
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const read = () => {
      const r = sec.getBoundingClientRect();
      target = clamp(-r.top / Math.max(1, r.height - window.innerHeight), 0, 1);
    };
    const frame = () => {
      raf = 0;
      current += (target - current) * 0.12;
      if (Math.abs(target - current) < 0.0002) current = target;
      const x = -dist * current, vw = window.innerWidth;
      track.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
      if (bar) bar.style.setProperty('--p', current.toFixed(4));
      // cada foto desliza um pouco dentro do card (parallax lateral)
      items.forEach((it) => {
        const k = clamp((it.x + x + it.w / 2 - vw / 2) / vw, -1, 1);
        it.img.style.transform = 'translate3d(' + (-k * 6).toFixed(2) + '%,0,0)';
      });
      if (current !== target && near) raf = requestAnimationFrame(frame);
    };
    const kick = () => { read(); if (!raf) raf = requestAnimationFrame(frame); };
    const layout = () => {
      const vw = window.innerWidth, vh = window.innerHeight;
      const last = cards[cards.length - 1];
      const pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
      dist = Math.max(0, last.offsetLeft + last.offsetWidth + pad - vw);
      // no desktop a faixa anda mais rápido que a rolagem: menos scroll para ver tudo
      sec.style.height = (vh + dist * (vw > 800 ? 0.5 : 0.7)).toFixed(0) + 'px';
      items = cards.map((c) => ({ img: $('img', c), x: c.offsetLeft, w: c.offsetWidth }));
      kick();
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((e) => {
        near = e[0].isIntersecting;
        if (near) { cards.forEach((c) => { const im = $('img', c); if (im) im.loading = 'eager'; }); kick(); }
      }, { rootMargin: '60% 0px' }).observe(sec);
    } else near = true;
    window.addEventListener('scroll', () => { if (near) kick(); }, { passive: true });
    window.addEventListener('resize', layout);
    if (document.fonts) document.fonts.ready.then(layout);
    layout(); current = target; frame();
  });

  /* ---------- Galeria masonry + ampliar foto ---------- */
  let lightbox = null;
  const openLightbox = (links, index) => {
    if (!lightbox) {
      const el = document.createElement('div');
      el.className = 'lightbox';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.setAttribute('aria-label', 'Foto ampliada');
      el.innerHTML = '<img alt=""><button class="lightbox__prev" aria-label="Foto anterior">\u2190</button><button class="lightbox__next" aria-label="Próxima foto">\u2192</button><button class="lightbox__close">fechar</button>';
      document.body.appendChild(el);
      lightbox = { el, img: $('img', el), i: 0, links: [] };
      const go = (d) => { lightbox.i = (lightbox.i + d + lightbox.links.length) % lightbox.links.length; show(); };
      const close = () => { el.classList.remove('is-open'); document.body.style.overflow = ''; };
      const show = () => {
        const a = lightbox.links[lightbox.i];
        lightbox.img.src = a.href;
        lightbox.img.alt = $('img', a).alt;
      };
      $('.lightbox__prev', el).addEventListener('click', (e) => { e.stopPropagation(); go(-1); });
      $('.lightbox__next', el).addEventListener('click', (e) => { e.stopPropagation(); go(1); });
      $('.lightbox__close', el).addEventListener('click', close);
      el.addEventListener('click', (e) => { if (e.target === el || e.target === lightbox.img) close(); });
      document.addEventListener('keydown', (e) => {
        if (!el.classList.contains('is-open')) return;
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowLeft') go(-1);
        else if (e.key === 'ArrowRight') go(1);
      });
      lightbox.show = show;
    }
    lightbox.links = links;
    lightbox.i = index;
    lightbox.show();
    lightbox.el.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  };

  $$('[data-masonry]').forEach((root) => {
    const items = $$('.masonry__item', root);
    root.classList.add('is-ready');
    const columnsFor = (w) => (w >= 1500 ? 5 : w >= 1000 ? 4 : w >= 600 ? 3 : w >= 380 ? 2 : 1);
    const layout = () => {
      const w = root.clientWidth;
      if (!w) return;
      const cols = columnsFor(w);
      const colW = w / cols;
      const heights = new Array(cols).fill(0);
      items.forEach((el) => {
        const c = heights.indexOf(Math.min(...heights));
        const h = colW * (parseFloat(el.dataset.h) / parseFloat(el.dataset.w));
        el.style.width = colW.toFixed(2) + 'px';
        el.style.height = h.toFixed(2) + 'px';
        el.style.transform = 'translate(' + (c * colW).toFixed(2) + 'px,' + heights[c].toFixed(2) + 'px)';
        heights[c] += h;
      });
      root.style.height = Math.max(...heights).toFixed(0) + 'px';
    };
    layout();
    if ('ResizeObserver' in window) new ResizeObserver(layout).observe(root); else window.addEventListener('resize', layout);

    // entrada: de baixo para cima, desfocado → nítido, com pequeno atraso entre fotos
    let batch = 0, batchTimer = 0;
    const show = (el) => {
      el.style.setProperty('--d', (batch++ * 0.06).toFixed(2) + 's');
      el.classList.add('is-in');
      clearTimeout(batchTimer);
      batchTimer = setTimeout(() => { batch = 0; }, 150);
    };
    if ('IntersectionObserver' in window && !reduce) {
      const io = new IntersectionObserver((entries) => {
        entries.filter((en) => en.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left)
          .forEach((en) => { show(en.target); io.unobserve(en.target); });
      }, { threshold: 0.08, rootMargin: '0px 0px -4% 0px' });
      items.forEach((el) => io.observe(el));
    } else items.forEach((el) => el.classList.add('is-in'));

    items.forEach((el, i) => el.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      openLightbox(items, i);
    }));
  });

  /* ---------- Mira (Crosshair): hero e seção +600 ---------- */
  if (window.Crosshair && window.matchMedia('(hover: hover)').matches) {
    $$('[data-crosshair]').forEach((host) => window.Crosshair(host, {
      color: host.dataset.crosshair || '#f7f3ec', thickness: 1, opacity: 0.35, lineStyle: 'dashed', fade: 0.6, smoothing: 0.45,
      showCoordinates: false, targetEffect: 'none', clickPulse: false, hideCursor: false
    }));
  }

  /* ---------- Números: +600 (a foto do centro cresce, as vizinhas diminuem; ligado à rolagem) ---------- */
  $$('[data-counter]').forEach((sec) => {
    const num = $('[data-count]', sec);
    const real = $$('.counter__item', sec);
    // cópias nas pontas: a 1ª foto fica centralizada com vizinhas dos dois lados (e a última também)
    const PAD = 2;
    const strip = real[0].parentElement;
    const mk = (src) => { const c = src.cloneNode(true); c.setAttribute('aria-hidden', 'true'); const im = c.querySelector('img'); if (im) { im.alt = ''; im.loading = 'lazy'; } return c; };
    const left = [], right = [];
    for (let k = PAD; k >= 1; k--) { const c = mk(real[(real.length - k + real.length) % real.length]); strip.insertBefore(c, real[0]); left.push(c); }
    for (let k = 0; k < PAD; k++) { const c = mk(real[k % real.length]); strip.appendChild(c); right.push(c); }
    const items = [...left, ...real, ...right];
    const stick = $('.counter__stick', sec);
    const numEl = $('.counter__num', sec);
    const labelEl = $('.counter__label', sec);
    const n = real.length;
    const total = parseInt(num.dataset.count, 10);
    if (reduce || n < 2) return;
    let target = 0, current = 0, raf = 0, near = false;
    const INTRO = 0.22; // início da seção: a 1ª foto ocupa a tela toda e vai diminuindo até o padrão da fileira
    const ease = (x) => 1 - Math.pow(1 - x, 3);
    const smooth = (x) => x * x * (3 - 2 * x);
    const io3 = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const read = () => {
      const r = sec.getBoundingClientRect();
      const span = Math.max(1, r.height - window.innerHeight);
      target = clamp(-r.top / span, 0, 1);
      // quando a seção ocupa a tela toda (fixa), os textos entram: o número pela esquerda e o texto pela direita
      sec.classList.toggle('is-revealed', r.top <= 2 && target >= INTRO * 0.9);
    };
    const frame = () => {
      raf = 0;
      current += (target - current) * 0.1;
      if (Math.abs(target - current) < 0.0004) current = target;
      num.textContent = Math.round(total * ease(clamp((current - INTRO) / (0.85 - INTRO), 0, 1)));

      const vw = stick.clientWidth || window.innerWidth, vh = stick.clientHeight || window.innerHeight;
      const wide = vw > 800;
      // faixa livre para as fotos: entre o fim do número (topo) e o começo do texto (base)
      const topEdge = numEl.offsetTop + numEl.offsetHeight + 14;
      const bottomEdge = labelEl.offsetTop - 14;
      const freeH = Math.max(160, bottomEdge - topEdge);
      const centerY = topEdge + freeH / 2;
      const small = clamp(vw * 0.24, 190, 420);
      const bigW = wide ? Math.min(vw * 0.7, freeH / 0.62) : vw; // no celular a foto cresce até as bordas
      const big = Math.max(small * 1.2, bigW);
      const gap = clamp(vw * 0.016, 12, 28);
      const e = 1 - io3(clamp(current / INTRO, 0, 1));   // 1 = foto em tela cheia · 0 = tamanho normal da fileira
      const t = clamp((current - INTRO) / (1 - INTRO), 0, 1) * (n - 1);

      const focusOf = (i) => smooth(Math.max(0, 1 - Math.abs(t - i)));
      const widths = items.map((_, j) => small + (big - small) * focusOf(j - PAD));
      // altura: no desktop segue a proporção; no celular a foto em foco fica mais alta (quase retrato)
      const heights = items.map((_, j) => {
        const w = widths[j];
        if (wide) return Math.min(w * 0.62, freeH);
        const r = 0.8 + (Math.min(1.25, freeH / big) - 0.8) * focusOf(j - PAD);
        return Math.min(w * r, freeH);
      });
      // a 1ª foto, no início, cresce até cobrir o viewport inteiro
      widths[PAD] += (vw - widths[PAD]) * e;
      heights[PAD] += (vh - heights[PAD]) * e;
      const cy = centerY + (vh / 2 - centerY) * e;
      const pos = [];
      let x = 0;
      widths.forEach((w) => { pos.push(x); x += w + gap; });
      const i0 = Math.min(n - 2, Math.floor(t));
      const f = t - i0;
      const c0 = pos[i0 + PAD] + widths[i0 + PAD] / 2, c1 = pos[i0 + 1 + PAD] + widths[i0 + 1 + PAD] / 2;
      const offset = vw / 2 - (c0 + (c1 - c0) * f);

      items.forEach((el, j) => {
        const i = j - PAD;
        el.style.width = widths[j].toFixed(1) + 'px';
        el.style.height = heights[j].toFixed(1) + 'px';
        el.style.top = cy.toFixed(1) + 'px';
        if (i === 0) el.style.borderRadius = (2 * (1 - e)).toFixed(2) + 'px';
        el.style.transform = 'translate3d(' + (pos[j] + offset).toFixed(1) + 'px,-50%,0)';
        el.firstElementChild.style.transform = 'scale(' + (1.12 - 0.12 * Math.max(focusOf(i), i === 0 ? e : 0)).toFixed(4) + ')';
      });
      if (current !== target && near) raf = requestAnimationFrame(frame);
    };
    const kick = () => { read(); if (!raf) raf = requestAnimationFrame(frame); };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((e) => { near = e[0].isIntersecting; if (near) kick(); }, { rootMargin: '40% 0px' }).observe(sec);
    } else near = true;
    window.addEventListener('scroll', () => { if (near) kick(); }, { passive: true });
    window.addEventListener('resize', kick);
    read(); current = target; frame();
  });

  /* ---------- Essência: frase que desdobra em 3D, letra por letra (FoldText) ---------- */
  $$('[data-statement]').forEach((sec) => {
    const text = $('[data-fold]', sec);
    if (!text) return;
    let i = 0;
    $$('.w', text).forEach((word) => {
      const chars = Array.from(word.textContent);
      word.textContent = '';
      chars.forEach((ch) => {
        const seg = document.createElement('span');
        seg.className = 'fold-seg';
        const piece = document.createElement('span');
        piece.className = 'fold-piece';
        piece.textContent = ch;
        piece.style.setProperty('--i', String(i++));
        seg.appendChild(piece);
        word.appendChild(seg);
      });
    });
    sec.classList.add('is-folding');
    const play = () => requestAnimationFrame(() => requestAnimationFrame(() => sec.classList.add('is-in')));
    if ('IntersectionObserver' in window && !reduce) {
      const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) { play(); io.disconnect(); } }, { threshold: 0.6 });
      io.observe(text);
    } else sec.classList.add('is-in');
  });

  /* ---------- Abordagem: abertura encolhe e sai; etapas entram (legenda, título, foto que abre, texto) ---------- */
  $$('[data-statement]').forEach((sec) => {
    const intro = $('[data-intro]', sec);
    const sides = $$('[data-side]', sec).map((el) => ({ el, imgs: $$('img', el), lag: parseInt(el.dataset.lag || '0', 10) }));
    const steps = $$('[data-step]', sec).map((el) => ({
      el,
      cap: $('.bcap', el),
      title: $('.step__title span', el),
      text: $('.step__text', el),
      ms: $$('.m', el),
    }));
    if (reduce || !intro || !steps.length) return;
    let target = 0, current = 0, raf = 0, near = false;
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const seg = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
    const out3 = (x) => 1 - Math.pow(1 - x, 3);
    const io3 = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const sine = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x); // virar página: arranque e chegada bem suaves
    const read = () => {
      const r = sec.getBoundingClientRect();
      target = clamp(-r.top / Math.max(1, r.height - window.innerHeight), 0, 1);
    };
    const frame = () => {
      raf = 0;
      current += (target - current) * 0.1;
      if (Math.abs(target - current) < 0.0003) current = target;
      const p = current, vw = window.innerWidth, vh = window.innerHeight;

      // abertura: 1) a frase desdobra (tempo) 2) as fotos sobem 3) as fotos trocam uma vez
      sides.forEach((sd) => {
        const lag = sd.lag * 0.015;
        const rv = io3(seg(p, 0.01 + lag, 0.08 + lag));
        sd.el.style.clipPath = 'inset(' + ((1 - rv) * 100).toFixed(2) + '% 0 0 0)';
        const q = io3(seg(p, 0.1 + lag, 0.18 + lag)); // 0 .. 1
        const i0 = Math.min(sd.imgs.length - 2, Math.floor(q));
        const f = q - i0;
        sd.imgs.forEach((im, i) => {
          let show = false, z = 0, clip = '';
          if (i === i0) { show = true; z = 1; }
          else if (i === i0 + 1 && f > 0) { show = true; z = 2; clip = 'inset(' + ((1 - f) * 100).toFixed(2) + '% 0 0 0)'; }
          im.style.visibility = show ? 'visible' : 'hidden';
          im.style.zIndex = String(z);
          im.style.clipPath = clip;
          im.style.transform = 'scale(' + (1.12 - 0.12 * (i === i0 + 1 ? f : i === i0 ? 1 - f * 0.4 : 0)).toFixed(4) + ')';
        });
      });

      // depois, a abertura sai para a esquerda, como quem vira a página; a 1ª etapa chega pela direita
      const a = sine(seg(p, 0.2, 0.3));
      intro.style.transform = 'translate3d(' + (-vw * a).toFixed(1) + 'px,0,0)';
      intro.style.visibility = a >= 1 ? 'hidden' : 'visible';

      const S = 0.3, L = (1 - S) / steps.length; // cada etapa ocupa L da rolagem
      steps.forEach((st, k) => {
        const s0 = S + k * L;
        const last = k === steps.length - 1;
        // virar página: a etapa entra pela direita enquanto a anterior sai pela esquerda
        const enterStart = k === 0 ? 0.2 : s0 - L * 0.2;
        const enterEnd = k === 0 ? 0.3 : s0 + L * 0.12;
        const ent = sine(seg(p, enterStart, enterEnd));
        const tout = last ? 0 : sine(seg(p, s0 + L * 0.8, s0 + L * 1.12));
        const x = (1 - ent) * vw - tout * vw;
        const tin = out3(seg(p, enterEnd - L * 0.02, enterEnd + L * 0.26));
        const grow = io3(seg(p, s0 + L * 0.06, s0 + L * 0.42));
        st.el.style.opacity = '1';
        st.el.style.visibility = ent > 0 && tout < 1 ? 'visible' : 'hidden';
        st.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
        if (st.cap) st.cap.style.transform = 'translate3d(0,' + ((1 - tin) * 14).toFixed(1) + 'px,0)';
        st.title.style.transform = 'translate3d(0,' + ((1 - tin) * 105).toFixed(1) + '%,0)';
        st.text.style.opacity = out3(seg(p, s0 + L * 0.2, s0 + L * 0.36)).toFixed(3);
        st.text.style.transform = 'translate3d(0,' + ((1 - out3(seg(p, s0 + L * 0.2, s0 + L * 0.36))) * 24).toFixed(1) + 'px,0)';
        st.ms.forEach((m, i) => {
          const g = io3(seg(p, s0 + L * (0.06 + i * 0.05), s0 + L * (0.42 + i * 0.05)));
          const side = ((1 - g) * 50).toFixed(2);
          m.style.clipPath = 'inset(0 ' + side + '% 0 ' + side + '%)';
          m.firstElementChild.style.transform = 'scale(' + (1.18 - 0.18 * g).toFixed(4) + ')';
        });
        // etapa com transformação: esboço → esboço colorido → render, por varredura da esquerda para a direita
        const mo = $('[data-morph]', st.el);
        if (mo) {
          const l2 = $('.ly2', mo), l3 = $('.ly3', mo), scan = $('.morph__scan', mo), lab = $('[data-morph-label]', mo);
          const w2 = io3(seg(p, s0 + L * 0.46, s0 + L * 0.58));
          const w3 = io3(seg(p, s0 + L * 0.64, s0 + L * 0.76));
          l2.style.clipPath = 'inset(0 ' + ((1 - w2) * 100).toFixed(2) + '% 0 0)';
          l3.style.clipPath = 'inset(0 ' + ((1 - w3) * 100).toFixed(2) + '% 0 0)';
          const wip = w3 > 0 && w3 < 1 ? w3 : w2 > 0 && w2 < 1 ? w2 : -1;
          scan.style.opacity = wip >= 0 ? '1' : '0';
          if (wip >= 0) scan.style.left = (wip * 100).toFixed(2) + '%';
          const name = w3 > 0.5 ? 'obra' : w2 > 0.5 ? 'projeto' : 'esboço';
          if (lab && lab.textContent !== name) lab.textContent = name;
        }
      });
      if (current !== target && near) raf = requestAnimationFrame(frame);
    };
    const kick = () => { read(); if (!raf) raf = requestAnimationFrame(frame); };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((e) => { near = e[0].isIntersecting; if (near) kick(); }, { rootMargin: '40% 0px' }).observe(sec);
    } else near = true;
    window.addEventListener('scroll', () => { if (near) kick(); }, { passive: true });
    window.addEventListener('resize', kick);
    read(); current = target; frame();
  });

  /* ---------- Rodapé: o esboço só roda quando está à vista ---------- */
  $$('[data-sketch]').forEach((el) => {
    if (!('IntersectionObserver' in window)) { el.classList.add('is-live'); return; }
    new IntersectionObserver((e) => el.classList.toggle('is-live', e[0].isIntersecting), { threshold: 0.05 }).observe(el);
  });

  /* ---------- Entrada suave dos elementos ---------- */
  const revealEls = $$('[data-reveal], .reveal-img');
  if ('IntersectionObserver' in window && !reduce) {
    // quadros recortados por clip-path não contam como visíveis: observa o elemento pai
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { (en.target._reveal || en.target).classList.add('is-in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach((el) => {
      if (el.classList.contains('reveal-img') && el.parentElement) { el.parentElement._reveal = el; io.observe(el.parentElement); } else io.observe(el);
    });
  } else revealEls.forEach((el) => el.classList.add('is-in'));

  /* ---------- Movimento na rolagem (parallax, faixa, hero) ---------- */
  const para = $$('.frame__media').map((el) => ({ el, box: el.parentElement, on: false }));
  const marquees = $$('[data-marquee]');
  const heroBody = $('.hero__content');
  const heroEl = $('.hero');
  let ticking = false;

  if ('IntersectionObserver' in window) {
    const vis = new IntersectionObserver((entries) => {
      entries.forEach((en) => { const p = para.find((x) => x.box === en.target); if (p) p.on = en.isIntersecting; });
      update();
    }, { rootMargin: '10% 0px' });
    para.forEach((p) => vis.observe(p.box));
  } else para.forEach((p) => (p.on = true));

  function update() {
    ticking = false;
    const vh = window.innerHeight;
    if (!reduce) {
      para.forEach((p) => {
        if (!p.on) return;
        const r = p.box.getBoundingClientRect();
        const t = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2); // -1 … 1
        const amp = p.box.offsetHeight * 0.1;
        p.el.style.transform = 'translate3d(0,' + (t * amp).toFixed(1) + 'px,0)';
      });
      marquees.forEach((m) => {
        const r = m.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const track = m.firstElementChild;
        const max = track.scrollWidth - m.clientWidth;
        const prog = 1 - (r.top + r.height) / (vh + r.height);
        track.style.transform = 'translate3d(' + (-max * Math.min(Math.max(prog, 0), 1)).toFixed(1) + 'px,0,0)';
      });
      if (heroEl && vh > 0) {
        const y = Math.min(window.scrollY, vh * 1.1);
        const k = Math.min(y / vh, 1);
        const sticky = getComputedStyle(heroEl).position === 'sticky';
        heroEl.classList.toggle('is-gone', sticky && window.scrollY > vh * 1.05);
        heroEl.style.setProperty('--py', (sticky ? y * -0.3 : 0).toFixed(1) + 'px');
        heroEl.style.setProperty('--dim', (sticky ? k * 0.55 : 0).toFixed(3));
        if (heroBody) {
          heroBody.style.transform = 'translate3d(0,' + (y * (sticky ? -0.12 : -0.18)).toFixed(1) + 'px,0)';
          heroBody.style.opacity = String(Math.max(1 - y / (vh * 0.65), 0));
        }
      }
    }
    onHeader();
  }
  const requestTick = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', requestTick, { passive: true });
  window.addEventListener('resize', requestTick);
  update();
})();
