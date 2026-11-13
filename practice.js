// ============================================================
// 1. ОБЩИЕ ФУНКЦИИ ИНТЕРФЕЙСА + ОПРЕДЕЛЕНИЕ УСТРОЙСТВА (ПК / ТЕЛЕФОН)
// ============================================================
const themeToggleBtn = document.getElementById('theme-toggle');
const body = document.body;

if (localStorage.getItem('theme') === 'light') {
    body.setAttribute('data-theme', 'light');
    themeToggleBtn.innerHTML = '🌙 Тёмная';
}

themeToggleBtn.addEventListener('click', () => {
    if (body.getAttribute('data-theme') === 'light') {
        body.removeAttribute('data-theme');
        themeToggleBtn.innerHTML = '☀️ Светлая';
        localStorage.setItem('theme', 'dark');
    } else {
        body.setAttribute('data-theme', 'light');
        themeToggleBtn.innerHTML = '🌙 Тёмная';
        localStorage.setItem('theme', 'light');
    }
});

const navToggle = document.getElementById('nav-toggle');
const navLinks = document.getElementById('nav-links');

navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', isOpen);
});

navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
    });
});

const progressBar = document.getElementById('progress-bar');
const backToTopBtn = document.getElementById('back-to-top');
let scrollTicking = false;

function onScroll() {
    const winScroll = document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
    progressBar.style.width = scrolled + '%';

    if (winScroll > 350) {
        backToTopBtn.classList.add('show');
    } else {
        backToTopBtn.classList.remove('show');
    }
    scrollTicking = false;
}

window.addEventListener('scroll', () => {
    if (!scrollTicking) {
        requestAnimationFrame(onScroll);
        scrollTicking = true;
    }
});

backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

const fadeObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            obs.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-in').forEach(el => fadeObserver.observe(el));

// Автоматическая адаптация под устройство (ПК vs Телефон/Планшет)
const DeviceProfile = {
    isMobile: false,
    dpr: 1,
    update() {
        const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        this.isMobile = coarse || window.innerWidth <= 820;
        const rawDpr = window.devicePixelRatio || 1;
        this.dpr = this.isMobile ? Math.min(rawDpr, 1.5) : Math.min(rawDpr, 2);

        const badge = document.getElementById('device-mode-badge');
        if (badge) {
            badge.textContent = this.isMobile
                ? '📱 Мобильный 3D (Touch • 60 FPS)'
                : '💻 ПК-режим (High-DPI + Хоткеи)';
        }
    }
};
DeviceProfile.update();
window.addEventListener('resize', () => DeviceProfile.update());

