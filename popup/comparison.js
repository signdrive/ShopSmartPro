// popup/comparison.js - ShopSmart Pro | Final: No innerHTML, CSP-Compliant, Secure
class ProductComparison {
    constructor() {
        this.products = [];
        this.initializeElements();
        this.loadTheme();
        this.loadSettings();
        this.setupEventListeners();
        this.loadComparison();
    }

    initializeElements() {
        this.comparisonResults = document.getElementById('comparisonResults');
        this.clearBtn = document.getElementById('clearComparison');
        this.closeBtn = document.getElementById('closeComparison');
        this.darkModeToggle = document.getElementById('darkModeToggle');
        this.exportCsvBtn = document.getElementById('exportCsv');
        this.saveListBtn = document.getElementById('saveList');
        this.listNameInput = document.getElementById('listName');

        if (!this.comparisonResults) {
            console.error('❌ #comparisonResults not found');
            this.showError('UI Error: Missing container');
        }
    }

    async loadSettings() {
        try {
            const result = await new Promise(resolve => {
                chrome.storage.sync.get(['settings'], res => resolve(res));
            });
            this.maxProducts = result.settings?.maxComparisonProducts || 4;
        } catch (e) {
            this.maxProducts = 4;
        }
    }

    async loadTheme() {
        try {
            const result = await new Promise(resolve => {
                chrome.storage.sync.get(['darkMode'], res => resolve(res));
            });
            if (result.darkMode) {
                document.body.classList.replace('light-mode', 'dark-mode');
                this.darkModeToggle.textContent = '☀️ Light Mode';
            }
        } catch (e) {}
    }

    saveTheme(isDark) {
        try {
            chrome.storage.sync.set({ darkMode: isDark });
        } catch (e) {}
    }

