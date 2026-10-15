/* Crosshair — porte para JavaScript puro do componente React Bits (JS + CSS).
   Uso: const c = Crosshair(elementoHost, { color: '#f7f3ec', ... });  c.update({ opacity: .5 });  c.destroy();
   O host precisa ter position diferente de static. */
(function () {
  'use strict';

  var LINE_STYLES = ['solid', 'dashed', 'dotted'];
  var EFFECTS = ['lock', 'glitch', 'none'];
  var HIDDEN = 'crosshair-cursor-hidden';
  var DEFAULTS = {
    color: '#ffffff', thickness: 1, opacity: 0.85, lineStyle: 'solid', gap: 0, fade: 0, smoothing: 0.35,
    showCoordinates: true, targetEffect: 'lock', targetSelector: 'a, button, [data-crosshair-target]',
    clickPulse: true, hideCursor: false, blendMode: 'normal', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
  };

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

  function toRgb(ctx, color) {
    ctx.fillStyle = '#000';
    ctx.fillStyle = color;
    var value = String(ctx.fillStyle);
    if (value.charAt(0) === '#') {
      var hex = parseInt(value.slice(1, 7), 16);
      return { r: (hex >> 16) & 255, g: (hex >> 8) & 255, b: hex & 255, a: 1 };
    }
    var p = (value.match(/[\d.]+/g) || [255, 255, 255, 1]).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p[3] == null ? 1 : p[3] };
  }

  function Crosshair(host, options) {
    var o = Object.assign({}, DEFAULTS, options || {});
    var canvas = document.createElement('canvas');
    canvas.className = 'crosshair-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5;mix-blend-mode:' + o.blendMode;
    host.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    if (!ctx) { canvas.remove(); return { update: function () {}, destroy: function () {} }; }

    function settings() {
      return {
        color: o.color, thickness: clamp(o.thickness, 0.5, 8), opacity: clamp(o.opacity, 0, 1),
        lineStyle: LINE_STYLES.indexOf(o.lineStyle) >= 0 ? o.lineStyle : 'solid',
        gap: Math.max(0, o.gap), fade: clamp(o.fade, 0, 1), smoothing: clamp(o.smoothing, 0, 1),
        showCoordinates: o.showCoordinates, targetEffect: EFFECTS.indexOf(o.targetEffect) >= 0 ? o.targetEffect : 'lock',
        targetSelector: o.targetSelector, clickPulse: o.clickPulse, hideCursor: o.hideCursor
      };
    }
    var s = settings();
    var FONT = '500 10px ' + o.fontFamily;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var state = {
      x: 0, y: 0, tx: 0, ty: 0, clientX: 0, clientY: 0, inside: false, seen: false, presence: 0, glitch: 0,
      target: null, lock: { x: 0, y: 0, w: 0, h: 0, alpha: 0 }, pulses: []
    };
    var size = { w: 0, h: 0, dpr: 1 };
    var ink = toRgb(ctx, s.color), inkSource = s.color;
    var raf = 0, last = 0, alive = true;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      size.dpr = Math.min(window.devicePixelRatio || 1, 2);
      size.w = rect.width; size.h = rect.height;
      canvas.width = Math.max(1, Math.round(rect.width * size.dpr));
      canvas.height = Math.max(1, Math.round(rect.height * size.dpr));
      wake();
    }
    function rgba(alpha) { return 'rgba(' + ink.r + ', ' + ink.g + ', ' + ink.b + ', ' + clamp(alpha * ink.a, 0, 1) + ')'; }
    function crisp(value, width) {
      var device = Math.round(width * size.dpr);
      return (Math.round(value * size.dpr) + (device % 2 ? 0.5 : 0)) / size.dpr;
    }

    function tag(text, x, y, align) {
      ctx.font = FONT;
      var width = ctx.measureText(text).width + 10, height = 16;
      var left = align === 'center' ? x - width / 2 : x;
      var top = align === 'middle' ? y - height / 2 : y;
      left = clamp(left, 4, size.w - width - 4);
      top = clamp(top, 4, size.h - height - 4);
      var light = ink.r * 0.2126 + ink.g * 0.7152 + ink.b * 0.0722 > 150;
      ctx.fillStyle = rgba(1);
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(left, top, width, height, 3); else ctx.rect(left, top, width, height);
      ctx.fill();
      ctx.fillStyle = light ? '#0a0a0a' : '#ffffff';
      ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      ctx.fillText(text, left + width / 2, top + height / 2 + 0.5);
    }

    function segment(x1, y1, x2, y2, horizontal) {
      var length = horizontal ? x2 - x1 : y2 - y1;
      if (length <= 0) return;
      if (s.fade > 0) {
        var gradient = horizontal ? ctx.createLinearGradient(0, 0, size.w, 0) : ctx.createLinearGradient(0, 0, 0, size.h);
        var at = clamp(horizontal ? state.x / size.w : state.y / size.h, 0.001, 0.999);
        gradient.addColorStop(0, rgba(1 - s.fade));
        gradient.addColorStop(at, rgba(1));
        gradient.addColorStop(1, rgba(1 - s.fade));
        ctx.strokeStyle = gradient;
      } else ctx.strokeStyle = rgba(1);
      ctx.beginPath();
      if (state.glitch > 0.01) {
        var pieces = Math.max(4, Math.round(length / 28));
        for (var i = 0; i < pieces; i++) {
          var jitter = (Math.random() - 0.5) * 14 * state.glitch, from = i / pieces, to = (i + 1) / pieces;
          if (horizontal) { ctx.moveTo(x1 + length * from, y1 + jitter); ctx.lineTo(x1 + length * to, y1 + jitter); }
          else { ctx.moveTo(x1 + jitter, y1 + length * from); ctx.lineTo(x1 + jitter, y1 + length * to); }
        }
      } else { ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }
      ctx.stroke();
    }

    function brackets(x, y, w, h) {
      var arm = Math.min(14, w / 3, h / 3);
      ctx.strokeStyle = rgba(1);
      ctx.lineWidth = Math.max(1.5, s.thickness);
      ctx.setLineDash([]); ctx.lineCap = 'square';
      ctx.beginPath();
      ctx.moveTo(x, y + arm); ctx.lineTo(x, y); ctx.lineTo(x + arm, y);
      ctx.moveTo(x + w - arm, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + arm);
      ctx.moveTo(x + w, y + h - arm); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - arm, y + h);
      ctx.moveTo(x + arm, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - arm);
      ctx.stroke();
    }

    function draw() {
      ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
      ctx.clearRect(0, 0, size.w, size.h);
      if (state.presence > 0.001) {
        ctx.globalAlpha = state.presence * s.opacity * (1 - 0.6 * state.lock.alpha);
        ctx.lineWidth = s.thickness;
        ctx.lineCap = s.lineStyle === 'dotted' ? 'round' : 'butt';
        if (s.lineStyle === 'dashed') ctx.setLineDash([s.thickness * 6, s.thickness * 5]);
        else if (s.lineStyle === 'dotted') ctx.setLineDash([0, s.thickness * 4]);
        else ctx.setLineDash([]);
        var x = crisp(state.x, s.thickness), y = crisp(state.y, s.thickness);
        segment(0, y, x - s.gap, y, true);
        segment(x + s.gap, y, size.w, y, true);
        segment(x, 0, x, y - s.gap, false);
        segment(x, y + s.gap, x, size.h, false);
        if (s.hideCursor) {
          ctx.fillStyle = rgba(1);
          ctx.beginPath(); ctx.arc(state.x, state.y, Math.max(1.5, s.thickness * 1.5), 0, Math.PI * 2); ctx.fill();
        }
        if (s.showCoordinates && state.lock.alpha < 0.999) {
          ctx.globalAlpha = state.presence * s.opacity * (1 - state.lock.alpha);
          tag(String(Math.round(state.x)), state.x, 8, 'center');
          tag(String(Math.round(state.y)), 8, state.y, 'middle');
        }
      }
      if (state.lock.alpha > 0.001) {
        var L = state.lock;
        ctx.globalAlpha = L.alpha * s.opacity;
        brackets(L.x, L.y, L.w, L.h);
        if (s.showCoordinates && state.target) {
          var box = state.target.getBoundingClientRect();
          tag(Math.round(box.width) + ' × ' + Math.round(box.height), L.x + L.w / 2, L.y + L.h + 8, 'center');
        }
      }
      state.pulses.forEach(function (p) {
        var t = p.age / 0.55, eased = 1 - Math.pow(1 - t, 3);
        ctx.globalAlpha = Math.pow(1 - t, 2) * s.opacity;
        ctx.strokeStyle = rgba(1); ctx.lineWidth = Math.max(1, s.thickness); ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(p.x, p.y, 3 + 30 * eased, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }

    function relative() {
      var rect = canvas.getBoundingClientRect();
      state.tx = state.clientX - rect.left;
      state.ty = state.clientY - rect.top;
      return rect;
    }

    function tick(now) {
      raf = 0;
      if (!alive) return;
      var dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      if (s.color !== inkSource) { inkSource = s.color; ink = toRgb(ctx, s.color); }
      var rect = relative();
      var follow = reduce || s.smoothing === 0 ? 1 : 1 - Math.exp(-dt / (0.008 + s.smoothing * 0.16));
      state.x += (state.tx - state.x) * follow;
      state.y += (state.ty - state.y) * follow;
      var wanted = state.inside ? 1 : 0;
      state.presence += (wanted - state.presence) * (reduce ? 1 : 1 - Math.exp(-dt / (wanted ? 0.12 : 0.25)));
      if (Math.abs(wanted - state.presence) < 0.002) state.presence = wanted;
      var lock = state.lock;
      var locked = s.targetEffect === 'lock' && state.inside ? state.target : null;
      var goal;
      if (locked) {
        var box = locked.getBoundingClientRect();
        goal = { x: box.left - rect.left - 6, y: box.top - rect.top - 6, w: box.width + 12, h: box.height + 12 };
      } else goal = { x: state.x - 10, y: state.y - 10, w: 20, h: 20 };
      var snap = reduce ? 1 : 1 - Math.exp(-dt / 0.085);
      lock.x += (goal.x - lock.x) * snap; lock.y += (goal.y - lock.y) * snap;
      lock.w += (goal.w - lock.w) * snap; lock.h += (goal.h - lock.h) * snap;
      var shown = locked ? 1 : 0;
      lock.alpha += (shown - lock.alpha) * (reduce ? 1 : 1 - Math.exp(-dt / (shown ? 0.08 : 0.14)));
      if (Math.abs(shown - lock.alpha) < 0.002) lock.alpha = shown;
      state.glitch = reduce ? 0 : Math.max(0, state.glitch - dt / 0.5);
      state.pulses = state.pulses.filter(function (p) { return (p.age += dt) < 0.55; });
      draw();
      var settling = Math.abs(state.tx - state.x) > 0.05 || Math.abs(state.ty - state.y) > 0.05 ||
        state.presence !== wanted || lock.alpha !== shown ||
        (locked && Math.abs(goal.w - lock.w) + Math.abs(goal.x - lock.x) + Math.abs(goal.y - lock.y) > 0.1) ||
        state.glitch > 0 || state.pulses.length > 0;
      if (settling) raf = requestAnimationFrame(tick);
    }

    function wake() {
      if (raf || !alive) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
    function setCursorHidden(hidden) { host.classList.toggle(HIDDEN, hidden); }

    function pick(element) {
      if (s.targetEffect === 'none' || !(element instanceof Element)) return null;
      var found = null;
      try { found = element.closest(s.targetSelector); } catch (e) { found = null; }
      if (found && !host.contains(found)) return null;
      return found;
    }
    function retarget(element) {
      var next = pick(element);
      if (next === state.target) return;
      state.target = next;
      if (next && s.targetEffect === 'glitch') state.glitch = 1;
    }
    function enter() {
      if (!state.seen) {
        state.seen = true;
        relative();
        state.x = state.tx; state.y = state.ty;
        state.lock.x = state.x - 10; state.lock.y = state.y - 10; state.lock.w = 20; state.lock.h = 20;
      }
      state.inside = true;
      setCursorHidden(s.hideCursor);
    }
    function leave() { state.inside = false; state.target = null; setCursorHidden(false); wake(); }

    function onMove(e) {
      state.clientX = e.clientX; state.clientY = e.clientY;
      if (e.pointerType === 'touch' && e.buttons === 0) return;
      enter(); retarget(e.target); wake();
    }
    function onDown(e) {
      onMove(e);
      if (!s.clickPulse || reduce) return;
      relative();
      state.pulses.push({ x: state.tx, y: state.ty, age: 0 });
      wake();
    }
    function onUp(e) { if (e.pointerType !== 'mouse') leave(); }
    function onScroll() {
      if (!state.inside) return;
      retarget(document.elementFromPoint(state.clientX, state.clientY));
      wake();
    }

    var observer = new ResizeObserver(resize);
    observer.observe(canvas);
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    host.addEventListener('pointerleave', leave);
    resize();

    return {
      update: function (next) { Object.assign(o, next); s = settings(); wake(); },
      destroy: function () {
        alive = false;
        cancelAnimationFrame(raf);
        observer.disconnect();
        host.removeEventListener('pointermove', onMove);
        host.removeEventListener('pointerdown', onDown);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        window.removeEventListener('scroll', onScroll, { capture: true });
        host.removeEventListener('pointerleave', leave);
        setCursorHidden(false);
        canvas.remove();
      }
    };
  }

  window.Crosshair = Crosshair;
})();
