// content.js - ShopSmart Pro | FINAL: Verified, No Duplicates, Full Fallback
console.log("ShopSmart Pro content script loaded");

// Prevent multiple initialization
let shopSmartInitialized = false;

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initContentScript);
} else {
    initContentScript();
}

function initContentScript() {
    if (shopSmartInitialized) return;
    shopSmartInitialized = true;

    if (!isSupportedShoppingSite()) {
        console.log("🚫 Not a supported site:", window.location.hostname);
        return;
    }

    // Only run on product listing or detail pages
    if (isSearchResultsPage() || isProductDetailPage()) {
        console.log("✅ Initializing on product page");
        // Slight delay to avoid race conditions
        setTimeout(() => {
            enhanceProductPages();
            addPriceTrackingButtons();
            addComparisonButtons();
        }, 500);

        observeDOMChanges();
    } else {
        console.log("ℹ️ Not a product page – skipping injection");
    }

    setupMessageListeners();
}

// Check if current site is supported
function isSupportedShoppingSite() {
    const hostname = window.location.hostname;
    const supportedDomains = [
        "amazon.com", "amazon.ca", "amazon.co.uk", "amazon.de", "amazon.fr",
        "amazon.it", "amazon.es", "amazon.co.jp", "amazon.com.au",
        "amazon.com.br", "amazon.com.mx", "amazon.nl"
    ];
    return supportedDomains.some(domain => hostname.includes(domain));
}

// Check if this is a search results page
function isSearchResultsPage() {
    return window.location.pathname.startsWith("/s?") ||
           window.location.search.includes("k=") ||
           document.querySelector("[data-component-type=\"s-search-result\"]");
}

// Check if this is a product detail page
function isProductDetailPage() {
    return /\/dp\/[A-Z0-9]{10}/.test(window.location.pathname);
}

// Enhance product pages
function enhanceProductPages() {
    if (isProductPage()) {
        addPriceHistorySection();
        addDealIndicators();
        addComparisonButtons();
    }
}

// Check if current page is a product page
function isProductPage() {
    const path = window.location.pathname;
    const hostname = window.location.hostname;

    if (hostname.includes("amazon.")) {
        return /\/dp\/[A-Z0-9]{10}/.test(path) || /\/gp\/product\/[A-Z0-9]{10}/.test(path);
    }

    return path.includes("/product/") || 
           path.includes("/item/") || 
           document.querySelector("[data-product-id], .product-details, .item-details");
}

// Add price history section (on detail page)
function addPriceHistorySection() {
    const productTitle = document.querySelector("#productTitle, h1");
    if (!productTitle || document.querySelector(".shopsmart-price-history")) return;

    const container = document.createElement("div");
    container.className = "shopsmart-price-history";

    const headerDiv = document.createElement("div");
    headerDiv.className = "price-history-header";

    const header = document.createElement("h3");
    header.textContent = "📊 Price History";

    const trackButton = document.createElement("button");
    trackButton.className = "track-price-btn";
    trackButton.dataset.productId = getProductId();
    trackButton.textContent = "📍 Track Price";
    trackButton.addEventListener("click", handleTrackProduct);

    headerDiv.appendChild(header);
    headerDiv.appendChild(trackButton);

    const chartContainer = document.createElement("div");
    chartContainer.className = "price-chart-container";
    chartContainer.innerHTML = "<p>Enable price tracking to see historical data</p>";

    container.appendChild(headerDiv);
    container.appendChild(chartContainer);

    productTitle.parentNode.insertBefore(container, productTitle.nextSibling);
}

// Add deal indicators
function addDealIndicators() {
    const priceEl = document.querySelector(".a-price-whole");
    if (!priceEl) return;

    const priceText = priceEl.textContent || "0";
    const price = parseFloat(priceText.replace(/[^\d.]/g, "")) || 0;
    if (price > 0 && price < 100) {
        const badge = document.createElement("span");
        badge.className = "shopsmart-deal-badge";
        badge.textContent = "🔥 Good Deal";
        priceEl.parentNode.appendChild(badge);
    }
}

// Add "Compare" buttons to product listings
function addComparisonButtons() {
    const cards = document.querySelectorAll(
        ".s-result-item[data-asin]:not(.ss-compare-processed)",
        "[data-component-type='s-search-result']:not(.ss-compare-processed)"
    );

    cards.forEach(card => {
        const asin = card.getAttribute("data-asin") ||
                     card.closest("[data-asin]")?.getAttribute("data-asin");
        if (!asin) return;

        const btn = document.createElement("button");
        btn.className = "shopsmart-compare-btn ss-compare-processed";
        btn.textContent = "🔄 Compare";

        btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const product = extractProductData(card, asin);
            if (product) {
                sendMessageToBackground({ action: "addToComparison", product });
                btn.textContent = "✅ Added";
                btn.disabled = true;
                setTimeout(() => sendMessageToBackground({ action: "openComparison" }), 800);
            }
        });

        const container = card.querySelector(".a-section") || card;
        container.appendChild(btn);

        // Mark as processed
        card.classList.add("ss-compare-processed");
    });
}

