document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const countrySelect = document.getElementById('countrySelect');
    const defaultCategory = document.getElementById('defaultCategory');
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

    // Fixed affiliate tag - cannot be changed by users
    const fixedAffiliateTag = 'elise200f-20';
    
    // Default settings
   const defaultSettings = {
    country: 'ca',
    affiliateTag: fixedAffiliateTag,
    defaultCategory: 'search-alias=aps',
    autoRedirect: false,
    saveHistory: true,
    priceAlerts: true,
    dealAlerts: true,
    couponAlerts: false,
    notificationFrequency: 'instant',
    enhancePages: true,
    voiceSearch: false,
    dataRetention: 30,
    usageStatistics: true,  // Added
    errorReporting: true    // Added
};

    // Tab switching functionality
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tab = button.dataset.tab;
            
            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show corresponding tab pane
            tabPanes.forEach(pane => pane.classList.remove('active'));
            document.getElementById(`${tab}-tab`).classList.add('active');
        });
    });

    // Load saved settings
    chrome.storage.sync.get(['settings'], function(result) {
        console.log('Loading settings from storage:', result);
        
        let settings = result.settings || defaultSettings;
        
        // Ensure affiliate tag is always fixed
        settings.affiliateTag = fixedAffiliateTag;
        
        // Update UI with loaded settings
        updateUIWithSettings(settings);
        
        showStatus('Settings loaded successfully.', 'success');
    });

    // Update UI with settings
    function updateUIWithSettings(settings) {
        countrySelect.value = settings.country || 'ca';
        defaultCategory.value = settings.defaultCategory || 'search-alias=aps';
        
        // Checkboxes
        document.getElementById('autoRedirect').checked = settings.autoRedirect || false;
        document.getElementById('saveHistory').checked = settings.saveHistory !== false;
        document.getElementById('priceAlerts').checked = settings.priceAlerts || false;
        document.getElementById('dealAlerts').checked = settings.dealAlerts || false;
        document.getElementById('couponAlerts').checked = settings.couponAlerts || false;
        document.getElementById('enhancePages').checked = settings.enhancePages !== false;
        document.getElementById('voiceSearch').checked = settings.voiceSearch || false;
        document.getElementById('analytics').checked = settings.analytics !== false;
        
        // Selects
        document.getElementById('notificationFrequency').value = settings.notificationFrequency || 'instant';
        document.getElementById('dataRetention').value = settings.dataRetention || 30;
        // Add privacy settings handling in updateUIWithSettings
        document.getElementById('usageStatistics').checked = settings.usageStatistics !== false;
        document.getElementById('errorReporting').checked = settings.errorReporting !== false;
    }

    // Save settings
    saveButton.addEventListener('click', function() {
       const newSettings = {
            country: countrySelect.value,
            affiliateTag: fixedAffiliateTag,
            defaultCategory: defaultCategory.value,
            autoRedirect: document.getElementById('autoRedirect').checked,
            saveHistory: document.getElementById('saveHistory').checked,
            priceAlerts: document.getElementById('priceAlerts').checked,
            dealAlerts: document.getElementById('dealAlerts').checked,
            couponAlerts: document.getElementById('couponAlerts').checked,
            notificationFrequency: document.getElementById('notificationFrequency').value,
            enhancePages: document.getElementById('enhancePages').checked,
            voiceSearch: document.getElementById('voiceSearch').checked,
            dataRetention: parseInt(document.getElementById('dataRetention').value),
            usageStatistics: document.getElementById('usageStatistics').checked,  // Added
            errorReporting: document.getElementById('errorReporting').checked     // Added
        };

        console.log('Saving settings:', newSettings);
        
        chrome.storage.sync.set({ settings: newSettings }, function() {
            if (chrome.runtime.lastError) {
                showStatus('Error saving settings: ' + chrome.runtime.lastError.message, 'error');
                return;
            }
            
            showStatus('Settings saved successfully!', 'success');
            
            // Notify other parts of the extension
            chrome.runtime.sendMessage({
                action: 'settingsUpdated',
                settings: newSettings
            });
        });
    });

    // Reset to default
    resetButton.addEventListener('click', function() {
        if (confirm('Are you sure you want to reset all settings to default?')) {
            chrome.storage.sync.set({ settings: defaultSettings }, function() {
                updateUIWithSettings(defaultSettings);
                showStatus('Settings reset to defaults.', 'success');
            });
        }
    });

    // Export settings
    exportSettingsBtn.addEventListener('click', function() {
        chrome.storage.sync.get(['settings'], function(result) {
            const settings = result.settings || defaultSettings;
            const dataStr = JSON.stringify(settings, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            
            const exportFileDefaultName = 'amazon-search-pro-settings.json';
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            
            showStatus('Settings exported successfully.', 'success');
        });
    });

    // Import settings
    importSettingsBtn.addEventListener('click', function() {
        importSettingsFile.click();
    });

    importSettingsFile.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const importedSettings = JSON.parse(e.target.result);
                    
                    // Ensure affiliate tag remains fixed
                    importedSettings.affiliateTag = fixedAffiliateTag;
                    
                    chrome.storage.sync.set({ settings: importedSettings }, function() {
                        updateUIWithSettings(importedSettings);
                        showStatus('Settings imported successfully.', 'success');
                    });
                } catch (error) {
                    showStatus('Error importing settings: Invalid file format', 'error');
                }
            };
            reader.readAsText(file);
        }
    });

    // Clear all data
    clearDataBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to clear ALL data? This cannot be undone.')) {
            chrome.storage.sync.clear(function() {
                chrome.storage.local.clear(function() {
                    updateUIWithSettings(defaultSettings);
                    showStatus('All data cleared successfully.', 'success');
                });
            });
        }
    });

    // Debug button
    debugButton.addEventListener('click', function() {
        if (debugInfo.style.display === 'none') {
            chrome.storage.sync.get(null, function(syncResult) {
                chrome.storage.local.get(null, function(localResult) {
                    debugContent.textContent = 'Sync Storage:\n' + 
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

        // Add to your event listeners
    document.getElementById('helpButton').addEventListener('click', function() {
        chrome.tabs.create({
            url: chrome.runtime.getURL('documentation.html')
        });
    });

    document.getElementById('aboutButton').addEventListener('click', function() {
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
});