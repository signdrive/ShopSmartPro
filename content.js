// content.js - ShopSmart Pro | Refactored: Removed inline CSS
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
        setTimeout(() => {
            enhanceProductPages();
            addPriceTrackingButtons();
            addComparisonButtons();
        }, 500); // Slight delay for render

        observeDOMChanges();
        // No longer injecting styles directly, assuming CSS is linked via manifest.json
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
        enhanceProductImages();
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

// Add price history section
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
        ".s-result-item[data-asin], [data-component-type=\"s-search-result\"]"
    );

    cards.forEach(card => {
        if (card.classList.contains("ss-compare-processed")) return;

        const asin = card.getAttribute("data-asin") ||
                     card.closest("[data-asin]")?.getAttribute("data-asin");
        if (!asin) return;

        const btn = document.createElement("button");
        btn.className = "shopsmart-compare-btn";
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
        trackBtn.className = "shopsmart-track-btn";
        trackBtn.textContent = "📍 Track";

        trackBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const product = extractProductData(card, asin);
            if (product) {
                sendMessageToBackground({ action: "trackProduct", product });
                trackBtn.textContent = "✅ Tracking";
                trackBtn.disabled = true;
                trackBtn.classList.add("shopsmart-track-btn-tracked"); // Add class for tracked state
            }
        });

        const actionsContainer = card.querySelector(".a-button-stack") ||
                                 card.querySelector(".a-section") ||
                                 card;
        actionsContainer.appendChild(trackBtn);

        card.classList.add("ss-track-processed");
    });
}

// FIXED: Extract product data with better price detection
function extractProductData(card, asin) {
    // Title extraction
    let title = "";
    const titleEl = card.querySelector("h2 a span") || 
                    card.querySelector("h2 a") || 
                    card.querySelector(".a-link-normal[href*=\"/dp/\"]") ||
                    card.querySelector(".a-text-normal");
    if (titleEl) {
        title = titleEl.textContent?.trim() || "Unknown Product";
    } else {
        title = "Unknown Product";
    }

    // Price extraction - multiple strategies
    let price = 0;
    let originalPrice = 0;
    
    // Try whole price first
    const priceWholeEl = card.querySelector(".a-price-whole");
    if (priceWholeEl) {
        const priceText = priceWholeEl.textContent.replace(/[^\d.]/g, "");
        price = parseFloat(priceText) || 0;
    }
    
    // Try price range
    if (!price) {
        const priceRangeEl = card.querySelector(".a-price-range");
        if (priceRangeEl) {
            const priceText = priceRangeEl.textContent.match(/\d+\.\d{2}/);
            if (priceText) price = parseFloat(priceText[0]);
        }
    }
    
    // Try data attributes
    if (!price) {
        const priceData = card.querySelector("[data-a-price]");
        if (priceData) {
            const priceValue = priceData.getAttribute("data-a-price");
            if (priceValue) price = parseFloat(priceValue);
        }
    }
    
    // Last resort: search text content
    if (!price) {
        const cardText = card.textContent;
        const priceMatch = cardText.match(/\$\d+\.\d{2}/);
        if (priceMatch) {
            price = parseFloat(priceMatch[0].replace("$", ""));
        }
    }
    
    originalPrice = price; // Set original price to current price

    // Image extraction
    let image = "";
    const img = card.querySelector("img");
    if (img) {
        image = img.src || img.getAttribute("data-src") || img.getAttribute("data-image-src") || "";
    }

    // URL extraction
    let url = "";
    const link = card.querySelector("h2 a") || 
                 card.querySelector(".a-link-normal[href*=\"/dp/\"]") ||
                 card.querySelector("a.a-text-normal");
    if (link) {
        url = link.href || "";
        // Ensure URL is absolute
        if (url && !url.startsWith("http")) {
            url = "https://" + window.location.hostname + url;
        }
    }

    // Rating extraction
    let rating = 0;
    const ratingEl = card.querySelector(".a-icon-star-small .a-icon-alt") ||
                     card.querySelector(".a-icon-star .a-icon-alt");
    if (ratingEl) {
        const ratingText = ratingEl.textContent || "0";
        const match = ratingText.match(/(\d+(\.\d+)?)/);
        rating = match ? parseFloat(match[0]) : 0;
    }

    // Category extraction
    let category = "Uncategorized";
    const breadcrumb = document.querySelector(".a-breadcrumb li:last-child");
    if (breadcrumb) {
        category = breadcrumb.textContent?.trim() || "Uncategorized";
    }

    return {
        id: asin,
        title: title.substring(0, 200), // Limit title length
        price: price,
        originalPrice: originalPrice,
        image: image,
        url: url,
        rating: rating,
        category: category,
        trackedAt: Date.now(),
        priceHistory: [{ price: price, timestamp: Date.now() }]
    };
}

// Handle track product
function handleTrackProduct(event) {
    const button = event.target;
    const productId = button.dataset.productId;
    const productData = {
        id: productId,
        title: document.querySelector("#productTitle")?.textContent?.trim() || "Unknown Product",
        price: getCurrentPrice(),
        image: getMainImageSrc(),
        url: window.location.href,
        rating: getProductRating(),
        category: getProductCategory(),
        trackedAt: Date.now(),
        priceHistory: [{ price: getCurrentPrice(), timestamp: Date.now() }],
        originalPrice: getOriginalPrice() || getCurrentPrice()
    };

    sendMessageToBackground({ action: "trackProduct", product: productData });
    button.textContent = "✅ Tracking";
    button.disabled = true;
    button.classList.add("shopsmart-track-btn-tracked"); // Add class for tracked state
}

// Helper functions
function getProductId() {
    const match = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/);
    return match ? match[1] : null;
}

function getCurrentPrice() {
    // Try multiple price selectors
    const priceSelectors = [
        ".a-price-whole",
        ".a-price[data-a-size=\"xl\"]",
        "#priceblock_ourprice",
        "#priceblock_dealprice",
        ".a-text-price"
    ];
    
    for (const selector of priceSelectors) {
        const priceEl = document.querySelector(selector);
        if (priceEl) {
            const priceText = priceEl.textContent || "0";
            const match = priceText.match(/\d+\.\d{2}/);
            if (match) return parseFloat(match[0]);
        }
    }
    
    return 0;
}

function getOriginalPrice() {
    const priceEl = document.querySelector(".a-text-price[data-a-strike=\"true\"]");
    if (priceEl) {
        const priceText = priceEl.textContent || "0";
        const match = priceText.match(/\d+\.\d{2}/);
        if (match) return parseFloat(match[0]);
    }
    return 0;
}

function getMainImageSrc() {
    return document.querySelector("#landingImage, #imgTagWrapperId img")?.src || "";
}

function getProductRating() {
    const text = document.querySelector(".a-icon-star .a-icon-alt")?.textContent || "0";
    const match = text.match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[0]) : 0;
}

function getProductCategory() {
    const breadcrumb = document.querySelector(".a-breadcrumb li:last-child");
    return breadcrumb?.textContent?.trim() || "Uncategorized";
}

// Observe for dynamic content
function observeDOMChanges() {
    const observer = new MutationObserver(mutations => {
        let added = false;
        mutations.forEach(mutation => {
            if (mutation.addedNodes.length > 0) added = true;
        });
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

// Listen for messages
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



