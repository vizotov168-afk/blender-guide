// ============================================================
// 1. ОБЩИЕ ФУНКЦИИ ИНТЕРФЕЙСА (Тема, меню, скролл, появление)
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

// ============================================================
// 2. ИНТЕРАКТИВНЫЙ 3D-СИМУЛЯТОР ГОРЯЧИХ КЛАВИШ BLENDER
// ============================================================
(function initHotkeySimulator() {
    const canvas = document.getElementById('sim-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const modeBadge = document.getElementById('sim-mode-badge');
    const keyBadge = document.getElementById('sim-key-badge');
    const stepCounter = document.getElementById('sim-step-counter');
    const instructionEl = document.getElementById('sim-instruction');
    const completeBanner = document.getElementById('sim-complete-banner');
    const resetBtn = document.getElementById('sim-reset-btn');
    const stepRows = document.querySelectorAll('.sim-step');
    const triggerBtns = document.querySelectorAll('[data-trigger-key]');

    const stepsData = [
        {
            key: 'Tab',
            mode: 'Object Mode',
            text: 'Нажми клавишу <kbd>Tab</kbd> (или кнопку справа), чтобы переключиться в режим редактирования <strong>Edit Mode</strong> и увидеть вершины куба.'
        },
        {
            key: 'Ctrl+R',
            mode: 'Edit Mode (Vertex / Edge)',
            text: 'Отлично! Теперь нажми <kbd>Ctrl + R</kbd>, чтобы добавить кольцевой разрез <strong>Loop Cut</strong> по центру для будущей крыши.'
        },
        {
            key: 'E',
            mode: 'Edit Mode (Loop Cut готов)',
            text: 'Разрез добавлен! Нажми клавишу <kbd>E</kbd>, чтобы применить <strong>Extrude</strong> и вытянуть двускатную крышу вверх по оси Z.'
        },
        {
            key: 'Ctrl+B',
            mode: 'Edit Mode (Крыша готова)',
            text: 'Супер! Теперь нажми <kbd>Ctrl + B</kbd>, чтобы снять фаску <strong>Bevel</strong> и аккуратно скруглить острые углы.'
        },
        {
            key: 'F12',
            mode: 'Edit Mode (Bevel применён)',
            text: 'Остался финальный штрих! Нажми <kbd>F12</kbd>, чтобы запустить <strong>Render</strong> со светом, тенями и светящимися окнами.'
        }
    ];

    let currentStep = 0; // 0..5 (5 = completed)
    let animProgress = 0; // 0..1 transition animation for current stage
    let renderTileProgress = 0; // 0..1 for F12 tile reveal
    let yaw = -0.62;
    let pitch = 0.36;
    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    let confetti = [];

    function spawnConfetti() {
        confetti = [];
        const colors = ['#f5792a', '#38bdf8', '#22c55e', '#facc15', '#f472b6'];
        for (let i = 0; i < 65; i++) {
            confetti.push({
                x: canvas.width * 0.5 + (Math.random() - 0.5) * 180,
                y: canvas.height * 0.45,
                vx: (Math.random() - 0.5) * 7,
                vy: -Math.random() * 6 - 2,
                size: Math.random() * 6 + 4,
                color: colors[i % colors.length],
                rot: Math.random() * Math.PI * 2,
                vrot: (Math.random() - 0.5) * 0.2
            });
        }
    }

    function updateSimulatorUI() {
        stepRows.forEach((row, idx) => {
            row.classList.remove('active', 'done');
            if (idx < currentStep) row.classList.add('done');
            else if (idx === currentStep) row.classList.add('active');
        });

        if (currentStep < stepsData.length) {
            stepCounter.textContent = `Шаг ${currentStep + 1} из ${stepsData.length}`;
            modeBadge.textContent = stepsData[currentStep].mode;
            instructionEl.innerHTML = stepsData[currentStep].text;
            completeBanner.hidden = true;
        } else {
            stepCounter.textContent = 'Готово: 5 из 5';
            modeBadge.textContent = 'Cycles Render • 1080p';
            instructionEl.innerHTML = 'Модель успешно отрендерена! Можешь покрутить готовый 3D-домик мышкой или нажать «Начать заново».';
            completeBanner.hidden = false;
        }
    }

    function advanceStep(pressedLabel) {
        if (currentStep >= stepsData.length) return;
        const expected = stepsData[currentStep].key;
        if (pressedLabel !== expected) {
            keyBadge.textContent = `Нажато: ${pressedLabel} (нужно ${expected})`;
            keyBadge.classList.add('hud-warn');
            setTimeout(() => keyBadge.classList.remove('hud-warn'), 650);
            return;
        }

        keyBadge.classList.remove('hud-warn');
        keyBadge.textContent = `✓ Выполнено: ${pressedLabel}`;
        currentStep++;
        animProgress = 0;

        if (currentStep === 5) {
            renderTileProgress = 0;
            spawnConfetti();
        }
        updateSimulatorUI();
    }

    // Screen buttons
    triggerBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            advanceStep(btn.getAttribute('data-trigger-key'));
        });
    });

    // Keyboard listener
    window.addEventListener('keydown', (e) => {
        if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
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

        if (matched) {
            advanceStep(matched);
        }
    });

    resetBtn.addEventListener('click', () => {
        currentStep = 0;
        animProgress = 0;
        renderTileProgress = 0;
        confetti = [];
        keyBadge.textContent = 'Ожидание клавиши...';
        updateSimulatorUI();
    });

    // Mouse / Touch orbit rotation
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
        pitch = Math.max(-0.45, Math.min(1.15, pitch + dy * 0.008));
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
        const dx = e.touches[0].clientX - lastX;
        const dy = e.touches[0].clientY - lastY;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
        yaw += dx * 0.012;
        pitch = Math.max(-0.45, Math.min(1.15, pitch + dy * 0.009));
    }, { passive: true });
    canvas.addEventListener('touchend', () => { isDragging = false; });

    // 3D Projection Math (Blender Z-up coordinate system)
    function project3D(x, y, z, cx, cy, scale) {
        const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
        const x1 = x * cosY - y * sinY;
        const y1 = x * sinY + y * cosY;

        const cosP = Math.cos(pitch), sinP = Math.sin(pitch);
        const y2 = y1 * cosP - z * sinP;
        const z2 = y1 * sinP + z * cosP;

        const fov = 5.2;
        const depth = fov + y2;
        const factor = (fov / Math.max(1.5, depth)) * scale;
        return {
            x: cx + x1 * factor,
            y: cy - z2 * factor,
            depth: y2
        };
    }

    function drawAxisGizmo(cx, cy) {
        const axes = [
            { label: 'X', vec: [1, 0, 0], color: '#ef4444' },
            { label: 'Y', vec: [0, 1, 0], color: '#22c55e' },
            { label: 'Z', vec: [0, 0, 1], color: '#3b82f6' }
        ];
        const pts = axes.map(a => {
            const p = project3D(a.vec[0], a.vec[1], a.vec[2], 0, 0, 26);
            return { ...a, px: cx + p.x, py: cy + p.y, depth: p.depth };
        }).sort((a, b) => b.depth - a.depth);

        pts.forEach(a => {
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(a.px, a.py);
            ctx.strokeStyle = a.color;
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(a.px, a.py, 8, 0, Math.PI * 2);
            ctx.fillStyle = a.color;
            ctx.fill();

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px Montserrat, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(a.label, a.px, a.py);
        });
    }

    function renderFrame() {
        if (!isDragging) {
            yaw += 0.0025;
        }
        if (animProgress < 1) {
            animProgress = Math.min(1, animProgress + 0.035);
        }
        if (currentStep === 5 && renderTileProgress < 1) {
            renderTileProgress = Math.min(1, renderTileProgress + 0.025);
        }

        const w = canvas.width;
        const h = canvas.height;
        const cx = w * 0.5;
        const cy = h * 0.56;
        const scale = Math.min(w, h) * 0.25;

        // Viewport background (Blender dark grey theme)
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#23272e');
        bgGrad.addColorStop(1, '#181b20');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Floor Grid (XY plane, z = -0.8)
        const gridZ = -0.8;
        const gridRange = 4;
        for (let i = -gridRange; i <= gridRange; i++) {
            const p1 = project3D(i, -gridRange, gridZ, cx, cy, scale);
            const p2 = project3D(i, gridRange, gridZ, cx, cy, scale);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = i === 0 ? 'rgba(34, 197, 94, 0.55)' : 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = i === 0 ? 1.6 : 1;
            ctx.stroke();

            const p3 = project3D(-gridRange, i, gridZ, cx, cy, scale);
            const p4 = project3D(gridRange, i, gridZ, cx, cy, scale);
            ctx.beginPath();
            ctx.moveTo(p3.x, p3.y);
            ctx.lineTo(p4.x, p4.y);
            ctx.strokeStyle = i === 0 ? 'rgba(239, 68, 68, 0.55)' : 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = i === 0 ? 1.6 : 1;
            ctx.stroke();
        }

        // Compute dynamic house geometry based on currentStep & animProgress
        const ease = 1 - Math.pow(1 - animProgress, 3);
        const roofLift = currentStep < 3 ? 0 : (currentStep === 3 ? 0.78 * ease : 0.78);
        const bevelAmt = currentStep < 4 ? 0 : (currentStep === 4 ? 0.12 * ease : 0.12);

        const bx = 0.85 - bevelAmt * 0.15;
        const by = 0.95 - bevelAmt * 0.15;
        const zBot = -0.8;
        const zTop = 0.45;
        const zPeak = zTop + roofLift;

        // 10-vertex prism house (8 base cube corners + 2 roof ridge vertices)
        const verts3D = [
            [-bx, -by, zBot], // 0: front-left-bottom
            [ bx, -by, zBot], // 1: front-right-bottom
            [ bx,  by, zBot], // 2: back-right-bottom
            [-bx,  by, zBot], // 3: back-left-bottom
            [-bx, -by, zTop], // 4: front-left-top
            [ bx, -by, zTop], // 5: front-right-top
            [ bx,  by, zTop], // 6: back-right-top
            [-bx,  by, zTop], // 7: back-left-top
            [  0, -by, zPeak],// 8: front-ridge
            [  0,  by, zPeak] // 9: back-ridge
        ];

        const proj = verts3D.map(v => project3D(v[0], v[1], v[2], cx, cy, scale));

        const faces = [
            { idx: [0, 1, 5, 8, 4], shade: 1.0, isRoof: false, frontWall: true },  // Front wall
            { idx: [2, 3, 7, 9, 6], shade: 0.65, isRoof: false, frontWall: false }, // Back wall
            { idx: [1, 2, 6, 5],    shade: 0.82, isRoof: false, sideWall: true },   // Right wall
            { idx: [3, 0, 4, 7],    shade: 0.72, isRoof: false, sideWall: false },  // Left wall
            { idx: [4, 8, 9, 7],    shade: 0.92, isRoof: true },                    // Left roof slope
            { idx: [8, 5, 6, 9],    shade: 1.08, isRoof: true }                     // Right roof slope
        ];

        // Sort faces painter's order (furthest first)
        const sortedFaces = faces.map(f => {
            const avgDepth = f.idx.reduce((acc, vi) => acc + proj[vi].depth, 0) / f.idx.length;
            return { ...f, avgDepth };
        }).sort((a, b) => b.avgDepth - a.avgDepth);

        const isRendered = currentStep === 5;
        const tileReveal = isRendered ? renderTileProgress : 0;

        // Draw solid / rendered faces
        sortedFaces.forEach(f => {
            ctx.beginPath();
            f.idx.forEach((vi, k) => {
                if (k === 0) ctx.moveTo(proj[vi].x, proj[vi].y);
                else ctx.lineTo(proj[vi].x, proj[vi].y);
            });
            ctx.closePath();

            if (tileReveal > 0.05) {
                const baseR = f.isRoof ? 215 : 226;
                const baseG = f.isRoof ? 95  : 232;
                const baseB = f.isRoof ? 45  : 240;
                ctx.fillStyle = `rgba(${Math.min(255, baseR * f.shade)}, ${Math.min(255, baseG * f.shade)}, ${Math.min(255, baseB * f.shade)}, ${0.95 * tileReveal})`;
            } else {
                const g = Math.round(115 * f.shade);
                ctx.fillStyle = `rgba(${g}, ${g + 6}, ${g + 14}, 0.86)`;
            }
            ctx.fill();

            // Glowing windows & door in Rendered mode (step 5)
            if (tileReveal > 0.4 && f.frontWall) {
                const wPts = [
                    project3D(-0.48, -by - 0.01, -0.18, cx, cy, scale),
                    project3D(-0.14, -by - 0.01, -0.18, cx, cy, scale),
                    project3D(-0.14, -by - 0.01,  0.16, cx, cy, scale),
                    project3D(-0.48, -by - 0.01,  0.16, cx, cy, scale)
                ];
                ctx.save();
                ctx.shadowColor = '#fbbf24';
                ctx.shadowBlur = 18 * tileReveal;
                ctx.fillStyle = `rgba(253, 224, 71, ${tileReveal})`;
                ctx.beginPath();
                wPts.forEach((p, k) => k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
                ctx.closePath();
                ctx.fill();
                ctx.restore();

                // Door
                const dPts = [
                    project3D(0.14, -by - 0.01, zBot, cx, cy, scale),
                    project3D(0.46, -by - 0.01, zBot, cx, cy, scale),
                    project3D(0.46, -by - 0.01, -0.12, cx, cy, scale),
                    project3D(0.14, -by - 0.01, -0.12, cx, cy, scale)
                ];
                ctx.fillStyle = `rgba(120, 53, 15, ${tileReveal})`;
                ctx.beginPath();
                dPts.forEach((p, k) => k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
                ctx.closePath();
                ctx.fill();
            }
        });

        // Draw wireframe edges (unless fully rendered)
        if (tileReveal < 0.98) {
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
                    ctx.strokeStyle = '#f5792a'; // Object mode orange outline
                    ctx.lineWidth = 2.2;
                } else if (currentStep === 4 && (a >= 4 || b >= 4)) {
                    ctx.strokeStyle = '#38bdf8'; // Bevel highlight
                    ctx.lineWidth = 2.4;
                } else {
                    ctx.strokeStyle = `rgba(245, 121, 42, ${1 - tileReveal})`;
                    ctx.lineWidth = 1.6;
                }
                ctx.stroke();
            });

            // Loop Cut glowing ring preview on step 2
            if (currentStep === 2) {
                const pulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.008);
                const lc = [
                    project3D(0, -by, zBot, cx, cy, scale),
                    project3D(0, -by, zTop, cx, cy, scale),
                    project3D(0,  by, zTop, cx, cy, scale),
                    project3D(0,  by, zBot, cx, cy, scale)
                ];
                ctx.beginPath();
                lc.forEach((p, k) => k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
                ctx.closePath();
                ctx.strokeStyle = `rgba(250, 204, 21, ${pulse})`;
                ctx.lineWidth = 3;
                ctx.stroke();
            }

            // Edit Mode vertex dots (Steps 1..4)
            if (currentStep >= 1 && currentStep <= 4) {
                const vLimit = currentStep >= 2 ? 10 : 8;
                for (let i = 0; i < vLimit; i++) {
                    ctx.beginPath();
                    ctx.arc(proj[i].x, proj[i].y, i >= 8 ? 4.5 : 3.5, 0, Math.PI * 2);
                    ctx.fillStyle = i >= 8 ? '#facc15' : '#f5792a';
                    ctx.fill();
                }
            }
        }

        // Render tile scanline overlay on F12
        if (currentStep === 5 && renderTileProgress < 1) {
            const boxX = cx - 150;
            const boxY = cy - 155;
            const boxW = 300;
            const boxH = 260;
            const scanY = boxY + boxH * renderTileProgress;
            ctx.strokeStyle = '#f5792a';
            ctx.lineWidth = 2;
            ctx.strokeRect(boxX, boxY, boxW, boxH);
            ctx.beginPath();
            ctx.moveTo(boxX, scanY);
            ctx.lineTo(boxX + boxW, scanY);
            ctx.strokeStyle = '#38bdf8';
            ctx.stroke();
        }

        // Confetti particles
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

        drawAxisGizmo(w - 46, 48);
        requestAnimationFrame(renderFrame);
    }

    updateSimulatorUI();
    renderFrame();
})();

