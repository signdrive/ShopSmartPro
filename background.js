// Background script for ShopSmart Pro extension
console.log('ShopSmart Pro background script loaded');

// Configuration
const AFFILIATE_TAG = 'elise200f-20';
const DEFAULT_COUNTRY = 'ca';

// Initialize extension
chrome.runtime.onInstalled.addListener(function() {
    console.log('ShopSmart Pro extension installed');
    
    // Set default settings
    chrome.storage.sync.set({
        settings: {
            country: DEFAULT_COUNTRY,
            affiliateTag: AFFILIATE_TAG,
            defaultCategory: 'search-alias=aps',
            enableNotifications: true,
            trackPrices: true
        },
        searchHistory: [],
        trackedProducts: [],
        trackedDeals: []
    });

    // Create context menu items
    createContextMenus();
    
    // Set up alarm for price checking
    setupPriceCheckAlarm();
});

// Create right-click context menu items
function createContextMenus() {
    // Remove existing menus first
    chrome.contextMenus.removeAll(function() {
        // Create search context menu
        chrome.contextMenus.create({
            id: 'search-store',
            title: 'Search for "%s"',
            contexts: ['selection']
        });

        // Create search in new tab context menu
        chrome.contextMenus.create({
            id: 'search-store-new-tab',
            title: 'Search in New Tab',
            contexts: ['selection']
        });

        // Create product comparison context menu
        chrome.contextMenus.create({
            id: 'compare-product',
            title: 'Compare with ShopSmart Pro',
            contexts: ['selection', 'link', 'image']
        });

        console.log('Context menus created successfully');
    });
}

// Setup price check alarm
function setupPriceCheckAlarm() {
    // Check for price changes every 6 hours
    chrome.alarms.create('priceCheck', {
        periodInMinutes: 360
    });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(function(info, tab) {
    chrome.storage.sync.get(['settings'], function(result) {
        const settings = result.settings || {};
        const country = settings.country || DEFAULT_COUNTRY;
        
        if (info.menuItemId === 'search-store' && info.selectionText) {
            // Search in current tab
            const url = `https://www.amazon.${country}/s?k=${encodeURIComponent(info.selectionText)}&tag=${AFFILIATE_TAG}`;
            chrome.tabs.update(tab.id, { url: url });
            
        } else if (info.menuItemId === 'search-store-new-tab') {
            // Search in new tab
            const url = `https://www.amazon.${country}/s?k=${encodeURIComponent(info.selectionText)}&tag=${AFFILIATE_TAG}`;
            chrome.tabs.create({ url: url });
            
        } else if (info.menuItemId === 'compare-product') {
            // Handle product comparison
            handleProductComparison(info, tab);
        }
    });
});

// Handle product comparison
function handleProductComparison(info, tab) {
    // Extract product information from context
    let productData = {
        text: info.selectionText || '',
        linkUrl: info.linkUrl || '',
        pageUrl: info.pageUrl || '',
        mediaType: info.mediaType || ''
    };

    // Send product data to content script for processing
    chrome.tabs.sendMessage(tab.id, {
        action: 'addToComparison',
        product: productData
    });
}

// Handle messages from other parts of the extension
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    switch (request.action) {
        case 'trackSearch':
            handleTrackSearch(request);
            sendResponse({ status: 'success' });
            break;
            
        case 'trackProduct':
            handleTrackProduct(request);
            sendResponse({ status: 'success' });
            break;
            
        case 'trackDealClick':
            handleTrackDealClick(request);
            sendResponse({ status: 'success' });
            break;
            
        case 'openDeals':
            openDealsPage();
            sendResponse({ status: 'success' });
            break;
            
        case 'openComparison':
            openComparisonPage();
            sendResponse({ status: 'success' });
            break;
            
        case 'createAffiliateLink':
            handleCreateAffiliateLink(request, sendResponse);
            return true; // Keep channel open for async response
            
        case 'getSettings':
            handleGetSettings(sendResponse);
            return true; // Keep channel open for async response
            
        default:
            sendResponse({ status: 'unknown_action' });
    }
});

