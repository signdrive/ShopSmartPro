// settings.js - ShopSmart Pro | Final: Default Country = USA
document.addEventListener('DOMContentLoaded', function () {
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

    // Fixed affiliate tag - cannot be changed by users
    const fixedAffiliateTag = 'elise200f-20';

    // Default settings – changed country to 'com' (USA)
    const defaultSettings = {
        country: 'com', // ✅ Changed from 'ca' to 'com' (United States)
        affiliateTag: fixedAffiliateTag,
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
        maxComparisonProducts: 4
    };

    // Tab switching functionality
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;

            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            tabPanes.forEach(pane => pane.classList.remove('active'));
            document.getElementById(`${tab}-tab`).classList.add('active');
        });
    });

    // Load saved settings
    chrome.storage.sync.get(['settings'], function (result) {
        let settings = result.settings || {};

        // Ensure critical settings are always set
        settings.affiliateTag = fixedAffiliateTag;

        // Backfill missing settings with defaults
        Object.keys(defaultSettings).forEach(key => {
            if (settings[key] === undefined) {
                settings[key] = defaultSettings[key];
            }
        });

        // Update UI with loaded settings
        updateUIWithSettings(settings);
        showStatus('Settings loaded successfully.', 'success');
    });

    // Update UI with settings
    function updateUIWithSettings(settings) {
        // ✅ Fallback to 'com' if no country
        const country = settings.country || 'com';
        countrySelect.value = country;
        defaultCategory.value = settings.defaultCategory || 'search-alias=aps';
        maxComparisonProducts.value = settings.maxComparisonProducts || 4;
        dataRetention.value = settings.dataRetention || 30;

        // General checkboxes
        document.getElementById('autoRedirect').checked = !!settings.autoRedirect;
        document.getElementById('saveHistory').checked = settings.saveHistory !== false;

        // Notification toggles
        document.getElementById('enableNotifications').checked = settings.enableNotifications !== false;
        document.getElementById('priceAlerts').checked = settings.priceAlerts !== false;
        document.getElementById('dealAlerts').checked = settings.dealAlerts !== false;
        document.getElementById('couponAlerts').checked = settings.couponAlerts !== false;
        document.getElementById('soundAlerts').checked = settings.soundAlerts !== false;

        // Features
        document.getElementById('enhancePages').checked = settings.enhancePages !== false;
        document.getElementById('voiceSearch').checked = settings.voiceSearch !== false;
        document.getElementById('analytics').checked = settings.analytics !== false;

        // Privacy
        document.getElementById('usageStatistics').checked = settings.usageStatistics !== false;
        document.getElementById('errorReporting').checked = settings.errorReporting !== false;
    }

    // Save settings
    saveButton.addEventListener('click', function () {
        const newSettings = {
            country: countrySelect.value, // ✅ Will be 'com' by default
            affiliateTag: fixedAffiliateTag,
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
            maxComparisonProducts: parseInt(maxComparisonProducts.value) || 4
        };

        chrome.storage.sync.set({ settings: newSettings }, function () {
            if (chrome.runtime.lastError) {
                showStatus('Error saving settings: ' + chrome.runtime.lastError.message, 'error');
                return;
            }

            showStatus('Settings saved successfully!', 'success');

            // ✅ Broadcast settings update to ALL parts of extension
            chrome.runtime.sendMessage({
                action: 'settingsUpdated',
                settings: newSettings
            });

            // ✅ Also broadcast to all open tabs (including popup)
            chrome.tabs.query({}, function (tabs) {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'settingsUpdated',
                        settings: newSettings
                    }, () => {
                        // Ignore errors (tab may not have listener)
                    });
                });
            });
        });
    });

    // Reset to default
    resetButton.addEventListener('click', function () {
        if (confirm('Are you sure you want to reset all settings to default?')) {
            chrome.storage.sync.set({ settings: defaultSettings }, function () {
                updateUIWithSettings(defaultSettings);
                showStatus('Settings reset to defaults.', 'success');

                // ✅ Broadcast reset
                chrome.runtime.sendMessage({
                    action: 'settingsUpdated',
                    settings: defaultSettings
                });
            });
        }
    });

    // Export settings
    exportSettingsBtn.addEventListener('click', function () {
        chrome.storage.sync.get(['settings'], function (result) {
            const settings = result.settings || defaultSettings;
            const dataStr = JSON.stringify(settings, null, 2);
            const dataUri = 'application/json;charset=utf-8,' + encodeURIComponent(dataStr);

            const exportFileDefaultName = 'shopsmart-pro-settings.json';

            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();

            showStatus('Settings exported successfully.', 'success');
        });
    });

    // Import settings
    importSettingsBtn.addEventListener('click', function () {
        importSettingsFile.click();
    });

    importSettingsFile.addEventListener('change', function (event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                try {
                    const importedSettings = JSON.parse(e.target.result);

                    // Preserve critical settings
                    importedSettings.affiliateTag = fixedAffiliateTag;

                    // Backfill any missing new settings
                    Object.keys(defaultSettings).forEach(key => {
                        if (importedSettings[key] === undefined) {
                            importedSettings[key] = defaultSettings[key];
                        }
                    });

                    chrome.storage.sync.set({ settings: importedSettings }, function () {
                        updateUIWithSettings(importedSettings);
                        showStatus('Settings imported successfully.', 'success');

                        // ✅ Broadcast import
                        chrome.runtime.sendMessage({
                            action: 'settingsUpdated',
                            settings: importedSettings
                        });
                    });
                } catch (error) {
                    showStatus('Error importing settings: Invalid file format', 'error');
                }
            };
            reader.readAsText(file);
        }
    });

    // Clear all data
    clearDataBtn.addEventListener('click', function () {
        if (confirm('Are you sure you want to clear ALL data? This cannot be undone.')) {
            chrome.storage.sync.clear(function () {
                chrome.storage.local.clear(function () {
                    updateUIWithSettings(defaultSettings);
                    showStatus('All data cleared successfully.', 'success');

                    // ✅ Broadcast reset
                    chrome.runtime.sendMessage({
                        action: 'settingsUpdated',
                        settings: defaultSettings
                    });
                });
            });
        }
    });

    // Debug button
    debugButton.addEventListener('click', function () {
        if (debugInfo.style.display === 'none') {
            chrome.storage.sync.get(null, function (syncResult) {
                chrome.storage.local.get(null, function (localResult) {
                    debugContent.textContent =
                        'Sync Storage:\n' +
                        JSON.stringify(syncResult, null, 2) +
                        '\n\nLocal Storage:\n' +
                        JSON.stringify(localResult, null, 2);
                    debugInfo.style.display = 'block';
                    debugButton.textContent = 'Hide Debug Info';
                });
            });
        } else {
            debugInfo.style.display = 'none';
            debugButton.textContent = 'Show Debug Info';
        }
    });

    // Help & About buttons
    document.getElementById('helpButton').addEventListener('click', function () {
        chrome.tabs.create({
            url: chrome.runtime.getURL('documentation.html')
        });
    });

    document.getElementById('aboutButton').addEventListener('click', function () {
        chrome.tabs.create({
            url: chrome.runtime.getURL('about.html')
        });
    });

    // Show status message
    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = type;
        setTimeout(() => {
            statusMessage.textContent = '';
            statusMessage.className = '';
        }, 5000);
    }

    // Test Notification Button
    if (testNotificationBtn) {
        testNotificationBtn.addEventListener('click', () => {
            chrome.runtime.sendMessage({
                action: 'createTestNotification'
            });
            showStatus('Test notification sent!', 'success');
        });
    }
});