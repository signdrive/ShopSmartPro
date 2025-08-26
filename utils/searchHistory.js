// utils/searchHistory.js

class SearchHistory {
    constructor() {
        this.maxItems = 100;
        this.history = [];
        this.init();
    }

    async init() {
        try {
            // ✅ Pass key as array for reliable return format
            const result = await chrome.storage.sync.get(['searchHistory']);
            
            // ✅ Handle case where result or searchHistory is missing
            if (result && Array.isArray(result.searchHistory)) {
                this.history = result.searchHistory;
            } else {
                this.history = [];
               
            }
        } catch (error) {
            console.error('Failed to load search history:', error);
            this.history = []; // fallback
        }
    }

    async saveHistory() {
        try {
            await chrome.storage.sync.set({ searchHistory: this.history });
        } catch (error) {
            console.error('Failed to save search history:', error);
            // Optionally: show error in UI or retry
        }
    }

    async addSearch(query, category = '', country = '') {
        if (!query || typeof query !== 'string') return null;

        const searchEntry = {
            query: query.trim(),
            category: category,
            country: country,
            timestamp: Date.now(),
            id: this.generateId()
        };

        // Add to front
        this.history.unshift(searchEntry);

        // Remove duplicates: keep only first occurrence
        this.history = this.history.filter(
            (entry, index, arr) =>
                index === arr.findIndex(e => e.query === entry.query && e.category === entry.category)
        );

        // Limit size
        if (this.history.length > this.maxItems) {
            this.history = this.history.slice(0, this.maxItems);
        }

        await this.saveHistory();
        return searchEntry;
    }

    getRecentSearches(limit = 10) {
        return this.history.slice(0, Math.max(0, limit));
    }

    searchHistory(query, limit = 5) {
        if (!query || typeof query !== 'string') return [];
        const lowerQuery = query.toLowerCase();
        return this.history
            .filter(entry => entry.query.toLowerCase().includes(lowerQuery))
            .slice(0, Math.max(0, limit));
    }

    async clearHistory() {
        this.history = [];
        await this.saveHistory();
    }

    exportHistory() {
        try {
            return JSON.stringify(this.history, null, 2);
        } catch (error) {
            console.error('Failed to export history:', error);
            return '[]';
        }
    }

    async importHistory(jsonData) {
        if (!jsonData) throw new Error('No data provided');

        try {
            const imported = JSON.parse(jsonData);
            if (Array.isArray(imported)) {
                this.history = imported
                    .filter(item => 
                        typeof item === 'object' && 
                        item.query && 
                        typeof item.timestamp === 'number'
                    )
                    .slice(0, this.maxItems);
                await this.saveHistory();
            } else {
                throw new Error('Invalid format: expected array');
            }
        } catch (error) {
            throw new Error(`Invalid history data: ${error.message}`);
        }
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Analytics methods
    getMostSearchedTerms(limit = 10) {
        const termCount = {};
        this.history.forEach(entry => {
            termCount[entry.query] = (termCount[entry.query] || 0) + 1;
        });

        return Object.entries(termCount)
            .map(([term, count]) => ({ term, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, Math.max(0, limit));
    }

    getSearchTrends(days = 30) {
        const now = Date.now();
        const daysAgo = now - (days * 24 * 60 * 60 * 1000);

        const trends = this.history
            .filter(entry => entry.timestamp > daysAgo)
            .reduce((acc, entry) => {
                const date = new Date(entry.timestamp).toLocaleDateString();
                acc[date] = (acc[date] || 0) + 1;
                return acc;
            }, {});

        return trends;
    }
}

// ✅ Initialize
const searchHistory = new SearchHistory();

// Optional: expose for debugging
if (typeof window !== 'undefined') {
    window.searchHistory = searchHistory;
}