document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    const categorySelect = document.getElementById('categorySelect');
    const countryInput = document.getElementById('country');
    const currentCountry = document.getElementById('currentCountry');
    const settingsButton = document.getElementById('settingsButton');
    const helpButton = document.getElementById('popupHelpButton');
    const voiceSearchBtn = document.getElementById('voiceSearchBtn');
    const dealsBtn = document.getElementById('dealsBtn');
    const compareBtn = document.getElementById('compareBtn');
    const searchHistory = document.getElementById('searchHistory');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const todaySearches = document.getElementById('todaySearches');
    const activeTrackers = document.getElementById('activeTrackers');
    const primeOnly = document.getElementById('primeOnly');
    const freeShipping = document.getElementById('freeShipping');
    
    // Voice search elements
    const voiceSearchModal = document.getElementById('voiceSearchModal');
    const startVoiceBtn = document.getElementById('startVoiceBtn');
    const closeVoiceModal = document.getElementById('closeVoiceModal');
    const voiceStatus = document.getElementById('voiceStatus');
    const voiceResult = document.getElementById('voiceResult');

    // Configuration
    const AFFILIATE_TAG = 'elise200f-20';

    // Country flag mapping
    const countryFlags = {
        'ca': '🇨🇦', 'com': '🇺🇸', 'co.uk': '🇬🇧', 'de': '🇩🇪', 'fr': '🇫🇷',
        'it': '🇮🇹', 'es': '🇪🇸', 'co.jp': '🇯🇵', 'com.au': '🇦🇺', 'com.br': '🇧🇷',
        'com.mx': '🇲🇽', 'nl': '🇳🇱'
    };

    // Default settings
    const defaultSettings = {
        country: 'ca',
        affiliateTag: AFFILIATE_TAG,
        defaultCategory: 'search-alias=aps'
    };

    // Voice recognition
    let recognition = null;
    let isListening = false;

    // Initialize voice recognition if available
    function initializeVoiceRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onstart = function() {
                isListening = true;
                startVoiceBtn.textContent = '🎤 Listening...';
                startVoiceBtn.classList.add('listening');
                voiceStatus.textContent = 'Listening... Speak now!';
            };

            recognition.onresult = function(event) {
                const transcript = event.results[0][0].transcript;
                
                voiceResult.textContent = `"${transcript}"`;
                searchInput.value = transcript;
                voiceStatus.textContent = 'Got it! Click "Use This" to search.';
                
                // Create "Use This" button
                const useButton = document.createElement('button');
                useButton.textContent = 'Use This Search';
                useButton.className = 'voice-btn';
                useButton.style.marginTop = '10px';
                useButton.addEventListener('click', function() {
                    searchInput.value = transcript;
                    voiceSearchModal.classList.remove('active');
                    searchInput.focus();
                });
                
                // Replace content
                voiceResult.innerHTML = '';
                voiceResult.appendChild(useButton);
            };

            recognition.onerror = function(event) {
                voiceStatus.textContent = `Error: ${event.error}. Please try again.`;
                resetVoiceUI();
            };

            recognition.onend = function() {
                resetVoiceUI();
            };
        } else {
            voiceSearchBtn.style.display = 'none';
        }
    }

    function resetVoiceUI() {
        isListening = false;
        startVoiceBtn.textContent = '🎤 Start Listening';
        startVoiceBtn.classList.remove('listening');
    }

    // Load settings and initialize
    chrome.storage.sync.get(['settings', 'searchHistory'], function(result) {
        const settings = result.settings || defaultSettings;
        updateUIWithSettings(settings);
        
        if (result.searchHistory) {
            displaySearchHistory(result.searchHistory);
        }
        
        loadActiveTrackersCount();
    });

    function updateUIWithSettings(settings) {
        const country = settings.country || 'ca';
        countryInput.value = country;
        currentCountry.textContent = countryFlags[country] || '🇨🇦';
        
        if (settings.defaultCategory) {
            categorySelect.value = settings.defaultCategory;
        }
    }

    function loadActiveTrackersCount() {
        chrome.storage.sync.get(['trackedProducts'], function(result) {
            const trackedProducts = result.trackedProducts || [];
            activeTrackers.textContent = trackedProducts.length;
        });
    }

    // ✅ Fixed: Removed form action dependency — build URL in JS
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault(); // Always prevent default

        const keyword = searchInput.value.trim();
        if (!keyword) return;

        const country = countryInput.value;
        const domain = country === 'com' ? 'com' : `www.amazon.${country}`;
        const baseUrl = `https://${domain}/s`;

        let url = `${baseUrl}?field-keywords=${encodeURIComponent(keyword)}`;
        url += `&${categorySelect.value}`;
        url += `&tag=${AFFILIATE_TAG}`;
        
        if (primeOnly.checked) url += '&rh=p_85:2470955011';         // Prime Only
        if (freeShipping.checked) url += '&rh=p_76:1249130011';     // Free Shipping

        try {
            chrome.tabs.create({ url: url });
            saveSearchHistory(keyword, categorySelect.value);
            trackSearchEvent(keyword, categorySelect.value);
        } catch (error) {
            console.error('Search failed:', error);
        }
    });

    function trackSearchEvent(query, category) {
        chrome.runtime.sendMessage({
            action: 'trackSearch',
            query: query,
            category: category,
            country: countryInput.value
        });
    }

    // Search history management
    function saveSearchHistory(query, category) {
        chrome.storage.sync.get(['searchHistory'], function(result) {
            const history = result.searchHistory || [];
            const newEntry = {
                query: query,
                category: category,
                timestamp: Date.now(),
                country: countryInput.value
            };

            // Add to front, limit to 20
            history.unshift(newEntry);
            if (history.length > 20) history.pop();

            chrome.storage.sync.set({ searchHistory: history }, function() {
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
        todaySearches.textContent = todayCount;
    }

    function displaySearchHistory(history) {
        searchHistory.innerHTML = '';
        
        if (!history || history.length === 0) {
            const noHistoryItem = document.createElement('div');
            noHistoryItem.className = 'history-item';
            noHistoryItem.textContent = 'No recent searches';
            searchHistory.appendChild(noHistoryItem);
            todaySearches.textContent = '0';
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
            item.addEventListener('click', function() {
                const query = this.dataset.query;
                searchInput.value = query;
                searchForm.dispatchEvent(new Event('submit'));
            });
        });
    }

    function clearSearchHistory() {
        chrome.storage.sync.set({ searchHistory: [] }, function() {
            searchHistory.innerHTML = '';
            const noHistoryItem = document.createElement('div');
            noHistoryItem.className = 'history-item';
            noHistoryItem.textContent = 'No recent searches';
            searchHistory.appendChild(noHistoryItem);
            todaySearches.textContent = '0';
        });
    }

    // Button handlers
    settingsButton.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    helpButton.addEventListener('click', () => {
        chrome.tabs.create({
            url: chrome.runtime.getURL('documentation.html')
        });
    });

    voiceSearchBtn.addEventListener('click', () => {
        voiceSearchModal.classList.add('active');
    });

    dealsBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'openDeals' });
    });

    compareBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'openComparison' });
    });

    clearHistoryBtn.addEventListener('click', clearSearchHistory);

    // Voice search handlers
    startVoiceBtn.addEventListener('click', () => {
        if (recognition) {
            if (!isListening) {
                recognition.start();
            } else {
                recognition.stop();
            }
        }
    });

    closeVoiceModal.addEventListener('click', () => {
        voiceSearchModal.classList.remove('active');
        if (recognition && isListening) recognition.stop();
        resetVoiceUI();
    });

    voiceSearchModal.addEventListener('click', (e) => {
        if (e.target === voiceSearchModal) {
            voiceSearchModal.classList.remove('active');
            if (recognition && isListening) recognition.stop();
            resetVoiceUI();
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            if (document.activeElement !== searchInput) {
                searchInput.focus();
                e.preventDefault();
            } else {
                searchForm.dispatchEvent(new Event('submit'));
            }
        }
        
        if (e.key === 'Escape') {
            if (voiceSearchModal.classList.contains('active')) {
                voiceSearchModal.classList.remove('active');
                if (recognition && isListening) recognition.stop();
                resetVoiceUI();
            }
        }
    });

    // Listen for settings updates
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === 'settingsUpdated') {
            updateUIWithSettings(request.settings);
            sendResponse({ status: 'success' });
        }
        
        if (request.action === 'trackersUpdated') {
            loadActiveTrackersCount();
        }
        
        return true;
    });

    // Initialize
    initializeVoiceRecognition();
    searchInput.focus();

    // Initial load
    loadActiveTrackersCount();
    chrome.storage.sync.get(['searchHistory'], function(result) {
        if (result.searchHistory) {
            updateTodaysSearchesCount(result.searchHistory);
        }
    });
});