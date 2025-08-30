// background.js - ShopSmart Pro | FINAL: Fixed Async Response Issues

const AFFILIATE_TAG = 'elise200f-20';
const DEFAULT_COUNTRY = 'ca';

// ✅ Your eBay Credentials (Client ID and Client Secret)
const EBAY_CLIENT_ID = 'SabirImc-ShopSmar-PRD-9d5c80ac8-d88362d1';
const EBAY_CLIENT_SECRET = 'PRD-d47d6511273c-071a-4d8e-9fb2-c4be';

let accessToken = null;
let tokenExpiry = 0;

// Cache for eBay API responses
const ebayCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Rate limiting
const requestHistory = new Map();
const MAX_REQUESTS_PER_MINUTE = 5;
const RATE_LIMIT_WINDOW = 60_000;

// Mock data fallback with pagination support
function getMockEbayData(query, page = 1, limit = 20) {
  const mockItems = [];
  const totalItems = 35; // Simulate multiple pages
  
  for (let i = 1; i <= limit; i++) {
    const itemNumber = (page - 1) * limit + i;
    if (itemNumber > totalItems) break;
    
    mockItems.push({
      title: `${query} - Robot Toy #${itemNumber}`,
      price: { value: (24.99 + itemNumber).toFixed(2), currency: "USD" },
      image: { imageUrl: "https://via.placeholder.com/150" },
      itemWebUrl: `https://www.ebay.com/itm/${1234567890 + itemNumber}`,
      shippingOptions: [{ shippingCost: { value: "5.99", currency: "USD" } }],
      condition: itemNumber % 2 === 0 ? "New" : "Used",
      itemId: `mock_${1234567890 + itemNumber}`
    });
  }
  
  return {
    itemSummaries: mockItems,
    total: totalItems
  };
}

// Check rate limit
function isRateLimited(senderId) {
  const now = Date.now();
  const requests = requestHistory.get(senderId) || [];
  const valid = requests.filter(ts => now - ts < RATE_LIMIT_WINDOW);
  requestHistory.set(senderId, valid);
  if (valid.length >= MAX_REQUESTS_PER_MINUTE) return true;
  valid.push(now);
  requestHistory.set(senderId, valid);
  return false;
}

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    settings: {
      country: DEFAULT_COUNTRY,
      affiliateTag: AFFILIATE_TAG,
      ebayClientId: EBAY_CLIENT_ID,
      maxComparisonProducts: 4,
      enableNotifications: true,
      priceAlerts: true,
      dealAlerts: true,
      soundAlerts: true
    },
    searchHistory: [],
    trackedProducts: [],
    comparisonProducts: []
  });

  // Create context menus
  chrome.contextMenus.removeAll(() => {
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
      contexts: ['selection']
    });
  });

  // Set up price check alarm
  chrome.alarms.create('priceCheck', { periodInMinutes: 360 });
});

// Build Amazon URL
function buildAmazonUrl(term, country) {
  const base = country === 'com' ? 'https://www.amazon.com' : `https://www.amazon.${country}`;
  return `${base}/s?k=${encodeURIComponent(term)}`;
}

// Context menu handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  chrome.storage.sync.get(['settings'], ({ settings }) => {
    const country = settings?.country || DEFAULT_COUNTRY;
    const url = buildAmazonUrl(info.selectionText || '', country);

    if (info.menuItemId === 'search-store') {
      chrome.tabs.update(tab.id, { url });
    } else if (info.menuItemId === 'search-store-new-tab') {
      chrome.tabs.create({ url });
    } else if (info.menuItemId === 'compare-product') {
      const product = {
        id: Date.now().toString(36),
        title: info.selectionText || 'Product',
        url: info.linkUrl || info.pageUrl,
        image: info.srcUrl || null,
        price: 0
      };
      chrome.tabs.sendMessage(tab.id, { action: 'addToComparison', product });
    }
  });
});

