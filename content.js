// Content script for ShopSmart Pro - enhances shopping experience
console.log('ShopSmart Pro content script loaded');

// Main initialization
(function() {
    // Wait for page to load completely
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initContentScript);
    } else {
        initContentScript();
    }
})();

function initContentScript() {
    console.log('Initializing ShopSmart Pro content features');
    
    // Check if this is a supported shopping site
    if (!isSupportedShoppingSite()) {
        return;
    }
    
    // Enhance product pages
    enhanceProductPages();
    
    // Add price tracking buttons
    addPriceTrackingButtons();
    
    // Monitor for dynamic content changes
    observeDOMChanges();
    
    // Listen for messages from background/popup
    setupMessageListeners();
}

// Check if current site is supported
function isSupportedShoppingSite() {
    const hostname = window.location.hostname;
    
    // Support various shopping sites
    const supportedDomains = [
        'amazon.com', 'amazon.ca', 'amazon.co.uk', 'amazon.de', 'amazon.fr',
        'amazon.it', 'amazon.es', 'amazon.co.jp', 'amazon.com.au', 
        'amazon.com.br', 'amazon.com.mx', 'amazon.nl',
        // Add other supported shopping sites here
        'walmart.com', 'bestbuy.com', 'ebay.com'
    ];
    
    return supportedDomains.some(domain => hostname.includes(domain));
}

// Enhance product pages with additional features
function enhanceProductPages() {
    if (isProductPage()) {
        console.log('Enhancing product page features');
        
        // Add price history chart container
        addPriceHistorySection();
        
        // Add deal indicators
        addDealIndicators();
        
        // Add product comparison buttons
        addComparisonButtons();
        
        // Enhance product images
        enhanceProductImages();
    }
}

// Check if current page is a product page
function isProductPage() {
    const path = window.location.pathname;
    const hostname = window.location.hostname;
    
    // Generic product page detection
    if (hostname.includes('amazon.')) {
        return /\/dp\/[A-Z0-9]{10}/.test(path) || /\/gp\/product\/[A-Z0-9]{10}/.test(path);
    }
    
    // Generic detection for other sites
    return path.includes('/product/') || 
           path.includes('/item/') || 
           document.querySelector('[data-product-id], .product-details, .item-details');
}

// Add price history section to product pages
function addPriceHistorySection() {
    const productTitle = document.querySelector('#productTitle, .product-title, h1[data-product-name]');
    if (!productTitle) return;
    
    const container = document.createElement('div');
    container.className = 'shopsmart-price-history';
    
    // Create elements safely instead of using innerHTML
    const headerDiv = document.createElement('div');
    headerDiv.className = 'price-history-header';
    
    const header = document.createElement('h3');
    header.textContent = '📊 Price History';
    
    const trackButton = document.createElement('button');
    trackButton.className = 'track-price-btn';
    trackButton.dataset.productId = getProductId();
    trackButton.textContent = '📍 Track Price';
    
    headerDiv.appendChild(header);
    headerDiv.appendChild(trackButton);
    
    const chartContainer = document.createElement('div');
    chartContainer.className = 'price-chart-container';
    
    const chartText = document.createElement('p');
    chartText.textContent = 'Enable price tracking to see historical data';
    chartContainer.appendChild(chartText);
    
    container.appendChild(headerDiv);
    container.appendChild(chartContainer);
    
    // Insert after product title
    productTitle.parentNode.insertBefore(container, productTitle.nextSibling);
    
    // Add event listener to track button
    trackButton.addEventListener('click', handleTrackProduct);
    
    // Inject styles
    injectStyles();
}

