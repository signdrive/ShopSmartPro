// content.js - ShopSmart Pro | FINAL FIXED VERSION
console.log('ShopSmart Pro content script loaded');

// Prevent multiple initialization
let shopSmartInitialized = false;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContentScript);
} else {
    initContentScript();
}

function initContentScript() {
    if (shopSmartInitialized) return;
    shopSmartInitialized = true;

    if (!isSupportedShoppingSite()) {
        console.log('🚫 Not a supported site:', window.location.hostname);
        return;
    }

    // Only run on product listing or detail pages
    if (isSearchResultsPage() || isProductDetailPage()) {
        console.log('✅ Initializing on product page');
        setTimeout(() => {
            enhanceProductPages();
            addPriceTrackingButtons();
            addComparisonButtons();
        }, 1000); // Wait for render

        observeDOMChanges();
        injectStyles();
    } else {
        console.log('ℹ️ Not a product page – skipping injection');
    }

    setupMessageListeners();
}

// Check if current site is supported
function isSupportedShoppingSite() {
    const hostname = window.location.hostname;
    const supportedDomains = [
        'amazon.com', 'amazon.ca', 'amazon.co.uk', 'amazon.de', 'amazon.fr',
        'amazon.it', 'amazon.es', 'amazon.co.jp', 'amazon.com.au',
        'amazon.com.br', 'amazon.com.mx', 'amazon.nl'
    ];
    return supportedDomains.some(domain => hostname.includes(domain));
}

// Check if this is a search results page
function isSearchResultsPage() {
    return window.location.pathname.startsWith('/s?') ||
           window.location.search.includes('k=') ||
           document.querySelector('[data-component-type="s-search-result"]');
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
        addComparisonButtons(); // Also call here for detail page
        enhanceProductImages();
    }
}

// Check if current page is a product page
function isProductPage() {
    const path = window.location.pathname;
    const hostname = window.location.hostname;

    if (hostname.includes('amazon.')) {
        return /\/dp\/[A-Z0-9]{10}/.test(path) || /\/gp\/product\/[A-Z0-9]{10}/.test(path);
    }

    return path.includes('/product/') || 
           path.includes('/item/') || 
           document.querySelector('[data-product-id], .product-details, .item-details');
}

// Add price history section
function addPriceHistorySection() {
    const productTitle = document.querySelector('#productTitle, h1');
    if (!productTitle || document.querySelector('.shopsmart-price-history')) return;

    const container = document.createElement('div');
    container.className = 'shopsmart-price-history';

    const headerDiv = document.createElement('div');
    headerDiv.className = 'price-history-header';

    const header = document.createElement('h3');
    header.textContent = '📊 Price History';

    const trackButton = document.createElement('button');
    trackButton.className = 'track-price-btn';
    trackButton.dataset.productId = getProductId();
    trackButton.textContent = '📍 Track Price';
    trackButton.addEventListener('click', handleTrackProduct);

    headerDiv.appendChild(header);
    headerDiv.appendChild(trackButton);

    const chartContainer = document.createElement('div');
    chartContainer.className = 'price-chart-container';
    chartContainer.innerHTML = '<p>Enable price tracking to see historical data</p>';

    container.appendChild(headerDiv);
    container.appendChild(chartContainer);

    productTitle.parentNode.insertBefore(container, productTitle.nextSibling);
}

// Add deal indicators
function addDealIndicators() {
    const priceEl = document.querySelector('.a-price-whole');
    if (!priceEl) return;

    const priceText = priceEl.textContent || '0';
    const price = parseFloat(priceText.replace(/[^\d.]/g, '')) || 0;
    if (price > 0 && price < 100) {
        const badge = document.createElement('span');
        badge.className = 'shopsmart-deal-badge';
        badge.textContent = '🔥 Good Deal';
        badge.style.cssText = `
            background: #dc3545; color: white; padding: 4px 8px;
            border-radius: 4px; font-size: 12px; margin-left: 10px; font-weight: bold;
        `;
        priceEl.parentNode.appendChild(badge);
    }
}

// Add "Compare" buttons to product listings
function addComparisonButtons() {
    const cards = document.querySelectorAll(
        '.s-result-item[data-asin], [data-component-type="s-search-result"], .puisg-col, .sg-col-20-of-24'
    );

    cards.forEach(card => {
        const asin = card.getAttribute('data-asin') ||
                     card.closest('[data-asin]')?.getAttribute('data-asin');
        if (!asin || card.querySelector('.shopsmart-compare-btn')) return;

        const btn = document.createElement('button');
        btn.className = 'shopsmart-compare-btn';
        btn.textContent = '🔄 Compare';
        btn.style.cssText = `
            background: #28a745; color: white; border: none; padding: 6px 10px;
            border-radius: 4px; font-size: 12px; cursor: pointer; margin: 8px auto;
            display: block; width: 80%; text-align: center;
        `;

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const product = extractProductData(card, asin);
            if (product) {
                sendMessageToBackground({ action: 'addToComparison', product });
                btn.textContent = '✅ Added';
                btn.disabled = true;
                setTimeout(() => sendMessageToBackground({ action: 'openComparison' }), 800);
            }
        });

        const container = card.querySelector('.a-section') || card;
        container.appendChild(btn);
    });
}