// Add "Track" buttons to product listings
function addPriceTrackingButtons() {
    const productCards = document.querySelectorAll(
        ".s-result-item[data-asin]:not(.ss-track-processed)"
    );

    productCards.forEach(card => {
        const asin = card.getAttribute("data-asin");
        if (!asin) return;

        const trackBtn = document.createElement("button");
        trackBtn.className = "shopsmart-track-btn ss-track-processed";
        trackBtn.textContent = "📍 Track";

        trackBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const product = extractProductData(card, asin);
            if (product) {
                sendMessageToBackground({ action: "trackProduct", product });
                trackBtn.textContent = "✅ Tracking";
                trackBtn.disabled = true;
                trackBtn.classList.add("shopsmart-track-btn-tracked");
            }
        });

        const actionsContainer = card.querySelector(".a-button-stack") ||
                                 card.querySelector(".a-section") ||
                                 card;
        actionsContainer.appendChild(trackBtn);

        // Mark as processed
        card.classList.add("ss-track-processed");
    });
}

// Extract product data with improved title extraction and fallback
function extractProductData(card, asin) {
    let title = "";
    
    // Try multiple selectors for product title
    const titleSelectors = [
        'h2 a span',
        '.a-size-medium',
        '.a-text-normal',
        '[data-cy="title-recipe"]',
        '.s-title-instructions-style h2',
        'h2 .a-link-normal',
        '.a-size-base-plus'
    ];
    
    for (const selector of titleSelectors) {
        const titleEl = card.querySelector(selector);
        if (titleEl && titleEl.textContent.trim()) {
            title = titleEl.textContent.trim();
            break;
        }
    }
    
    if (!title) {
        const possibleTitleElements = card.querySelectorAll('h2, h3, .a-size-base-plus, .a-text-normal');
        for (const el of possibleTitleElements) {
            if (el.textContent.trim().length > 10) {
                title = el.textContent.trim();
                break;
            }
        }
    }
    
    if (!title) {
        title = "Unknown Product";
    }

    // Price extraction
    let price = 0;
    const priceSelectors = [
        '.a-price-whole',
        '.a-price[data-a-size="xl"]',
        '[data-a-price]',
        '.a-price-range',
        '.a-text-price',
        '.a-color-price'
    ];
    
    for (const selector of priceSelectors) {
        const priceEl = card.querySelector(selector);
        if (priceEl) {
            const priceText = priceEl.textContent || priceEl.getAttribute('data-a-price') || '0';
            const priceMatch = priceText.match(/\d+\.\d{2}/) || priceText.match(/\d+/);
            if (priceMatch) {
                price = parseFloat(priceMatch[0]);
                break;
            }
        }
    }

    // Image extraction
    let image = "";
    const imgSelectors = [
        'img',
        '[data-image-load]',
        '[data-old-hires]',
        '.s-image'
    ];
    
    for (const selector of imgSelectors) {
        const img = card.querySelector(selector);
        if (img) {
            image = img.src || img.getAttribute('data-src') || img.getAttribute('data-image-src') || '';
            if (image) break;
        }
    }

    // ✅ FALLBACK TO LOCAL PLACEHOLDER
    if (!image || image.trim() === "") {
        image = chrome.runtime.getURL("img/ebay/placeholder.png");
    }

    // URL extraction
    let url = "";
    const linkSelectors = [
        'h2 a',
        '.a-link-normal[href*="/dp/"]',
        'a.a-text-normal',
        '.a-size-base-plus a'
    ];
    
    for (const selector of linkSelectors) {
        const link = card.querySelector(selector);
        if (link && link.href) {
            url = link.href.startsWith('http') ? link.href : `https://${window.location.hostname}${link.href}`;
            break;
        }
    }

    // Rating extraction
    let rating = 0;
    const ratingEl = card.querySelector('.a-icon-star-small .a-icon-alt') ||
                     card.querySelector('.a-icon-star .a-icon-alt');
    if (ratingEl) {
        const match = (ratingEl.textContent || '').match(/(\d+(\.\d+)?)/);
        rating = match ? parseFloat(match[0]) : 0;
    }

    // Category extraction
    let category = "Uncategorized";
    const breadcrumb = document.querySelector('.a-breadcrumb li:last-child');
    if (breadcrumb) {
        category = breadcrumb.textContent.trim() || 'Uncategorized';
    }

    return {
        id: asin,
        title: title.substring(0, 200),
        price: price,
        originalPrice: price,
        image: image,
        url: url,
        rating: rating,
        category: category,
        trackedAt: Date.now(),
        priceHistory: [{ price: price, timestamp: Date.now() }]
    };
}

