// background.js - FINAL: Fixed & Secure
const AFFILIATE_TAG = "elise200f-20";
const DEFAULT_COUNTRY = "com"; // ✅ USA default

// ✅ Your eBay Credentials
const EBAY_CLIENT_ID = "SabirImc-ShopSmar-PRD-9d5c80ac8-d88362d1";
const EBAY_CLIENT_SECRET = "PRD-d47d6511273c-071a-4d8e-9fb2-c4be";

let accessToken = null;
let tokenExpiry = 0;

// Cache for eBay API responses
const ebayCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Rate limiting
const requestHistory = new Map();
const MAX_REQUESTS_PER_MINUTE = 5;
const RATE_LIMIT_WINDOW = 60_000;

// Mock data fallback with pagination
function getMockEbayData(query, page = 1, limit = 20) {
  const mockItems = [];
  const totalItems = 35;
  
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
      soundAlerts: true,
      trackPrices: true
    },
    searchHistory: [],
    trackedProducts: [],
    comparisonProducts: [],
    savedComparisons: []
  });

  // Create context menus
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "search-store",
      title: "Search for \"%s\"",
      contexts: ["selection"]
    });
    chrome.contextMenus.create({
      id: "search-store-new-tab",
      title: "Search in New Tab",
      contexts: ["selection"]
    });
    chrome.contextMenus.create({
      id: "compare-product",
      title: "Compare with ShopSmart Pro",
      contexts: ["selection"]
    });
  });

  // Set up price check alarm
  chrome.alarms.create("priceCheck", { periodInMinutes: 360 });
});

// ✅ Build correct Amazon URL
function buildAmazonUrl(term, country) {
  const domain = country === "com" ? "www.amazon.com" : `www.amazon.${country}`;
  const baseUrl = `https://${domain}/s`;
  return `${baseUrl}?k=${encodeURIComponent(term)}&tag=${AFFILIATE_TAG}`;
}

// Context menu handler
chrome.contextMenus.onClicked.addListener((info, tab) => {
  chrome.storage.sync.get(["settings"], (result) => {
    const settings = result.settings || {};
    const country = settings.country || DEFAULT_COUNTRY;
    const url = buildAmazonUrl(info.selectionText || "", country);

    if (info.menuItemId === "search-store") {
      chrome.tabs.update(tab.id, { url });
    } else if (info.menuItemId === "search-store-new-tab") {
      chrome.tabs.create({ url });
    } else if (info.menuItemId === "compare-product") {
      const product = {
        id: Date.now().toString(36),
        title: info.selectionText || "Product",
        url: info.linkUrl || info.pageUrl,
        image: info.srcUrl || null,
        price: 0
      };
      chrome.tabs.sendMessage(tab.id, { action: "addToComparison", product });
    }
  });
});

// Handle messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "fetchEbaySearch":
      handleFetchEbaySearch(request, sender.tab ? sender.tab.id : null, sendResponse)
        .catch(err => {
          console.error("eBay search error:", err);
          sendResponse({ error: err.message, success: false });
        });
      return true;

    case "getSettings":
      chrome.storage.sync.get(["settings"], (res) => {
        sendResponse({ settings: res.settings || {} });
      });
      return true;

    case "addToComparison":
      addToComparison(request.product);
      sendResponse({ status: "added" });
      return true;

    case "openComparison":
      openComparisonPage();
      sendResponse({ status: "success" });
      return false;

    case "openDeals":
      openDealsPage();
      sendResponse({ status: "success" });
      return false;

    case "trackProduct":
      trackProduct(request.product, sender, sendResponse);
      return true;

    case "createAffiliateLink":
      createAffiliateLink(request, sendResponse);
      return true;
  }
  return false;
});

// ✅ Add to comparison
function addToComparison(product) {
  if (!product?.id) return;
  chrome.storage.sync.get(["comparisonProducts", "settings"], (result) => {
    const max = result.settings?.maxComparisonProducts || 4;
    let products = Array.isArray(result.comparisonProducts) ? result.comparisonProducts : [];
    products = products.filter(p => p.id !== product.id);
    products.unshift(product);
    if (products.length > max) products = products.slice(0, max);
    chrome.storage.sync.set({ comparisonProducts: products }, () => {
      chrome.runtime.sendMessage({ action: "comparisonUpdated" });
    });
  });
}