// Add "Track" buttons to price elements
function addPriceTrackingButtons() {
    const prices = document.querySelectorAll('.a-price, .a-offscreen + .a-price');

    prices.forEach(priceEl => {
        if (priceEl.querySelector('.shopsmart-track-btn')) return;

        const trackBtn = document.createElement('button');
        trackBtn.className = 'shopsmart-track-btn';
        trackBtn.textContent = '📍 Track';
        trackBtn.style.cssText = `
            background: #007bff; color: white; border: none; padding: 4px 8px;
            border-radius: 3px; font-size: 11px; cursor: pointer; margin-left: 6px;
        `;

        const card = priceEl.closest('.s-result-item[data-asin]') || priceEl.closest('[data-asin]');
        const asin = card ? card.getAttribute('data-asin') : null;
        if (!asin) return;

        trackBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const product = extractProductData(card, asin);
            if (product) {
                sendMessageToBackground({ action: 'trackProduct', product });
                trackBtn.textContent = '✅ Tracking';
                trackBtn.disabled = true;
                trackBtn.style.background = '#28a745';
            }
        });

        priceEl.appendChild(trackBtn);
    });
}

// Extract product data
function extractProductData(card, asin) {
    const titleEl = card.querySelector('h2 a') || card.querySelector('.a-link-normal');
    const title = titleEl?.textContent?.trim() || 'Unknown Product';

    const priceEl = card.querySelector('.a-price-whole');
    const priceText = priceEl?.textContent || '0';
    const price = parseFloat(priceText.replace(/[^\d.]/g, '')) || 0;

    const image = card.querySelector('img')?.src || '';
    const url = card.querySelector('a')?.href || window.location.href;

    const ratingEl = card.querySelector('.a-icon-star .a-icon-alt');
    const ratingText = ratingEl?.textContent || '0';
    const rating = parseFloat(ratingText) || 0;

    return {
        id: asin,
        title,
        price,
        image,
        url,
        rating
    };
}

// Handle track product
function handleTrackProduct(event) {
    const button = event.target;
    const productId = button.dataset.productId;
    const productData = {
        id: productId,
        title: document.querySelector('#productTitle')?.textContent?.trim() || 'Unknown Product',
        price: getCurrentPrice(),
        image: document.querySelector('#landingImage')?.src || '',
        url: window.location.href,
        rating: getProductRating()
    };

    sendMessageToBackground({ action: 'trackProduct', product: productData });
    button.textContent = '✅ Tracking';
    button.disabled = true;
}

// Helper functions
function getProductId() {
    const match = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/);
    return match ? match[1] : null;
}

function getCurrentPrice() {
    return parseFloat(document.querySelector('.a-price-whole')?.textContent || '0') || 0;
}

function getProductRating() {
    const text = document.querySelector('.a-icon-star .a-icon-alt')?.textContent || '0';
    return parseFloat(text) || 0;
}

// Observe for dynamic content
function observeDOMChanges() {
    const observer = new MutationObserver(() => {
        setTimeout(() => {
            if (isSearchResultsPage()) {
                addPriceTrackingButtons();
                addComparisonButtons();
            }
        }, 800);
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// Listen for messages
function setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'getProductData') {
            sendResponse({
                productData: extractProductData(document.body, getProductId()),
                pageUrl: window.location.href
            });
        } else if (request.action === 'enhancePage') {
            enhanceProductPages();
            sendResponse({ status: 'enhanced' });
        } else {
            sendResponse({ status: 'unknown_action' });
        }
        return true;
    });
}

// Send message to background
function sendMessageToBackground(message) {
    chrome.runtime.sendMessage(message, () => {
        if (chrome.runtime.lastError) {
            console.warn('Message send failed:', chrome.runtime.lastError.message);
        }
    });
}

// Inject styles
function injectStyles() {
    if (document.head.querySelector('#shopsmart-styles')) return;
    const style = document.createElement('style');
    style.id = 'shopsmart-styles';
    style.textContent = `
        .shopsmart-compare-btn:hover, .shopsmart-track-btn:hover {
            opacity: 0.9; transform: scale(1.02);
        }
        .shopsmart-compare-btn:disabled, .shopsmart-track-btn:disabled {
            opacity: 0.6; cursor: not-allowed;
        }
    `;
    document.head.appendChild(style);
}