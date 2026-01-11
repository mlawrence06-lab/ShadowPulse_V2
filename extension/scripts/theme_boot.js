// theme_boot.js - Runs at document_start to prevent White Flash
(function() {
    try {
        // Attempt to get synchronously cached theme
        const cachedTheme = localStorage.getItem('sp_theme_sync');
        if (cachedTheme) {
            document.documentElement.setAttribute('data-sp-theme', cachedTheme);
            
            // Also try to apply background color immediately to avoid any gap
            if (cachedTheme === 'dark' || cachedTheme === 'custom') {
                // We can't easily read the custom colors here synchrounously without storing them all in LS.
                // But valid dark mode prevents the BLINDING white.
                // Set a default dark background color just in case CSS hasn't loaded yet?
                // Actually CSS is injected by manifest, so it should be available or parsing.
            }
        }
    } catch (e) {
        // Squelch errors (e.g. security restrictions)
    }
})();