// Add deal indicators to product pages
function addDealIndicators() {
    const priceElement = document.querySelector('.a-price-whole, .price-characteristic, .product-price');
    if (!priceElement) return;
    
    // Check if this looks like a deal
    const price = parseFloat(priceElement.textContent.replace(/[^\d.]/g, ''));
    if (price && price < 100) { // Arbitrary threshold for demo
        const dealBadge = document.createElement('span');
        dealBadge.className = 'shopsmart-deal-badge';
        dealBadge.textContent = '🔥 Good Deal';
        dealBadge.style.cssText = `
            background: #dc3545;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            margin-left: 10px;
            font-weight: bold;
        `;
        
        priceElement.parentNode.appendChild(dealBadge);
    }
}

// Add comparison buttons to product listings
function addComparisonButtons() {
    const productCards = document.querySelectorAll('.s-result-item, .product-card, .search-result-item');
    
    productCards.forEach((card, index) => {
        if (card.querySelector('.shopsmart-compare-btn')) return;
        
        const compareBtn = document.createElement('button');
        compareBtn.className = 'shopsmart-compare-btn';
        compareBtn.textContent = '🔄 Compare';
        compareBtn.style.cssText = `
            background: #28a745;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            margin-top: 8px;
        `;
        
        compareBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            handleAddToComparison(card);
        });
        
        const actionsDiv = card.querySelector('.a-section, .product-actions, .card-actions') || card;
        actionsDiv.appendChild(compareBtn);
    });
}

// Enhance product images with zoom and gallery features
function enhanceProductImages() {
    const mainImage = document.querySelector('#landingImage, .product-image, .main-image');
    if (mainImage) {
        mainImage.style.cursor = 'zoom-in';
        mainImage.addEventListener('click', function() {
            this.style.transform = this.style.transform === 'scale(1.5)' ? 'scale(1)' : 'scale(1.5)';
            this.style.transition = 'transform 0.3s ease';
        });
    }
}

// Add price tracking buttons to search results
function addPriceTrackingButtons() {
    const priceElements = document.querySelectorAll('.a-price, .price-tag, .product-price');
    
    priceElements.forEach(priceEl => {
        if (priceEl.querySelector('.shopsmart-track-btn')) return;
        
        const trackBtn = document.createElement('button');
        trackBtn.className = 'shopsmart-track-btn';
        trackBtn.textContent = '📍 Track';
        trackBtn.style.cssText = `
            background: #17a2b8;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 11px;
            cursor: pointer;
            margin-left: 8px;
        `;
        
        trackBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            handleTrackProductFromButton(this);
        });
        
        priceEl.parentNode.appendChild(trackBtn);
    });
}

// Handle track product button click
function handleTrackProductFromButton(button) {
    const productCard = button.closest('.s-result-item, .product-card, .search-result-item');
    if (!productCard) return;
    
    const productData = extractProductData(productCard);
    if (productData) {
        sendMessageToBackground({
            action: 'trackProduct',
            product: productData
        });
        
        button.textContent = '✅ Tracking';
        button.disabled = true;
    }
}

// Handle track product from detail page
function handleTrackProduct(event) {
    const button = event.target;
    const productId = button.dataset.productId;
    
    const productData = {
        id: productId,
        title: getProductTitle(),
        price: getCurrentPrice(),
        image: getProductImage(),
        url: window.location.href,
        rating: getProductRating()
    };
    
    sendMessageToBackground({
        action: 'trackProduct',
        product: productData
    });
    
    button.textContent = '✅ Tracking';
    button.disabled = true;
}

// Handle add to comparison
function handleAddToComparison(productCard) {
    const productData = extractProductData(productCard);
    if (productData) {
        sendMessageToBackground({
            action: 'addToComparison',
            product: productData
        });
        
        // Visual feedback
        const button = productCard.querySelector('.shopsmart-compare-btn');
        if (button) {
            const originalText = button.textContent;
            button.textContent = '✅ Added';
            button.disabled = true;
            
            setTimeout(() => {
                button.textContent = originalText;
                button.disabled = false;
            }, 2000);
        }
    }
}