// Handle search tracking
function handleTrackSearch(request) {
    chrome.storage.sync.get(['searchHistory'], function(result) {
        const history = result.searchHistory || [];
        history.unshift({
            query: request.query,
            category: request.category,
            country: request.country,
            timestamp: Date.now()
        });
        
        // Keep only last 50 searches
        if (history.length > 50) {
            history.length = 50;
        }
        
        chrome.storage.sync.set({ searchHistory: history });
    });
}

// Handle product tracking
function handleTrackProduct(request) {
    chrome.storage.sync.get(['trackedProducts'], function(result) {
        const trackedProducts = result.trackedProducts || [];
        const existingProduct = trackedProducts.find(p => p.id === request.product.id);
        
        if (!existingProduct) {
            trackedProducts.push({
                ...request.product,
                trackedAt: Date.now(),
                originalPrice: request.product.price,
                priceHistory: [{
                    price: request.product.price,
                    date: Date.now()
                }]
            });
            
            chrome.storage.sync.set({ trackedProducts: trackedProducts });
            
            // Show confirmation notification
            showNotification(
                'Product Tracking Started',
                `Now tracking price for: ${request.product.title}`
            );
        }
    });
}

// Handle deal click tracking
function handleTrackDealClick(request) {
    chrome.storage.sync.get(['dealStats'], function(result) {
        const dealStats = result.dealStats || { clicks: 0, lastClicked: null };
        dealStats.clicks = (dealStats.clicks || 0) + 1;
        dealStats.lastClicked = Date.now();
        
        chrome.storage.sync.set({ dealStats: dealStats });
    });
}

// Open deals page
function openDealsPage() {
    chrome.tabs.create({
        url: chrome.runtime.getURL('deals/deals.html')
    });
}

// Open comparison page
function openComparisonPage() {
    chrome.tabs.create({
        url: chrome.runtime.getURL('popup/comparison.html')
    });
}

// Handle affiliate link creation
function handleCreateAffiliateLink(request, sendResponse) {
    const searchTerm = encodeURIComponent(request.searchTerm || '');
    const affiliateTag = request.affiliateTag || AFFILIATE_TAG;
    
    chrome.storage.sync.get(['settings'], function(result) {
        const settings = result.settings || {};
        const country = settings.country || DEFAULT_COUNTRY;
        
        const url = `https://www.amazon.${country}/s?k=${searchTerm}&tag=${affiliateTag}&ref=nb_sb_noss`;
        sendResponse({ url: url });
    });
}

// Handle settings retrieval
function handleGetSettings(sendResponse) {
    chrome.storage.sync.get(['settings'], function(result) {
        sendResponse({ settings: result.settings || {} });
    });
}

// Show notification
function showNotification(title, message) {
    if (chrome.notifications) {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
            title: title,
            message: message
        });
    }
}

// Handle alarm events (price checking)
chrome.alarms.onAlarm.addListener(function(alarm) {
    if (alarm.name === 'priceCheck') {
        checkPriceChanges();
    }
});

// Check for price changes
function checkPriceChanges() {
    chrome.storage.sync.get(['trackedProducts', 'settings'], function(result) {
        const trackedProducts = result.trackedProducts || [];
        const settings = result.settings || {};
        
        if (!settings.enableNotifications) return;
        
        // Simulate price check (in real implementation, you'd fetch actual prices)
        trackedProducts.forEach(product => {
            const priceChange = Math.random() > 0.7 ? -(Math.random() * 20) : 0;
            
            if (priceChange < 0) {
                // Price dropped - send notification
                const newPrice = (product.originalPrice + priceChange).toFixed(2);
                showNotification(
                    'Price Drop Alert!',
                    `${product.title} dropped to $${newPrice} (Was: $${product.originalPrice})`
                );
                
                // Update price history
                product.priceHistory.push({
                    price: newPrice,
                    date: Date.now()
                });
            }
        });
        
        // Save updated products
        chrome.storage.sync.set({ trackedProducts: trackedProducts });
    });
}

// Handle extension startup
chrome.runtime.onStartup.addListener(function() {
    console.log('ShopSmart Pro extension started');
    setupPriceCheckAlarm();
});

// Handle update available
chrome.runtime.onUpdateAvailable.addListener(function(details) {
    console.log('Update available for ShopSmart Pro:', details.version);
    chrome.runtime.reload();
});


// Export functions for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createContextMenus,
        handleTrackSearch,
        handleTrackProduct,
        showNotification,
        checkPriceChanges
    };
}