// Handle track product on detail page
function handleTrackProduct(event) {
    const button = event.target;
    const productId = button.dataset.productId;
    
    let productTitle = document.querySelector('#productTitle')?.textContent?.trim();
    if (!productTitle) {
        productTitle = document.querySelector('h1')?.textContent?.trim() || "Unknown Product";
    }
    
    const productData = {
        id: productId,
        title: productTitle,
        price: getCurrentPrice(),
        image: getMainImageSrc(),
        url: window.location.href,
        rating: getProductRating(),
        category: getProductCategory(),
        trackedAt: Date.now(),
        priceHistory: [{ price: getCurrentPrice(), timestamp: Date.now() }],
        originalPrice: getOriginalPrice() || getCurrentPrice()
    };

    // ✅ FALLBACK TO PLACEHOLDER
    if (!productData.image || productData.image.trim() === "") {
        productData.image = chrome.runtime.getURL("img/ebay/placeholder.png");
    }

    sendMessageToBackground({ action: "trackProduct", product: productData });
    button.textContent = "✅ Tracking";
    button.disabled = true;
    button.classList.add("shopsmart-track-btn-tracked");
}

// Helper functions
function getProductId() {
    const match = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/);
    return match ? match[1] : null;
}

function getCurrentPrice() {
    const priceSelectors = [
        '.a-price-whole',
        '.a-price[data-a-size="xl"]',
        '#priceblock_ourprice',
        '#priceblock_dealprice',
        '.a-text-price',
        '.a-color-price',
        '[data-a-price]'
    ];
    
    for (const selector of priceSelectors) {
        const priceEl = document.querySelector(selector);
        if (priceEl) {
            const priceText = priceEl.textContent || priceEl.getAttribute('data-a-price') || '0';
            const match = priceText.match(/\d+\.\d{2}/) || priceText.match(/\d+/);
            if (match) return parseFloat(match[0]);
        }
    }
    
    return 0;
}

function getOriginalPrice() {
    const priceEl = document.querySelector('.a-text-price[data-a-strike="true"]');
    if (priceEl) {
        const priceText = priceEl.textContent || '0';
        const match = priceText.match(/\d+\.\d{2}/);
        if (match) return parseFloat(match[0]);
    }
    return 0;
}

function getMainImageSrc() {
    const imgSelectors = [
        '#landingImage',
        '#imgTagWrapperId img',
        '[data-old-hires]',
        '.a-dynamic-image'
    ];
    
    for (const selector of imgSelectors) {
        const img = document.querySelector(selector);
        if (img) {
            return img.src || img.getAttribute('data-old-hires') || '';
        }
    }
    
    return chrome.runtime.getURL("img/ebay/placeholder.png");
}

function getProductRating() {
    const ratingSelectors = [
        '.a-icon-star .a-icon-alt',
        '.a-icon-star-small .a-icon-alt',
        '[data-hook="average-star-rating"]',
        '.a-size-base'
    ];
    
    for (const selector of ratingSelectors) {
        const text = document.querySelector(selector)?.textContent || '0';
        const match = text.match(/(\d+(\.\d+)?)/);
        if (match) return parseFloat(match[0]);
    }
    
    return 0;
}

function getProductCategory() {
    const breadcrumb = document.querySelector('.a-breadcrumb li:last-child');
    return breadcrumb?.textContent?.trim() || 'Uncategorized';
}

// Observe for dynamic content (e.g., infinite scroll)
function observeDOMChanges() {
    const observer = new MutationObserver(mutations => {
        let added = false;
        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                added = true;
                break;
            }
        }
        if (added) {
            setTimeout(() => {
                if (isSearchResultsPage()) {
                    addPriceTrackingButtons();
                    addComparisonButtons();
                }
            }, 600);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// Listen for messages from background/popup
function setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "getProductData") {
            sendResponse({
                productData: extractProductData(document.body, getProductId()),
                pageUrl: window.location.href
            });
        } else if (request.action === "enhancePage") {
            enhanceProductPages();
            sendResponse({ status: "enhanced" });
        } else {
            sendResponse({ status: "unknown_action" });
        }
        return true;
    });
}

// Send message to background
function sendMessageToBackground(message) {
    chrome.runtime.sendMessage(message, () => {
        if (chrome.runtime.lastError) {
            console.warn("Message send failed:", chrome.runtime.lastError.message);
        }
    });
}