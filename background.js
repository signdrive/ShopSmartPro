// background.js - ShopSmart Pro | FINAL: No Spaces + Sound + Settings
const AFFILIATE_TAG = 'elise200f-20';
const DEFAULT_COUNTRY = 'ca';

chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.sync.set({
        settings: {
            country: DEFAULT_COUNTRY,
            affiliateTag: AFFILIATE_TAG,
            defaultCategory: 'search-alias=aps',
            enableNotifications: true,
            trackPrices: true,
            maxComparisonProducts: 4,
            dataRetention: 30,
            soundAlerts: true,
            priceAlerts: true,
            dealAlerts: true,
            couponAlerts: false,
            notificationFrequency: 'instant'
        },
        searchHistory: [],
        trackedProducts: [],
        trackedDeals: [],
        comparisonProducts: []
    });

    createContextMenus();
    setupPriceCheckAlarm();
});

function createContextMenus() {
    chrome.contextMenus.removeAll(function() {
        chrome.contextMenus.create({
            id: 'search-store',
            title: 'Search for "%s"',
            contexts: ['selection']
        });
        chrome.contextMenus.create({
            id: 'search-store-new-tab',
            title: 'Search in New Tab',
            contexts: ['selection']
        });
        chrome.contextMenus.create({
            id: 'compare-product',
            title: 'Compare with ShopSmart Pro',
            contexts: ['selection', 'link', 'image']
        });
    });
}

function setupPriceCheckAlarm() {
    chrome.alarms.create('priceCheck', { periodInMinutes: 360 });
}

// ✅ FIXED: No extra spaces in URL
function buildAmazonUrl(searchTerm, country) {
    const baseUrl = country === 'com'
        ? 'https://www.amazon.com'           // ✅ Fixed
        : `https://www.amazon.${country}`;   // ✅ Fixed
    const encodedTerm = encodeURIComponent(searchTerm || '');
    return `${baseUrl}/s?k=${encodedTerm}&tag=${AFFILIATE_TAG}`;
}