// ============================================================
// 2. ИНТЕРАКТИВНЫЙ 3D-СИМУЛЯТОР ВЬЮПОРТА BLENDER 4.x
// ============================================================
(function initBlenderViewportSimulator() {
    const canvas = document.getElementById('sim-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const modeBadge = document.getElementById('sim-mode-badge');
    const keyBadge = document.getElementById('sim-key-badge');
    const statsText = document.getElementById('sim-stats-text');
    const stepCounter = document.getElementById('sim-step-counter');
    const instructionEl = document.getElementById('sim-instruction');
    const completeBanner = document.getElementById('sim-complete-banner');
    const resetBtn = document.getElementById('sim-reset-btn');
    const zoomInBtn = document.getElementById('sim-zoom-in');
    const zoomOutBtn = document.getElementById('sim-zoom-out');
    const stepRows = document.querySelectorAll('.sim-step');
    const triggerBtns = document.querySelectorAll('[data-trigger-key]');
    const quickKeyBtns = document.querySelectorAll('.quick-key-btn');
    const shadeBtns = document.querySelectorAll('.shade-btn');
    const selModeBtns = document.querySelectorAll('.sel-mode-btn');
    const toolIcons = document.querySelectorAll('.tool-icon');

    const stepsData = [
        {
            key: 'Tab',
            mode: 'Object Mode ▾',
            tool: 'select',
            shade: 'solid',
            stats: 'Verts: 8 | Edges: 12 | Faces: 6 | Objects: 1/3',
            text: 'Нажми клавишу <kbd>Tab</kbd> (или кнопку на панели), чтобы перевести куб в <strong>Edit Mode</strong> и увидеть его вершины и рёбра.'
        },
        {
            key: 'Ctrl+R',
            mode: 'Edit Mode ▾',
            tool: 'loopcut',
            shade: 'solid',
            stats: 'Verts: 8 | Edges: 12 | Faces: 6 | Выделено: Всё',
            text: 'Отлично! Теперь нажми <kbd>Ctrl + R</kbd> (инструмент <strong>Loop Cut</strong>), чтобы разрезать куб петлями под конёк крыши и проёмы окон.'
        },
        {
            key: 'E',
            mode: 'Edit Mode ▾',
            tool: 'extrude',
            shade: 'solid',
            stats: 'Verts: 24 | Edges: 38 | Faces: 16 | Loop Cut готов',
            text: 'Петли готовы! Нажми клавишу <kbd>E</kbd> (<strong>Extrude</strong>), чтобы выдавить двускатную крышу, дымоход, дверь и крыльцо.'
        },
        {
            key: 'Ctrl+B',
            mode: 'Edit Mode ▾',
            tool: 'bevel',
            shade: 'mat',
            stats: 'Verts: 42 | Edges: 68 | Faces: 28 | Экструзия готова',
            text: 'Супер! Нажми <kbd>Ctrl + B</kbd> (<strong>Bevel</strong>), чтобы снять аккуратную фаску с карнизов крыши и наличников окон.'
        },
        {
            key: 'F12',
            mode: 'Edit Mode ▾',
            tool: 'select',
            shade: 'mat',
            stats: 'Verts: 64 | Edges: 104 | Faces: 42 | Bevel применён',
            text: 'Финальный шаг! Нажми <kbd>F12</kbd>, чтобы запустить <strong>Cycles Render</strong> с плитками просчёта, тенями и светящимися окнами!'
        }
    ];

    let currentStep = 0; // 0..5
    let animProgress = 1;
    let renderTileProgress = 0;
    let viewportShade = 'solid'; // 'wire' | 'solid' | 'mat' | 'render'
    let selMode = 'vert'; // 'vert' | 'edge' | 'face'
    let yaw = -0.68;
    let pitch = 0.38;
    let zoom = 1.0;
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    let pinchDist = 0;
    let confetti = [];
    let smokePuffs = [];

    function initSmoke() {
        smokePuffs = [];
        for (let i = 0; i < 6; i++) {
            smokePuffs.push({
                offset: i * 0.18,
                drift: (Math.random() - 0.5) * 0.12
            });
        }
    }
    initSmoke();

    function spawnConfetti() {
        confetti = [];
        const colors = ['#f5792a', '#38bdf8', '#22c55e', '#facc15', '#f472b6'];
        const count = DeviceProfile.isMobile ? 35 : 65;
        for (let i = 0; i < count; i++) {
            confetti.push({
                x: 390 + (Math.random() - 0.5) * 180,
                y: 210,
                vx: (Math.random() - 0.5) * 7,
                vy: -Math.random() * 6 - 2,
                size: Math.random() * 6 + 4,
                color: colors[i % colors.length],
                rot: Math.random() * Math.PI * 2,
                vrot: (Math.random() - 0.5) * 0.2
            });
        }
    }

    function setShadeMode(mode) {
        viewportShade = mode;
        shadeBtns.forEach(b => b.classList.toggle('active', b.dataset.shade === mode));
    }

    function setToolIcon(toolName) {
        toolIcons.forEach(t => t.classList.toggle('active', t.dataset.tool === toolName));
    }

    function updateSimulatorUI() {
        stepRows.forEach((row, idx) => {
            row.classList.remove('active', 'done');
            if (idx < currentStep) row.classList.add('done');
            else if (idx === currentStep) row.classList.add('active');
        });

        quickKeyBtns.forEach((btn, idx) => {
            btn.classList.remove('active-key', 'done-key');
            if (idx < currentStep) btn.classList.add('done-key');
            else if (idx === currentStep) btn.classList.add('active-key');
        });

        if (currentStep < stepsData.length) {
            const st = stepsData[currentStep];
            stepCounter.textContent = `Шаг ${currentStep + 1} из ${stepsData.length}`;
            modeBadge.textContent = st.mode;
            statsText.textContent = st.stats;
            instructionEl.innerHTML = st.text;
            setToolIcon(st.tool);
            setShadeMode(st.shade);
            completeBanner.hidden = true;
        } else {
            stepCounter.textContent = 'Готово: 5 из 5';
            modeBadge.textContent = 'Cycles Render ▾';
            statsText.textContent = 'Verts: 64 | Faces: 42 | Mem: 48.2M | Cycles 128 Samples';
            instructionEl.innerHTML = 'Рендер завершён! Можешь вращать готовый 3D-коттедж мышкой или пальцем и переключать сферы режимов вьюпорта (Wireframe / Solid / Material / Rendered) справа сверху.';
            setShadeMode('render');
            completeBanner.hidden = false;
        }
    }

    function advanceStep(pressedLabel) {
        if (currentStep >= stepsData.length) return;
        const expected = stepsData[currentStep].key;
        if (pressedLabel !== expected) {
            keyBadge.textContent = `Нажато: ${pressedLabel} (сейчас нужно ${expected})`;
            keyBadge.classList.add('hud-warn');
            setTimeout(() => keyBadge.classList.remove('hud-warn'), 700);
            return;
        }

        keyBadge.classList.remove('hud-warn');
        keyBadge.textContent = `✓ Хоткей выполнен: ${pressedLabel}`;
        currentStep++;
        animProgress = 0;

        if (currentStep === 5) {
            renderTileProgress = 0;
            spawnConfetti();
        }
        updateSimulatorUI();
    }

    triggerBtns.forEach(btn => {
        btn.addEventListener('click', () => advanceStep(btn.getAttribute('data-trigger-key')));
    });

    shadeBtns.forEach(btn => {
        btn.addEventListener('click', () => setShadeMode(btn.dataset.shade));
    });

    selModeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            selMode = btn.dataset.selMode;
            selModeBtns.forEach(b => b.classList.toggle('active', b === btn));
        });
    });

    toolIcons.forEach(btn => {
        btn.addEventListener('click', () => setToolIcon(btn.dataset.tool));
    });

    zoomInBtn.addEventListener('click', () => { zoom = Math.min(1.45, zoom + 0.12); });
    zoomOutBtn.addEventListener('click', () => { zoom = Math.max(0.68, zoom - 0.12); });

    resetBtn.addEventListener('click', () => {
        currentStep = 0;
        animProgress = 1;
        renderTileProgress = 0;
        zoom = 1.0;
        confetti = [];
        keyBadge.textContent = 'Сцена сброшена к стартовому кубу';
        updateSimulatorUI();
    });

    // Клавиатурные хоткеи для ПК
    window.addEventListener('keydown', (e) => {
        if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

        if (e.key === '1') { selModeBtns[0].click(); return; }
        if (e.key === '2') { selModeBtns[1].click(); return; }
        if (e.key === '3') { selModeBtns[2].click(); return; }

        if (currentStep >= stepsData.length) return;
        const expected = stepsData[currentStep].key;
        let matched = null;

        if (e.key === 'Tab') {
            if (expected === 'Tab' || document.activeElement === canvas) {
                e.preventDefault();
                matched = 'Tab';
            }
        } else if (e.ctrlKey && (e.key.toLowerCase() === 'r' || e.code === 'KeyR')) {
            e.preventDefault();
            matched = 'Ctrl+R';
        } else if (!e.ctrlKey && !e.altKey && (e.key.toLowerCase() === 'e' || e.code === 'KeyE')) {
            matched = 'E';
        } else if (e.ctrlKey && (e.key.toLowerCase() === 'b' || e.code === 'KeyB')) {
            e.preventDefault();
            matched = 'Ctrl+B';
        } else if (e.key === 'F12') {
            e.preventDefault();
            matched = 'F12';
        }

        if (matched) advanceStep(matched);
    });

    // Управление камерой мышью и тачем (с поддержкой pinch-to-zoom на смартфонах)
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
    });
    window.addEventListener('mouseup', () => { isDragging = false; });
    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        yaw += dx * 0.01;
        pitch = Math.max(-0.25, Math.min(1.15, pitch + dy * 0.008));
    });

    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            isDragging = true;
            lastX = e.touches[0].clientX;
            lastY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            isDragging = false;
            pinchDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
        }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1 && isDragging) {
            const dx = e.touches[0].clientX - lastX;
            const dy = e.touches[0].clientY - lastY;
            lastX = e.touches[0].clientX;
            lastY = e.touches[0].clientY;
            yaw += dx * 0.012;
            pitch = Math.max(-0.25, Math.min(1.15, pitch + dy * 0.009));
        } else if (e.touches.length === 2 && pinchDist > 0) {
            const newDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            zoom = Math.max(0.68, Math.min(1.45, zoom * (newDist / pinchDist)));
            pinchDist = newDist;
        }
    }, { passive: true });
    canvas.addEventListener('touchend', () => { isDragging = false; pinchDist = 0; });

    function project3D(x, y, z, cx, cy, scale) {
        const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
        const x1 = x * cosY - y * sinY;
        const y1 = x * sinY + y * cosY;

        const cosP = Math.cos(pitch), sinP = Math.sin(pitch);
        const y2 = y1 * cosP - z * sinP;
        const z2 = y1 * sinP + z * cosP;

        const fov = 5.4;
        const depth = fov + y2;
        const factor = (fov / Math.max(1.4, depth)) * scale * zoom;
        return {
            x: cx + x1 * factor,
            y: cy - z2 * factor,
            depth: y2
        };
    }

    function drawPoly(pts, fill, stroke, lineWidth = 1.4) {
        if (pts.length < 3) return;
        ctx.beginPath();
        pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.closePath();
        if (fill) {
            ctx.fillStyle = fill;
            ctx.fill();
        }
        if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        }
    }

    function draw3DCursor(cx, cy, scale) {
        const c = project3D(0, 0, -0.75, cx, cy, scale);
        ctx.save();
        ctx.beginPath();
        ctx.arc(c.x, c.y, 9, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = '#ef4444';
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = 'rgba(255,255,255,0.75)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(c.x - 13, c.y); ctx.lineTo(c.x + 13, c.y);
        ctx.moveTo(c.x, c.y - 13); ctx.lineTo(c.x, c.y + 13);
        ctx.stroke();
        ctx.restore();
    }

    function drawSceneCameraAndLight(cx, cy, scale) {
        // Lamp (Area Light) at (-1.8, -1.6, 1.55)
        const lp = project3D(-1.75, -1.55, 1.55, cx, cy, scale);
        const lGround = project3D(-1.75, -1.55, -0.8, cx, cy, scale);

        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(lp.x, lp.y);
        ctx.lineTo(lGround.x, lGround.y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(lp.x, lp.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#facc15';
        ctx.fill();
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Camera pyramid gizmo at (1.9, -2.0, 0.85)
        const camApex = project3D(2.05, -2.15, 0.9, cx, cy, scale);
        const c1 = project3D(1.65, -1.75, 1.08, cx, cy, scale);
        const c2 = project3D(1.88, -1.62, 1.08, cx, cy, scale);
        const c3 = project3D(1.88, -1.62, 0.72, cx, cy, scale);
        const c4 = project3D(1.65, -1.75, 0.72, cx, cy, scale);

        ctx.strokeStyle = 'rgba(148, 163, 184, 0.75)';
        ctx.lineWidth = 1.3;
        [c1, c2, c3, c4].forEach(corner => {
            ctx.beginPath();
            ctx.moveTo(camApex.x, camApex.y);
            ctx.lineTo(corner.x, corner.y);
            ctx.stroke();
        });
        drawPoly([c1, c2, c3, c4], 'rgba(56, 189, 248, 0.12)', 'rgba(148, 163, 184, 0.85)', 1.3);
        ctx.restore();
    }

    function drawNavigationGizmo(cx, cy) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, 34, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.fill();

        const axes = [
            { label: 'X', vec: [1, 0, 0], color: '#ff4d6d' },
            { label: 'Y', vec: [0, 1, 0], color: '#52b788' },
            { label: 'Z', vec: [0, 0, 1], color: '#4ea8de' }
        ];
        const pts = axes.map(a => {
            const p = project3D(a.vec[0], a.vec[1], a.vec[2], 0, 0, 26 / zoom);
            return { ...a, px: cx + p.x, py: cy + p.y, depth: p.depth };
        }).sort((a, b) => b.depth - a.depth);

        pts.forEach(a => {
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(a.px, a.py);
            ctx.strokeStyle = a.color;
            ctx.lineWidth = 2.2;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(a.px, a.py, 8.5, 0, Math.PI * 2);
            ctx.fillStyle = a.color;
            ctx.fill();

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px Montserrat, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(a.label, a.px, a.py);
        });
        ctx.restore();
    }

    function renderLoop() {
        if (!isDragging) {
            yaw += 0.0022;
        }
        if (animProgress < 1) {
            animProgress = Math.min(1, animProgress + 0.04);
        }
        if (currentStep === 5 && renderTileProgress < 1) {
            renderTileProgress = Math.min(1, renderTileProgress + 0.022);
        }

        const w = canvas.width;
        const h = canvas.height;
        const cx = w * 0.5;
        const cy = h * 0.57;
        const scale = Math.min(w, h) * 0.24;

        const isRenderView = viewportShade === 'render' || currentStep === 5;
        const isMatView = viewportShade === 'mat';
        const isWireView = viewportShade === 'wire';

        // 1. Фон вьюпорта (В режиме рендера — красивое сумеречное HDRI небо)
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        if (isRenderView) {
            bgGrad.addColorStop(0, '#0f172a');
            bgGrad.addColorStop(0.55, '#1e293b');
            bgGrad.addColorStop(1, '#111827');
        } else if (isMatView) {
            bgGrad.addColorStop(0, '#2b303c');
            bgGrad.addColorStop(1, '#1d212a');
        } else {
            bgGrad.addColorStop(0, '#303030');
            bgGrad.addColorStop(1, '#1d1d1d');
        }
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // 2. 3D Сетка пола Blender (XY plane at z = -0.8)
        const gridZ = -0.8;
        const gridRange = DeviceProfile.isMobile ? 4 : 5;
        for (let i = -gridRange; i <= gridRange; i++) {
            const p1 = project3D(i, -gridRange, gridZ, cx, cy, scale);
            const p2 = project3D(i, gridRange, gridZ, cx, cy, scale);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = i === 0 ? 'rgba(82, 183, 136, 0.7)' : 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = i === 0 ? 1.8 : 1;
            ctx.stroke();

            const p3 = project3D(-gridRange, i, gridZ, cx, cy, scale);
            const p4 = project3D(gridRange, i, gridZ, cx, cy, scale);
            ctx.beginPath();
            ctx.moveTo(p3.x, p3.y);
            ctx.lineTo(p4.x, p4.y);
            ctx.strokeStyle = i === 0 ? 'rgba(255, 77, 109, 0.7)' : 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = i === 0 ? 1.8 : 1;
            ctx.stroke();
        }

        // Мягкая тень под домом в режиме Material / Render
        if (isRenderView || isMatView) {
            const shCenter = project3D(0, 0, gridZ, cx, cy, scale);
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(shCenter.x, shCenter.y + 6, 135 * zoom, 52 * zoom, 0, 0, Math.PI * 2);
            ctx.fillStyle = isRenderView ? 'rgba(0, 0, 0, 0.58)' : 'rgba(0, 0, 0, 0.32)';
            ctx.filter = 'blur(10px)';
            ctx.fill();
            ctx.restore();
        }

        // 3. Расчёт геометрии дома по шагам
        const ease = 1 - Math.pow(1 - animProgress, 3);
        const roofLift = currentStep < 3 ? 0 : (currentStep === 3 ? 0.82 * ease : 0.82);
        const bevelAmt = currentStep < 4 ? 0 : (currentStep === 4 ? 0.12 * ease : 0.12);
        const eavesOut = currentStep >= 4 ? (currentStep === 4 ? 0.10 * ease : 0.10) : 0;

        const bx = 0.88;
        const by = 0.96;
        const zBot = -0.8;
        const zWallTop = 0.44;
        const zPeak = zWallTop + roofLift;

        const verts3D = [
            [-bx, -by, zBot], // 0: front-left-bottom
            [ bx, -by, zBot], // 1: front-right-bottom
            [ bx,  by, zBot], // 2: back-right-bottom
            [-bx,  by, zBot], // 3: back-left-bottom
            [-(bx + eavesOut), -(by + eavesOut), zWallTop], // 4: front-left-top
            [ (bx + eavesOut), -(by + eavesOut), zWallTop], // 5: front-right-top
            [ (bx + eavesOut),  (by + eavesOut), zWallTop], // 6: back-right-top
            [-(bx + eavesOut),  (by + eavesOut), zWallTop], // 7: back-left-top
            [0, -(by + eavesOut), zPeak], // 8: front-ridge
            [0,  (by + eavesOut), zPeak]  // 9: back-ridge
        ];

        const proj = verts3D.map(v => project3D(v[0], v[1], v[2], cx, cy, scale));

        const faces = [
            { idx: [0, 1, 5, 8, 4], shade: 1.0,  isRoof: false, tag: 'front' },
            { idx: [2, 3, 7, 9, 6], shade: 0.62, isRoof: false, tag: 'back' },
            { idx: [1, 2, 6, 5],    shade: 0.84, isRoof: false, tag: 'right' },
            { idx: [3, 0, 4, 7],    shade: 0.72, isRoof: false, tag: 'left' },
            { idx: [4, 8, 9, 7],    shade: 0.94, isRoof: true,  tag: 'roofL' },
            { idx: [8, 5, 6, 9],    shade: 1.12, isRoof: true,  tag: 'roofR' }
        ];

        // Дополнительные 3D-детали (Крыльцо и Дымоход появляются с Шага 3 — Extrude)
        if (currentStep >= 3) {
            const extScale = currentStep === 3 ? ease : 1;
            // Дымоход на правом скате
            const chZ1 = zWallTop + 0.25 * extScale;
            const chZ2 = zWallTop + 0.88 * extScale;
            const chPts = [
                [0.28, 0.15, chZ1], [0.52, 0.15, chZ1], [0.52, 0.42, chZ1], [0.28, 0.42, chZ1],
                [0.28, 0.15, chZ2], [0.52, 0.15, chZ2], [0.52, 0.42, chZ2], [0.28, 0.42, chZ2]
            ].map(v => project3D(v[0], v[1], v[2], cx, cy, scale));

            faces.push(
                { customPts: [chPts[0], chPts[1], chPts[5], chPts[4]], shade: 0.9, isRoof: true, isChimney: true },
                { customPts: [chPts[1], chPts[2], chPts[6], chPts[5]], shade: 0.78, isRoof: true, isChimney: true },
                { customPts: [chPts[4], chPts[5], chPts[6], chPts[7]], shade: 1.05, isRoof: true, isChimney: true }
            );
        }

        const sortedFaces = faces.map(f => {
            const pts = f.customPts || f.idx.map(vi => proj[vi]);
            const avgDepth = pts.reduce((acc, p) => acc + p.depth, 0) / pts.length;
            return { ...f, pts, avgDepth };
        }).sort((a, b) => b.avgDepth - a.avgDepth);

        const tileReveal = currentStep === 5 ? renderTileProgress : (viewportShade === 'render' ? 1 : 0);

        // 4. Отрисовка граней
        sortedFaces.forEach(f => {
            if (!isWireView) {
                let fillCol;
                if (tileReveal > 0.05 || isMatView) {
                    const blend = isMatView ? 0.85 : tileReveal;
                    const r = f.isRoof ? (f.isChimney ? 185 : 225) : 230;
                    const g = f.isRoof ? (f.isChimney ? 75  : 102) : 236;
                    const b = f.isRoof ? (f.isChimney ? 55  : 48)  : 245;
                    fillCol = `rgba(${Math.min(255, Math.round(r * f.shade))}, ${Math.min(255, Math.round(g * f.shade))}, ${Math.min(255, Math.round(b * f.shade))}, ${0.95 * blend})`;
                } else if (currentStep === 1 && selMode === 'face') {
                    fillCol = `rgba(245, 121, 42, ${0.28 * f.shade})`;
                } else {
                    const base = Math.round(128 * f.shade);
                    fillCol = `rgba(${base}, ${base + 5}, ${base + 12}, 0.92)`;
                }
                drawPoly(f.pts, fillCol, null);
            }

            // Дверь и светящиеся окна (с шага 2 как разметка, с шага 3/5 как 3D проёмы со светом)
            if (f.tag === 'front' && currentStep >= 2) {
                const winPts = [
                    project3D(-0.56, -by - 0.01, -0.18, cx, cy, scale),
                    project3D(-0.12, -by - 0.01, -0.18, cx, cy, scale),
                    project3D(-0.12, -by - 0.01,  0.22, cx, cy, scale),
                    project3D(-0.56, -by - 0.01,  0.22, cx, cy, scale)
                ];
                const doorPts = [
                    project3D(0.16, -by - 0.01, zBot, cx, cy, scale),
                    project3D(0.54, -by - 0.01, zBot, cx, cy, scale),
                    project3D(0.54, -by - 0.01, -0.04, cx, cy, scale),
                    project3D(0.16, -by - 0.01, -0.04, cx, cy, scale)
                ];

                if (tileReveal > 0.25 || isMatView) {
                    ctx.save();
                    ctx.shadowColor = '#fbbf24';
                    ctx.shadowBlur = 22 * (tileReveal || 0.7);
                    drawPoly(winPts, 'rgba(254, 240, 138, 0.96)', '#f59e0b', 1.8);
                    ctx.restore();
                    drawPoly(doorPts, '#78350f', '#f5792a', 1.4);
                } else {
                    drawPoly(winPts, 'rgba(245, 121, 42, 0.22)', '#facc15', 1.6);
                    drawPoly(doorPts, 'rgba(245, 121, 42, 0.16)', '#f5792a', 1.5);
                }
            }

            // Боковое окно на правой стене
            if (f.tag === 'right' && currentStep >= 3) {
                const sideWin = [
                    project3D(bx + 0.01, -0.35, -0.14, cx, cy, scale),
                    project3D(bx + 0.01,  0.35, -0.14, cx, cy, scale),
                    project3D(bx + 0.01,  0.35,  0.20, cx, cy, scale),
                    project3D(bx + 0.01, -0.35,  0.20, cx, cy, scale)
                ];
                if (tileReveal > 0.25 || isMatView) {
                    ctx.save();
                    ctx.shadowColor = '#fbbf24';
                    ctx.shadowBlur = 16;
                    drawPoly(sideWin, 'rgba(253, 224, 71, 0.92)', '#d97706', 1.5);
                    ctx.restore();
                } else {
                    drawPoly(sideWin, 'rgba(56, 189, 248, 0.18)', '#38bdf8', 1.4);
                }
            }
        });

        // 5. Каркасные рёбра и вершины Edit Mode
        if (tileReveal < 0.96 || isWireView) {
            const edges = [
                [0,1],[1,2],[2,3],[3,0],
                [4,5],[5,6],[6,7],[7,4],
                [0,4],[1,5],[2,6],[3,7]
            ];
            if (currentStep >= 2) {
                edges.push([4,8],[8,5],[7,9],[9,6],[8,9]);
            }

            edges.forEach(([a, b]) => {
                ctx.beginPath();
                ctx.moveTo(proj[a].x, proj[a].y);
                ctx.lineTo(proj[b].x, proj[b].y);

                if (currentStep === 0) {
                    ctx.strokeStyle = '#f5792a';
                    ctx.lineWidth = 2.2;
                } else if (currentStep === 4 && (a >= 4 || b >= 4)) {
                    ctx.strokeStyle = '#38bdf8';
                    ctx.lineWidth = 2.5;
                } else if (selMode === 'edge') {
                    ctx.strokeStyle = '#fbbf24';
                    ctx.lineWidth = 2.1;
                } else {
                    ctx.strokeStyle = isWireView ? '#f5792a' : 'rgba(245, 121, 42, 0.85)';
                    ctx.lineWidth = 1.5;
                }
                ctx.stroke();
            });

            // Анимация кольца разреза Loop Cut на шаге 2
            if (currentStep === 2) {
                const pulse = 0.65 + 0.35 * Math.sin(Date.now() * 0.009);
                const lc = [
                    project3D(0, -by, zBot, cx, cy, scale),
                    project3D(0, -by, zWallTop, cx, cy, scale),
                    project3D(0,  by, zWallTop, cx, cy, scale),
                    project3D(0,  by, zBot, cx, cy, scale)
                ];
                drawPoly(lc, 'rgba(250, 204, 21, 0.08)', `rgba(250, 204, 21, ${pulse})`, 3);
            }

            // Точки вершин в Edit Mode
            if (currentStep >= 1 && currentStep <= 4 && selMode === 'vert') {
                const vCount = currentStep >= 2 ? 10 : 8;
                for (let i = 0; i < vCount; i++) {
                    ctx.beginPath();
                    ctx.arc(proj[i].x, proj[i].y, i >= 8 ? 4.8 : 3.8, 0, Math.PI * 2);
                    ctx.fillStyle = i >= 8 ? '#fde047' : '#ff9f1c';
                    ctx.fill();
                    ctx.strokeStyle = '#18181b';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        }

        // Дымок из трубы в режиме рендера
        if (tileReveal > 0.5) {
            const t = Date.now() * 0.0006;
            smokePuffs.forEach(p => {
                const cycle = (t + p.offset) % 1;
                const sp = project3D(0.4 + p.drift * cycle * 3, 0.28, zWallTop + 0.9 + cycle * 0.9, cx, cy, scale);
                ctx.beginPath();
                ctx.arc(sp.x, sp.y, (6 + cycle * 14) * zoom, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(226, 232, 240, ${(1 - cycle) * 0.32 * tileReveal})`;
                ctx.fill();
            });
        }

        // 3D Курсор и объекты сцены (Камера + Свет)
        if (currentStep < 5 && viewportShade !== 'render') {
            draw3DCursor(cx, cy, scale);
            drawSceneCameraAndLight(cx, cy, scale);
        }

        // Плитки рендера Cycles (Render Buckets) при нажатии F12
        if (currentStep === 5 && renderTileProgress < 1) {
            const bucketW = 90;
            const bucketH = 75;
            const bx = cx - 150 + ((renderTileProgress * 4) % 1) * 210;
            const by = cy - 140 + Math.floor(renderTileProgress * 3) * 80;
            ctx.strokeStyle = '#f5792a';
            ctx.lineWidth = 2;
            ctx.strokeRect(bx, by, bucketW, bucketH);
            ctx.fillStyle = 'rgba(245, 121, 42, 0.12)';
            ctx.fillRect(bx, by, bucketW, bucketH);
        }

        // Конфетти
        confetti.forEach(c => {
            c.x += c.vx;
            c.y += c.vy;
            c.vy += 0.16;
            c.rot += c.vrot;
            if (c.y < h + 20) {
                ctx.save();
                ctx.translate(c.x, c.y);
                ctx.rotate(c.rot);
                ctx.fillStyle = c.color;
                ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);
                ctx.restore();
            }
        });

        // Текст оверлея Blender в левом верхнем углу вьюпорта
        ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.font = '500 11.5px Montserrat, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('User Perspective (Local)', 14, 22);
        ctx.fillStyle = 'rgba(245, 121, 42, 0.9)';
        ctx.fillText(`(1) Collection | House_Mesh • ${viewportShade.toUpperCase()}`, 14, 38);

        drawNavigationGizmo(w - 48, 50);
        requestAnimationFrame(renderLoop);
    }

    updateSimulatorUI();
    renderLoop();
})();

// ============================================================
// 3. ЛАБОРАТОРИЯ ШЕЙДЕРОВ (НАСТОЯЩАЯ 3D-СЕТКА + PRINCIPLED BSDF)
// ============================================================
(function initShaderLab3D() {
    const canvas = document.getElementById('lab-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const colorInput = document.getElementById('lab-color');
    const colorDots = document.querySelectorAll('.color-dot');
    const metalSlider = document.getElementById('lab-metallic');
    const metalVal = document.getElementById('lab-metallic-val');
    const roughSlider = document.getElementById('lab-roughness');
    const roughVal = document.getElementById('lab-roughness-val');
    const emissSlider = document.getElementById('lab-emission');
    const emissVal = document.getElementById('lab-emission-val');
    const engineBtns = document.querySelectorAll('.engine-btn');
    const denoiserCheck = document.getElementById('lab-denoiser');
    const denoiseWrapper = document.getElementById('denoise-wrapper');
    const shapeBtns = document.querySelectorAll('[data-lab-shape]');
    const hdriBtns = document.querySelectorAll('[data-hdri]');
    const autoRotateBtn = document.getElementById('lab-autorotate-btn');
    const statusBadge = document.getElementById('lab-render-status');
    const sampleBadge = document.getElementById('lab-sample-counter');
    const hintText = document.getElementById('lab-engine-hint');

    let matColor = '#f5792a';
    let metallic = 0.20;
    let roughness = 0.25;
    let emission = 0.75;
    let engine = 'cycles';
    let denoiser = true;
    let shape = 'shaderball'; // 'shaderball' | 'house' | 'torus'
    let hdri = 'sunset';      // 'sunset' | 'studio' | 'night'
    let autoRotate = true;

    let yaw = 0.55;
    let pitch = 0.34;
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    let currentSamples = 128;

    const hdriPresets = {
        sunset: {
            skyTop: '#1e1b4b',
            skyMid: '#4c1d95',
            skyHorizon: '#ea580c',
            floorCol: '#18142c',
            keyLight: [0.62, -0.52, 0.58],
            rimColor: [251, 146, 60]
        },
        studio: {
            skyTop: '#1e293b',
            skyMid: '#334155',
            skyHorizon: '#64748b',
            floorCol: '#161e29',
            keyLight: [0.55, -0.60, 0.58],
            rimColor: [148, 163, 184]
        },
        night: {
            skyTop: '#090d16',
            skyMid: '#0f172a',
            skyHorizon: '#0284c7',
            floorCol: '#09111e',
            keyLight: [0.50, -0.58, 0.64],
            rimColor: [56, 189, 248]
        }
    };

    function restartProgressiveSampling() {
        currentSamples = engine === 'cycles' ? 4 : 128;
    }

    function hexToRgb(hex) {
        const clean = hex.replace('#', '');
        const num = parseInt(clean, 16);
        return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
    }

    function updateLabStatus() {
        restartProgressiveSampling();
        if (engine === 'eevee') {
            statusBadge.textContent = 'EEVEE • Real-Time Raster';
            sampleBadge.textContent = 'Real-Time 60 FPS';
            denoiseWrapper.style.opacity = '0.5';
            hintText.innerHTML = '<strong>EEVEE:</strong> мгновенная растеризация в реальном времени — идеально для слабых ПК, но без глубокой трассировки лучей.';
        } else if (denoiser) {
            statusBadge.textContent = 'Cycles • Ray Tracing + OptiX';
            denoiseWrapper.style.opacity = '1';
            hintText.innerHTML = '<strong>Cycles + OptiX Denoiser:</strong> физически точные блики и отражения, а нейросеть сглаживает шум трассировки лучей.';
        } else {
            statusBadge.textContent = 'Cycles • Raw Path Tracing (Шум)';
            denoiseWrapper.style.opacity = '1';
            hintText.innerHTML = '<strong>Cycles без Denoiser:</strong> видны «светлячки» и зернистость Монте-Карло на тенях. Поставь галочку Denoiser!';
        }
    }

    colorDots.forEach(dot => {
        dot.addEventListener('click', () => {
            colorDots.forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            matColor = dot.dataset.color;
            colorInput.value = matColor;
            restartProgressiveSampling();
        });
    });

    colorInput.addEventListener('input', (e) => {
        matColor = e.target.value;
        colorDots.forEach(d => d.classList.remove('active'));
        restartProgressiveSampling();
    });

    metalSlider.addEventListener('input', (e) => {
        metallic = parseFloat(e.target.value);
        metalVal.textContent = metallic.toFixed(2);
        restartProgressiveSampling();
    });

    roughSlider.addEventListener('input', (e) => {
        roughness = parseFloat(e.target.value);
        roughVal.textContent = roughness.toFixed(2);
        restartProgressiveSampling();
    });

    emissSlider.addEventListener('input', (e) => {
        emission = parseFloat(e.target.value);
        emissVal.textContent = emission.toFixed(2);
        restartProgressiveSampling();
    });

    engineBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            engineBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            engine = btn.dataset.engine;
            updateLabStatus();
        });
    });

    denoiserCheck.addEventListener('change', (e) => {
        denoiser = e.target.checked;
        updateLabStatus();
    });

    shapeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            shapeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            shape = btn.dataset.labShape;
            restartProgressiveSampling();
        });
    });

    hdriBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            hdriBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            hdri = btn.dataset.hdri;
            restartProgressiveSampling();
        });
    });

    autoRotateBtn.addEventListener('click', () => {
        autoRotate = !autoRotate;
        autoRotateBtn.classList.toggle('active', autoRotate);
        autoRotateBtn.textContent = autoRotate ? '⟳ Автовращение: Вкл' : '⟳ Автовращение: Выкл';
    });

    // Вращение 3D-модели в лаборатории мышью и пальцем
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
    });
    window.addEventListener('mouseup', () => { isDragging = false; });
    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        yaw += (e.clientX - lastX) * 0.011;
        pitch = Math.max(-0.35, Math.min(1.05, pitch + (e.clientY - lastY) * 0.008));
        lastX = e.clientX;
        lastY = e.clientY;
        restartProgressiveSampling();
    });

    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            isDragging = true;
            lastX = e.touches[0].clientX;
            lastY = e.touches[0].clientY;
        }
    }, { passive: true });
    canvas.addEventListener('touchmove', (e) => {
        if (!isDragging || e.touches.length !== 1) return;
        yaw += (e.touches[0].clientX - lastX) * 0.013;
        pitch = Math.max(-0.35, Math.min(1.05, pitch + (e.touches[0].clientY - lastY) * 0.009));
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
        restartProgressiveSampling();
    }, { passive: true });
    canvas.addEventListener('touchend', () => { isDragging = false; });

    function rotateVec(x, y, z) {
        const cy = Math.cos(yaw), sy = Math.sin(yaw);
        const x1 = x * cy - y * sy;
        const y1 = x * sy + y * cy;

        const cp = Math.cos(pitch), sp = Math.sin(pitch);
        const y2 = y1 * cp - z * sp;
        const z2 = y1 * sp + z * cp;
        return { x: x1, y: y2, z: z2 };
    }

    function projPt(v, cx, cy, scale) {
        const fov = 4.8;
        const f = (fov / Math.max(1.4, fov + v.y)) * scale;
        return { x: cx + v.x * f, y: cy - v.z * f, depth: v.y };
    }

    // Генерация настоящей 3D-сетки Шейдер-шара с экваториальным светящимся кольцом и подставкой
    function buildShaderBallFaces() {
        const latSteps = DeviceProfile.isMobile ? 12 : 16;
        const lonSteps = DeviceProfile.isMobile ? 18 : 24;
        const faces = [];
        const R = 1.02;

        for (let i = 0; i < latSteps; i++) {
            const t1 = -Math.PI * 0.5 + (i / latSteps) * Math.PI;
            const t2 = -Math.PI * 0.5 + ((i + 1) / latSteps) * Math.PI;
            const isEquatorRing = (i === Math.floor(latSteps * 0.48));
            const rScale = isEquatorRing ? 0.94 : 1.0;

            for (let j = 0; j < lonSteps; j++) {
                const p1 = (j / lonSteps) * Math.PI * 2;
                const p2 = ((j + 1) / lonSteps) * Math.PI * 2;

                const v0 = [R * rScale * Math.cos(t1) * Math.cos(p1), R * rScale * Math.cos(t1) * Math.sin(p1), R * Math.sin(t1)];
                const v1 = [R * rScale * Math.cos(t1) * Math.cos(p2), R * rScale * Math.cos(t1) * Math.sin(p2), R * Math.sin(t1)];
                const v2 = [R * rScale * Math.cos(t2) * Math.cos(p2), R * rScale * Math.cos(t2) * Math.sin(p2), R * Math.sin(t2)];
                const v3 = [R * rScale * Math.cos(t2) * Math.cos(p1), R * rScale * Math.cos(t2) * Math.sin(p1), R * Math.sin(t2)];

                const tm = (t1 + t2) * 0.5;
                const pm = (p1 + p2) * 0.5;
                const nx = Math.cos(tm) * Math.cos(pm);
                const ny = Math.cos(tm) * Math.sin(pm);
                const nz = Math.sin(tm);

                faces.push({
                    verts: [v0, v1, v2, v3],
                    normal: [nx, ny, nz],
                    emissive: isEquatorRing
                });
            }
        }
        return faces;
    }

    // Генерация 3D Тора (Donut)
    function buildTorusFaces() {
        const uSteps = DeviceProfile.isMobile ? 16 : 22;
        const vSteps = DeviceProfile.isMobile ? 12 : 16;
        const R = 0.78;
        const r = 0.36;
        const faces = [];

        for (let i = 0; i < uSteps; i++) {
            const u1 = (i / uSteps) * Math.PI * 2;
            const u2 = ((i + 1) / uSteps) * Math.PI * 2;
            for (let j = 0; j < vSteps; j++) {
                const v1 = (j / vSteps) * Math.PI * 2;
                const v2 = ((j + 1) / vSteps) * Math.PI * 2;
                const isNeonStripe = (j === 3 || j === 11);

                const pt = (u, v) => [
                    (R + r * Math.cos(v)) * Math.cos(u),
                    (R + r * Math.cos(v)) * Math.sin(u),
                    r * Math.sin(v)
                ];

                const um = (u1 + u2) * 0.5;
                const vm = (v1 + v2) * 0.5;
                const nx = Math.cos(vm) * Math.cos(um);
                const ny = Math.cos(vm) * Math.sin(um);
                const nz = Math.sin(vm);

                faces.push({
                    verts: [pt(u1, v1), pt(u2, v1), pt(u2, v2), pt(u1, v2)],
                    normal: [nx, ny, nz],
                    emissive: isNeonStripe
                });
            }
        }
        return faces;
    }

    // Генерация 3D Коттеджа для лаборатории
    function buildHouseFaces() {
        const bx = 0.82, by = 0.9, zb = -0.82, zt = 0.32, zp = 1.02;
        const V = [
            [-bx, -by, zb], [bx, -by, zb], [bx, by, zb], [-bx, by, zb],
            [-bx, -by, zt], [bx, -by, zt], [bx, by, zt], [-bx, by, zt],
            [0, -by, zp], [0, by, zp]
        ];
        return [
            { verts: [V[0], V[1], V[5], V[8], V[4]], normal: [0, -1, 0], emissive: false, hasWin: true },
            { verts: [V[2], V[3], V[7], V[9], V[6]], normal: [0,  1, 0], emissive: false },
            { verts: [V[1], V[2], V[6], V[5]],       normal: [1,  0, 0], emissive: false },
            { verts: [V[3], V[0], V[4], V[7]],       normal: [-1, 0, 0], emissive: false },
            { verts: [V[4], V[8], V[9], V[7]],       normal: [-0.65, 0, 0.75], emissive: false, isRoof: true },
            { verts: [V[8], V[5], V[6], V[9]],       normal: [ 0.65, 0, 0.75], emissive: false, isRoof: true },
            // Светящееся окно фасада
            {
                verts: [[-0.46, -by - 0.02, -0.22], [-0.08, -by - 0.02, -0.22], [-0.08, -by - 0.02, 0.18], [-0.46, -by - 0.02, 0.18]],
                normal: [0, -1, 0],
                emissive: true
            },
            {
                verts: [[0.14, -by - 0.02, -0.22], [0.50, -by - 0.02, -0.22], [0.50, -by - 0.02, 0.18], [0.14, -by - 0.02, 0.18]],
                normal: [0, -1, 0],
                emissive: true
            }
        ];
    }

    function shadePolygonPBR(normalRot, rgb, env) {
        const [lx, ly, lz] = env.keyLight;
        const nx = normalRot.x, ny = normalRot.y, nz = normalRot.z;

        // Diffuse N dot L
        const ndotl = Math.max(0.08, nx * lx + ny * ly + nz * lz);

        // Half-vector specular (View is [0, -1, 0])
        const hx = lx, hy = ly - 1.0, hz = lz;
        const hLen = Math.hypot(hx, hy, hz) || 1;
        const ndoth = Math.max(0, (nx * hx + ny * hy + nz * hz) / hLen);

        const shininess = Math.pow(Math.max(1.05 - roughness, 0.05), 3.2) * 95 + 4;
        const specPower = Math.pow(ndoth, shininess) * (1.25 - roughness * 0.9);

        // Fresnel rim reflection (stronger at grazing angles & high metallic)
        const viewDot = Math.max(0, -ny);
        const fresnel = Math.pow(1 - viewDot, 2.6) * (0.35 + metallic * 0.65) * (1.1 - roughness * 0.6);

        // Metallic tinting: metals tint specular with base color & darken diffuse
        const diffFactor = ndotl * (1 - metallic * 0.65);
        const specR = metallic * rgb.r + (1 - metallic) * 255;
        const specG = metallic * rgb.g + (1 - metallic) * 255;
        const specB = metallic * rgb.b + (1 - metallic) * 255;

        const r = Math.min(255, rgb.r * diffFactor + specR * specPower * 0.85 + env.rimColor[0] * fresnel);
        const g = Math.min(255, rgb.g * diffFactor + specG * specPower * 0.85 + env.rimColor[1] * fresnel);
        const b = Math.min(255, rgb.b * diffFactor + specB * specPower * 0.85 + env.rimColor[2] * fresnel);

        return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    }

    function renderLabFrame() {
        if (autoRotate && !isDragging) {
            yaw += 0.009;
        }
        if (engine === 'cycles' && currentSamples < 128) {
            currentSamples = Math.min(128, currentSamples + 4);
            sampleBadge.textContent = currentSamples < 128
                ? `Path Tracing: ${currentSamples} / 128`
                : `Samples: 128 / 128 ✓`;
        }

        const w = canvas.width;
        const h = canvas.height;
        const cx = w * 0.5;
        const cy = h * 0.52;
        const scale = Math.min(w, h) * 0.28;
        const rgb = hexToRgb(matColor);
        const env = hdriPresets[hdri];

        // 1. HDRI Sky Dome & Reflective Studio Floor
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.64);
        skyGrad.addColorStop(0, env.skyTop);
        skyGrad.addColorStop(0.65, env.skyMid);
        skyGrad.addColorStop(1, env.skyHorizon);
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h * 0.64);

        const floorGrad = ctx.createLinearGradient(0, h * 0.64, 0, h);
        floorGrad.addColorStop(0, env.floorCol);
        floorGrad.addColorStop(1, '#070a10');
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, h * 0.64, w, h * 0.36);

        // Перспективная сетка студийного пола
        const floorZ = -1.05;
        for (let i = -4; i <= 4; i++) {
            const p1 = projPt(rotateVec(i * 0.7, -2.8, floorZ), cx, cy, scale);
            const p2 = projPt(rotateVec(i * 0.7,  2.8, floorZ), cx, cy, scale);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Зеркальное отражение на полу в Cycles (зависит от Roughness и Emission)
        if (engine === 'cycles') {
            ctx.save();
            const reflAlpha = (1.05 - roughness * 0.75) * 0.35;
            ctx.beginPath();
            ctx.ellipse(cx, cy + 125, 95, 34, 0, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${reflAlpha})`;
            ctx.filter = `blur(${Math.round(6 + roughness * 18)}px)`;
            ctx.fill();
            ctx.restore();
        }

        // Тень Ambient Occlusion под объектом
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy + 115, engine === 'cycles' ? 115 : 95, 26, 0, 0, Math.PI * 2);
        ctx.fillStyle = engine === 'cycles' ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.38)';
        ctx.filter = engine === 'cycles' ? 'blur(10px)' : 'blur(4px)';
        ctx.fill();
        ctx.restore();

        // 2. Сборка и сортировка 3D-граней выбранной модели
        const rawFaces = shape === 'shaderball'
            ? buildShaderBallFaces()
            : (shape === 'torus' ? buildTorusFaces() : buildHouseFaces());

        const projectedFaces = rawFaces.map(f => {
            const rVerts = f.verts.map(v => rotateVec(v[0], v[1], v[2]));
            const pVerts = rVerts.map(rv => projPt(rv, cx, cy, scale));
            const rNorm = rotateVec(f.normal[0], f.normal[1], f.normal[2]);
            const avgDepth = pVerts.reduce((s, p) => s + p.depth, 0) / pVerts.length;
            return { ...f, pVerts, rNorm, avgDepth };
        }).sort((a, b) => b.avgDepth - a.avgDepth);

        // 3. Отрисовка 3D-полигонов с физическим шейдингом Principled BSDF
        projectedFaces.forEach(f => {
            // Backface culling для выпуклых мешей (шар и тор)
            if (shape !== 'house' && f.rNorm.y > 0.22) return;

            ctx.beginPath();
            f.pVerts.forEach((p, idx) => idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
            ctx.closePath();

            if (f.emissive && emission > 0.02) {
                ctx.save();
                if (engine === 'cycles') {
                    ctx.shadowColor = '#fde047';
                    ctx.shadowBlur = 22 * emission;
                }
                const lum = Math.round(80 + emission * 175);
                ctx.fillStyle = `rgb(${lum}, ${Math.round(lum * 0.92)}, ${Math.round(45 + emission * 65)})`;
                ctx.fill();
                ctx.restore();
            } else {
                const baseShadeColor = f.isRoof ? { r: 215, g: 222, b: 232 } : rgb;
                const col = shadePolygonPBR(f.rNorm, baseShadeColor, env);
                ctx.fillStyle = col;
                ctx.fill();
                ctx.strokeStyle = roughness < 0.35
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(0, 0, 0, 0.12)';
                ctx.lineWidth = 0.7;
                ctx.stroke();
            }
        });

        // 4. Реалистичный шум трассировки лучей (Cycles без Denoiser или во время накопления сэмплов)
        const showRawNoise = engine === 'cycles' && (!denoiser || currentSamples < 128);
        if (showRawNoise) {
            const noiseIntensity = !denoiser ? 1.0 : (1 - currentSamples / 128);
            const dotsCount = Math.floor((DeviceProfile.isMobile ? 650 : 1200) * noiseIntensity);
            ctx.save();
            for (let i = 0; i < dotsCount; i++) {
                const nx = cx - 145 + Math.random() * 290;
                const ny = cy - 135 + Math.random() * 265;
                ctx.fillStyle = Math.random() > 0.45
                    ? `rgba(255, 245, 200, ${0.24 * noiseIntensity})`
                    : `rgba(0, 0, 0, ${0.32 * noiseIntensity})`;
                ctx.fillRect(nx, ny, 2, 2);
            }
            ctx.restore();
        }

        requestAnimationFrame(renderLabFrame);
    }

    updateLabStatus();
    renderLabFrame();
})();

// ============================================================
// 4. ЧЕК-ЛИСТ ПРАКТИЧЕСКИХ ЗАДАНИЙ (localStorage)
// ============================================================
(function initPracticeTasks() {
    const TASK_COUNT = 5;
    const textEl = document.getElementById('practice-progress-text');
    const fillEl = document.getElementById('practice-progress-fill');
    const boxes = document.querySelectorAll('[data-task-checkbox]');

    function loadTasks() {
        try {
            return JSON.parse(localStorage.getItem('blenderPracticeProgress')) || {};
        } catch {
            return {};
        }
    }

    function updateUI(state) {
        const done = Object.values(state).filter(Boolean).length;
        textEl.textContent = `Выполнено ${done} из ${TASK_COUNT} заданий`;
        fillEl.style.width = `${(done / TASK_COUNT) * 100}%`;
    }

    const state = loadTasks();
    boxes.forEach(cb => {
        const id = cb.getAttribute('data-task-checkbox');
        cb.checked = !!state[id];
        cb.addEventListener('change', () => {
            state[id] = cb.checked;
            localStorage.setItem('blenderPracticeProgress', JSON.stringify(state));
            updateUI(state);
        });
    });

    updateUI(state);
})();

// ============================================================
// 5. ПОНЯТНЫЙ СЛОВАРЬ 3D-ТЕРМИНОВ ДЛЯ НОВИЧКОВ
// ============================================================
(function initGlossary() {
    const terms = [
        { title: 'Вьюпорт (Viewport)', cat: 'interface', label: 'Интерфейс', desc: 'Главное 3D-окно программы, где ты видишь сцену, вращаешь камеру и собираешь модели со всех сторон.' },
        { title: 'Object Mode и Edit Mode (Tab)', cat: 'interface', label: 'Интерфейс', desc: 'Два главных режима: в Object Mode ты двигаешь объект целиком, а в Edit Mode меняешь его форму по точкам и граням.' },
        { title: 'Хоткеи / Шорткаты (Hotkeys)', cat: 'interface', label: 'Интерфейс', desc: 'Горячие клавиши (G — двигать, R — вращать, S — масштаб), которые ускоряют работу в несколько раз.' },
        { title: 'Меш / Полигональная сетка (Mesh)', cat: 'modeling', label: 'Моделирование', desc: 'Объёмный каркас 3D-модели, состоящий из множества точек, отрезков и плоских многоугольников.' },
        { title: 'Вершина, Ребро, Грань (Vertex, Edge, Face)', cat: 'modeling', label: 'Моделирование', desc: 'Три кирпичика любой 3D-модели: точка в пространстве (1), линия между точками (2) и плоскость между рёбрами (3).' },
        { title: 'Экструдирование / Extrude (E)', cat: 'modeling', label: 'Моделирование', desc: 'Инструмент «выдавливания», который вытягивает новую объёмную часть из выбранной грани или ребра.' },
        { title: 'Инсет / Inset (I)', cat: 'modeling', label: 'Моделирование', desc: 'Создание уменьшенной копии грани прямо внутри неё — идеально для рамки окна, двери или углубления.' },
        { title: 'Фаска / Bevel (Ctrl + B)', cat: 'modeling', label: 'Моделирование', desc: 'Срезание или плавное скругление острых углов модели, чтобы она выглядела как реальный предмет.' },
        { title: 'Лупкат / Loop Cut (Ctrl + R)', cat: 'modeling', label: 'Моделирование', desc: 'Кольцевой разрез модели по кругу, добавляющий новую линию рёбер для детализации формы.' },
        { title: 'Нормали (Normals)', cat: 'modeling', label: 'Моделирование', desc: 'Невидимые стрелки, показывающие, где у поверхности лицевая сторона, а где изнанка. Исправляются через Shift + N.' },
        { title: 'Шейдер (Shader) и Principled BSDF', cat: 'shading', label: 'Материалы и свет', desc: 'Набор правил, объясняющий программе, как поверхность отражает свет: как пластик, дерево, стекло или металл.' },
        { title: 'Шероховатость (Roughness)', cat: 'shading', label: 'Материалы и свет', desc: 'Ползунок от 0 до 1: при 0 поверхность блестит как зеркало, при 1 становится полностью матовой.' },
        { title: 'Металличность (Metallic)', cat: 'shading', label: 'Материалы и свет', desc: 'Параметр материала (0 или 1), превращающий обычный цветной пластик в настоящий отражающий металл.' },
        { title: 'UV-развёртка (UV Unwrapping)', cat: 'shading', label: 'Материалы и свет', desc: 'Развёртывание 3D-модели на плоскость (как бумажной выкройки), чтобы картинка-текстура легла ровно.' },
        { title: 'HDRI-карта', cat: 'shading', label: 'Материалы и свет', desc: 'Панорамное 360°-изображение неба или студии, которое мягко освещает сцену и даёт реалистичные блики.' },
        { title: 'Рендер (Render — F12)', cat: 'render', label: 'Рендер', desc: 'Финальный просчёт 3D-сцены со светом, тенями и материалами в готовую картинку или видео.' },
        { title: 'Движки EEVEE и Cycles', cat: 'render', label: 'Рендер', desc: 'EEVEE — сверхбыстрый движок для слабых ПК; Cycles — физическая трассировка лучей для фотореализма.' },
        { title: 'Сэмплы (Samples) и Denoiser', cat: 'render', label: 'Рендер', desc: 'Сэмплы задают точность просчёта света, а Denoiser (шумоподавление) очищает кадр от «зернистости».' }
    ];

    const grid = document.getElementById('glossary-grid');
    const searchInput = document.getElementById('glossary-search');
    const emptyEl = document.getElementById('glossary-empty');
    const filterBtns = document.querySelectorAll('[data-filter]');
    let activeFilter = 'all';

    function renderTerms() {
        const q = searchInput.value.trim().toLowerCase();
        const filtered = terms.filter(t => {
            const okCat = activeFilter === 'all' || t.cat === activeFilter;
            const okText = t.title.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q);
            return okCat && okText;
        });

        grid.innerHTML = filtered.map(t => `
            <article class="glass card text-left animate-hover term-card">
                <div class="term-header">
                    <h3>${t.title}</h3>
                    <span class="term-badge">${t.label}</span>
                </div>
                <p>${t.desc}</p>
            </article>
        `).join('');

        emptyEl.hidden = filtered.length > 0;
    }

    searchInput.addEventListener('input', renderTerms);
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilter = btn.getAttribute('data-filter');
            renderTerms();
        });
    });

    renderTerms();
})();