// ============================================================
// 3. ЛАБОРАТОРИЯ МАТЕРИАЛОВ (PRINCIPLED BSDF) И ДВИЖКОВ РЕНДЕРА
// ============================================================
(function initRenderLab() {
    const canvas = document.getElementById('lab-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const colorInput = document.getElementById('lab-color');
    const colorDots = document.querySelectorAll('.color-dot');
    const roughSlider = document.getElementById('lab-roughness');
    const roughVal = document.getElementById('lab-roughness-val');
    const emissSlider = document.getElementById('lab-emission');
    const emissVal = document.getElementById('lab-emission-val');
    const engineBtns = document.querySelectorAll('.engine-btn');
    const denoiserCheck = document.getElementById('lab-denoiser');
    const denoiseWrapper = document.getElementById('denoise-wrapper');
    const shapeBtns = document.querySelectorAll('[data-lab-shape]');
    const statusBadge = document.getElementById('lab-render-status');
    const hintText = document.getElementById('lab-engine-hint');

    let matColor = '#e06d3b';
    let roughness = 0.35;
    let emission = 0.80;
    let engine = 'cycles';
    let denoiser = true;
    let shape = 'house';
    let angle = 0.55;

    function hexToRgb(hex) {
        const clean = hex.replace('#', '');
        const num = parseInt(clean, 16);
        return {
            r: (num >> 16) & 255,
            g: (num >> 8) & 255,
            b: num & 255
        };
    }

    function updateLabStatus() {
        if (engine === 'eevee') {
            statusBadge.textContent = 'Движок: EEVEE (Real-Time)';
            denoiseWrapper.style.opacity = '0.55';
            hintText.innerHTML = '<strong>EEVEE:</strong> рендерит мгновенно даже на слабых ноутбуках, но тени и отражения упрощённые.';
        } else if (denoiser) {
            statusBadge.textContent = 'Движок: Cycles + Denoiser';
            denoiseWrapper.style.opacity = '1';
            hintText.innerHTML = '<strong>Cycles + Denoiser:</strong> физически мягкие тени и блики, а шумоподавитель полностью убирает «зернистость».';
        } else {
            statusBadge.textContent = 'Движок: Cycles (Без Denoiser)';
            denoiseWrapper.style.opacity = '1';
            hintText.innerHTML = '<strong>Cycles без Denoiser:</strong> при малом числе сэмплов виден характерный цифровой шум («зернистость»). Включи Denoiser!';
        }
    }

    colorDots.forEach(dot => {
        dot.addEventListener('click', () => {
            colorDots.forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            matColor = dot.getAttribute('data-color');
            colorInput.value = matColor;
        });
    });

    colorInput.addEventListener('input', (e) => {
        matColor = e.target.value;
        colorDots.forEach(d => d.classList.remove('active'));
    });

    roughSlider.addEventListener('input', (e) => {
        roughness = parseFloat(e.target.value);
        roughVal.textContent = roughness.toFixed(2);
    });

    emissSlider.addEventListener('input', (e) => {
        emission = parseFloat(e.target.value);
        emissVal.textContent = emission.toFixed(2);
    });

    engineBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            engineBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            engine = btn.getAttribute('data-engine');
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
            shape = btn.getAttribute('data-lab-shape');
        });
    });

    function drawLab() {
        angle += 0.008;
        const w = canvas.width;
        const h = canvas.height;
        const cx = w * 0.5;
        const cy = h * 0.54;
        const rgb = hexToRgb(matColor);

        // Studio backdrop
        const bg = ctx.createRadialGradient(cx, cy - 30, 30, cx, cy, w * 0.65);
        bg.addColorStop(0, engine === 'cycles' ? '#2c3545' : '#242c38');
        bg.addColorStop(1, '#11161d');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        // Soft studio floor shadow
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy + 108, engine === 'cycles' ? 135 : 115, 30, 0, 0, Math.PI * 2);
        ctx.fillStyle = engine === 'cycles' ? 'rgba(0, 0, 0, 0.55)' : 'rgba(0, 0, 0, 0.35)';
        ctx.filter = engine === 'cycles' ? 'blur(12px)' : 'blur(4px)';
        ctx.fill();
        ctx.restore();

        if (shape === 'sphere') {
            const r = 95;
            // Base shaded sphere
            const grad = ctx.createRadialGradient(cx - 34, cy - 36, 12, cx, cy, r);
            grad.addColorStop(0, `rgb(${Math.min(255, rgb.r + 55)}, ${Math.min(255, rgb.g + 55)}, ${Math.min(255, rgb.b + 55)})`);
            grad.addColorStop(0.65, `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
            grad.addColorStop(1, `rgb(${Math.round(rgb.r * 0.25)}, ${Math.round(rgb.g * 0.25)}, ${Math.round(rgb.b * 0.25)})`);

            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            // Specular highlight controlled by Roughness
            const specRadius = 14 + roughness * 62;
            const specAlpha = (1.08 - roughness) * (engine === 'cycles' ? 0.85 : 0.65);
            const spec = ctx.createRadialGradient(cx - 34, cy - 36, 2, cx - 34, cy - 36, specRadius);
            spec.addColorStop(0, `rgba(255, 255, 255, ${Math.max(0.05, specAlpha)})`);
            spec.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fillStyle = spec;
            ctx.fill();

            // Emission ring around equator
            if (emission > 0.02) {
                ctx.save();
                ctx.strokeStyle = `rgba(253, 224, 71, ${emission})`;
                ctx.lineWidth = 6;
                ctx.shadowColor = '#facc15';
                ctx.shadowBlur = 24 * emission;
                ctx.beginPath();
                ctx.ellipse(cx, cy, r - 2, 24, -0.2, 0, Math.PI);
                ctx.stroke();
                ctx.restore();
            }
        } else {
            // 3D Isometric House with live Base Color, Roughness & Emission
            const cos = Math.cos(angle), sin = Math.sin(angle);
            const proj = (x, y, z) => {
                const rx = x * cos - y * sin;
                const ry = x * sin + y * cos;
                return { x: cx + rx * 95, y: cy + ry * 42 - z * 95, d: ry };
            };

            const pts = [
                proj(-0.85, -0.9, -0.7), proj(0.85, -0.9, -0.7),
                proj(0.85,  0.9, -0.7), proj(-0.85, 0.9, -0.7),
                proj(-0.85, -0.9,  0.35), proj(0.85, -0.9,  0.35),
                proj(0.85,  0.9,  0.35), proj(-0.85, 0.9,  0.35),
                proj(0, -0.9, 1.05), proj(0, 0.9, 1.05)
            ];

            const faces = [
                { i: [0, 1, 5, 8, 4], k: 1.0, roof: false, win: true },
                { i: [2, 3, 7, 9, 6], k: 0.62, roof: false, win: false },
                { i: [1, 2, 6, 5],    k: 0.82, roof: false, win: false },
                { i: [3, 0, 4, 7],    k: 0.72, roof: false, win: false },
                { i: [4, 8, 9, 7],    k: 0.92, roof: true,  win: false },
                { i: [8, 5, 6, 9],    k: 1.12, roof: true,  win: false }
            ].map(f => ({
                ...f,
                depth: f.i.reduce((s, v) => s + pts[v].d, 0) / f.i.length
            })).sort((a, b) => b.depth - a.depth);

            const glossBoost = (1 - roughness) * 42;

            faces.forEach(f => {
                ctx.beginPath();
                f.i.forEach((vi, idx) => idx === 0 ? ctx.moveTo(pts[vi].x, pts[vi].y) : ctx.lineTo(pts[vi].x, pts[vi].y));
                ctx.closePath();

                const r = f.roof ? Math.min(255, rgb.r * f.k + glossBoost) : Math.min(255, 225 * f.k + glossBoost * 0.5);
                const g = f.roof ? Math.min(255, rgb.g * f.k + glossBoost) : Math.min(255, 232 * f.k + glossBoost * 0.5);
                const b = f.roof ? Math.min(255, rgb.b * f.k + glossBoost) : Math.min(255, 240 * f.k + glossBoost * 0.5);
                ctx.fillStyle = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
                ctx.fill();

                if (f.win && f.depth < 0.25) {
                    const w1 = proj(-0.48, -0.91, -0.15);
                    const w2 = proj(-0.12, -0.91, -0.15);
                    const w3 = proj(-0.12, -0.91,  0.18);
                    const w4 = proj(-0.48, -0.91,  0.18);
                    ctx.save();
                    if (emission > 0.05) {
                        ctx.shadowColor = '#fde047';
                        ctx.shadowBlur = 22 * emission;
                    }
                    const lum = Math.round(60 + emission * 195);
                    ctx.fillStyle = `rgb(${lum}, ${Math.round(lum * 0.92)}, ${Math.round(45 + emission * 40)})`;
                    ctx.beginPath();
                    ctx.moveTo(w1.x, w1.y); ctx.lineTo(w2.x, w2.y);
                    ctx.lineTo(w3.x, w3.y); ctx.lineTo(w4.x, w4.y);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }
            });
        }

        // Cycles Monte-Carlo Noise simulation when Denoiser is OFF
        if (engine === 'cycles' && !denoiser) {
            ctx.save();
            for (let i = 0; i < 1600; i++) {
                const nx = cx - 150 + Math.random() * 300;
                const ny = cy - 140 + Math.random() * 270;
                ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.28)';
                ctx.fillRect(nx, ny, 2, 2);
            }
            ctx.restore();
        }

        requestAnimationFrame(drawLab);
    }

    updateLabStatus();
    drawLab();
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
