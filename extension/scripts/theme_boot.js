// theme_boot.js - Runs at document_start to prevent White Flash
(function() {
    try {
        // Attempt to get synchronously cached theme
        const cachedTheme = localStorage.getItem('sp_theme_sync');
        if (cachedTheme) {
            document.documentElement.setAttribute('data-sp-theme', cachedTheme);
        }


    } catch (e) {
        // Squelch errors (e.g. security restrictions)
    }
})();
