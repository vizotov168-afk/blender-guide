/* ==========================================================================
   practice.js — интерактивность страницы practice.html
   Разделы:
     0. Утилиты
     1. Общие элементы страницы (тема, меню, прогресс скролла, появление блоков)
     2. 3D-ядро на Canvas (камера, домик, отрисовка)
     3. Симулятор горячих клавиш
     4. Лаборатория «Материалы и рендер»
     5. Чек-лист к урокам
     6. Словарь терминов
     7. Главный цикл анимации
   ========================================================================== */
(function () {
    'use strict';

    /* ======================================================================
       0. УТИЛИТЫ
       ====================================================================== */
    const $ = (sel, root) => (root || document).querySelector(sel);
    const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
    const TAU = Math.PI * 2;
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    function storageGet(key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }
    function storageSet(key, value) {
        try { localStorage.setItem(key, value); } catch (e) { /* приватный режим: просто не сохраняем */ }
    }
    function setText(el, text) { if (el) el.textContent = text; }

    // ---- цвета ----
    function hexToRgb(hex) {
        let h = String(hex || '#000000').replace('#', '');
        if (h.length === 3) h = h.split('').map(c => c + c).join('');
        const n = parseInt(h, 16) || 0;
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    function rgbStr(c, a) {
        const r = clamp(Math.round(c[0]), 0, 255);
        const g = clamp(Math.round(c[1]), 0, 255);
        const b = clamp(Math.round(c[2]), 0, 255);
        return a === undefined ? 'rgb(' + r + ',' + g + ',' + b + ')' : 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    }
    function mixRgb(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
    function scaleRgb(c, k) { return [clamp(c[0] * k, 0, 255), clamp(c[1] * k, 0, 255), clamp(c[2] * k, 0, 255)]; }

    // ---- векторы ----
    function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
    function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
    function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
    function unit3(a) {
        const l = Math.hypot(a[0], a[1], a[2]);
        return l < 1e-9 ? null : [a[0] / l, a[1] / l, a[2] / l];
    }

    // ---- плавные переходы (tween) ----
    const tweens = [];
    const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const linear = t => t;

    function tween(target, key, to, ms, ease, done) {
        for (let i = tweens.length - 1; i >= 0; i--) {
            if (tweens[i].target === target && tweens[i].key === key) tweens.splice(i, 1);
        }
        tweens.push({
            target: target,
            key: key,
            from: target[key],
            to: to,
            t0: performance.now(),
            dur: reducedMotion ? 1 : Math.max(1, ms),
            ease: ease || easeInOut,
            done: done
        });
    }

    function stepTweens(now) {
        for (let i = tweens.length - 1; i >= 0; i--) {
            const tw = tweens[i];
            if (!tw) continue;
            const t = clamp((now - tw.t0) / tw.dur, 0, 1);
            tw.target[tw.key] = lerp(tw.from, tw.to, tw.ease(t));
            if (t >= 1) {
                tweens.splice(i, 1);
                if (tw.done) tw.done();
            }
        }
    }

    // ---- выпуклая оболочка (для тени дома) ----
    function convexHull(points) {
        const pts = points.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]);
        if (pts.length < 3) return pts;
        const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
        const lower = [];
        for (let i = 0; i < pts.length; i++) {
            while (lower.length >= 2 && cr(lower[lower.length - 2], lower[lower.length - 1], pts[i]) <= 0) lower.pop();
            lower.push(pts[i]);
        }
        const upper = [];
        for (let i = pts.length - 1; i >= 0; i--) {
            while (upper.length >= 2 && cr(upper[upper.length - 2], upper[upper.length - 1], pts[i]) <= 0) upper.pop();
            upper.push(pts[i]);
        }
        upper.pop();
        lower.pop();
        return lower.concat(upper);
    }

    // ---- экранирование и подсветка для словаря ----
    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }
    function normText(s) { return String(s).toLowerCase().replace(/ё/g, 'е'); }

    function highlight(text, words) {
        if (!words.length) return escapeHtml(text);
        const n = normText(text);
        const ranges = [];
        words.forEach(w => {
            let i = n.indexOf(w);
            while (i !== -1) {
                ranges.push([i, i + w.length]);
                i = n.indexOf(w, i + w.length);
            }
        });
        if (!ranges.length) return escapeHtml(text);
        ranges.sort((a, b) => a[0] - b[0]);
        const merged = [ranges[0].slice()];
        for (let k = 1; k < ranges.length; k++) {
            const last = merged[merged.length - 1];
            if (ranges[k][0] <= last[1]) last[1] = Math.max(last[1], ranges[k][1]);
            else merged.push(ranges[k].slice());
        }
        let out = '';
        let pos = 0;
        merged.forEach(r => {
            out += escapeHtml(text.slice(pos, r[0])) + '<mark>' + escapeHtml(text.slice(r[0], r[1])) + '</mark>';
            pos = r[1];
        });
        return out + escapeHtml(text.slice(pos));
    }

    /* ======================================================================
       1. ОБЩИЕ ЭЛЕМЕНТЫ СТРАНИЦЫ
       ====================================================================== */

    // ---- тема: тот же ключ localStorage ('theme'), что и в script.js ----
    const themeBtn = $('#theme-toggle');
    const body = document.body;

    function applyTheme(theme) {
        if (theme === 'light') {
            body.setAttribute('data-theme', 'light');
            if (themeBtn) themeBtn.innerHTML = '🌙 Тёмная';
        } else {
            body.removeAttribute('data-theme');
            if (themeBtn) themeBtn.innerHTML = '☀️ Светлая';
        }
    }

    applyTheme(storageGet('theme') === 'light' ? 'light' : 'dark');

    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const next = body.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            applyTheme(next);
            storageSet('theme', next);
        });
    }

    // Тема изменилась в другой вкладке (например, на главной странице)
    window.addEventListener('storage', e => {
        if (e.key === 'theme') applyTheme(e.newValue === 'light' ? 'light' : 'dark');
    });
    // Возврат кнопкой «Назад» из кэша браузера
    window.addEventListener('pageshow', e => {
        if (e.persisted) applyTheme(storageGet('theme') === 'light' ? 'light' : 'dark');
    });

    // ---- бургер-меню ----
    const navToggle = $('#nav-toggle');
    const navLinks = $('#nav-links');
    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            const isOpen = navLinks.classList.toggle('open');
            navToggle.setAttribute('aria-expanded', String(isOpen));
        });
        $$('a', navLinks).forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('open');
                navToggle.setAttribute('aria-expanded', 'false');
            });
        });
    }

    // ---- прогресс-бар скролла и кнопка «наверх» ----
    const progressBar = $('#progress-bar');
    const backToTopBtn = $('#back-to-top');
    let scrollTicking = false;

    function onScroll() {
        const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
        if (progressBar) progressBar.style.width = scrolled + '%';
        if (backToTopBtn) backToTopBtn.classList.toggle('show', winScroll > 350);
        scrollTicking = false;
    }

    window.addEventListener('scroll', () => {
        if (!scrollTicking) {
            requestAnimationFrame(onScroll);
            scrollTicking = true;
        }
    }, { passive: true });
    onScroll();

    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    // ---- появление блоков при скролле ----
    if ('IntersectionObserver' in window) {
        const fadeObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0, rootMargin: '0px 0px -6% 0px' });
        $$('.fade-in').forEach(el => fadeObserver.observe(el));
    } else {
        $$('.fade-in').forEach(el => el.classList.add('visible'));
    }

    // ---- подсветка текущего раздела в меню ----
    if ('IntersectionObserver' in window && navLinks) {
        const sectionLinks = {};
        $$('a[href^="#"]', navLinks).forEach(a => { sectionLinks[a.getAttribute('href').slice(1)] = a; });
        const sectionObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                Object.keys(sectionLinks).forEach(id => sectionLinks[id].classList.remove('active'));
                const link = sectionLinks[entry.target.id];
                if (link) link.classList.add('active');
            });
        }, { threshold: 0, rootMargin: '-40% 0px -55% 0px' });
        Object.keys(sectionLinks).forEach(id => {
            const section = document.getElementById(id);
            if (section) sectionObserver.observe(section);
        });
    }

    /* ======================================================================
       2. 3D-ЯДРО НА CANVAS
       Мини-движок: камера с перспективой, модель домика из полигонов,
       отсечение задних граней, освещение по Ламберту, тень, свечение окон.
       ====================================================================== */

    // Размеры домика (Z — вверх, как в Blender)
    const HOUSE = { a: 1.3, b: 1.0, zE: 1.4, roofH: 1.0 };
    const CENTROID = [0, 0, 1.1];
    const LIGHT = unit3([0.55, -0.5, 0.75]);          // направление на «солнце» (мировые координаты)
    const VIEW_LIGHT = unit3([-0.35, -0.6, 0.72]);    // свет вьюпорта (координаты камеры)
    const SUN_TINT = [1.0, 0.82, 0.62];
    const AMB_TINT = [0.62, 0.7, 1.0];

    // Звёзды для вечернего неба (детерминированные, чтобы не мигали)
    const STARS = Array.from({ length: 70 }, (_, i) => {
        const r = k => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
        return { x: r(1), y: r(2), r: r(3) > 0.85 ? 2 : 1, a: 0.35 + r(4) * 0.55 };
    });

    function makeCamera(az, el, W, H, o) {
        const ca = Math.cos(az), sa = Math.sin(az);
        const ce = Math.cos(el), se = Math.sin(el);
        const cx = W / 2;
        const cy = H * o.cy;
        // поворот вектора в систему камеры (X вправо, Y вглубь, Z вверх)
        const toView = p => {
            const x = p[0] * ca - p[1] * sa;
            const y = p[0] * sa + p[1] * ca;
            return [x, y * ce - p[2] * se, y * se + p[2] * ce];
        };
        const project = p => {
            const v = toView([p[0], p[1], p[2] - o.tz]);
            const d = Math.max(0.3, v[1] + o.dist);
            const s = o.focal / d;
            return { x: cx + v[0] * s, y: cy - v[2] * s, d: d, s: s };
        };
        return { az: az, el: el, cx: cx, cy: cy, D: o.dist, f: o.focal, tz: o.tz, toView: toView, rot: toView, project: project };
    }

    function finishFace(pts, props) {
        let n = null;
        for (let k = 0; k + 2 < pts.length && !n; k++) {
            n = unit3(cross3(sub3(pts[k + 1], pts[k]), sub3(pts[k + 2], pts[k])));
        }
        const c = [0, 0, 0];
        pts.forEach(p => { c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; });
        c[0] /= pts.length; c[1] /= pts.length; c[2] /= pts.length;
        // нормаль всегда смотрит наружу от центра дома
        if (n && dot3(n, sub3(c, CENTROID)) < 0) n = [-n[0], -n[1], -n[2]];
        return Object.assign({ pts: pts, n: n, c: c }, props);
    }

    /*
       Модель домика. Индексы вершин:
         0..7   — нижнее кольцо (z = 0), 8-угольник: 4 угла срезаются фаской
         8..15  — среднее кольцо (линия Loop Cut)
         16..23 — верхнее кольцо (карниз)
         24, 25 — концы конька крыши
       o.c      — ширина фаски (0 = острые углы)
       o.ridge  — высота крыши 0..1 (0 = плоский верх, 1 = готовая крыша)
       o.loopZ  — высота среднего кольца
       o.attic  — рисовать ли чердачные окна
    */
    function buildHouse(o) {
        const a = HOUSE.a, b = HOUSE.b, zE = HOUSE.zE, c = o.c;
        const zM = o.loopZ;
        const zr = zE + o.ridge * HOUSE.roofH;
        const plan = [
            [-a + c, -b], [a - c, -b], [a, -b + c], [a, b - c],
            [a - c, b], [-a + c, b], [-a, b - c], [-a, -b + c]
        ];
        const verts = [];
        [0, zM, zE].forEach(z => plan.forEach(q => verts.push([q[0], q[1], z])));
        verts.push([-a, 0, zr], [a, 0, zr]);

        const faces = [];
        const add = (idx, props) => {
            faces.push(finishFace(idx.map(i => verts[i]), Object.assign({ idx: idx }, props)));
        };
        for (let i = 0; i < 8; i++) {
            const j = (i + 1) % 8;
            add([i, j, 8 + j, 8 + i], { t: 'wall', side: i, level: 0 });
            add([8 + i, 8 + j, 16 + j, 16 + i], { t: 'wall', side: i, level: 1 });
        }
        add([16, 17, 25, 24], { t: 'roof' });
        add([17, 18, 25], { t: 'roof', corner: true });
        add([18, 19, 25], { t: 'roof' });
        add([19, 20, 25], { t: 'roof', corner: true });
        add([20, 21, 24, 25], { t: 'roof' });
        add([21, 22, 24], { t: 'roof', corner: true });
        add([22, 23, 24], { t: 'roof' });
        add([23, 16, 24], { t: 'roof', corner: true });

        // окна и дверь — отдельные «наклейки» чуть над стеной
        const e = 0.012;
        const decor = (pts, kind) => faces.push(finishFace(pts, { decor: true, kind: kind }));
        const frontQuad = (x0, x1, z0, z1, y) => [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]];
        const sideQuad = (y0, y1, z0, z1, x) => [[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]];

        decor(frontQuad(-1.0, -0.5, 0.6, 1.1, -b - e), 'window');
        decor(frontQuad(0.5, 1.0, 0.6, 1.1, -b - e), 'window');
        decor(frontQuad(-0.22, 0.22, 0.0, 0.95, -b - e), 'door');
        decor(frontQuad(-1.0, -0.5, 0.6, 1.1, b + e), 'window');
        decor(frontQuad(0.5, 1.0, 0.6, 1.1, b + e), 'window');
        decor(sideQuad(-0.4, 0.4, 0.6, 1.1, a + e), 'window');
        decor(sideQuad(-0.4, 0.4, 0.6, 1.1, -a - e), 'window');
        if (o.attic) {
            decor(sideQuad(-0.18, 0.18, 1.5, 1.85, a + e), 'window');
            decor(sideQuad(-0.18, 0.18, 1.5, 1.85, -a - e), 'window');
        }
        return { verts: verts, faces: faces };
    }

    // Видимые грани (отсечение задних)
    function collectVisible(cam, mesh) {
        const bodyFaces = [];
        const decorFaces = [];
        for (let i = 0; i < mesh.faces.length; i++) {
            const f = mesh.faces[i];
            if (!f.n) continue;
            const nv = cam.rot(f.n);
            const cv = cam.toView([f.c[0], f.c[1], f.c[2] - cam.tz]);
            if (nv[0] * cv[0] + nv[1] * (cv[1] + cam.D) + nv[2] * cv[2] >= 0) continue;
            const pp = f.pts.map(cam.project);
            (f.decor ? decorFaces : bodyFaces).push({ f: f, pp: pp, nv: nv });
        }
        return { body: bodyFaces, decor: decorFaces };
    }

    function pathFace(ctx, pp) {
        ctx.beginPath();
        ctx.moveTo(pp[0].x, pp[0].y);
        for (let i = 1; i < pp.length; i++) ctx.lineTo(pp[i].x, pp[i].y);
        ctx.closePath();
    }

    function rrect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    // ---- выделение в Edit Mode: что подсвечено оранжевым на каждом шаге ----
    function isVertSel(i, sel) {
        if (sel === 'all') return true;
        if (sel === 'loop') return i >= 8 && i < 16;
        if (sel === 'roof') return i >= 16;
        if (sel === 'bevel') return i < 24;
        return false;
    }
    function isEdgeSel(a, b, sel) {
        if (sel === 'all') return true;
        if (sel === 'loop') return a >= 8 && a < 16 && b >= 8 && b < 16;
        if (sel === 'roof') return a >= 16 && b >= 16;
        if (sel === 'bevel') {
            if (a >= 24 || b >= 24) return false;
            const ra = a % 8, rb = b % 8;
            const la = Math.floor(a / 8), lb = Math.floor(b / 8);
            if (ra === rb) return true;
            if (la !== lb) return false;
            const lo = Math.min(ra, rb), hi = Math.max(ra, rb);
            return (hi - lo === 1 && lo % 2 === 1) || (lo === 0 && hi === 7);
        }
        return false;
    }
    function isFaceSel(f, sel) {
        if (sel === 'all') return true;
        if (sel === 'roof') return f.t === 'roof';
        if (sel === 'bevel') return (f.t === 'wall' && f.side % 2 === 1) || (f.t === 'roof' && !!f.corner);
        return false;
    }
    function edgeVisible(a, b, st) {
        if (a >= 8 && a < 16 && b >= 8 && b < 16) return st.loop > 0.02;
        if (a >= 24 || b >= 24) return st.ridge > 0.02;
        return true;
    }
    function vertVisible(i, st) {
        if (i >= 8 && i < 16) return st.loop > 0.02;
        if (i >= 24) return st.ridge > 0.02;
        return true;
    }

    // ---- сетка, оси и гизмо вьюпорта ----
    function drawGrid(ctx, cam) {
        const ext = 5;
        const line = (p, q) => {
            const a = cam.project(p), b = cam.project(q);
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
        };
        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255,255,255,0.09)';
        ctx.beginPath();
        for (let i = -ext; i <= ext; i++) {
            if (i === 0) continue;
            line([i, -ext, 0], [i, ext, 0]);
            line([-ext, i, 0], [ext, i, 0]);
        }
        ctx.stroke();

        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(224,72,77,0.9)';
        ctx.beginPath(); line([-ext, 0, 0], [ext, 0, 0]); ctx.stroke();
        ctx.strokeStyle = 'rgba(127,191,74,0.9)';
        ctx.beginPath(); line([0, -ext, 0], [0, ext, 0]); ctx.stroke();
        ctx.strokeStyle = 'rgba(74,144,226,0.95)';
        ctx.beginPath(); line([0, 0, 0], [0, 0, 4.2]); ctx.stroke();

        ctx.font = '700 15px Montserrat, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        const labels = [['X', [ext + 0.35, 0, 0], '#e0484d'], ['Y', [0, ext + 0.35, 0], '#7fbf4a'], ['Z', [0, 0, 4.55], '#4a90e2']];
        labels.forEach(l => {
            const p = cam.project(l[1]);
            ctx.fillStyle = l[2];
            ctx.fillText(l[0], p.x, p.y);
        });
        ctx.restore();
    }

    function drawGizmo(ctx, W, cam) {
        const gx = W - 74, gy = 74, R = 36;
        ctx.save();
        ctx.beginPath();
        ctx.arc(gx, gy, R + 16, 0, TAU);
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fill();
        const axes = [
            { n: 'X', v: [1, 0, 0], c: '#e0484d' },
            { n: 'Y', v: [0, 1, 0], c: '#7fbf4a' },
            { n: 'Z', v: [0, 0, 1], c: '#4a90e2' }
        ];
        const items = [];
        axes.forEach(ax => {
            const v = cam.toView(ax.v);
            items.push({ n: ax.n, c: ax.c, x: gx + v[0] * R, y: gy - v[2] * R, d: v[1], pos: true });
            items.push({ n: '', c: ax.c, x: gx - v[0] * R, y: gy + v[2] * R, d: -v[1], pos: false });
        });
        items.sort((p, q) => q.d - p.d);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '700 12px Montserrat, sans-serif';
        items.forEach(it => {
            if (it.pos) {
                ctx.beginPath();
                ctx.moveTo(gx, gy);
                ctx.lineTo(it.x, it.y);
                ctx.strokeStyle = it.c;
                ctx.lineWidth = 3;
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(it.x, it.y, 10, 0, TAU);
                ctx.fillStyle = it.c;
                ctx.fill();
                ctx.fillStyle = '#111';
                ctx.fillText(it.n, it.x, it.y + 0.5);
            } else {
                ctx.beginPath();
                ctx.arc(it.x, it.y, 6, 0, TAU);
                ctx.fillStyle = it.c;
                ctx.globalAlpha = 0.45;
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        });
        ctx.restore();
    }

    function drawMeshEdges(ctx, vis, st, em) {
        ctx.save();
        ctx.globalAlpha = em;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        for (let pass = 0; pass < 2; pass++) {
            ctx.beginPath();
            let any = false;
            vis.body.forEach(q => {
                const idx = q.f.idx;
                const n = idx.length;
                for (let k = 0; k < n; k++) {
                    const a = idx[k], b = idx[(k + 1) % n];
                    if (!edgeVisible(a, b, st)) continue;
                    if (isEdgeSel(a, b, st.sel) !== (pass === 1)) continue;
                    ctx.moveTo(q.pp[k].x, q.pp[k].y);
                    ctx.lineTo(q.pp[(k + 1) % n].x, q.pp[(k + 1) % n].y);
                    any = true;
                }
            });
            if (!any) continue;
            if (pass === 0) {
                ctx.strokeStyle = 'rgba(10,10,12,0.95)';
                ctx.lineWidth = 1.4;
            } else {
                ctx.strokeStyle = (st.sel === 'loop' && st.loopAnim) ? '#ffe14a' : '#ffa14a';
                ctx.lineWidth = 2.6;
            }
            ctx.stroke();
        }

        // вершины
        const seen = new Map();
        vis.body.forEach(q => {
            q.f.idx.forEach((vi, k) => { if (!seen.has(vi)) seen.set(vi, q.pp[k]); });
        });
        seen.forEach((p, vi) => {
            if (!vertVisible(vi, st)) return;
            const selected = isVertSel(vi, st.sel);
            ctx.beginPath();
            ctx.arc(p.x, p.y, selected ? 4.6 : 3.6, 0, TAU);
            ctx.fillStyle = selected ? '#ffb45e' : '#0c0c0e';
            ctx.fill();
            ctx.lineWidth = 1.2;
            ctx.strokeStyle = selected ? '#3a1d05' : 'rgba(255,255,255,0.35)';
            ctx.stroke();
        });
        ctx.restore();
    }

    const OPS = {
        2: ['Loop Cut and Slide', 'Number of Cuts: 1', 'Smoothness: 0'],
        3: ['Extrude Region and Move', 'Move Z: 1.0 m'],
        4: ['Bevel', 'Width: 0.22 m', 'Segments: 1']
    };

    function drawOperatorPanel(ctx, H, lines) {
        const w = 230, lh = 20, h = 16 + lines.length * lh + 6;
        const x = 16, y = H - h - 16;
        ctx.save();
        rrect(ctx, x, y, w, h, 8);
        ctx.fillStyle = 'rgba(24,26,30,0.82)';
        ctx.fill();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#ffa14a';
        ctx.font = '700 13px Montserrat, sans-serif';
        ctx.fillText('▾ ' + lines[0], x + 12, y + 10);
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '500 12px Montserrat, sans-serif';
        for (let i = 1; i < lines.length; i++) ctx.fillText(lines[i], x + 24, y + 10 + i * lh);
        ctx.restore();
    }

    // ---- вид вьюпорта: Object Mode / Edit Mode ----
    function drawViewport(ctx, W, H, cam, mesh, st) {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#4b4e56');
        g.addColorStop(1, '#2a2c31');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        drawGrid(ctx, cam);

        const vis = collectVisible(cam, mesh);
        const em = st.editMix;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // оранжевый контур выбранного объекта (Object Mode)
        if (em < 0.999) {
            ctx.save();
            ctx.globalAlpha = 1 - em;
            ctx.strokeStyle = '#ffa34d';
            ctx.lineWidth = 6;
            vis.body.forEach(q => { pathFace(ctx, q.pp); ctx.stroke(); });
            ctx.restore();
        }

        vis.body.forEach(q => {
            const shade = 0.42 + 0.58 * Math.max(0, dot3(q.nv, VIEW_LIGHT));
            let rgb = [152 * shade, 158 * shade, 168 * shade];
            if (em > 0 && isFaceSel(q.f, st.sel)) rgb = mixRgb(rgb, [245, 121, 42], 0.4 * em);
            const col = rgbStr(rgb);
            pathFace(ctx, q.pp);
            ctx.fillStyle = col;
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = col;
            ctx.stroke();
        });

        vis.decor.forEach(q => {
            const shade = 0.42 + 0.58 * Math.max(0, dot3(q.nv, VIEW_LIGHT));
            const base = q.f.kind === 'door' ? [92, 62, 38] : [38, 48, 66];
            pathFace(ctx, q.pp);
            ctx.fillStyle = rgbStr(scaleRgb(base, 0.5 + shade * 0.7));
            ctx.fill();
        });

        if (em > 0.01) drawMeshEdges(ctx, vis, st, em);

        drawGizmo(ctx, W, cam);

        ctx.save();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(255,255,255,0.78)';
        ctx.font = '600 15px Montserrat, sans-serif';
        ctx.fillText('User Perspective', 16, 14);
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.font = '500 13px Montserrat, sans-serif';
        ctx.fillText('(1) Collection | House', 16, 36);
        ctx.restore();

        if (OPS[st.step]) drawOperatorPanel(ctx, H, OPS[st.step]);
    }

    // ---- «готовая» сцена: небо, земля, тень, освещённый дом, свечение окон ----
    function drawLitScene(ctx, W, H, cam, mesh, P) {
        const horizon = cam.cy - cam.f * Math.tan(cam.el);
        const hy = clamp(horizon, 0, H);

        // небо
        let g = ctx.createLinearGradient(0, 0, 0, Math.max(hy, 1));
        g.addColorStop(0, '#0e1432');
        g.addColorStop(0.55, '#2d2a63');
        g.addColorStop(0.85, '#b4577a');
        g.addColorStop(1, '#f19a63');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        if (hy > 30) {
            ctx.fillStyle = '#ffffff';
            STARS.forEach(s => {
                ctx.globalAlpha = s.a * (1 - s.y);
                ctx.fillRect(s.x * W, s.y * hy * 0.8, s.r, s.r);
            });
            ctx.globalAlpha = 1;
        }

        // земля
        g = ctx.createLinearGradient(0, hy, 0, H);
        g.addColorStop(0, '#5c4458');
        g.addColorStop(0.12, '#2a2f45');
        g.addColorStop(1, '#10151f');
        ctx.fillStyle = g;
        ctx.fillRect(0, hy, W, H - hy);

        // тень: проекция всех вершин на землю вдоль луча света
        const shadowPts = mesh.verts.map(p => {
            const t = p[2] / LIGHT[2];
            return [p[0] - LIGHT[0] * t, p[1] - LIGHT[1] * t];
        });
        const hull = convexHull(shadowPts).map(q => cam.project([q[0], q[1], 0]));
        if (hull.length >= 3) {
            ctx.save();
            pathFace(ctx, hull);
            ctx.fillStyle = 'rgba(5,6,14,0.45)';
            ctx.fill();
            ctx.lineJoin = 'round';
            ctx.lineWidth = P.soft ? 16 : 8;
            ctx.strokeStyle = 'rgba(5,6,14,0.16)';
            ctx.stroke();
            ctx.restore();
        }

        const vis = collectVisible(cam, mesh);
        const windows = vis.decor.filter(q => q.f.kind === 'window');
        const glowOn = P.emisI > 0.02;

        // тёплый свет окон на земле
        if (glowOn) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            windows.forEach(q => {
                const n = q.f.n;
                if (Math.abs(n[2]) > 0.5) return;
                const gp = cam.project([q.f.c[0] + n[0] * 0.9, q.f.c[1] + n[1] * 0.9, 0]);
                const rad = 1.5 * gp.s;
                ctx.save();
                ctx.translate(gp.x, gp.y);
                ctx.scale(1, 0.42);
                const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
                rg.addColorStop(0, 'rgba(255,190,100,' + (0.5 * P.emisI * P.spill).toFixed(3) + ')');
                rg.addColorStop(1, 'rgba(255,190,100,0)');
                ctx.fillStyle = rg;
                ctx.beginPath();
                ctx.arc(0, 0, rad, 0, TAU);
                ctx.fill();
                ctx.restore();
            });
            ctx.restore();
        }

        const lit = (base, n) => {
            const sun = Math.max(0, dot3(n, LIGHT));
            const amb = 0.3 + 0.14 * n[2];
            return [
                base[0] * (AMB_TINT[0] * amb + SUN_TINT[0] * sun * 0.95),
                base[1] * (AMB_TINT[1] * amb + SUN_TINT[1] * sun * 0.95),
                base[2] * (AMB_TINT[2] * amb + SUN_TINT[2] * sun * 0.95)
            ];
        };
        const spec = Math.pow(1 - P.rough, 2);

        // корпус и крыша
        vis.body.forEach((q, gi) => {
            const f = q.f;
            const base = f.t === 'roof' ? P.roof : P.wall;
            const sun = Math.max(0, dot3(f.n, LIGHT));
            let rgb = lit(base, f.n);
            if (spec > 0.01) {
                const fres = 1 - Math.abs(q.nv[1]);
                rgb = mixRgb(rgb, [150, 172, 220], clamp(spec * (0.12 + 0.5 * fres), 0, 1));
            }
            const col = rgbStr(rgb);
            pathFace(ctx, q.pp);
            ctx.fillStyle = col;
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = col;
            ctx.stroke();

            // блик: чем меньше Roughness, тем ярче полоса света на грани
            if (spec > 0.04 && sun > 0.15) {
                let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
                q.pp.forEach(p => {
                    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
                    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
                });
                const pos = 0.5 + 0.5 * Math.sin(cam.az * 1.4 + gi * 1.7);
                const a = 0.5 * spec * Math.sqrt(sun);
                const lg = ctx.createLinearGradient(minX, minY, maxX, maxY);
                lg.addColorStop(0, 'rgba(255,255,255,0)');
                lg.addColorStop(clamp(pos - 0.14, 0, 1), 'rgba(255,255,255,0)');
                lg.addColorStop(pos, 'rgba(255,255,255,' + a.toFixed(3) + ')');
                lg.addColorStop(clamp(pos + 0.14, 0, 1), 'rgba(255,255,255,0)');
                lg.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.save();
                pathFace(ctx, q.pp);
                ctx.clip();
                ctx.fillStyle = lg;
                ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
                ctx.restore();
            }
        });

        // окна и дверь
        vis.decor.forEach(q => {
            if (q.f.kind === 'door') {
                const col = rgbStr(lit([96, 60, 32], q.f.n));
                pathFace(ctx, q.pp);
                ctx.fillStyle = col;
                ctx.fill();
                return;
            }
            const rgb = mixRgb([24, 34, 58], [255, 214, 130], P.emisI);
            pathFace(ctx, q.pp);
            ctx.fillStyle = rgbStr(rgb);
            ctx.fill();
            // переплёт окна
            const p = q.pp;
            const mid = (u, v) => ({ x: (u.x + v.x) / 2, y: (u.y + v.y) / 2 });
            const m01 = mid(p[0], p[1]), m23 = mid(p[2], p[3]);
            const m12 = mid(p[1], p[2]), m30 = mid(p[3], p[0]);
            const size = Math.max(Math.abs(p[1].x - p[0].x) + Math.abs(p[1].y - p[0].y), Math.abs(p[3].y - p[0].y));
            ctx.beginPath();
            ctx.moveTo(m01.x, m01.y); ctx.lineTo(m23.x, m23.y);
            ctx.moveTo(m12.x, m12.y); ctx.lineTo(m30.x, m30.y);
            ctx.strokeStyle = 'rgba(20,14,10,0.55)';
            ctx.lineWidth = Math.max(1, size * 0.04);
            ctx.stroke();
        });

        // свечение окон (Emission)
        if (glowOn) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            windows.forEach(q => {
                let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
                q.pp.forEach(p => {
                    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
                    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
                });
                const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
                const size = Math.max(maxX - minX, maxY - minY, 4);
                const rad = size * (0.9 + 2.4 * P.emisI);
                const rg = ctx.createRadialGradient(cx, cy, size * 0.1, cx, cy, rad);
                rg.addColorStop(0, 'rgba(255,200,120,' + (0.6 * P.emisI).toFixed(3) + ')');
                rg.addColorStop(1, 'rgba(255,200,120,0)');
                ctx.fillStyle = rg;
                ctx.beginPath();
                ctx.arc(cx, cy, rad, 0, TAU);
                ctx.fill();
            });
            ctx.restore();
        }

        // виньетка
        const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.9);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, 'rgba(0,0,0,0.38)');
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, W, H);
    }

    // ---- вращение модели мышью или пальцем ----
    function attachOrbit(canvas, st, bounds, canRotate) {
        let last = null;
        canvas.addEventListener('pointerdown', e => {
            if (canRotate && !canRotate()) return;
            st.dragging = true;
            last = { x: e.clientX, y: e.clientY };
            if (canvas.setPointerCapture) {
                try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* не критично */ }
            }
            canvas.style.cursor = 'grabbing';
        });
        canvas.addEventListener('pointermove', e => {
            if (!st.dragging || !last) return;
            const dx = e.clientX - last.x;
            const dy = e.clientY - last.y;
            last = { x: e.clientX, y: e.clientY };
            st.az += dx * 0.01;
            if (e.pointerType === 'mouse') st.el = clamp(st.el + dy * 0.006, bounds[0], bounds[1]);
            st.lastTouch = performance.now();
        });
        const end = () => {
            st.dragging = false;
            last = null;
            canvas.style.cursor = 'grab';
            st.lastTouch = performance.now();
        };
        canvas.addEventListener('pointerup', end);
        canvas.addEventListener('pointercancel', end);
        canvas.addEventListener('lostpointercapture', end);
    }

    /* ======================================================================
       3. СИМУЛЯТОР ГОРЯЧИХ КЛАВИШ
       ====================================================================== */
    const simShell = $('#sim-shell');
    const simCanvas = $('#sim-canvas');
    const simCtx = simCanvas ? simCanvas.getContext('2d') : null;

    const simEls = {
        mode: $('#sim-mode'),
        status: $('#sim-status'),
        keys: $('#sim-keys'),
        focusHint: $('#sim-focus-hint'),
        counter: $('#sim-counter'),
        fill: $('#sim-progress-fill'),
        hint: $('#sim-hint'),
        win: $('#sim-win'),
        restart: $('#sim-restart'),
        steps: $$('#sim-steps .mission'),
        pads: $$('.pad-key')
    };

    const RENDER_MS = 2800;
    const SIM_CAM = { dist: 9.5, focal: 980, tz: 1.0, cy: 0.58 };    // камера вьюпорта
    const RENDER_CAM = { dist: 9, focal: 900, tz: 1.0, cy: 0.62 };   // камера рендера (ниже, чтобы было видно небо)
    const RENDER_EL = 0.2;
    const RENDER_LOOK = {
        wall: [232, 214, 179],
        roof: [168, 64, 46],
        rough: 0.5,
        emisI: 0.85,
        spill: 1,
        soft: true
    };

    const TILE_COLS = 10, TILE_ROWS = 6;
    const TILES = (function () {
        const arr = [];
        for (let r = 0; r < TILE_ROWS; r++) {
            for (let c = 0; c < TILE_COLS; c++) {
                const x = (c + 0.5) / TILE_COLS - 0.5;
                const y = (r + 0.5) / TILE_ROWS - 0.5;
                arr.push({ c: c, r: r, k: Math.hypot(x * 1.6, y) + Math.atan2(y, x) * 0.01 });
            }
        }
        arr.sort((p, q) => p.k - q.k);
        return arr;
    })();

    const S = {};
    let simVisible = true;
    let keyTimer = null;

    const STEPS = [
        {
            combo: 'tab', label: 'Tab', title: 'войти в Edit Mode',
            run: function () {
                S.mode = 'edit';
                S.sel = 'all';
                tween(S, 'editMix', 1, 450, easeInOut);
            }
        },
        {
            combo: 'ctrl+r', label: 'Ctrl + R', title: 'кольцевой разрез (Loop Cut)',
            run: function () {
                S.sel = 'loop';
                S.loopAnim = true;
                S.loop = 0;
                tween(S, 'loop', 1, 900, easeOut, () => { S.loopAnim = false; });
            }
        },
        {
            combo: 'e', label: 'E', title: 'выдавить крышу (Extrude)',
            run: function () {
                S.sel = 'roof';
                tween(S, 'ridge', 1, 1100, easeInOut);
            }
        },
        {
            combo: 'ctrl+b', label: 'Ctrl + B', title: 'скруглить углы (Bevel)',
            run: function () {
                S.sel = 'bevel';
                tween(S, 'bevel', 1, 800, easeInOut);
            }
        },
        {
            combo: 'f12', label: 'F12', title: 'запустить рендер',
            run: function () {
                S.mode = 'render';
                S.sel = 'none';
                S.renderState = 'rendering';
                S.renderP = 0;
                tween(S, 'renderP', 1, RENDER_MS, linear, () => {
                    S.renderState = 'done';
                    if (!reducedMotion) spawnConfetti();
                    updateSimUI();
                });
            }
        }
    ];

    const STATUS_TEXT = [
        'Object Mode: объект выделен целиком — виден оранжевый контур.',
        'Edit Mode: выделены все вершины, рёбра и грани.',
        'Loop Cut: по центру высоты добавлено кольцо рёбер.',
        'Extrude: верхняя часть вытянута — получилась крыша.',
        'Bevel: острые вертикальные углы срезаны фаской.',
        'Render: сцена просчитана — свет, тени и окна светятся.'
    ];

    function resetSim() {
        tweens.length = 0;
        Object.assign(S, {
            step: 0,
            editMix: 0,
            loop: 0,
            ridge: 0,
            bevel: 0,
            loopAnim: false,
            sel: 'none',
            mode: 'object',
            renderP: 0,
            renderState: 'idle',
            az: 0.62,
            el: 0.5,
            dragging: false,
            lastTouch: -99999,
            confetti: []
        });
        updateSimUI();
    }

    function say(msg) { setText(simEls.hint, msg); }

    function updateSimUI() {
        setText(simEls.counter, S.step + ' / 5');
        if (simEls.fill) simEls.fill.style.width = (S.step / 5 * 100) + '%';
        simEls.steps.forEach((li, i) => {
            li.classList.toggle('is-done', i < S.step);
            li.classList.toggle('is-active', i === S.step);
        });
        simEls.pads.forEach(btn => {
            btn.classList.toggle('expected', S.step < 5 && btn.dataset.combo === STEPS[S.step].combo);
        });
        if (simEls.mode) {
            simEls.mode.textContent = S.mode === 'edit' ? 'Edit Mode' : (S.mode === 'render' ? 'Render' : 'Object Mode');
            simEls.mode.setAttribute('data-mode', S.mode);
        }
        setText(simEls.status, STATUS_TEXT[S.step]);
        if (simEls.win) simEls.win.hidden = !(S.step >= 5 && S.renderState === 'done');

        if (S.renderState === 'rendering') say('Идёт рендер… сцена считается плитками, как в Cycles.');
        else if (S.step >= 5) say('Готово! Можно вращать сцену мышью или пройти симулятор заново.');
        else say('Миссия ' + (S.step + 1) + ': нажми ' + STEPS[S.step].label + ' — ' + STEPS[S.step].title + '.');
    }

    function shake() {
        if (!simShell) return;
        simShell.classList.remove('shake');
        void simShell.offsetWidth;
        simShell.classList.add('shake');
        setTimeout(() => simShell.classList.remove('shake'), 450);
    }

    function pulsePad(combo) {
        simEls.pads.forEach(btn => {
            if (btn.dataset.combo !== combo) return;
            btn.classList.add('pressed');
            setTimeout(() => btn.classList.remove('pressed'), 220);
        });
    }

    function trigger(combo) {
        if (S.renderState === 'rendering') return;
        if (S.step >= 5) {
            say('Все миссии пройдены! Нажми «Пройти симулятор заново».');
            return;
        }
        const need = STEPS[S.step];
        if (combo !== need.combo) {
            shake();
            say('Не то сочетание. Сейчас нужно: ' + need.label + ' — ' + need.title + '.');
            return;
        }
        need.run();
        const done = S.step;
        S.step++;
        const li = simEls.steps[done];
        if (li) {
            li.classList.add('just-done');
            setTimeout(() => li.classList.remove('just-done'), 900);
        }
        updateSimUI();
    }

    // ---- клавиатура ----
    function keyLabel(e) {
        const c = e.code || '';
        if (/^Key[A-Z]$/.test(c)) return c.slice(3);
        if (/^Digit\d$/.test(c)) return c.slice(5);
        if (c === 'Tab') return 'Tab';
        if (/^F\d{1,2}$/.test(c)) return c;
        if (c === 'Escape') return 'Esc';
        if (c === 'Space') return 'Space';
        if (c === 'Enter') return 'Enter';
        if (/^(Control|Shift|Alt|Meta)(Left|Right)$/.test(c)) return null;
        if (e.key && e.key.length === 1) return e.key.toUpperCase();
        return e.key || null;
    }

    function describeKeys(e) {
        const list = [];
        if (e.ctrlKey) list.push('Ctrl');
        if (e.metaKey) list.push('⌘');
        if (e.altKey) list.push('Alt');
        if (e.shiftKey) list.push('Shift');
        const main = keyLabel(e);
        if (main) list.push(main);
        return list;
    }

    function showKeys(list, ms) {
        if (!simEls.keys) return;
        simEls.keys.innerHTML = list
            .map(l => '<kbd class="pressed">' + escapeHtml(l) + '</kbd>')
            .join('<span class="plus">+</span>');
        clearTimeout(keyTimer);
        keyTimer = setTimeout(clearKeys, ms || 900);
    }
    function clearKeys() {
        if (simEls.keys) simEls.keys.innerHTML = '';
    }

    function isKey(e, code, ch) {
        return e.code === code || (e.key || '').toLowerCase() === ch;
    }

    // Используем e.code, поэтому всё работает и в русской раскладке
    function comboFromEvent(e) {
        const ctrl = e.ctrlKey || e.metaKey;
        if (e.code === 'Tab' || e.key === 'Tab') return (!ctrl && !e.altKey) ? 'tab' : null;
        if (e.code === 'F12' || e.key === 'F12') return 'f12';
        if (isKey(e, 'KeyR', 'r') && ctrl && !e.altKey && !e.shiftKey) return 'ctrl+r';
        if (isKey(e, 'KeyB', 'b') && ctrl && !e.altKey && !e.shiftKey) return 'ctrl+b';
        if (isKey(e, 'KeyE', 'e') && !ctrl && !e.altKey) return 'e';
        return null;
    }

    if (simShell) {
        simShell.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                simShell.blur();
                if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
                return;
            }
            showKeys(describeKeys(e));
            const combo = comboFromEvent(e);
            if (!combo) return;
            e.preventDefault();      // отменяем Tab, Ctrl+R (перезагрузка), Ctrl+B, F12 браузера
            if (e.repeat) return;
            pulsePad(combo);
            trigger(combo);
        });
        simShell.addEventListener('keyup', () => {
            clearTimeout(keyTimer);
            keyTimer = setTimeout(clearKeys, 250);
        });
        simShell.addEventListener('focusin', () => {
            if (simEls.focusHint) simEls.focusHint.classList.add('hidden');
        });
        simShell.addEventListener('focusout', e => {
            if (!simShell.contains(e.relatedTarget)) {
                if (simEls.focusHint) simEls.focusHint.classList.remove('hidden');
                clearKeys();
            }
        });
    }

    simEls.pads.forEach(btn => {
        btn.addEventListener('click', () => trigger(btn.dataset.combo));
    });
    if (simEls.restart) simEls.restart.addEventListener('click', resetSim);

    // ---- конфетти после финального рендера ----
    function spawnConfetti() {
        const colors = ['#f5792a', '#ffd166', '#06d6a0', '#4cc9f0', '#ff6bd6'];
        const W = simCanvas ? simCanvas.width : 960;
        const H = simCanvas ? simCanvas.height : 600;
        for (let i = 0; i < 90; i++) {
            S.confetti.push({
                x: W * 0.5 + (Math.random() - 0.5) * 220,
                y: H * 0.28,
                vx: (Math.random() - 0.5) * 9,
                vy: -Math.random() * 8 - 2,
                rot: Math.random() * TAU,
                vr: (Math.random() - 0.5) * 0.3,
                c: colors[i % colors.length],
                w: 6 + Math.random() * 6,
                h: 4 + Math.random() * 5
            });
        }
    }

    function drawConfetti(ctx, H, dt) {
        const k = dt * 60;
        S.confetti = S.confetti.filter(p => p.y < H + 30);
        S.confetti.forEach(p => {
            p.vy += 0.28 * k;
            p.x += p.vx * k;
            p.y += p.vy * k;
            p.vx *= 0.995;
            p.rot += p.vr * k;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            ctx.fillStyle = p.c;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
        });
    }

    function drawRenderBadge(ctx, W, text) {
        ctx.save();
        ctx.font = '600 13px Montserrat, sans-serif';
        const w = ctx.measureText(text).width + 24;
        rrect(ctx, 14, 14, w, 30, 15);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 26, 29.5);
        ctx.restore();
    }

    function drawSim(dt) {
        if (!simCtx) return;
        const ctx = simCtx;
        const W = simCanvas.width, H = simCanvas.height;
        const cam = makeCamera(S.az, S.el, W, H, SIM_CAM);
        const mesh = buildHouse({
            c: S.bevel * 0.22,
            ridge: S.ridge,
            loopZ: HOUSE.zE * (0.84 - 0.34 * S.loop),
            attic: S.ridge > 0.99
        });
        const rcam = makeCamera(S.az, RENDER_EL, W, H, RENDER_CAM);
        const rmesh = buildHouse({ c: 0.22, ridge: 1, loopZ: 0.7, attic: true });

        if (S.renderState === 'done') {
            drawLitScene(ctx, W, H, rcam, rmesh, RENDER_LOOK);
            drawRenderBadge(ctx, W, 'Render Result · Cycles · 128 samples · Denoise');
        } else {
            drawViewport(ctx, W, H, cam, mesh, S);
            if (S.renderState === 'rendering') {
                const count = Math.min(TILES.length, Math.ceil(S.renderP * TILES.length));
                const tw = W / TILE_COLS, th = H / TILE_ROWS;
                if (count > 0) {
                    ctx.save();
                    ctx.beginPath();
                    for (let i = 0; i < count; i++) ctx.rect(TILES[i].c * tw, TILES[i].r * th, tw + 0.5, th + 0.5);
                    ctx.clip();
                    drawLitScene(ctx, W, H, rcam, rmesh, RENDER_LOOK);
                    ctx.restore();
                }
                if (count < TILES.length && count > 0) {
                    const cur = TILES[count - 1];
                    const x = cur.c * tw, y = cur.r * th, L = 16;
                    ctx.save();
                    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.moveTo(x + 3, y + 3 + L); ctx.lineTo(x + 3, y + 3); ctx.lineTo(x + 3 + L, y + 3);
                    ctx.moveTo(x + tw - 3 - L, y + 3); ctx.lineTo(x + tw - 3, y + 3); ctx.lineTo(x + tw - 3, y + 3 + L);
                    ctx.moveTo(x + 3, y + th - 3 - L); ctx.lineTo(x + 3, y + th - 3); ctx.lineTo(x + 3 + L, y + th - 3);
                    ctx.moveTo(x + tw - 3 - L, y + th - 3); ctx.lineTo(x + tw - 3, y + th - 3); ctx.lineTo(x + tw - 3, y + th - 3 - L);
                    ctx.stroke();
                    ctx.restore();
                }
                // полоса прогресса рендера
                ctx.save();
                const bw = 320, bx = (W - bw) / 2, by = 20;
                rrect(ctx, bx - 14, by - 10, bw + 28, 44, 12);
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.font = '600 13px Montserrat, sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillText('Rendering… ' + Math.round(S.renderP * 100) + '%  ·  Tile ' + count + '/' + TILES.length, bx, by - 3);
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                ctx.fillRect(bx, by + 18, bw, 6);
                ctx.fillStyle = '#f5792a';
                ctx.fillRect(bx, by + 18, bw * S.renderP, 6);
                ctx.restore();
            }
        }

        if (S.confetti.length) drawConfetti(ctx, H, dt);
    }

    function simFrame(now, dt) {
        if (!reducedMotion && !S.dragging && S.renderState !== 'rendering' && now - S.lastTouch > 1500) {
            S.az += dt * 0.42;
        }
        drawSim(dt);
    }

    if (simCanvas) {
        attachOrbit(simCanvas, S, [0.12, 1.05], () => S.renderState !== 'rendering');
        simCanvas.style.cursor = 'grab';
    }
    resetSim();

    /* ======================================================================
       4. ЛАБОРАТОРИЯ «МАТЕРИАЛЫ И РЕНДЕР»
       ====================================================================== */
    const labCanvas = $('#lab-canvas');
    const labCtx = labCanvas ? labCanvas.getContext('2d', { willReadFrequently: true }) : null;
    const labEls = {
        color: $('#lab-color'),
        colorHex: $('#lab-color-hex'),
        rough: $('#lab-rough'),
        roughVal: $('#lab-rough-val'),
        emis: $('#lab-emis'),
        emisVal: $('#lab-emis-val'),
        engines: $$('input[name="lab-engine"]'),
        samples: $('#lab-samples'),
        samplesVal: $('#lab-samples-val'),
        samplesGroup: $('#lab-samples-group'),
        denoise: $('#lab-denoise'),
        denoiseGroup: $('#lab-denoise-group'),
        badge: $('#lab-badge'),
        time: $('#lab-time'),
        note: $('#lab-note'),
        presets: $$('[data-preset]'),
        reset: $('#lab-reset')
    };

    const LAB_DEFAULTS = { color: '#d9b38c', rough: 0.45, emis: 4, engine: 'eevee', denoise: false, samples: 16 };
    const L = Object.assign({ az: 0.5, el: RENDER_EL, dragging: false, lastTouch: -99999, dirty: true }, LAB_DEFAULTS);
    const LAB_MESH = buildHouse({ c: 0.14, ridge: 1, loopZ: 0.7, attic: true });
    let labVisible = true;
    let labLastDraw = 0;

    const PRESETS = {
        glossy: { color: '#d84a4a', rough: 0.12, emis: 3.5 },
        matte: { color: '#c9a27a', rough: 0.95, emis: 3.5 },
        glow: { color: '#8fb4d9', rough: 0.5, emis: 9 },
        dark: { color: '#e8d6b3', rough: 0.5, emis: 0 }
    };

    // ---- шум Cycles ----
    let noiseBuf = null;
    let noiseLen = 0;
    function ensureNoise(n) {
        if (noiseBuf && noiseLen === n) return;
        noiseLen = n;
        noiseBuf = new Int8Array(n * 2);
        for (let i = 0; i < noiseBuf.length; i++) {
            noiseBuf[i] = Math.round((Math.random() + Math.random() + Math.random() + Math.random() - 2) * 63);
        }
    }

    function applyNoise(ctx, W, H, sigma, fireflies) {
        const img = ctx.getImageData(0, 0, W, H);
        const d = img.data;
        const N = W * H;
        ensureNoise(N);
        const off = (Math.random() * N) | 0;
        const off2 = (Math.random() * N) | 0;
        const k = sigma / 36.4;
        const kc = k * 0.45;
        for (let i = 0, p = 0; i < N; i++, p += 4) {
            const n = noiseBuf[i + off] * k;
            const m = noiseBuf[i + off2] * kc;
            d[p] += n + m;
            d[p + 1] += n - m * 0.5;
            d[p + 2] += n + m * 0.3;
        }
        for (let f = 0; f < fireflies; f++) {
            const p = (((Math.random() * H) | 0) * W + ((Math.random() * W) | 0)) * 4;
            d[p] = 255; d[p + 1] = 240; d[p + 2] = 220;
        }
        ctx.putImageData(img, 0, 0);
    }

    // ---- «материал-шар» в углу превью ----
    function drawBall(ctx, cx, cy, R, rgb, rough) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, R + 8, 0, TAU);
        ctx.fillStyle = 'rgba(8,10,20,0.45)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, TAU);
        ctx.clip();

        // рассеянный цвет
        const hx = cx - R * 0.38, hy = cy - R * 0.42;
        const g = ctx.createRadialGradient(hx, hy, R * 0.1, cx, cy, R * 1.05);
        g.addColorStop(0, rgbStr(scaleRgb(rgb, 1.25)));
        g.addColorStop(0.55, rgbStr(rgb));
        g.addColorStop(1, rgbStr(scaleRgb(rgb, 0.28)));
        ctx.fillStyle = g;
        ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

        // отражение окружения (заметно только у глянцевых материалов)
        const s = Math.pow(1 - rough, 2);
        const eg = ctx.createLinearGradient(0, cy - R, 0, cy + R);
        eg.addColorStop(0, 'rgba(170,190,235,0.95)');
        eg.addColorStop(0.47, 'rgba(240,160,120,0.9)');
        eg.addColorStop(0.5, 'rgba(25,32,40,0.95)');
        eg.addColorStop(1, 'rgba(10,14,20,0.95)');
        ctx.globalAlpha = 0.5 * s;
        ctx.fillStyle = eg;
        ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
        ctx.globalAlpha = 1;

        // блик: маленький и яркий при Roughness 0, широкий и слабый при больших значениях
        const peak = Math.pow(1 - rough, 0.8);
        const sr = R * (0.1 + 0.85 * rough);
        const sg = ctx.createRadialGradient(hx, hy, 0, hx, hy, sr);
        sg.addColorStop(0, 'rgba(255,255,255,' + (0.95 * peak).toFixed(3) + ')');
        sg.addColorStop(0.4, 'rgba(255,255,255,' + (0.35 * peak).toFixed(3) + ')');
        sg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sg;
        ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

        // тёмный край шара
        const rim = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R);
        rim.addColorStop(0, 'rgba(0,0,0,0)');
        rim.addColorStop(1, 'rgba(0,0,0,0.35)');
        ctx.fillStyle = rim;
        ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
        ctx.restore();

        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, TAU);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.stroke();
    }

    function labNoiseAmount() {
        if (L.engine !== 'cycles' || L.denoise) return { sigma: 0, flies: 0 };
        return { sigma: 120 / Math.sqrt(L.samples), flies: Math.round(260 / Math.sqrt(L.samples)) };
    }

    function drawLab() {
        if (!labCtx) return;
        const W = labCanvas.width, H = labCanvas.height;
        const cam = makeCamera(L.az, L.el, W, H, { dist: 10, focal: 860, tz: 1.0, cy: 0.64 });
        const wall = hexToRgb(L.color);
        const P = {
            wall: wall,
            roof: scaleRgb(mixRgb(wall, [120, 50, 40], 0.25), 0.62),
            rough: L.rough,
            emisI: 1 - Math.exp(-L.emis / 3),
            spill: L.engine === 'cycles' ? 1 : 0.35,
            soft: L.engine === 'cycles'
        };
        drawLitScene(labCtx, W, H, cam, LAB_MESH, P);
        drawBall(labCtx, W - 72, 74, 46, wall, L.rough);
        const noise = labNoiseAmount();
        if (noise.sigma > 0) applyNoise(labCtx, W, H, noise.sigma, noise.flies);
        L.dirty = false;
    }

    function labFrame(now, dt) {
        if (!reducedMotion && !L.dragging && now - L.lastTouch > 1500) L.az += dt * 0.35;
        const noisy = labNoiseAmount().sigma > 0;
        if (reducedMotion && !L.dirty && !noisy) return;
        if (now - labLastDraw < 33) return;       // ~30 кадров/с: шум и ImageData требуют ресурсов
        labLastDraw = now;
        drawLab();
    }

    function updateLabUI() {
        const cycles = L.engine === 'cycles';
        setText(labEls.colorHex, L.color);
        setText(labEls.roughVal, L.rough.toFixed(2));
        setText(labEls.emisVal, L.emis.toFixed(1));
        setText(labEls.samplesVal, String(L.samples));

        if (labEls.samples) labEls.samples.disabled = !cycles;
        if (labEls.denoise) labEls.denoise.disabled = !cycles;
        if (labEls.samplesGroup) labEls.samplesGroup.classList.toggle('is-disabled', !cycles);
        if (labEls.denoiseGroup) labEls.denoiseGroup.classList.toggle('is-disabled', !cycles);

        let badge = 'EEVEE · реальное время';
        let time = 0.1;
        let note = 'EEVEE показывает результат мгновенно, но считает свет приближённо. Для проб и быстрой настройки материала это идеальный выбор.';
        if (cycles) {
            time = 0.4 + L.samples * 0.05 + (L.denoise ? 0.8 : 0);
            badge = 'Cycles · ' + L.samples + ' samples' + (L.denoise ? ' · Denoise' : '');
            if (L.denoise) {
                note = 'Denoiser включён: нейросеть сгладила зерно, и картинка чистая даже при малом числе Samples.';
            } else if (L.samples < 64) {
                note = 'Видно «зерно»: лучей на пиксель мало, и каждый пиксель посчитан с ошибкой. Подними Samples или включи Denoiser.';
            } else {
                note = 'Samples достаточно много, поэтому шум почти не виден, но рендер стал заметно дольше.';
            }
        }
        setText(labEls.badge, badge);
        setText(labEls.time, '≈ ' + time.toFixed(1) + ' с');
        setText(labEls.note, note);
    }

    function syncLabControls() {
        if (labEls.color) labEls.color.value = L.color;
        if (labEls.rough) labEls.rough.value = String(L.rough);
        if (labEls.emis) labEls.emis.value = String(L.emis);
        if (labEls.samples) labEls.samples.value = String(L.samples);
        if (labEls.denoise) labEls.denoise.checked = L.denoise;
        labEls.engines.forEach(r => { r.checked = r.value === L.engine; });
    }

    function labChanged() {
        L.dirty = true;
        updateLabUI();
    }

    if (labEls.color) labEls.color.addEventListener('input', () => { L.color = labEls.color.value; labChanged(); });
    if (labEls.rough) labEls.rough.addEventListener('input', () => { L.rough = parseFloat(labEls.rough.value); labChanged(); });
    if (labEls.emis) labEls.emis.addEventListener('input', () => { L.emis = parseFloat(labEls.emis.value); labChanged(); });
    if (labEls.samples) labEls.samples.addEventListener('input', () => { L.samples = parseInt(labEls.samples.value, 10); labChanged(); });
    if (labEls.denoise) labEls.denoise.addEventListener('change', () => { L.denoise = labEls.denoise.checked; labChanged(); });
    labEls.engines.forEach(r => {
        r.addEventListener('change', () => {
            if (r.checked) { L.engine = r.value; labChanged(); }
        });
    });
    labEls.presets.forEach(btn => {
        btn.addEventListener('click', () => {
            const p = PRESETS[btn.dataset.preset];
            if (!p) return;
            Object.assign(L, p);
            syncLabControls();
            labChanged();
        });
    });
    if (labEls.reset) {
        labEls.reset.addEventListener('click', () => {
            Object.assign(L, LAB_DEFAULTS);
            syncLabControls();
            labChanged();
        });
    }

    if (labCanvas) {
        attachOrbit(labCanvas, L, [0.05, 0.35], null);
        labCanvas.style.cursor = 'grab';
    }
    syncLabControls();
    updateLabUI();

    /* ======================================================================
       5. ЧЕК-ЛИСТ К УРОКАМ (прогресс в localStorage)
       ====================================================================== */
    const PRACTICE_KEY = 'blenderPractice';
    const chkBoxes = $$('input[data-step]');
    const chkCards = $$('.chk-card');
    const chkText = $('#chk-text');
    const chkFill = $('#chk-fill');
    const chkReset = $('#chk-reset');
    const chkSaved = $('#chk-saved');
    let chkSavedTimer = null;
    let chkResetTimer = null;

    function loadPractice() {
        try {
            const data = JSON.parse(storageGet(PRACTICE_KEY));
            return data && typeof data === 'object' ? data : {};
        } catch (e) {
            return {};
        }
    }
    let practiceState = loadPractice();

    function updateChecklistUI() {
        const total = chkBoxes.length;
        let done = 0;
        chkBoxes.forEach(b => { if (b.checked) done++; });
        let lessonsDone = 0;
        chkCards.forEach(card => {
            const boxes = $$('input[data-step]', card);
            const n = boxes.filter(b => b.checked).length;
            const complete = boxes.length > 0 && n === boxes.length;
            if (complete) lessonsDone++;
            card.classList.toggle('is-complete', complete);
            setText($('[data-count]', card), n + '/' + boxes.length);
        });
        setText(chkText, 'Выполнено ' + done + ' из ' + total + ' шагов · уроков завершено: ' + lessonsDone + ' из ' + chkCards.length);
        if (chkFill) chkFill.style.width = (total ? done / total * 100 : 0) + '%';
    }

    function flashSaved() {
        if (!chkSaved) return;
        chkSaved.textContent = 'Сохранено ✓';
        chkSaved.classList.add('show');
        clearTimeout(chkSavedTimer);
        chkSavedTimer = setTimeout(() => chkSaved.classList.remove('show'), 1400);
    }

    chkBoxes.forEach(box => {
        const id = box.getAttribute('data-step');
        box.checked = !!practiceState[id];
        box.addEventListener('change', () => {
            if (box.checked) practiceState[id] = true;
            else delete practiceState[id];
            storageSet(PRACTICE_KEY, JSON.stringify(practiceState));
            updateChecklistUI();
            flashSaved();
        });
    });

    if (chkReset) {
        chkReset.addEventListener('click', () => {
            if (chkReset.getAttribute('data-armed') !== '1') {
                // первое нажатие — просим подтвердить, без всплывающих окон
                chkReset.setAttribute('data-armed', '1');
                chkReset.textContent = 'Нажми ещё раз для сброса';
                clearTimeout(chkResetTimer);
                chkResetTimer = setTimeout(() => {
                    chkReset.removeAttribute('data-armed');
                    chkReset.textContent = 'Сбросить прогресс';
                }, 3000);
                return;
            }
            clearTimeout(chkResetTimer);
            chkReset.removeAttribute('data-armed');
            chkReset.textContent = 'Сбросить прогресс';
            practiceState = {};
            storageSet(PRACTICE_KEY, JSON.stringify(practiceState));
            chkBoxes.forEach(b => { b.checked = false; });
            updateChecklistUI();
            flashSaved();
        });
    }

    // Прогресс мог измениться в другой вкладке
    window.addEventListener('storage', e => {
        if (e.key !== PRACTICE_KEY) return;
        practiceState = loadPractice();
        chkBoxes.forEach(b => { b.checked = !!practiceState[b.getAttribute('data-step')]; });
        updateChecklistUI();
    });
    updateChecklistUI();

    /* ======================================================================
       6. СЛОВАРЬ ТЕРМИНОВ
       ====================================================================== */
    const CATEGORIES = { ui: 'Интерфейс', model: 'Моделирование', mat: 'Материалы и свет', render: 'Рендер' };

    const TERMS = [
        {
            term: 'Вьюпорт', en: 'Viewport', cat: 'ui',
            text: 'Главное окно Blender, в котором ты видишь свою 3D-сцену. Представь камеру оператора: ты можешь облетать модель, приближаться и отдаляться, а сама модель при этом стоит на месте.',
            tip: 'Потерялся в пространстве? Нажми Home — Blender вернёт всё в кадр.',
            hot: ['Home', 'Numpad 1', 'Numpad 7']
        },
        {
            term: 'Меш', en: 'Mesh', cat: 'model',
            text: 'Сетка из точек, линий и плоскостей — «скелет» почти любого 3D-объекта. Представь проволочный каркас, обтянутый плёнкой: чем больше проволочек, тем плавнее форма, но тем тяжелее модель для компьютера.',
            tip: 'Куб, сфера и даже обезьянка Сюзанна — всё это меши.',
            hot: ['Shift+A']
        },
        {
            term: 'Вершина, ребро, грань', en: 'Vertex, Edge, Face', cat: 'model',
            text: 'Три «кирпичика» меша. Вершина — точка в пространстве. Ребро — линия между двумя вершинами. Грань — плоскость, натянутая на рёбра (чаще всего четырёхугольник). Двигая их, ты лепишь форму.',
            tip: 'В Edit Mode режимы выбора переключаются цифрами 1, 2, 3 на основной клавиатуре.',
            hot: ['1', '2', '3']
        },
        {
            term: 'Object Mode и Edit Mode', en: 'Режимы работы', cat: 'ui',
            text: 'Object Mode — ты работаешь с объектом целиком: двигаешь, вращаешь, масштабируешь, как предмет на столе. Edit Mode — ты «залез внутрь» и правишь отдельные вершины, рёбра и грани.',
            tip: 'Если выдавливание или разрез «не работают» — проверь, не остался ли ты в Object Mode.',
            hot: ['Tab']
        },
        {
            term: 'Хоткеи', en: 'Hotkeys', cat: 'ui',
            text: 'Горячие клавиши — сочетания, которые заменяют поиск по меню. В Blender почти всё делается с клавиатуры, поэтому опытные моделлеры редко тянутся к меню. Начни с трёх: G — двигать, R — вращать, S — масштабировать.',
            tip: 'Любое действие можно отменить: Ctrl+Z.',
            hot: ['G', 'R', 'S', 'Ctrl+Z']
        },
        {
            term: 'Экструдирование', en: 'Extrude', cat: 'model',
            text: '«Выдавливание»: берёшь грань (или ребро, вершину) и вытягиваешь наружу — между старым и новым положением сами появляются боковые стенки. Так из верхней грани куба получается крыша дома, а из квадрата — стена.',
            tip: 'Работает только в Edit Mode. После E двигай мышь и подтверждай левой кнопкой.',
            hot: ['E']
        },
        {
            term: 'Инсет', en: 'Inset', cat: 'model',
            text: 'Внутри выбранной грани создаётся её уменьшенная копия — получается рамка. Это основа для окон, дверей и панелей: сначала Inset, потом Extrude внутрь или наружу.',
            tip: 'Пара Inset + Extrude — любимый приём для окон, кнопок и углублений.',
            hot: ['I']
        },
        {
            term: 'Фаска', en: 'Bevel', cat: 'model',
            text: 'Срезает или скругляет острый угол, заменяя его узкой полоской. В реальном мире идеально острых рёбер почти нет: на скруглённом крае ловится блик, поэтому модель выглядит правдоподобнее.',
            tip: 'Крути колесо мыши во время Bevel — добавятся сегменты, и угол станет плавным.',
            hot: ['Ctrl+B']
        },
        {
            term: 'Лупкат', en: 'Loop Cut', cat: 'model',
            text: 'Кольцевой разрез: вокруг модели появляется новый «поясок» из рёбер — как резинка на мяче. Нужен, чтобы получить дополнительные вершины там, где хочешь сделать деталь: окно, изгиб, ребро жёсткости.',
            tip: 'Колесо мыши — число разрезов, левая кнопка — поставить, правая — оставить ровно по центру.',
            hot: ['Ctrl+R']
        },
        {
            term: 'Нормали', en: 'Normals', cat: 'model',
            text: 'У каждой грани есть «лицо» и «изнанка». Нормаль — невидимая стрелка, которая показывает, куда смотрит лицо. От неё зависит освещение: если стрелка смотрит внутрь, поверхность может быть тёмной или с пятнами.',
            tip: 'Пятна на модели? В Edit Mode выдели всё (A) и нажми Shift+N — нормали пересчитаются наружу.',
            hot: ['Shift+N']
        },
        {
            term: 'Шейдер и Principled BSDF', en: 'Shader', cat: 'mat',
            text: 'Шейдер — «рецепт» поверхности: он говорит, как материал реагирует на свет. Principled BSDF — главный универсальный шейдер Blender: один узел с настройками Base Color, Metallic, Roughness, Emission и другими. Из него можно сделать пластик, металл, стекло, кожу.',
            tip: 'Новичку почти всегда хватает одного Principled BSDF.',
            hot: []
        },
        {
            term: 'Шероховатость', en: 'Roughness', cat: 'mat',
            text: 'Показывает, насколько поверхность матовая. 0.0 — идеальное зеркало с чётким бликом, 1.0 — полностью матовая поверхность, как бетон. Резина — около 0.8, полированный металл — около 0.1.',
            tip: 'Попробуй сам в лаборатории выше: ползунок Roughness.',
            hot: []
        },
        {
            term: 'UV-развёртка', en: 'UV Unwrap', cat: 'mat',
            text: 'Способ «разрезать» 3D-модель и разложить её на плоскую выкройку — как развёртку картонной коробки. Нужна, чтобы наложить на модель плоскую картинку (текстуру). Буквы U и V — оси плоскости, потому что X, Y и Z уже заняты в 3D.',
            tip: 'В Edit Mode нажми U и выбери Smart UV Project — это быстрая автоматическая развёртка.',
            hot: ['U']
        },
        {
            term: 'HDRI-карта', en: 'HDRI', cat: 'mat',
            text: 'Панорамная фотография окружения (небо, улица, студия), которая хранит не только цвет, но и яркость света. Blender подставляет её вместо фона: она освещает сцену и отражается в блестящих предметах. С HDRI даже простая сфера выглядит как фото.',
            tip: 'Подключается во вкладке World — узел Environment Texture.',
            hot: []
        },
        {
            term: 'Рендер', en: 'Render', cat: 'render',
            text: 'Превращение 3D-сцены в готовую картинку или видео: компьютер просчитывает, как свет падает на объекты и попадает в камеру. Для рендера нужны объект, свет и камера.',
            tip: 'F12 — одна картинка, Ctrl+F12 — анимация. Результат сохраняется вручную.',
            hot: ['F12', 'Ctrl+F12']
        },
        {
            term: 'EEVEE и Cycles', en: 'Render engines', cat: 'render',
            text: 'Два движка рендера. EEVEE быстрый, почти как видеоигра: результат за секунды, подходит для проб и стилизованной графики. Cycles честно просчитывает путь лучей света: картинка реалистичнее (мягкие тени, отражения, стекло), но считается намного дольше.',
            tip: 'Выбирается в Properties → Render → Render Engine.',
            hot: []
        },
        {
            term: 'Сэмплы', en: 'Samples', cat: 'render',
            text: 'Сколько «лучей света» Cycles пускает на каждый пиксель. Мало сэмплов — быстро, но картинка зернистая; много — чисто, но долго. Это как опрос: спроси 10 человек — ответ случайный, спроси 1000 — точный.',
            tip: 'Попробуй ползунок Samples в лаборатории при включённом Cycles.',
            hot: []
        },
        {
            term: 'Denoiser', en: 'Шумоподавление', cat: 'render',
            text: 'Умный фильтр на основе нейросети, который убирает зернистость. Благодаря ему хватает небольшого числа сэмплов, и рендер получается в разы быстрее. Если переборщить, мелкие детали «замыливаются».',
            tip: 'Включается в Render → Sampling → Render → Denoise.',
            hot: []
        }
    ];

    const glGrid = $('#gl-grid');
    const glSearch = $('#gl-search');
    const glChips = $$('#gl-chips .chip');
    const glCount = $('#gl-count');
    const glEmpty = $('#gl-empty');
    let glCat = 'all';

    function renderHotkeys(hot) {
        if (!hot || !hot.length) return '';
        const chips = hot.map(h => h.split('+').map(k => '<kbd>' + escapeHtml(k) + '</kbd>').join('+')).join(' ');
        return '<div class="gl-hot" aria-label="Горячие клавиши">' + chips + '</div>';
    }

    function renderGlossary() {
        if (!glGrid) return;
        const query = glSearch ? normText(glSearch.value.trim()) : '';
        const words = query ? query.split(/\s+/).filter(Boolean) : [];

        const list = TERMS.filter(t => {
            if (glCat !== 'all' && t.cat !== glCat) return false;
            if (!words.length) return true;
            const hay = normText([t.term, t.en, t.text, t.tip, CATEGORIES[t.cat], t.hot.join(' ')].join(' '));
            return words.every(w => hay.indexOf(w) !== -1);
        });

        glGrid.innerHTML = list.map(t => (
            '<article class="gl-card glass animate-hover">' +
                '<div class="gl-top">' +
                    '<div>' +
                        '<h3 class="gl-term">' + highlight(t.term, words) + '</h3>' +
                        '<span class="gl-en">' + highlight(t.en, words) + '</span>' +
                    '</div>' +
                    '<span class="gl-badge" data-cat="' + t.cat + '">' + escapeHtml(CATEGORIES[t.cat]) + '</span>' +
                '</div>' +
                '<p class="gl-text">' + highlight(t.text, words) + '</p>' +
                '<p class="gl-tip">💡 ' + highlight(t.tip, words) + '</p>' +
                renderHotkeys(t.hot) +
            '</article>'
        )).join('');

        setText(glCount, 'Показано терминов: ' + list.length + ' из ' + TERMS.length);
        if (glEmpty) glEmpty.hidden = list.length > 0;
    }

    if (glSearch) glSearch.addEventListener('input', renderGlossary);
    glChips.forEach(chip => {
        chip.addEventListener('click', () => {
            glCat = chip.getAttribute('data-cat');
            glChips.forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
            renderGlossary();
        });
    });
    renderGlossary();

    /* ======================================================================
       7. ГЛАВНЫЙ ЦИКЛ АНИМАЦИИ
       Рисуем только то, что сейчас видно на экране.
       ====================================================================== */
    if ('IntersectionObserver' in window) {
        const visObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.target === simCanvas) simVisible = entry.isIntersecting;
                if (entry.target === labCanvas) labVisible = entry.isIntersecting;
            });
        }, { threshold: 0 });
        if (simCanvas) visObserver.observe(simCanvas);
        if (labCanvas) visObserver.observe(labCanvas);
    }

    let lastT = performance.now();
    function loop(now) {
        requestAnimationFrame(loop);
        const dt = Math.min(0.05, Math.max(0, (now - lastT) / 1000));
        lastT = now;
        stepTweens(now);
        if (simVisible) simFrame(now, dt);
        if (labVisible) labFrame(now, dt);
    }
    requestAnimationFrame(loop);
})();