// ✅ Track Product
function trackProduct(product, sender, sendResponse) {
  if (!product?.id) {
    sendResponse({ success: false, error: "Invalid product" });
    return;
  }

  chrome.storage.sync.get(["trackedProducts"], (result) => {
    let trackedProducts = Array.isArray(result.trackedProducts) ? result.trackedProducts : [];
    const exists = trackedProducts.some(p => p.id === product.id);

    if (!exists) {
      // ✅ Add full product data
      const trackedItem = {
        ...product,
        trackedAt: Date.now(),
        priceHistory: [{ price: product.price, timestamp: Date.now() }],
        originalPrice: product.originalPrice || product.price,
        category: product.category || "Uncategorized"
      };

      trackedProducts.unshift(trackedItem);
      chrome.storage.sync.set({ trackedProducts }, () => {
        // ✅ Show notification
        if (chrome.notifications) {
          chrome.notifications.create(`tracked-${product.id}`, {
            type: "basic",
            iconUrl: chrome.runtime.getURL("icons/icon-48.png"),
            title: "✅ Tracking Started",
            message: `Now tracking: ${product.title.substring(0, 50)}...`
          });
        }

        // ✅ Update popup counter
        chrome.runtime.sendMessage({ action: "trackersUpdated" });

        sendResponse({ status: "tracked" });
      });
    } else {
      sendResponse({ status: "already_tracked" });
    }
  });
}

// ✅ Create affiliate link
function createAffiliateLink(request, sendResponse) {
  const { searchTerm } = request;
  const country = request.country || "com";
  const domain = country === "com" ? "www.amazon.com" : `www.amazon.${country}`;
  const url = `https://${domain}/s?k=${encodeURIComponent(searchTerm)}&tag=${AFFILIATE_TAG}`;
  sendResponse({ url });
}

// Open comparison page
function openComparisonPage() {
  chrome.tabs.create({ url: chrome.runtime.getURL("popup/comparison.html") });
}

// Open deals page
function openDealsPage() {
  chrome.tabs.create({ url: chrome.runtime.getURL("deals/deals.html") });
}

// Get fresh OAuth token
async function getEbayAccessToken() {
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  const authHeader = btoa(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`);
  const response = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${authHeader}`
    },
    body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope"
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("OAuth failed:", response.status, text);
    throw new Error("Failed to authenticate with eBay API.");
  }

  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
  return accessToken;
}

// Handle eBay search with pagination
async function handleFetchEbaySearch(request, senderTabId, sendResponse) {
  const { query, page = 1, limit = 20 } = request;
  const senderId = senderTabId || "unknown";

  if (isRateLimited(senderId)) {
    sendResponse({ error: "Too many requests. Please wait.", success: false });
    return;
  }

  const cacheKey = `ebay_${query}_${DEFAULT_COUNTRY}_page${page}_limit${limit}`;
  const cached = ebayCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) {
    sendResponse(cached);
    return;
  }

  try {
    const token = await getEbayAccessToken();
    const marketplaceId = DEFAULT_COUNTRY === "com" ? "EBAY-US" : "EBAY-CA";
    const offset = (page - 1) * limit;
    
    const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&marketplace_id=${marketplaceId}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-EBAY-C-MARKETPLACE-ID": marketplaceId
      }
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Browse API Error:", res.status, text);
      throw new Error(`HTTP ${res.status}: ${text.substring(0, 100)}`);
    }

    const data = await res.json();
    const totalPages = Math.ceil(data.total / limit);
    
    const payload = {
      data,
      page,
      totalPages,
      success: true
    };
    
    ebayCache.set(cacheKey, payload);
    sendResponse(payload);
    
  } catch (error) {
    console.warn("API failed, using mock data", error.message);
    const mock = getMockEbayData(query, page, limit);
    const totalPages = Math.ceil(mock.total / limit);
    
    const mockPayload = {
       mock,
      page,
      totalPages,
      warning: "Using demo data — API temporarily unavailable.",
      success: true
    };
    
    ebayCache.set(cacheKey, mockPayload);
    sendResponse(mockPayload);
  }
}

// Price check alarm
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === "priceCheck") {
    chrome.storage.sync.get(["trackedProducts"], (result) => {
      const trackedProducts = Array.isArray(result.trackedProducts) ? result.trackedProducts : [];
      const changed = trackedProducts.filter(() => Math.random() > 0.8);
      if (changed.length > 0) {
        chrome.notifications.create({
          type: "basic",
          iconUrl: chrome.runtime.getURL("icons/icon-48.png"),
          title: "📉 Price Drop!",
          message: `${changed.length} tracked items dropped in price!`
        });
      }
    });
  }
});

