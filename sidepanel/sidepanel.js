    // Listen for theme change messages from other extension pages/popups
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'themeChanged' && message.settings) {
            applyDarkMode(!!message.settings.darkMode);
        }
    });
// sidepanel/sidepanel.js - FINAL: Chrome-Compatible, Flag-Fixed, Real-Time Sync
(() => {
    'use strict';

    // DOM Elements (with null safety)
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    const categorySelect = document.getElementById('categorySelect');
    const countryInput = document.getElementById('country'); // hidden input
    const currentCountry = document.getElementById('currentCountry');
    const settingsButton = document.getElementById('settingsButton');
    const helpButton = document.getElementById('popupHelpButton');
    const voiceSearchBtn = document.getElementById('voiceSearchBtn');
    const dealsBtn = document.getElementById('dealsBtn');
    const compareBtn = document.getElementById('compareBtn');
    const ebayBtn = document.getElementById('searchEbayBtn');
    const trackedBtn = document.getElementById('trackedBtn');
    const searchHistory = document.getElementById('searchHistory');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const todaySearches = document.getElementById('todaySearches');
    const activeTrackers = document.getElementById('activeTrackers');
    const primeOnly = document.getElementById('primeOnly');
    const freeShipping = document.getElementById('freeShipping');

    // Side panel specific elements
    const trackedProductsList = document.getElementById('trackedProductsList');
    const comparisonList = document.getElementById('comparisonList');

    // Voice search elements
    const voiceSearchModal = document.getElementById('voiceSearchModal');
    const startVoiceBtn = document.getElementById('startVoiceBtn');
    const closeVoiceModal = document.getElementById('closeVoiceModal');
    const voiceStatus = document.getElementById('voiceStatus');
    const voiceResult = document.getElementById('voiceResult');

    // ✅ Affiliate Tags by Country (Verified)
    const AFFILIATE_TAGS = {
        'com':      'elise200f-20',    // USA
        'ca':       'elise2004-20',    // Canada
        'com.be':   'elise2008-21',    // Belgium
        'fr':       'elise2006-21',    // France
        'de':       'elise2001-21',    // Germany
        'it':       'elise20027-21',   // Italy
        'es':       'elise2005-21',    // Spain
        'co.uk':    'elise20-21'       // United Kingdom
    };

    const DEFAULT_AFFILIATE_TAG = 'elise200f-20'; // Fallback: USA

    // Default settings
    const defaultSettings = {
        country: 'com',
        defaultCategory: 'search-alias=aps',
        darkMode: false
    };

    // ✅ EMOJI FLAG FUNCTIONS (Chrome-Compatible)

    // Get flag emoji - Always return emoji
    function getCountryFlag(countryCode) {
        const flags = {
            'ca': '🇨🇦',      // Canada
            'com': '🇺🇸',     // USA
            'co.uk': '🇬🇧',   // UK
            'de': '🇩🇪',      // Germany
            'fr': '🇫🇷',      // France
            'it': '🇮🇹',      // Italy
            'es': '🇪🇸',      // Spain
            'co.jp': '🇯🇵',   // Japan
            'com.au': '🇦🇺',  // Australia
            'com.br': '🇧🇷',  // Brazil
            'com.mx': '🇲🇽',  // Mexico
            'nl': '🇳🇱',      // Netherlands
            'com.be': '🇧🇪'   // Belgium
        };
        return flags[countryCode] || '🇺🇸';
    }

    // Fallback: HTML entities for maximum compatibility
    function getCountryFlagHTML(countryCode) {
        const flagEntities = {
            'ca': '&#127464;&#127462;',      // 🇨🇦
            'com': '&#127482;&#127480;',     // 🇺🇸
            'co.uk': '&#127468;&#127463;',   // 🇬🇧
            'de': '&#127465;&#127466;',      // 🇩🇪
            'fr': '&#127467;&#127479;',      // 🇫🇷
            'it': '&#127470;&#127481;',      // 🇮🇹
            'es': '&#127466;&#127480;',      // 🇪🇸
            'co.jp': '&#127471;&#127477;',   // 🇯🇵
            'com.au': '&#127462;&#127482;',  // 🇦🇺
            'com.br': '&#127463;&#127479;',  // 🇧🇷
            'com.mx': '&#127474;&#127485;',  // 🇲🇽
            'nl': '&#127475;&#127473;',      // 🇳🇱
            'com.be': '&#127463;&#127466;'   // 🇧🇪
        };
        return flagEntities[countryCode] || '&#127482;&#127480;'; // US
    }

    // Voice recognition
    let recognition = null;
    let isListening = false;

    // Initialize voice recognition if available
    function initializeVoiceRecognition() {
        if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
            if (voiceSearchBtn) voiceSearchBtn.style.display = 'none';
            return;
        }

        try {
            recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onstart = () => {
                isListening = true;
                if (startVoiceBtn) {
                    startVoiceBtn.textContent = '🎤 Listening...';
                    startVoiceBtn.classList.add('listening');
                }
                if (voiceStatus) voiceStatus.textContent = 'Listening... Speak now!';
            };

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript.trim();
                if (!transcript) return;

                if (voiceResult) {
                    voiceResult.textContent = `"${transcript}"`;
                    searchInput.value = transcript;
                    voiceStatus.textContent = 'Got it! Click "Use This" to search.';

                    const useButton = document.createElement('button');
                    useButton.textContent = 'Use This Search';
                    useButton.className = 'voice-btn';
                    useButton.style.cssText = 'margin-top: 10px; padding: 8px; background: #0078d4; color: white; border: none; border-radius: 4px; cursor: pointer;';
                    useButton.addEventListener('click', () => {
                        searchInput.value = transcript;
                        voiceSearchModal.classList.remove('active');
                        searchInput.focus();
                    });

                    voiceResult.innerHTML = '';
                    voiceResult.appendChild(useButton);
                }
            };

            recognition.onerror = (event) => {
                if (voiceStatus) voiceStatus.textContent = `Error: ${event.error}. Please try again.`;
                resetVoiceUI();
            };

            recognition.onend = () => {
                resetVoiceUI();
            };
        } catch (error) {
            console.error('Voice recognition initialization failed:', error);
            if (voiceSearchBtn) voiceSearchBtn.style.display = 'none';
        }
    }

    function resetVoiceUI() {
        isListening = false;
        if (startVoiceBtn) {
            startVoiceBtn.textContent = '🎤 Start Listening';
            startVoiceBtn.classList.remove('listening');
        }
    }

    // Load settings and initialize
    chrome.storage.sync.get(['settings', 'searchHistory', 'trackedProducts', 'comparisonProducts'], (result) => {
        const settings = result.settings || defaultSettings;
        updateUIWithSettings(settings);

        if (Array.isArray(result.searchHistory)) {
            displaySearchHistory(result.searchHistory);
        }

        if (Array.isArray(result.trackedProducts)) {
            displayTrackedProducts(result.trackedProducts);
        }

        if (Array.isArray(result.comparisonProducts)) {
            displayComparisonProducts(result.comparisonProducts);
        }

        loadActiveTrackersCount();

        // Apply dark mode
        applyDarkMode(!!settings.darkMode);
    });

    // ✅ Update UI with settings and force emoji flag
    function updateUIWithSettings(settings) {
        const country = settings.country || 'com';
        if (countryInput) countryInput.value = country;

        if (currentCountry) {
            try {
                const flag = getCountryFlag(country);
                currentCountry.textContent = flag;

                // Enhanced styling for emoji
                currentCountry.className = 'current-country emoji-flag';
                currentCountry.style.cssText = `
                    font-family: 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif !important;
                    font-size: 2em !important;
                    line-height: 1 !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    min-width: 40px !important;
                    height: 40px !important;
                    margin-right: 10px !important;
                    flex-shrink: 0 !important;
                `;

                // Fallback after render
                setTimeout(() => {
                    if (currentCountry.textContent.length < 2 || currentCountry.offsetWidth < 20) {
                        console.log('Emoji failed, using HTML entities');
                        currentCountry.innerHTML = getCountryFlagHTML(country);
                    }
                }, 100);
            } catch (e) {
                console.error('Flag rendering error:', e);
                currentCountry.innerHTML = getCountryFlagHTML(country);
            }
        }

        if (categorySelect && settings.defaultCategory) {
            categorySelect.value = settings.defaultCategory;
        }
    }

    // ✅ Apply dark mode
    function applyDarkMode(isDark) {
        document.body.classList.toggle('dark-mode', isDark);
        document.body.classList.toggle('light-mode', !isDark);
    }

    function loadActiveTrackersCount() {
        chrome.storage.sync.get(['trackedProducts'], (result) => {
            const trackedProducts = Array.isArray(result.trackedProducts) ? result.trackedProducts : [];
            if (activeTrackers) activeTrackers.textContent = trackedProducts.length;
        });
    }

    // Display tracked products
    function displayTrackedProducts(trackedProducts) {
        if (!trackedProductsList) return;

        if (!trackedProducts || trackedProducts.length === 0) {
            trackedProductsList.innerHTML = '<div class="empty-state">No products tracked yet</div>';
            return;
        }

        const fragment = document.createDocumentFragment();
        trackedProducts.slice(0, 5).forEach(product => {
            const productItem = document.createElement('div');
            productItem.className = 'product-item';
            productItem.innerHTML = `
                <div class="product-title">${escapeHtml(product.title || 'Unknown Product')}</div>
                <div class="product-price">$${product.price || '0.00'}</div>
                <div class="product-meta">Tracked ${formatDate(product.trackedAt || Date.now())}</div>
            `;
            productItem.addEventListener('click', () => {
                if (product.url) {
                    chrome.tabs.create({ url: product.url });
                }
            });
            fragment.appendChild(productItem);
        });
        trackedProductsList.innerHTML = '';
        trackedProductsList.appendChild(fragment);
    }

    // Display comparison products
    function displayComparisonProducts(comparisonProducts) {
        if (!comparisonList) return;

        if (!comparisonProducts || comparisonProducts.length === 0) {
            comparisonList.innerHTML = '<div class="empty-state">No products in comparison</div>';
            return;
        }

        const fragment = document.createDocumentFragment();
        comparisonProducts.slice(0, 3).forEach(product => {
            const productItem = document.createElement('div');
            productItem.className = 'product-item';
            productItem.innerHTML = `
                <div class="product-title">${escapeHtml(product.title || 'Unknown Product')}</div>
                <div class="product-price">$${product.price || '0.00'}</div>
                <div class="product-meta">${product.source || 'Unknown Source'}</div>
            `;
            productItem.addEventListener('click', () => {
                if (product.url) {
                    chrome.tabs.create({ url: product.url });
                }
            });
            fragment.appendChild(productItem);
        });
        comparisonList.innerHTML = '';
        comparisonList.appendChild(fragment);
    }

    // Prevent form submission
    if (searchForm) {
        searchForm.setAttribute('novalidate', 'true');
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            performSearch();
        }, { passive: false });
    }

    // Perform search
    function performSearch() {
        const keyword = searchInput?.value.trim();
        if (!keyword) return;

        const country = countryInput?.value || 'com';
        const category = categorySelect?.value || 'search-alias=aps';
        const tag = AFFILIATE_TAGS[country] || DEFAULT_AFFILIATE_TAG;
        const domain = country === 'com' ? 'www.amazon.com' : `www.amazon.${country}`;
        const baseUrl = `https://${domain}/s`;

        let url = `${baseUrl}?field-keywords=${encodeURIComponent(keyword)}&${category}&tag=${tag}`;
        if (primeOnly?.checked) url += '&rh=p_85:2470955011';
        if (freeShipping?.checked) url += '&rh=p_76:1249130011';

        chrome.tabs.create({ url }, () => {
            if (chrome.runtime.lastError) {
                console.error('Failed to create tab:', chrome.runtime.lastError);
            }
        });

        saveSearchHistory(keyword, category);
        trackSearchEvent(keyword, category);
    }

    function trackSearchEvent(query, category) {
        chrome.runtime.sendMessage({
            action: 'trackSearch',
            query,
            category,
            country: countryInput?.value || 'com'
        });
    }

    // Search history management
    function saveSearchHistory(query, category) {
        chrome.storage.sync.get(['searchHistory'], (result) => {
            let history = Array.isArray(result.searchHistory) ? result.searchHistory : [];
            const newEntry = {
                query,
                category,
                timestamp: Date.now(),
                country: countryInput?.value || 'com'
            };

            history = history.filter(item => !(item.query === query && item.category === category));
            history.unshift(newEntry);
            if (history.length > 20) history = history.slice(0, 20);

            chrome.storage.sync.set({ searchHistory: history }, () => {
                displaySearchHistory(history);
                updateTodaysSearchesCount(history);
            });
        });
    }

    function updateTodaysSearchesCount(history) {
        const today = new Date().toLocaleDateString();
        const todayCount = history.filter(item =>
            new Date(item.timestamp).toLocaleDateString() === today
        ).length;
        if (todaySearches) todaySearches.textContent = todayCount;
    }

    function displaySearchHistory(history) {
        if (!searchHistory) return;
        searchHistory.innerHTML = '';

        if (!history || history.length === 0) {
            const noHistoryItem = document.createElement('div');
            noHistoryItem.className = 'history-item';
            noHistoryItem.textContent = 'No recent searches';
            searchHistory.appendChild(noHistoryItem);
            if (todaySearches) todaySearches.textContent = '0';
            return;
        }

        const fragment = document.createDocumentFragment();
        history.slice(0, 5).forEach(item => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.dataset.query = item.query;
            historyItem.textContent = item.query;

            const dateSpan = document.createElement('span');
            dateSpan.style.cssText = 'color: #666; font-size: 0.8em; margin-left: 5px;';
            dateSpan.textContent = `(${new Date(item.timestamp).toLocaleDateString()})`;
            historyItem.appendChild(dateSpan);

            fragment.appendChild(historyItem);
        });
        searchHistory.appendChild(fragment);
        updateTodaysSearchesCount(history);

        // Rebind click listeners
        searchHistory.querySelectorAll('.history-item').forEach(item => {
            item.removeEventListener('click', historyItemClick);
            item.addEventListener('click', historyItemClick);
        });
    }

    function historyItemClick() {
        const query = this.dataset.query;
        if (searchInput) searchInput.value = query;
        performSearch();
    }

    function clearSearchHistory() {
        chrome.storage.sync.set({ searchHistory: [] }, () => {
            if (searchHistory) {
                searchHistory.innerHTML = '';
                const noHistoryItem = document.createElement('div');
                noHistoryItem.className = 'history-item';
                noHistoryItem.textContent = 'No recent searches';
                searchHistory.appendChild(noHistoryItem);
            }
            if (todaySearches) todaySearches.textContent = '0';
        });
    }

    // Button handlers
    settingsButton?.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    helpButton?.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('documentation.html') });
    });

    voiceSearchBtn?.addEventListener('click', () => {
        voiceSearchModal?.classList.add('active');
    });

    dealsBtn?.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'openDeals' });
    });

    compareBtn?.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'openComparison' });
    });

    trackedBtn?.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('tracked/tracked.html') });
    });

    ebayBtn?.addEventListener('click', () => {
        const query = searchInput?.value.trim();
        if (!query) {
            alert('Please enter a search term');
            return;
        }
        const url = chrome.runtime.getURL(`ebay/ebay.html?search=${encodeURIComponent(query)}`);
        chrome.tabs.create({ url });
    });

    clearHistoryBtn?.addEventListener('click', clearSearchHistory);

    // Voice search handlers
    startVoiceBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (recognition) {
            isListening ? recognition.stop() : recognition.start();
        }
    });

    closeVoiceModal?.addEventListener('click', () => {
        voiceSearchModal?.classList.remove('active');
        if (recognition && isListening) recognition.stop();
        resetVoiceUI();
    });

    voiceSearchModal?.addEventListener('click', (e) => {
        if (e.target === voiceSearchModal) {
            voiceSearchModal.classList.remove('active');
            if (recognition && isListening) recognition.stop();
            resetVoiceUI();
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            if (document.activeElement !== searchInput) {
                searchInput?.focus();
                e.preventDefault();
            } else {
                e.preventDefault();
                performSearch();
            }
        }

        if (e.key === 'Escape') {
            if (voiceSearchModal?.classList.contains('active')) {
                voiceSearchModal.classList.remove('active');
                if (recognition && isListening) recognition.stop();
                resetVoiceUI();
            }
        }
    });

    // Listen for updates
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'settingsUpdated') {
            updateUIWithSettings(request.settings);
            applyDarkMode(!!request.settings.darkMode);
            sendResponse({ status: 'success' });
        }

        if (request.action === 'trackersUpdated') {
            loadActiveTrackersCount();
            chrome.storage.sync.get(['trackedProducts'], (result) => {
                if (Array.isArray(result.trackedProducts)) {
                    displayTrackedProducts(result.trackedProducts);
                }
            });
        }

        if (request.action === 'comparisonUpdated') {
            chrome.storage.sync.get(['comparisonProducts'], (result) => {
                if (Array.isArray(result.comparisonProducts)) {
                    displayComparisonProducts(result.comparisonProducts);
                }
            });
        }

        if (request.action === 'productTracked' || request.action === 'trackProduct') {
            loadActiveTrackersCount();
            chrome.storage.sync.get(['trackedProducts'], (result) => {
                if (Array.isArray(result.trackedProducts)) {
                    displayTrackedProducts(result.trackedProducts);
                }
            });
        }

        return true;
    });

    // Utility functions
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }

    // Force flag update
    function forceUpdateFlag() {
        chrome.storage.sync.get(['settings'], (result) => {
            const settings = result.settings || { country: 'com' };
            updateUIWithSettings(settings);
        });
    }

    // Initialize
    initializeVoiceRecognition();
    if (searchInput) searchInput.focus();

    loadActiveTrackersCount();
    chrome.storage.sync.get(['searchHistory'], (result) => {
        if (Array.isArray(result.searchHistory)) {
            updateTodaysSearchesCount(result.searchHistory);
        }
    });

    // Force flag update after DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(forceUpdateFlag, 100);
    });

    setTimeout(() => forceUpdateFlag(), 500);
    setTimeout(() => forceUpdateFlag(), 1000);
})();


