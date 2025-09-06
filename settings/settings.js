// settings/settings.js - FINAL: System Dark Mode Sync + Manual Override

document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const countrySelect = document.getElementById('countrySelect');
    const defaultCategory = document.getElementById('defaultCategory');
    const maxComparisonProducts = document.getElementById('maxComparisonProducts');
    const dataRetention = document.getElementById('dataRetention');
    const saveButton = document.getElementById('saveButton');
    const resetButton = document.getElementById('resetButton');
    const exportSettingsBtn = document.getElementById('exportSettingsBtn');
    const importSettingsBtn = document.getElementById('importSettingsBtn');
    const importSettingsFile = document.getElementById('importSettingsFile');
    const clearDataBtn = document.getElementById('clearDataBtn');
    const statusMessage = document.getElementById('statusMessage');
    const debugButton = document.getElementById('debugButton');
    const debugInfo = document.getElementById('debugInfo');
    const debugContent = document.getElementById('debugContent');
    const testNotificationBtn = document.getElementById('testNotificationBtn');
    const darkModeToggle = document.getElementById('darkMode');
    const syncWithSystem = document.getElementById('syncWithSystem'); // ✅ New

    // Fixed affiliate tag
    const FIXED_AFFILIATE_TAG = 'elise200f-20';

    // Default settings
    const defaultSettings = {
        country: 'com',
        affiliateTag: FIXED_AFFILIATE_TAG,
        defaultCategory: 'search-alias=aps',
        autoRedirect: false,
        saveHistory: true,
        enableNotifications: true,
        priceAlerts: true,
        dealAlerts: true,
        couponAlerts: false,
        soundAlerts: true,
        notificationFrequency: 'instant',
        enhancePages: true,
        voiceSearch: false,
        analytics: true,
        dataRetention: 30,
        usageStatistics: true,
        errorReporting: true,
        maxComparisonProducts: 4,
        darkMode: false,
        syncWithSystem: true // ✅ Default: follow OS
    };

    // Insert "Sync with system" checkbox if not in HTML
    if (!syncWithSystem) {
        const darkModeGroup = document.querySelector('#darkMode')?.closest('.setting-group');
        if (darkModeGroup) {
            const syncGroup = document.createElement('div');
            syncGroup.className = 'setting-group';

            syncGroup.innerHTML = `
                <label class="checkbox-label">
                    <input type="checkbox" id="syncWithSystem">
                    <span class="checkmark"></span>
                    Sync with system appearance
                </label>
                <small>Automatically follow your device's light/dark mode</small>
            `;

            darkModeGroup.parentNode.insertBefore(syncGroup, darkModeGroup.nextSibling);
        }
    }

    // Tab switching
    function setupTabSwitching() {
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tab = button.dataset.tab;

                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                tabPanes.forEach(pane => pane.classList.remove('active'));
                document.getElementById(`${tab}-tab`).classList.add('active');
            });
        });
    }

    // Load settings
    function loadSettings() {
        chrome.storage.sync.get(['settings'], (result) => {
            const settings = { ...defaultSettings, ...(result.settings || {}) };
            settings.affiliateTag = FIXED_AFFILIATE_TAG;

            // Apply immediately
            updateUIWithSettings(settings);
            applyTheme(settings);

            showStatus('Settings loaded successfully.', 'success');
        });
    }

    // Apply theme (body class + sync)
    function applyTheme(settings) {
        const useDark = settings.syncWithSystem
            ? window.matchMedia('(prefers-color-scheme: dark)').matches
            : settings.darkMode;

        document.body.classList.toggle('dark-mode', useDark);
        document.body.classList.toggle('light-mode', !useDark);
    }

    // Update UI
    function updateUIWithSettings(settings) {
        countrySelect.value = settings.country || 'com';
        defaultCategory.value = settings.defaultCategory || 'search-alias=aps';
        maxComparisonProducts.value = settings.maxComparisonProducts || 4;
        dataRetention.value = settings.dataRetention || 30;

        // General
        document.getElementById('autoRedirect').checked = !!settings.autoRedirect;
        document.getElementById('saveHistory').checked = settings.saveHistory !== false;

        // Notifications
        document.getElementById('enableNotifications').checked = settings.enableNotifications !== false;
        document.getElementById('priceAlerts').checked = settings.priceAlerts !== false;
        document.getElementById('dealAlerts').checked = settings.dealAlerts !== false;
        document.getElementById('couponAlerts').checked = settings.couponAlerts !== false;
        document.getElementById('soundAlerts').checked = settings.soundAlerts !== false;
        document.getElementById('notificationFrequency').value = settings.notificationFrequency || 'instant';

        // Features
        document.getElementById('enhancePages').checked = settings.enhancePages !== false;
        document.getElementById('voiceSearch').checked = settings.voiceSearch !== false;
        document.getElementById('analytics').checked = settings.analytics !== false;

        // Privacy
        document.getElementById('usageStatistics').checked = settings.usageStatistics !== false;
        document.getElementById('errorReporting').checked = settings.errorReporting !== false;

        // Theme
        if (darkModeToggle) darkModeToggle.checked = !!settings.darkMode;
        if (syncWithSystem) syncWithSystem.checked = !!settings.syncWithSystem;
    }

    // Save settings
    function saveSettings() {
        const newSettings = {
            country: countrySelect.value,
            affiliateTag: FIXED_AFFILIATE_TAG,
            defaultCategory: defaultCategory.value,
            autoRedirect: document.getElementById('autoRedirect').checked,
            saveHistory: document.getElementById('saveHistory').checked,
            enableNotifications: document.getElementById('enableNotifications').checked,
            priceAlerts: document.getElementById('priceAlerts').checked,
            dealAlerts: document.getElementById('dealAlerts').checked,
            couponAlerts: document.getElementById('couponAlerts').checked,
            soundAlerts: document.getElementById('soundAlerts').checked,
            notificationFrequency: document.getElementById('notificationFrequency').value,
            enhancePages: document.getElementById('enhancePages').checked,
            voiceSearch: document.getElementById('voiceSearch').checked,
            analytics: document.getElementById('analytics').checked,
            dataRetention: parseInt(dataRetention.value) || 30,
            usageStatistics: document.getElementById('usageStatistics').checked,
            errorReporting: document.getElementById('errorReporting').checked,
            maxComparisonProducts: parseInt(maxComparisonProducts.value) || 4,
            darkMode: darkModeToggle?.checked ?? false,
            syncWithSystem: syncWithSystem?.checked ?? true
        };

        chrome.storage.sync.set({ settings: newSettings }, () => {
            if (chrome.runtime.lastError) {
                showStatus('Error saving settings: ' + chrome.runtime.lastError.message, 'error');
                return;
            }

            showStatus('Settings saved successfully!', 'success');
            applyTheme(newSettings);

            // Broadcast update
            broadcastSettings(newSettings);
        });
    }

    // Broadcast settings to all contexts
    function broadcastSettings(settings) {
        chrome.runtime.sendMessage({ action: 'settingsUpdated', settings });

        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { action: 'settingsUpdated', settings }, () => {});
            });
        });
    }

    // Reset to defaults
    function resetSettings() {
        if (confirm('Are you sure you want to reset all settings to default?')) {
            chrome.storage.sync.set({ settings: defaultSettings }, () => {
                updateUIWithSettings(defaultSettings);
                applyTheme(defaultSettings);
                showStatus('Settings reset to defaults.', 'success');
                broadcastSettings(defaultSettings);
            });
        }
    }

    // Export settings
    function exportSettings() {
        chrome.storage.sync.get(['settings'], (result) => {
            const settings = result.settings || defaultSettings;
            const dataStr = JSON.stringify(settings, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = 'shopsmart-pro-settings.json';
            a.click();

            URL.revokeObjectURL(url);
            showStatus('Settings exported successfully.', 'success');
        });
    }

    // Import settings
    function importSettings() {
        importSettingsFile.click();
    }

    importSettingsFile.addEventListener('change', (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                imported.affiliateTag = FIXED_AFFILIATE_TAG;

                Object.keys(defaultSettings).forEach(key => {
                    if (imported[key] === undefined) {
                        imported[key] = defaultSettings[key];
                    }
                });

                chrome.storage.sync.set({ settings: imported }, () => {
                    updateUIWithSettings(imported);
                    applyTheme(imported);
                    showStatus('Settings imported successfully.', 'success');
                    broadcastSettings(imported);
                });
            } catch (err) {
                showStatus('Invalid settings file: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
    });

    // Clear all data
    function clearAllData() {
        if (confirm('Are you sure you want to clear ALL data? This cannot be undone.')) {
            chrome.storage.sync.clear(() => {
                chrome.storage.local.clear(() => {
                    updateUIWithSettings(defaultSettings);
                    applyTheme(defaultSettings);
                    showStatus('All data cleared.', 'success');
                    broadcastSettings(defaultSettings);
                });
            });
        }
    }

    // Debug
    debugButton.addEventListener('click', () => {
        if (debugInfo.classList.contains('hidden')) {
            chrome.storage.sync.get(null, (sync) => {
                chrome.storage.local.get(null, (local) => {
                    debugContent.textContent = 
                        'Sync:\n' + JSON.stringify(sync, null, 2) +
                        '\n\nLocal:\n' + JSON.stringify(local, null, 2);
                    debugInfo.classList.remove('hidden');
                    debugButton.textContent = 'Hide Debug Info';
                });
            });
        } else {
            debugInfo.classList.add('hidden');
            debugButton.textContent = 'Show Debug Info';
        }
    });

    // Help & About
    document.getElementById('helpButton')?.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('documentation.html') });
    });

    document.getElementById('aboutButton')?.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('about.html') });
    });

    // Test Notification
    testNotificationBtn?.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'createTestNotification' });
        showStatus('Test notification sent!', 'success');
    });

    // Status message
    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = type;
        setTimeout(() => {
            statusMessage.textContent = '';
            statusMessage.className = '';
        }, 5000);
    }

    // Initialize
    setupTabSwitching();
    loadSettings();

    // Event Listeners
    saveButton.addEventListener('click', saveSettings);
    resetButton.addEventListener('click', resetSettings);
    exportSettingsBtn.addEventListener('click', exportSettings);
    importSettingsBtn.addEventListener('click', importSettings);
    clearDataBtn.addEventListener('click', clearAllData);

    // Observe system theme if sync is enabled
    if (syncWithSystem) {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        media.addEventListener('change', () => {
            chrome.storage.sync.get(['settings'], (result) => {
                const settings = result.settings || {};
                if (settings.syncWithSystem) {
                    applyTheme(settings);
                    broadcastSettings({ ...settings, darkMode: media.matches });
                }
            });
        });
    }
});