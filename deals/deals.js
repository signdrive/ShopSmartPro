// deals.js - FINAL: Country Selector + Image Fix + Missing Method

function applyTranslations() {
    const elements = document.querySelectorAll('[data-key]');
    elements.forEach(el => {
        const key = el.dataset.key;
        const message = chrome.i18n.getMessage(key);
        if (message) el.textContent = message;
    });

    // Also for the title, which doesn't use data-key
    document.title = document.title.replace(/__MSG_(\w+)__/g, (match, key) => {
        return chrome.i18n.getMessage(key) || match;
    });
}

// ✅ Affiliate Tags by Country
const AFFILIATE_TAGS = {
    'com': 'elise200f-20',
    'ca': 'elise2004-20',
    'co.uk': 'elise20-21',
    'fr': 'elise2006-21',
    'de': 'elise2001-21',
    'es': 'elise2005-21',
    'it': 'elise20027-21',
    'nl': 'elise2011-21',
    'jp': 'elise2007-21'
};

// ✅ Default Country
const DEFAULT_COUNTRY = 'com';

class DealHighlights {
    constructor() {
        this.currentCountry = DEFAULT_COUNTRY;
        this.loadSettings();
        this.setupEventListeners();
        this.loadDarkMode();
    }

    async loadSettings() {
        try {
            const result = await new Promise(resolve => {
                chrome.storage.sync.get(['settings'], resolve);
            });
            this.currentCountry = result.settings?.country || DEFAULT_COUNTRY;
        } catch (error) {
            console.warn('Failed to load settings, using default.', error);
        }
    }

    setupEventListeners() {
        // Country Selector
        const countrySelect = document.getElementById('countrySelect');
        if (countrySelect) {
            countrySelect.value = this.currentCountry;
            countrySelect.addEventListener('change', (e) => {
                this.currentCountry = e.target.value;
                this.updateIframeSrc(); // ✅ Now defined
            });
        }

        // View Deal Buttons
        document.querySelectorAll('.view-deal-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.deal-card');
                const searchTerm = card.dataset.search;
                const category = card.dataset.category;
                this.openAmazonDeals(searchTerm, category);
            });
        });

        // Open All Deals
        document.getElementById('openAmazonDeals')?.addEventListener('click', () => {
            const domain = this.currentCountry === 'com' ? 'www.amazon.com' : `www.amazon.${this.currentCountry}`;
            const url = `https://${domain}/deals?tag=${this.getAffiliateTag()}`;
            chrome.tabs.create({ url });
        });
    }

    getAffiliateTag() {
        return AFFILIATE_TAGS[this.currentCountry] || 'elise200f-20';
    }

    openAmazonDeals(searchTerm, category = 'aps') {
        const domain = this.currentCountry === 'com' ? 'www.amazon.com' : `www.amazon.${this.currentCountry}`;
        const iParam = category === 'electronics' ? 'electronics' :
                     category === 'kitchen' ? 'kitchen' :
                     category === 'toys' ? 'toys-and-games' :
                     category === 'beauty' ? 'beauty' : 'aps';
        const tag = this.getAffiliateTag();
        const url = `https://${domain}/s?k=${encodeURIComponent(searchTerm)}&i=${encodeURIComponent(iParam)}&tag=${tag}`;
        chrome.tabs.create({ url });
    }

    updateIframeSrc() {
        // ✅ This method was missing — now defined
        // We don't use iframe anymore, but we can still keep it for future
        // For now, just log or do nothing
        console.log('Updating iframe src for country:', this.currentCountry);
    }

    async loadDarkMode() {
        try {
            const result = await new Promise(resolve => chrome.storage.sync.get('settings', resolve));
            const settings = result.settings || {};
            const isDark = settings.darkMode || false;
            const syncWithSystem = settings.syncWithSystem !== false;

            if (syncWithSystem) {
                const media = window.matchMedia('(prefers-color-scheme: dark)');
                this.applyTheme(media.matches);
                media.addEventListener('change', e => this.applyTheme(e.matches));
            } else {
                this.applyTheme(isDark);
            }
        } catch (error) {
            this.applyTheme(false);
        }
    }

    applyTheme(isDark) {
        document.body.classList.toggle('dark-mode', isDark);
        document.body.classList.toggle('light-mode', !isDark);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    applyTranslations();
    new DealHighlights();
});