// Extract product data from card
function extractProductData(card) {
    try {
        return {
            id: getProductIdFromCard(card),
            title: getProductTitleFromCard(card),
            price: getPriceFromCard(card),
            image: getImageFromCard(card),
            url: getUrlFromCard(card),
            rating: getRatingFromCard(card)
        };
    } catch (error) {
        console.error('Error extracting product data:', error);
        return null;
    }
}

// Helper functions for data extraction
function getProductIdFromCard(card) {
    return card.dataset.asin || 
           card.id || 
           Math.random().toString(36).substr(2, 9);
}

function getProductTitleFromCard(card) {
    return card.querySelector('h2, .product-title, [data-cy="title"]')?.textContent?.trim() || 
           'Unknown Product';
}

function getPriceFromCard(card) {
    const priceText = card.querySelector('.a-price-whole, .price, .product-price')?.textContent;
    return priceText ? parseFloat(priceText.replace(/[^\d.]/g, '')) : 0;
}

function getImageFromCard(card) {
    return card.querySelector('img, [data-image]')?.src || '';
}

function getUrlFromCard(card) {
    return card.querySelector('a, [href]')?.href || window.location.href;
}

function getRatingFromCard(card) {
    const ratingText = card.querySelector('.a-icon-star, .rating, .product-rating')?.textContent;
    return ratingText ? parseFloat(ratingText) : 0;
}

function getProductId() {
    const urlMatch = window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/);
    return urlMatch ? urlMatch[1] : Math.random().toString(36).substr(2, 9);
}

function getProductTitle() {
    return document.querySelector('#productTitle, h1, title')?.textContent?.trim() || 'Unknown Product';
}

function getCurrentPrice() {
    const priceText = document.querySelector('.a-price-whole, .price, .product-price')?.textContent;
    return priceText ? parseFloat(priceText.replace(/[^\d.]/g, '')) : 0;
}

function getProductImage() {
    return document.querySelector('#landingImage, .product-image, img')?.src || '';
}

function getProductRating() {
    const ratingText = document.querySelector('.a-icon-star, .rating, .product-rating')?.textContent;
    return ratingText ? parseFloat(ratingText) : 0;
}

// Observe DOM changes for dynamic content
function observeDOMChanges() {
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length) {
                // Re-run enhancements when new content is added
                setTimeout(() => {
                    addPriceTrackingButtons();
                    addComparisonButtons();
                }, 1000);
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Setup message listeners
function setupMessageListeners() {
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        switch (request.action) {
            case 'getProductData':
                sendResponse({
                    productData: extractProductData(document.body),
                    pageUrl: window.location.href
                });
                break;
                
            case 'enhancePage':
                enhanceProductPages();
                sendResponse({ status: 'enhanced' });
                break;
                
            default:
                sendResponse({ status: 'unknown_action' });
        }
        return true;
    });
}

// Send message to background script
function sendMessageToBackground(message) {
    chrome.runtime.sendMessage(message, function(response) {
        if (chrome.runtime.lastError) {
            console.log('Message failed:', chrome.runtime.lastError);
        }
    });
}

// Inject custom styles
function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .shopsmart-price-history {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            background: #f8f9fa;
        }
        
        .price-history-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .price-history-header h3 {
            margin: 0;
            color: #333;
        }
        
        .track-price-btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .track-price-btn:disabled {
            background: #28a745;
            cursor: not-allowed;
        }
        
        .price-chart-container {
            min-height: 100px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: white;
            border-radius: 4px;
            padding: 20px;
        }
        
        .shopsmart-deal-badge {
            background: #dc3545;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            margin-left: 10px;
            font-weight: bold;
        }
        
        .shopsmart-compare-btn:hover,
        .shopsmart-track-btn:hover,
        .track-price-btn:hover:not(:disabled) {
            opacity: 0.9;
            transform: translateY(-1px);
        }
    `;
    
    document.head.appendChild(style);
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isSupportedShoppingSite,
        isProductPage,
        extractProductData,
        enhanceProductPages
    };
}