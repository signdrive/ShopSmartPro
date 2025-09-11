document.addEventListener('DOMContentLoaded', function () {
    const i18nElements = document.querySelectorAll('[data-i18n]');
    i18nElements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        const message = chrome.i18n.getMessage(key);
        if (message) {
            el.textContent = message;
        }
    });

    const i18nPlaceholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    i18nPlaceholderElements.forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const message = chrome.i18n.getMessage(key);
        if (message) {
            el.placeholder = message;
        }
    });
});
