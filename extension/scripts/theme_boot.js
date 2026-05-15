// theme_boot.js - Runs at document_start to prevent White Flash
(function() {
    try {
        const cachedTheme = localStorage.getItem('sp_theme_sync');
        if (cachedTheme) {
            document.documentElement.setAttribute('data-sp-theme', cachedTheme);
            // Set emergency background immediately to prevent FOUC before CSS loads
            if (cachedTheme === 'dark') {
                document.documentElement.style.backgroundColor = '#0f172a';
                document.documentElement.style.color = '#f1f5f9';
            }
        }
    } catch (e) {
        // Squelch errors (e.g. security restrictions)
    }
})();
