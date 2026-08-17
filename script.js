const themeToggleBtn = document.getElementById('theme-toggle');
const body = document.body;

// Восстановление сохранённой темы при загрузке
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

// Бургер-меню для мобильных
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

// Скролл: прогресс-бар + кнопка "наверх", обёрнуто в requestAnimationFrame
const progressBar = document.getElementById('progress-bar');
const backToTopBtn = document.getElementById('back-to-top');
let ticking = false;

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
    ticking = false;
}

window.addEventListener('scroll', () => {
    if (!ticking) {
        requestAnimationFrame(onScroll);
        ticking = true;
    }
});

backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Появление блоков при скролле
const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            obs.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// Прогресс прохождения уроков (сохраняется в localStorage)
const LESSON_COUNT = 5;
const progressText = document.getElementById('progress-text');
const progressFill = document.getElementById('lesson-progress-fill');
const lessonCheckboxes = document.querySelectorAll('[data-lesson-checkbox]');

function loadProgress() {
    try {
        return JSON.parse(localStorage.getItem('blenderProgress')) || {};
    } catch {
        return {};
    }
}

function saveProgress(progress) {
    localStorage.setItem('blenderProgress', JSON.stringify(progress));
}

function updateProgressUI(progress) {
    const done = Object.values(progress).filter(Boolean).length;
    progressText.textContent = `Пройдено ${done} из ${LESSON_COUNT} уроков`;
    progressFill.style.width = (done / LESSON_COUNT) * 100 + '%';
}

let progress = loadProgress();

lessonCheckboxes.forEach(checkbox => {
    const id = checkbox.getAttribute('data-lesson-checkbox');
    checkbox.checked = !!progress[id];

    checkbox.addEventListener('change', () => {
        progress[id] = checkbox.checked;
        saveProgress(progress);
        updateProgressUI(progress);
    });
});

updateProgressUI(progress);

// Подсветка текущего урока в быстрой навигации
const quickNavItems = document.querySelectorAll('.quick-nav-item');
const lessonCards = document.querySelectorAll('[id^="lesson"]');

const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const lessonId = entry.target.getAttribute('data-lesson');
        const navItem = document.querySelector(`[data-lesson-link="${lessonId}"]`);
        if (!navItem) return;
        if (entry.isIntersecting) {
            quickNavItems.forEach(item => item.classList.remove('active'));
            navItem.classList.add('active');
        }
    });
}, { threshold: 0.5 });

lessonCards.forEach(card => navObserver.observe(card));