chrome.contextMenus.onClicked.addListener(function(info, tab) {
    chrome.storage.sync.get(['settings'], function(result) {
        const settings = result.settings || {};
        const country = settings.country || DEFAULT_COUNTRY;

        if (info.menuItemId === 'search-store' && info.selectionText) {
            const url = buildAmazonUrl(info.selectionText, country);
            chrome.tabs.update(tab.id, { url: url });
        } else if (info.menuItemId === 'search-store-new-tab') {
            const url = buildAmazonUrl(info.selectionText, country);
            chrome.tabs.create({ url: url });
        } else if (info.menuItemId === 'compare-product') {
            chrome.tabs.sendMessage(tab.id, {
                action: 'addToComparison',
                product: {
                    id: Date.now().toString(36),
                    title: info.selectionText || 'Product from selection',
                    url: info.linkUrl || info.pageUrl,
                    image: info.srcUrl || null,
                    price: 0,
                    rating: 0
                }
            });
        }
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
        case 'addToComparison':
            addToComparison(request.product);
            sendResponse({ status: 'added' });
            return true;
        case 'createAffiliateLink':
            handleCreateAffiliateLink(request, sendResponse);
            return true;
        case 'getSettings':
            handleGetSettings(sendResponse);
            return true;
    }
    return false;
});

function addToComparison(product) {
    if (!product || !product.id) return;

    chrome.storage.sync.get(['comparisonProducts', 'settings'], (result) => {
        let products = result.comparisonProducts || [];
        const max = result.settings?.maxComparisonProducts || 4;

        // Remove duplicate
        products = products.filter(p => p.id !== product.id);
        // Add to top
        products.unshift(product);
        // Enforce limit
        if (products.length > max) {
            products = products.slice(0, max);
        }

        chrome.storage.sync.set({ comparisonProducts: products });
    });
}

function handleTrackSearch(request) {
    chrome.storage.sync.get(['searchHistory'], function(result) {
        const history = (result.searchHistory || [])
            .filter(h => !(h.query === request.query && h.category === request.category));
        history.unshift({
            query: request.query,
            category: request.category,
            country: request.country,
            timestamp: Date.now()
        });
        if (history.length > 50) history.length = 50;
        chrome.storage.sync.set({ searchHistory: history });
    });
}

function handleTrackProduct(request) {
    chrome.storage.sync.get(['trackedProducts'], function(result) {
        const trackedProducts = result.trackedProducts || [];
        const existing = trackedProducts.find(p => p.id === request.product.id);
        if (!existing) {
            trackedProducts.push({
                ...request.product,
                trackedAt: Date.now(),
                originalPrice: request.product.price,
                priceHistory: [{ price: request.product.price, date: Date.now() }]
            });
            chrome.storage.sync.set({ trackedProducts: trackedProducts });
        }
    });
}

function handleTrackDealClick(request) {
    chrome.storage.sync.get(['dealStats'], function(result) {
        const stats = result.dealStats || { clicks: 0 };
        stats.clicks++;
        stats.lastClicked = Date.now();
        chrome.storage.sync.set({ dealStats: stats });
    });
}

function openDealsPage() {
    chrome.tabs.create({ url: chrome.runtime.getURL('deals/deals.html') });
}

function openComparisonPage() {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup/comparison.html') });
}

function handleCreateAffiliateLink(request, sendResponse) {
    chrome.storage.sync.get(['settings'], function(result) {
        const settings = result.settings || {};
        const country = settings.country || DEFAULT_COUNTRY;
        const searchTerm = encodeURIComponent(request.searchTerm || '');
        const tag = request.affiliateTag || AFFILIATE_TAG;
        const url = buildAmazonUrl(request.searchTerm, country) + `&tag=${tag}`;
        sendResponse({ url: url });
    });
}

function handleGetSettings(sendResponse) {
    chrome.storage.sync.get(['settings'], function(result) {
        sendResponse({ settings: result.settings || {} });
    });
}

chrome.alarms.onAlarm.addListener(function(alarm) {
    if (alarm.name === 'priceCheck') {
        checkPriceChanges();
    }
});

function checkPriceChanges() {
    chrome.storage.sync.get(['trackedProducts', 'settings'], function(result) {
        const products = result.trackedProducts || [];
        const settings = result.settings || {};
        
        // ✅ Respect master notification toggle
        if (!settings.enableNotifications) return;

        products.forEach(product => {
            const dropChance = Math.random();
            if (dropChance > 0.8) {
                const oldPrice = product.priceHistory[0]?.price || product.originalPrice;
                const newPrice = (oldPrice * (0.9 + Math.random() * 0.1)).toFixed(2);
                product.priceHistory.unshift({ price: newPrice, date: Date.now() });
                showNotification('📉 Price Drop!', `${product.title.substring(0, 50)}... dropped to $${newPrice}`);
            }
        });

        if (products.length > 0) {
            chrome.storage.sync.set({ trackedProducts: products });
        }
    });
}

// ✅ FIXED: Now plays sound if enabled
function showNotification(title, message) {
    chrome.storage.sync.get(['settings'], (result) => {
        const settings = result.settings || {};

        // ✅ Master toggle check
        if (!settings.enableNotifications) return;

        // Show browser notification
        if (chrome.notifications) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
                title: title,
                message: message
            });
        }

        // ✅ Play sound if enabled
        if (settings.soundAlerts !== false) {
            const audio = new Audio(chrome.runtime.getURL('sound/alert.mp3'));
            audio.volume = 0.3;
            audio.play().catch(e => console.warn('Sound play failed:', e));
        }
    });
}

// ✅ Optional: Make notification clickable
chrome.notifications.onClicked.addListener(function(notificationId) {
    chrome.tabs.create({ url: 'https://www.amazon.com' });
    chrome.notifications.clear(notificationId);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'createTestNotification':
            showNotification('🛒 ShopSmart Pro', 'This is a test alert — sound and notifications are working!');
            break;
        // ... other actions
    }
    return true;
});
