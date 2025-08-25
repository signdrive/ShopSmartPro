class PriceTracker {
    constructor() {
        this.trackedItems = new Map();
        this.loadTrackedItems();
        this.startTracking();
    }

    async loadTrackedItems() {
        const result = await chrome.storage.sync.get('trackedItems');
        if (result.trackedItems) {
            this.trackedItems = new Map(result.trackedItems);
        }
    }

    async saveTrackedItems() {
        await chrome.storage.sync.set({ 
            trackedItems: Array.from(this.trackedItems.entries()) 
        });
    }

    async trackProduct(productUrl, targetPrice, productName = '') {
        const productId = this.extractProductId(productUrl);
        if (!productId) return false;

        const trackInfo = {
            url: productUrl,
            targetPrice: targetPrice,
            productName: productName,
            currentPrice: null,
            lastChecked: Date.now(),
            priceHistory: []
        };

        this.trackedItems.set(productId, trackInfo);
        await this.saveTrackedItems();
        return true;
    }

    async checkPrices() {
        for (const [productId, trackInfo] of this.trackedItems) {
            try {
                const currentPrice = await this.scrapePrice(trackInfo.url);
                trackInfo.currentPrice = currentPrice;
                trackInfo.lastChecked = Date.now();
                
                trackInfo.priceHistory.push({
                    price: currentPrice,
                    timestamp: Date.now()
                });

                // Keep only last 30 days of history
                const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
                trackInfo.priceHistory = trackInfo.priceHistory.filter(
                    entry => entry.timestamp > thirtyDaysAgo
                );

                if (currentPrice <= trackInfo.targetPrice) {
                    this.sendPriceAlert(trackInfo);
                }

            } catch (error) {
                console.error('Error checking price for:', productId, error);
            }
        }

        await this.saveTrackedItems();
    }

    async scrapePrice(url) {
        // This would be replaced with actual price scraping logic
        // For now, we'll simulate with random prices
        return Math.random() * 100 + 20;
    }

    sendPriceAlert(trackInfo) {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
            title: '💰 Price Drop Alert!',
            message: `${trackInfo.productName || 'Product'} is now at your target price!`,
            contextMessage: `Current: $${trackInfo.currentPrice} | Target: $${trackInfo.targetPrice}`
        });

        // Send to background for analytics
        chrome.runtime.sendMessage({
            action: 'priceAlertTriggered',
            product: trackInfo
        });
    }

    extractProductId(url) {
        const match = url.match(/\/dp\/([A-Z0-9]{10})/);
        return match ? match[1] : null;
    }

    startTracking() {
        // Check prices every hour
        setInterval(() => this.checkPrices(), 60 * 60 * 1000);
        
        // Initial check after 10 seconds
        setTimeout(() => this.checkPrices(), 10000);
    }

    getTrackedItems() {
        return Array.from(this.trackedItems.values());
    }

    async removeTracking(productId) {
        this.trackedItems.delete(productId);
        await this.saveTrackedItems();
    }
}

// Initialize price tracker
const priceTracker = new PriceTracker();