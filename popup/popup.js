// popup/popup.js - FINAL: Dynamic Affiliate Tags + Auto-Close
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
    const searchHistory = document.getElementById('searchHistory');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const todaySearches = document.getElementById('todaySearches');
    const activeTrackers = document.getElementById('activeTrackers');
    const primeOnly = document.getElementById('primeOnly');
    const freeShipping = document.getElementById('freeShipping');

    // New: Tracked Page Button
    const trackedBtn = document.createElement('button');
    trackedBtn.className = 'icon-btn';
    trackedBtn.id = 'trackedBtn';
    trackedBtn.title = 'View Tracked Products';
    trackedBtn.innerHTML = '<img src="img/ebay/tracked.png" alt="Tracked" width="24" height="24">';
    const quickActions = document.querySelector('.quick-actions');
    if (quickActions) {
        quickActions.appendChild(trackedBtn);
    }

    // Voice search elements
    const voiceSearchModal = document.getElementById('voiceSearchModal');
    const startVoiceBtn = document.getElementById('startVoiceBtn');
    const closeVoiceModal = document.getElementById('closeVoiceModal');
    const voiceStatus = document.getElementById('voiceStatus');
    const voiceResult = document.getElementById('voiceResult');

    // ✅ Affiliate Tags by Country
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

    const DEFAULT_AFFILIATE_TAG = 'elise200f-20'; // Fallback

    // Country flag mapping
    const countryFlags = {
        'ca': '🇨🇦', 'com': '🇺🇸', 'co.uk': '🇬🇧', 'de': '🇩🇪', 'fr': '🇫🇷',
        'it': '🇮🇹', 'es': '🇪🇸', 'co.jp': '🇯🇵', 'com.au': '🇦🇺', 'com.br': '🇧🇷',
        'com.mx': '🇲🇽', 'nl': '🇳🇱', 'com.be': '🇧🇪'
    };

    // Default settings
    const defaultSettings = {
        country: 'com',
        defaultCategory: 'search-alias=aps'
    };

    // Voice recognition
    let recognition = null;
    let isListening = false;

    // Initialize voice recognition if available
    function initializeVoiceRecognition() {
        if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
            if (voiceSearchBtn) voiceSearchBtn.style.display = 'none';
            return;
        }

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
    }

    function resetVoiceUI() {
        isListening = false;
        if (startVoiceBtn) {
            startVoiceBtn.textContent = '🎤 Start Listening';
            startVoiceBtn.classList.remove('listening');
        }
    }

    // Load settings and initialize
    chrome.storage.sync.get(['settings', 'searchHistory'], (result) => {
        const settings = result.settings || defaultSettings;
        updateUIWithSettings(settings);

        if (Array.isArray(result.searchHistory)) {
            displaySearchHistory(result.searchHistory);
        }

        loadActiveTrackersCount();
    });

    // ✅ Update UI and ensure hidden input is in sync
    function updateUIWithSettings(settings) {
        const country = settings.country || 'com';
        if (countryInput) countryInput.value = country;
        if (currentCountry) currentCountry.textContent = countryFlags[country] || '🇺🇸';
        if (categorySelect && settings.defaultCategory) {
            categorySelect.value = settings.defaultCategory;
        }
    }

    function loadActiveTrackersCount() {
        chrome.storage.sync.get(['trackedProducts'], (result) => {
            const trackedProducts = Array.isArray(result.trackedProducts) ? result.trackedProducts : [];
            if (activeTrackers) activeTrackers.textContent = trackedProducts.length;
        });
    }

    // ✅ Prevent ANY form submission to popup.html
    if (searchForm) {
        searchForm.setAttribute('novalidate', 'true');
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            performSearch();
        }, { passive: false });
    }

    // ✅ Central search function
    function performSearch() {
        const keyword = searchInput?.value.trim();
        if (!keyword) return;

        // Get country from hidden input
        const country = countryInput?.value || 'com';
        const category = categorySelect?.value || 'search-alias=aps';

        // ✅ Get correct affiliate tag
        const tag = AFFILIATE_TAGS[country] || DEFAULT_AFFILIATE_TAG;

        // ✅ Build correct domain
        const domain = country === 'com' ? 'www.amazon.com' : `www.amazon.${country}`;
        const baseUrl = `https://${domain}/s`;

        let url = `${baseUrl}?field-keywords=${encodeURIComponent(keyword)}`;
        url += `&${category}&tag=${tag}`;

        if (primeOnly?.checked) url += '&rh=p_85:2470955011';
        if (freeShipping?.checked) url += '&rh=p_76:1249130011';

        chrome.tabs.create({ url }, () => {
            if (chrome.runtime.lastError) {
                console.error('Failed to create tab:', chrome.runtime.lastError);
            }
            // ✅ Close popup after tab opens
            setTimeout(window.close, 100);
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

    // ✅ Button handlers
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
        setTimeout(window.close, 100);
    });

    compareBtn?.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'openComparison' });
        setTimeout(window.close, 100);
    });

    // ✅ New: Tracked Products Button
    trackedBtn?.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('tracked/tracked.html') });
        setTimeout(window.close, 100);
    });

    if (ebayBtn) {
        ebayBtn.addEventListener('click', () => {
            const query = searchInput?.value.trim();
            if (!query) {
                alert('Please enter a search term');
                return;
            }
            const url = chrome.runtime.getURL(`ebay/ebay.html?search=${encodeURIComponent(query)}`);
            chrome.tabs.create({ url });
            setTimeout(window.close, 100);
        });
    }

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

    // Listen for settings updates
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'settingsUpdated') {
            updateUIWithSettings(request.settings);
            sendResponse({ status: 'success' });
        }

        if (request.action === 'trackersUpdated') {
            loadActiveTrackersCount();
        }

        // ✅ Listen for tracking events
        if (request.action === 'productTracked' || request.action === 'trackProduct') {
            loadActiveTrackersCount();
        }

        return true;
    });

    // Initialize
    initializeVoiceRecognition();
    if (searchInput) searchInput.focus();

    // Initial load
    loadActiveTrackersCount();
    chrome.storage.sync.get(['searchHistory'], (result) => {
        if (Array.isArray(result.searchHistory)) {
            updateTodaysSearchesCount(result.searchHistory);
        }
    });
})();