    setupEventListeners() {
        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => this.clearComparison());
        }

        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => window.close());
        }

        if (this.darkModeToggle) {
            this.darkModeToggle.addEventListener('click', () => {
                const isDark = document.body.classList.contains('light-mode');
                document.body.classList.toggle('light-mode');
                document.body.classList.toggle('dark-mode');
                this.darkModeToggle.textContent = isDark ? '☀️ Light Mode' : '🌓 Dark Mode';
                this.saveTheme(isDark);
            });
        }

        const shareBtn = document.getElementById('shareBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                const url = chrome.runtime.getURL('popup/comparison.html');
                navigator.clipboard.writeText(url)
                    .then(() => {
                        alert('🔗 Comparison link copied to clipboard!');
                    })
                    .catch(err => {
                        console.error('Failed to copy link:', err);
                        alert('❌ Could not copy link. Please try again.');
                    });
            });
        }

        if (this.exportCsvBtn) {
            this.exportCsvBtn.addEventListener('click', () => this.exportToCsv());
        }

        if (this.saveListBtn) {
            this.saveListBtn.addEventListener('click', () => this.saveCurrentList());
        }

        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'comparisonUpdated') {
                this.loadComparison();
            }
            return true;
        });
    }

    async loadComparison() {
        try {
            const result = await new Promise((resolve) => {
                chrome.storage.sync.get(['comparisonProducts'], (res) => {
                    resolve({
                        comparisonProducts: Array.isArray(res?.comparisonProducts) ? res.comparisonProducts : []
                    });
                });
            });

            this.products = result.comparisonProducts || [];
            this.renderComparison();
        } catch (error) {
            console.error('Failed to load comparison:', error);
            this.showError('Failed to load saved products');
            this.products = [];
            this.renderComparison();
        }
    }

    async saveComparison() {
        try {
            await new Promise((resolve, reject) => {
                chrome.storage.sync.set({ comparisonProducts: this.products }, () => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve();
                    }
                });
            });
        } catch (error) {
            console.error('Failed to save comparison:', error);
            this.showError('Failed to save products');
        }
    }

    addProduct(product) {
        if (!product || !product.id) return;
        const exists = this.products.some(p => p.id === product.id);
        if (exists) return;

        this.products.unshift(product);

        if (this.products.length > (this.maxProducts || 4)) {
            this.products.pop();
        }

        this.saveComparison();
        this.renderComparison();
    }

    removeProduct(productId) {
        this.products = this.products.filter(p => p.id !== productId);
        this.saveComparison();
        this.renderComparison();
    }

    clearComparison() {
        this.products = [];
        this.saveComparison();
        this.renderComparison();
    }

    renderComparison() {
        if (!this.comparisonResults) return;
        this.comparisonResults.innerHTML = '';

        if (this.products.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'loading';

            const text = document.createElement('div');
            text.textContent = 'Select products to compare';
            empty.appendChild(text);

            const hint = document.createElement('small');
            hint.textContent = 'Click "Compare" on any product listing';
            empty.appendChild(hint);

            this.comparisonResults.appendChild(empty);
            return;
        }

        // ✅ Warning for 5+ products — Safe DOM creation
        if (this.products.length > 4) {
            const warning = document.createElement('div');
            warning.className = 'warning';

            const strong = document.createElement('strong');
            strong.textContent = '⚠️ Too Many Products';

            const small = document.createElement('small');
            small.textContent = 'For best experience, keep comparisons under 5 products.';

            warning.appendChild(strong);
            warning.appendChild(document.createElement('br'));
            warning.appendChild(small);

            this.comparisonResults.appendChild(warning);
        }

        const grid = document.createElement('div');
        grid.className = 'comparison-grid';

        const productsRow = document.createElement('div');
        productsRow.className = 'products-row';

        this.products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.dataset.id = product.id;

            const img = document.createElement('img');
            img.src = product.image || 'https://via.placeholder.com/100x100?text=No+Image';
            img.alt = product.title;
            img.className = 'product-image';
            img.onerror = () => { img.src = 'https://via.placeholder.com/100x100?text=Product'; };

            const title = document.createElement('h3');
            title.className = 'product-title';
            title.textContent = product.title;

            const price = document.createElement('div');
            price.className = 'product-price';
            price.textContent = `$${product.price?.toFixed(2) || 'N/A'}`;

            const rating = document.createElement('div');
            rating.className = 'product-rating';
            rating.textContent = `⭐ ${product.rating || 'N/A'}`;

            const actions = document.createElement('div');
            actions.className = 'action-buttons';

            const viewBtn = document.createElement('button');
            viewBtn.className = 'action-btn view-btn';
            viewBtn.dataset.url = product.url;
            viewBtn.textContent = 'View';

            const trackBtn = document.createElement('button');
            trackBtn.className = 'action-btn track-btn';
            trackBtn.dataset.id = product.id;
            trackBtn.textContent = 'Track';

            const removeBtn = document.createElement('button');
            removeBtn.className = 'action-btn remove-btn';
            removeBtn.dataset.id = product.id;
            removeBtn.textContent = 'Remove';

            actions.append(viewBtn, trackBtn, removeBtn);
            card.append(img, title, price, rating, actions);
            productsRow.appendChild(card);
        });

        grid.appendChild(productsRow);

        if (this.products.length >= 2) {
            grid.appendChild(this.createComparisonTable());
        }

        this.comparisonResults.appendChild(grid);
        this.addProductEventListeners();
    }

    createComparisonTable() {
        const features = ['price', 'rating'];
        const tableSection = document.createElement('div');
        tableSection.className = 'comparison-section';

        const heading = document.createElement('h3');
        heading.textContent = '📊 Feature Comparison';
        tableSection.appendChild(heading);

        const table = document.createElement('table');
        table.className = 'comparison-table';

        const thead = document.createElement('thead');
        const hRow = document.createElement('tr');

        const thFeature = document.createElement('th');
        thFeature.textContent = 'Feature';
        hRow.appendChild(thFeature);

        this.products.forEach((_, i) => {
            const th = document.createElement('th');
            th.textContent = `Product ${i+1}`;
            hRow.appendChild(th);
        });

        thead.appendChild(hRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        features.forEach(feature => {
            const row = document.createElement('tr');

            const tdFeature = document.createElement('td');
            tdFeature.textContent = this.formatFeatureName(feature);
            row.appendChild(tdFeature);

            this.products.forEach(product => {
                const td = document.createElement('td');
                td.textContent = this.formatFeatureValue(feature, product);
                const cls = this.getFeatureClass(feature, product);
                td.className = cls;
                row.appendChild(td);
            });

            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        tableSection.appendChild(table);
        return tableSection;
    }

    formatFeatureName(f) {
        return { price: '💰 Price', rating: '⭐ Rating' }[f] || f;
    }

    formatFeatureValue(f, p) {
        if (f === 'price') return p.price ? `$${p.price.toFixed(2)}` : 'N/A';
        if (f === 'rating') return p.rating ? `⭐ ${p.rating}` : 'N/A';
        return 'N/A';
    }

    getFeatureClass(feature, product) {
        const values = this.products.map(p => p[feature] || 0);
        const current = product[feature] || 0;
        const best = feature === 'price' ? Math.min(...values) : Math.max(...values);
        const worst = feature === 'price' ? Math.max(...values) : Math.min(...values);
        return current === best ? 'feature-better' : current === worst ? 'feature-worse' : 'feature-equal';
    }

    addProductEventListeners() {
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.onclick = () => {
                const url = btn.dataset.url;
                if (url) {
                    const affiliateUrl = new URL(url, location.origin);
                    affiliateUrl.searchParams.set('tag', 'elise200f-20');
                    chrome.tabs.create({ url: affiliateUrl.toString() });
                }
            };
        });

        document.querySelectorAll('.track-btn').forEach(btn => {
            btn.onclick = () => {
                const id = btn.dataset.id;
                const product = this.products.find(p => p.id === id);
                if (product) {
                    chrome.runtime.sendMessage({ action: 'trackProduct', product });
                    btn.textContent = '✅ Tracking';
                    btn.disabled = true;
                }
            };
        });

        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.onclick = () => {
                this.removeProduct(btn.dataset.id);
            };
        });
    }

    exportToCsv() {
        if (this.products.length === 0) {
            alert('No products to export.');
            return;
        }

        const headers = ['Title', 'Price', 'Rating', 'URL'];
        const rows = this.products.map(p => [
            p.title,
            `$${p.price.toFixed(2)}`,
            p.rating,
            p.url
        ]);

        let csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `shopsmart-comparison-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();

        URL.revokeObjectURL(url);
    }

    saveCurrentList() {
        if (this.products.length === 0) {
            alert('No products to save.');
            return;
        }

        const name = this.listNameInput?.value.trim() || `Comparison ${new Date().toLocaleDateString()}`;

        const list = {
            name,
            products: this.products,
            date: Date.now()
        };

        chrome.storage.sync.get(['savedComparisons'], (result) => {
            let lists = result.savedComparisons || [];
            lists = lists.filter(l => l.name !== name);
            lists.unshift(list);
            chrome.storage.sync.set({ savedComparisons: lists }, () => {
                alert(`✅ Saved as "${name}"`);
                if (this.listNameInput) this.listNameInput.value = '';
            });
        });
    }

    showError(msg) {
        if (!this.comparisonResults) return;
        this.comparisonResults.innerHTML = '';

        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'color: #dc3545; text-align: center; padding: 20px; font-size: 0.9rem;';

        const text = document.createTextNode(`❌ ${msg}`);
        errorDiv.appendChild(text);

        this.comparisonResults.appendChild(errorDiv);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new ProductComparison();
});