class SearchHistory {
    constructor() {
        this.maxItems = 100;
        this.history = [];
        this.loadHistory();
    }

    async loadHistory() {
        const result = await chrome.storage.sync.get('searchHistory');
        this.history = result.searchHistory || [];
    }

    async saveHistory() {
        await chrome.storage.sync.set({ searchHistory: this.history });
    }

    async addSearch(query, category = '', country = '') {
        const searchEntry = {
            query: query,
            category: category,
            country: country,
            timestamp: Date.now(),
            id: this.generateId()
        };

        this.history.unshift(searchEntry);
        
        // Remove duplicates and limit size
        this.history = this.history.filter((entry, index, array) =>
            index === array.findIndex(e => e.query === entry.query && e.category === entry.category)
        ).slice(0, this.maxItems);

        await this.saveHistory();
        return searchEntry;
    }

    getRecentSearches(limit = 10) {
        return this.history.slice(0, limit);
    }

    searchHistory(query, limit = 5) {
        const lowerQuery = query.toLowerCase();
        return this.history
            .filter(entry => entry.query.toLowerCase().includes(lowerQuery))
            .slice(0, limit);
    }

    clearHistory() {
        this.history = [];
        return this.saveHistory();
    }

    exportHistory() {
        return JSON.stringify(this.history, null, 2);
    }

    importHistory(jsonData) {
        try {
            const imported = JSON.parse(jsonData);
            if (Array.isArray(imported)) {
                this.history = imported.slice(0, this.maxItems);
                return this.saveHistory();
            }
        } catch (error) {
            throw new Error('Invalid history data format');
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
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([term, count]) => ({ term, count }));
    }

    getSearchTrends(days = 30) {
        const now = Date.now();
        const daysAgo = now - (days * 24 * 60 * 60 * 1000);
        
        return this.history
            .filter(entry => entry.timestamp > daysAgo)
            .reduce((trends, entry) => {
                const date = new Date(entry.timestamp).toLocaleDateString();
                trends[date] = (trends[date] || 0) + 1;
                return trends;
            }, {});
    }
}

const searchHistory = new SearchHistory();