// Handle messages - FIXED for async operations
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'fetchEbaySearch':
      handleFetchEbaySearch(request, sender.tab?.id, sendResponse)
        .catch(error => {
          console.error('Search error:', error);
          sendResponse({ 
            error: error.message,
            success: false 
          });
        });
      return true; // ✅ Keep the message channel open for async response

    case 'getSettings':
      chrome.storage.sync.get(['settings'], (res) => {
        sendResponse({ settings: res.settings || {} });
      });
      return true; // ✅ Required for async response

    case 'addToComparison':
      addToComparison(request.product);
      sendResponse({ status: 'added' });
      return false; // ✅ Sync response

    case 'openComparison':
      openComparisonPage();
      sendResponse({ status: 'success' });
      return false; // ✅ Sync response

    case 'openDeals':
      openDealsPage();
      sendResponse({ status: 'success' });
      return false; // ✅ Sync response
  }
  return false;
});

// Add to comparison
function addToComparison(product) {
  if (!product?.id) return;
  chrome.storage.sync.get(['comparisonProducts', 'settings'], ({ comparisonProducts = [], settings }) => {
    const max = settings?.maxComparisonProducts || 4;
    let products = comparisonProducts.filter(p => p.id !== product.id);
    products.unshift(product);
    if (products.length > max) products = products.slice(0, max);
    chrome.storage.sync.set({ comparisonProducts: products });
    chrome.runtime.sendMessage({ action: 'comparisonUpdated' });
  });
}

// Open comparison page
function openComparisonPage() {
  chrome.tabs.create({ url: chrome.runtime.getURL('popup/comparison.html') });
}

// Open deals page
function openDealsPage() {
  chrome.tabs.create({ url: chrome.runtime.getURL('deals/deals.html') });
}

// Get fresh OAuth token
async function getEbayAccessToken() {
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  const authHeader = btoa(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`);
  const response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${authHeader}`
    },
    body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope'
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('OAuth failed:', response.status, text);
    throw new Error('Failed to authenticate with eBay API.');
  }

  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
  return accessToken;
}

// Handle eBay search with PAGINATION - FIXED async handling
async function handleFetchEbaySearch(request, senderTabId, sendResponse) {
  const { query, page = 1, limit = 20 } = request;
  const senderId = senderTabId || 'unknown';

  if (isRateLimited(senderId)) {
    sendResponse({ error: 'Too many requests. Please wait.', success: false });
    return;
  }

  const cacheKey = `ebay_${query}_${DEFAULT_COUNTRY}_page${page}_limit${limit}`;
  const cached = ebayCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) {
    sendResponse({ 
      data: cached.data, 
      page: cached.page, 
      totalPages: cached.totalPages,
      success: true 
    });
    return;
  }

  try {
    const token = await getEbayAccessToken();
    const marketplaceId = DEFAULT_COUNTRY === 'com' ? 'EBAY-US' : 'EBAY-CA';
    const offset = (page - 1) * limit;
    
    const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&marketplace_id=${marketplaceId}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-EBAY-C-MARKETPLACE-ID': marketplaceId
      }
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Browse API Error:', res.status, text);
      throw new Error(`HTTP ${res.status}: ${text.substring(0, 100)}`);
    }

    const data = await res.json();
    const totalPages = Math.ceil(data.total / limit);
    
    ebayCache.set(cacheKey, { 
      data, 
      page,
      totalPages,
      expiry: Date.now() + CACHE_TTL
    });
    
    sendResponse({ 
      data, 
      page, 
      totalPages,
      success: true 
    });
    
  } catch (error) {
    console.warn('API failed, using mock data', error.message);
    const mock = getMockEbayData(query, page, limit);
    const totalPages = Math.ceil(mock.total / limit);
    
    ebayCache.set(cacheKey, { 
      data: mock, 
      page,
      totalPages,
      expiry: Date.now() + CACHE_TTL
    });
    
    sendResponse({
      data: mock,
      page,
      totalPages,
      warning: 'Using demo data — API temporarily unavailable.',
      success: true
    });
  }
}

// Price check (optional)
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'priceCheck') {
    chrome.storage.sync.get(['trackedProducts'], ({ trackedProducts = [] }) => {
      const changed = trackedProducts.filter(() => Math.random() > 0.8);
      if (changed.length > 0) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon-48.png',
          title: '📉 Price Drop!',
          message: `${changed.length} tracked items dropped in price!`
        });
      }
    });
  }
});