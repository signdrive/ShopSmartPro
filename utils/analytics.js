// utils/analytics.js

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

        this.init();
        this.setupPeriodicSave();
    }

    async init() {
        try {
            // ✅ Use array syntax for reliable result structure
            const result = await chrome.storage.sync.get(['affiliateAnalytics']);

            // ✅ Safely check if data exists and is an object
            if (result && result.affiliateAnalytics) {
                const saved = result.affiliateAnalytics;

                // ✅ Validate and merge only valid data
                this.stats = {
                    ...this.stats,
                    ...saved,

                    // Ensure arrays
                    clickHistory: Array.isArray(saved.clickHistory) ? saved.clickHistory : [],
                    conversionHistory: Array.isArray(saved.conversionHistory) ? saved.conversionHistory : [],

                    // Ensure objects
                    earningsByCategory: typeof saved.earningsByCategory === 'object' ? saved.earningsByCategory : {},
                    earningsByProduct: typeof saved.earningsByProduct === 'object' ? saved.earningsByProduct : {},
                    dailyStats: typeof saved.dailyStats === 'object' ? saved.dailyStats : {}
                };

                // ✅ Ensure numeric values
                this.stats.totalClicks = Number(saved.totalClicks) || 0;
                this.stats.totalConversions = Number(saved.totalConversions) || 0;
                this.stats.totalEarnings = Number(saved.totalEarnings) || 0;

                console.debug('Loaded affiliate analytics:', this.stats);
            } else {
                //console.info('No affiliate analytics data found. Starting fresh.');
            }
        } catch (error) {
            console.error('Failed to load affiliate analytics:', error);
            // Keep default empty stats
        }
    }

    async saveStats() {
        try {
            await chrome.storage.sync.set({ affiliateAnalytics: this.stats });
        } catch (error) {
            console.error('Failed to save affiliate analytics:', error);
            // Optionally: fallback to localStorage or retry
        }
    }

    setupPeriodicSave() {
        // Save every 30 seconds
        setInterval(() => {
            this.saveStats().catch(err =>
                console.error('Auto-save failed:', err)
            );
        }, 30000);
    }

    trackClick(productUrl, category = 'unknown') {
        if (!productUrl || typeof productUrl !== 'string') {
            console.warn('Invalid product URL in trackClick:', productUrl);
            return null;
        }

        const clickData = {
            url: productUrl.trim(),
            category: category || 'unknown',
            timestamp: Date.now(),
            converted: false
        };

        this.stats.totalClicks++;
        this.stats.clickHistory.push(clickData);

        // Update daily stats
        this.updateDailyStats('clicks', 1);

        // Save asynchronously
        this.saveStats().catch(err =>
            console.error('Failed to save after click tracking:', err)
        );

        return clickData;
    }

    trackConversion(productUrl, amount, category = 'unknown') {
        if (!productUrl || typeof productUrl !== 'string') {
            console.warn('Invalid product URL in trackConversion:', productUrl);
            return null;
        }

        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount < 0) {
            console.warn('Invalid amount in trackConversion:', amount);
            return null;
        }

        this.stats.totalConversions++;
        this.stats.totalEarnings += numAmount;

        const conversionData = {
            url: productUrl.trim(),
            amount: numAmount,
            category: category || 'unknown',
            timestamp: Date.now()
        };

        this.stats.conversionHistory.push(conversionData);

        // Update category earnings
        const cat = category || 'unknown';
        this.stats.earningsByCategory[cat] = (this.stats.earningsByCategory[cat] || 0) + numAmount;

        // Update product earnings
        const productId = this.extractProductId(productUrl);
        if (productId) {
            this.stats.earningsByProduct[productId] = (this.stats.earningsByProduct[productId] || 0) + numAmount;
        }

        // Update daily stats
        this.updateDailyStats('conversions', 1);
        this.updateDailyStats('earnings', numAmount);

        // Save asynchronously
        this.saveStats().catch(err =>
            console.error('Failed to save after conversion tracking:', err)
        );

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

        // Only allow valid metrics
        if (['clicks', 'conversions', 'earnings'].includes(metric)) {
            this.stats.dailyStats[today][metric] += Number(value) || 0;
        }
    }

    extractProductId(url) {
        if (!url || typeof url !== 'string') return null;
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
            const match = url.match(/\/dp\/([A-Z0-9]{10})/);
            return match ? match[1] : null;
        } catch (e) {
            console.warn('Invalid URL in extractProductId:', url);
            return null;
        }
    }

    getConversionRate() {
        if (this.stats.totalClicks === 0) return 0;
        return ((this.stats.totalConversions / this.stats.totalClicks) * 100).toFixed(2);
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
            .map(([category, earnings]) => ({ category, earnings }))
            .sort((a, b) => b.earnings - a.earnings)
            .slice(0, Math.max(0, limit));
    }

    getRecentActivity(limit = 10) {
        const allActivity = [
            ...this.stats.clickHistory.map(click => ({ type: 'click', ...click })),
            ...this.stats.conversionHistory.map(conv => ({ type: 'conversion', ...conv }))
        ].sort((a, b) => b.timestamp - a.timestamp);

        return allActivity.slice(0, Math.max(0, limit));
    }

    async clearData() {
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
        await this.saveStats();
        console.info('Affiliate analytics data cleared.');
    }

    exportData() {
        try {
            return JSON.stringify(this.stats, null, 2);
        } catch (error) {
            console.error('Failed to export analytics data:', error);
            return '{}';
        }
    }
}

// ✅ Initialize
const affiliateAnalytics = new AffiliateAnalytics();

// Optional: expose for debugging
if (typeof window !== 'undefined') {
    window.affiliateAnalytics = affiliateAnalytics;
}