// utils/priceTracker.js

class PriceTracker {
    constructor() {
        this.trackedItems = new Map();
        this.loadTrackedItems()
            .then(() => this.startTracking())
            .catch(error =>
                console.error('Failed to initialize PriceTracker:', error)
            );
    }

    async loadTrackedItems() {
        try {
            const result = await chrome.storage.sync.get(['trackedItems']);
            
            // ✅ Handle missing or invalid data
            if (!result || !result.trackedItems || !Array.isArray(result.trackedItems)) {
                this.trackedItems = new Map();
                
                return;
            }

            const entries = result.trackedItems;
            const validEntries = [];

            for (const entry of entries) {
                if (Array.isArray(entry) && entry.length === 2) {
                    const [productId, trackInfo] = entry;
                    // Validate required fields
                    if (typeof trackInfo === 'object' && trackInfo.url && trackInfo.targetPrice !== undefined) {
                        validEntries.push(entry);
                    }
                }
            }

            this.trackedItems = new Map(validEntries);
            console.debug(`Loaded ${this.trackedItems.size} tracked items.`);
        } catch (error) {
            console.error('Error loading tracked items from storage:', error);
            this.trackedItems = new Map(); // fallback
            // Optionally notify user
            this.showNotification('Price tracking failed to load.', 'warning');
        }
    }

    async saveTrackedItems() {
        try {
            const serialized = Array.from(this.trackedItems.entries());
            await chrome.storage.sync.set({ trackedItems: serialized });
        } catch (error) {
            console.error('Failed to save tracked items:', error);
            this.showNotification('Could not save tracked items. Check storage quota.', 'error');
        }
    }

    async trackProduct(productUrl, targetPrice, productName = '') {
        const productId = this.extractProductId(productUrl);
        if (!productId) {
            console.warn('Invalid product URL:', productUrl);
            return false;
        }

        if (typeof targetPrice !== 'number' || targetPrice <= 0) {
            console.warn('Invalid target price:', targetPrice);
            return false;
        }

        const trackInfo = {
            url: productUrl.trim(),
            targetPrice: parseFloat(targetPrice),
            productName: (productName || '').trim(),
            currentPrice: null,
            lastChecked: Date.now(),
            priceHistory: []
        };

        this.trackedItems.set(productId, trackInfo);
        await this.saveTrackedItems();

        console.debug(`Tracked product: ${productId}`, trackInfo);
        return true;
    }

    async checkPrices() {
        if (this.trackedItems.size === 0) {
          
            return;
        }

        console.info(`Checking prices for ${this.trackedItems.size} products...`);

        for (const [productId, trackInfo] of this.trackedItems) {
            try {
                const currentPrice = await this.scrapePrice(trackInfo.url);

                // Update tracking info
                trackInfo.currentPrice = currentPrice;
                trackInfo.lastChecked = Date.now();

                trackInfo.priceHistory.push({
                    price: currentPrice,
                    timestamp: Date.now()
                });

                // Keep only last 30 days
                const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
                trackInfo.priceHistory = trackInfo.priceHistory.filter(
                    entry => entry.timestamp > thirtyDaysAgo
                );

                // Alert if target reached
                if (currentPrice <= trackInfo.targetPrice) {
                    this.sendPriceAlert(trackInfo);
                }

            } catch (error) {
                console.error('Error checking price for product:', productId, error);
                // Continue checking others
            }
        }

        await this.saveTrackedItems();
    }

    // 🔁 Replace this with real scraping logic later
    async scrapePrice(url) {
        // ⚠️ Placeholder: Simulate price (remove in production)
        return Math.floor(Math.random() * 80 + 20); // $20–$100
    }

    sendPriceAlert(trackInfo) {
        const title = '💰 Price Drop Alert!';
        const message = `${trackInfo.productName || 'A tracked product'} is now at your target price!`;
        const contextMessage = `Current: $${trackInfo.currentPrice?.toFixed(2)} | Target: $${trackInfo.targetPrice}`;

        // Ensure notification permission
        if (chrome.permissions && !chrome.permissions.contains?.({ permissions: ['notifications'] })) {
            console.warn('Notifications not permitted.');
            return;
        }

        chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
            title,
            message,
            contextMessage,
            priority: 2
        });

        // Notify background script for analytics
        chrome.runtime.sendMessage({
            action: 'priceAlertTriggered',
            product: trackInfo
        });
    }

    extractProductId(url) {
        if (!url) return null;
        try {
            const urlObj = new URL(url);
            const pathSegments = urlObj.pathname.split('/').filter(Boolean);
            for (let i = 0; i < pathSegments.length - 1; i++) {
                if (pathSegments[i] === 'dp' || pathSegments[i] === 'product') {
                    const id = pathSegments[i + 1];
                    if (/^[A-Z0-9]{10}$/.test(id)) {
                        return id;
                    }
                }
            }
            // Fallback regex
            const match = url.match(/\/(?:dp|product)\/([A-Z0-9]{10})/);
            return match ? match[1] : null;
        } catch (e) {
            console.warn('Invalid URL:', url);
            return null;
        }
    }

    startTracking() {
        // Initial check after 10 seconds
        setTimeout(() => {
            this.checkPrices().catch(err =>
                console.error('Initial price check failed:', err)
            );
        }, 10000);

        // Check every hour
        setInterval(() => {
            this.checkPrices().catch(err =>
                console.error('Scheduled price check failed:', err)
            );
        }, 60 * 60 * 1000);
    }

    getTrackedItems() {
        return Array.from(this.trackedItems.values());
    }

    async removeTracking(productId) {
        if (this.trackedItems.has(productId)) {
            this.trackedItems.delete(productId);
            await this.saveTrackedItems();
            console.debug(`Removed tracking for product: ${productId}`);
            return true;
        }
        return false;
    }

    // Optional: Show fallback UI notification
    showNotification(message, type = 'error') {
        console[type](message);
        // You could also dispatch an event or update popup UI
    }
}

// ✅ Initialize globally
const priceTracker = new PriceTracker();

// Make available for debugging (optional)
if (chrome.runtime.id) {
    window.priceTracker = priceTracker;
}