(function () {
    function applyDarkMode(isDark) {
        document.body.classList.toggle('dark-mode', isDark);
        localStorage.setItem('darkMode', String(isDark));
        document.querySelectorAll('#darkModeToggle i, #sidebarDarkModeToggle i').forEach(icon => {
            icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        });
        document.querySelectorAll('#sidebarDarkModeToggle, #userMenuDarkToggle').forEach(input => {
            if (input.type === 'checkbox') input.checked = isDark;
        });
    }

    function initDarkMode() {
        applyDarkMode(localStorage.getItem('darkMode') === 'true');
        document.addEventListener('click', event => {
            const trigger = event.target.closest('#darkModeToggle');
            if (trigger) applyDarkMode(!document.body.classList.contains('dark-mode'));
        });
        document.addEventListener('change', event => {
            if (event.target.matches('#sidebarDarkModeToggle, #userMenuDarkToggle')) {
                applyDarkMode(event.target.checked);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDarkMode);
    } else {
        initDarkMode();
    }
})();
