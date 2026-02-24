// theme_boot.js - Runs at document_start to prevent White Flash
(function() {
    try {
        // Attempt to get synchronously cached theme
        const cachedTheme = localStorage.getItem('sp_theme_sync');
        if (cachedTheme) {
            document.documentElement.setAttribute('data-sp-theme', cachedTheme);
        }

        // Apply pulse text visibility state
        chrome.storage.local.get(['sp_show_pulse_text'], (res) => {
            if (res.sp_show_pulse_text === false) {
                document.body.classList.add('sp-hide-pulsed-text');
            }
        });
    } catch (e) {
        // Squelch errors (e.g. security restrictions)
    }
})();
