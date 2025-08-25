class AffiliateAnalytics {
    constructor() {
        this.stats = {
            totalClicks: 0,
            totalConversions: 0,
            totalEarnings: 0,
            clickHistory: [],
            conversionHistory: [],
            earningsByCategory: {},
            earningsByProduct: {},
            dailyStats: {}
        };
        
        this.loadStats();
        this.setupPeriodicSave();
    }

    async loadStats() {
        const result = await chrome.storage.sync.get('affiliateAnalytics');
        if (result.affiliateAnalytics) {
            this.stats = { ...this.stats, ...result.affiliateAnalytics };
        }
    }

    async saveStats() {
        await chrome.storage.sync.set({ affiliateAnalytics: this.stats });
    }

    setupPeriodicSave() {
        setInterval(() => this.saveStats(), 30000); // Save every 30 seconds
    }

    trackClick(productUrl, category = 'unknown') {
        const clickData = {
            url: productUrl,
            category: category,
            timestamp: Date.now(),
            converted: false
        };

        this.stats.totalClicks++;
        this.stats.clickHistory.push(clickData);
        
        // Update daily stats
        this.updateDailyStats('clicks', 1);
        
        this.saveStats();
        return clickData;
    }

    trackConversion(productUrl, amount, category = 'unknown') {
        this.stats.totalConversions++;
        this.stats.totalEarnings += amount;
        
        const conversionData = {
            url: productUrl,
            amount: amount,
            category: category,
            timestamp: Date.now()
        };

        this.stats.conversionHistory.push(conversionData);
        
        // Update category earnings
        this.stats.earningsByCategory[category] = 
            (this.stats.earningsByCategory[category] || 0) + amount;
        
        // Update product earnings
        const productId = this.extractProductId(productUrl);
        if (productId) {
            this.stats.earningsByProduct[productId] = 
                (this.stats.earningsByProduct[productId] || 0) + amount;
        }

        // Update daily stats
        this.updateDailyStats('conversions', 1);
        this.updateDailyStats('earnings', amount);

        this.saveStats();
        return conversionData;
    }

    updateDailyStats(metric, value) {
        const today = new Date().toLocaleDateString();
        if (!this.stats.dailyStats[today]) {
            this.stats.dailyStats[today] = {
                clicks: 0,
                conversions: 0,
                earnings: 0
            };
        }
        
        this.stats.dailyStats[today][metric] += value;
    }

    extractProductId(url) {
        const match = url.match(/\/dp\/([A-Z0-9]{10})/);
        return match ? match[1] : null;
    }

    getConversionRate() {
        if (this.stats.totalClicks === 0) return 0;
        return (this.stats.totalConversions / this.stats.totalClicks * 100).toFixed(2);
    }

    getAverageOrderValue() {
        if (this.stats.totalConversions === 0) return 0;
        return (this.stats.totalEarnings / this.stats.totalConversions).toFixed(2);
    }

    getDashboardData() {
        return {
            totalClicks: this.stats.totalClicks,
            totalConversions: this.stats.totalConversions,
            totalEarnings: this.stats.totalEarnings.toFixed(2),
            conversionRate: this.getConversionRate(),
            averageOrderValue: this.getAverageOrderValue(),
            earningsByCategory: { ...this.stats.earningsByCategory },
            dailyStats: { ...this.stats.dailyStats }
        };
    }

    getTopPerformingCategories(limit = 5) {
        return Object.entries(this.stats.earningsByCategory)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([category, earnings]) => ({ category, earnings }));
    }

    getRecentActivity(limit = 10) {
        const allActivity = [
            ...this.stats.clickHistory.map(click => ({
                type: 'click',
                ...click
            })),
            ...this.stats.conversionHistory.map(conversion => ({
                type: 'conversion',
                ...conversion
            }))
        ].sort((a, b) => b.timestamp - a.timestamp);

        return allActivity.slice(0, limit);
    }

    clearData() {
        this.stats = {
            totalClicks: 0,
            totalConversions: 0,
            totalEarnings: 0,
            clickHistory: [],
            conversionHistory: [],
            earningsByCategory: {},
            earningsByProduct: {},
            dailyStats: {}
        };
        return this.saveStats();
    }

    exportData() {
        return JSON.stringify(this.stats, null, 2);
    }
}

const affiliateAnalytics = new AffiliateAnalytics();