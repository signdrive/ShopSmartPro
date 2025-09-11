// popup/comparison.js

/**
 * Recursively traverses the DOM to find and replace i18n placeholders.
 * It looks for nodes and attributes with the pattern __MSG_key__.
 * @param {Node} node - The starting node to traverse.
 */
function applyTranslations(node = document.body) {
    if (!node) return;

    const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null, false);

    let currentNode;
    while (currentNode = walker.nextNode()) {
        if (currentNode.nodeType === Node.TEXT_NODE) {
            // Process text content
            const text = currentNode.nodeValue;
            const replacedText = text.replace(/__MSG_(\w+)__/g, (match, key) => {
                return chrome.i18n.getMessage(key) || match;
            });
            if (replacedText !== text) {
                currentNode.nodeValue = replacedText;
            }
        } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
            // Process attributes
            for (let i = 0; i < currentNode.attributes.length; i++) {
                const attr = currentNode.attributes[i];
                const attrValue = attr.value;
                const replacedAttrValue = attrValue.replace(/__MSG_(\w+)__/g, (match, key) => {
                    return chrome.i18n.getMessage(key) || match;
                });
                if (replacedAttrValue !== attrValue) {
                    attr.value = replacedAttrValue;
                }
            }
        }
    }
}

class ProductComparison {
    constructor() {
        this.products = [];
        this.maxProducts = 4;
        this.initializeElements();
        if (this.comparisonResults) {
            this.loadSettings()
                .then(() => this.loadTheme())
                .then(() => this.setupEventListeners())
                .then(() => this.loadComparison())
                .then(() => this.loadSavedLists());
        }
    }

    initializeElements() {
        this.comparisonResults = document.getElementById('comparisonResults');
        this.clearBtn = document.getElementById('clearComparison');
        this.closeBtn = document.getElementById('closeComparison');
        this.exportCsvBtn = document.getElementById('exportCsv');
        this.saveListBtn = document.getElementById('saveList');
        this.listNameInput = document.getElementById('listName');
        this.loadListSelect = document.getElementById('loadList');
        this.deleteListBtn = document.getElementById('deleteList');
    }

    async loadSettings() {
        try {
            const result = await new Promise(resolve => {
                chrome.storage.sync.get(['settings'], res => resolve(res));
            });
            this.maxProducts = result?.settings?.maxComparisonProducts || 4;
        } catch (e) {
            this.maxProducts = 4;
        }
    }

     async loadTheme() {
        try {
            const result = await new Promise(resolve => {
                chrome.storage.sync.get(['settings'], res => resolve(res));
            });
            const isDark = result?.settings?.darkMode === true;
            this.updateTheme(isDark);
        } catch (e) {
            this.updateTheme(false);
        }
    }

     updateTheme(isDark) {
        document.body.classList.toggle('dark-mode', isDark);
        document.body.classList.toggle('light-mode', !isDark);
    }

 setupEventListeners() {
        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => this.clearComparison());
        }

        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => window.close());
        }

        const shareBtn = document.getElementById('shareBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                const url = chrome.runtime.getURL('popup/comparison.html');
                navigator.clipboard.writeText(url)
                    .then(() => {
                        alert(chrome.i18n.getMessage('comparisonLinkCopied'));
                    })
                    .catch(() => {
                        alert(chrome.i18n.getMessage('couldNotCopyLink'));
                    });
            });
        }

        if (this.exportCsvBtn) {
            this.exportCsvBtn.addEventListener('click', () => this.exportToCsv());
        }

        if (this.saveListBtn) {
            this.saveListBtn.addEventListener('click', () => this.saveCurrentList());
        }

        if (this.loadListSelect) {
            this.loadListSelect.addEventListener('change', () => {
                if (this.loadListSelect.value) {
                    this.loadSavedList(this.loadListSelect.value);
                }
            });
        }

        if (this.deleteListBtn) {
            this.deleteListBtn.addEventListener('click', () => {
                if (this.loadListSelect.value) {
                    this.deleteSavedList(this.loadListSelect.value);
                }
            });
        }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'settingsUpdated') {
                const isDark = !!request.settings.darkMode;
                this.updateTheme(isDark);
                sendResponse({ status: 'success' });
            }

            if (request.action === 'comparisonUpdated' || request.action === 'addToComparison') {
                this.loadComparison();
            }

            return true;
        });

    
        this.comparisonResults?.addEventListener('click', (e) => {
            const viewBtn = e.target.closest('.view-btn');
            const trackBtn = e.target.closest('.track-btn');
            const removeBtn = e.target.closest('.remove-btn');

            if (viewBtn) {
                this.handleViewProduct(viewBtn.dataset.url);
            } else if (trackBtn) {
                this.handleTrackProduct(trackBtn.dataset.id);
            } else if (removeBtn) {
                this.removeProduct(removeBtn.dataset.id);
            }
        });
    }

    handleViewProduct(url) {
        if (!url) return;
        try {
            const affiliateUrl = new URL(url);
            affiliateUrl.searchParams.set('tag', 'elise200f-20');
            chrome.tabs.create({ url: affiliateUrl.toString(), openerTabId: window.opener?.id });
        } catch (e) {
            chrome.tabs.create({ url, openerTabId: window.opener?.id });
        }
    }

    handleTrackProduct(id) {
        const product = this.products.find(p => p.id === id);
        if (!product) return;

        chrome.runtime.sendMessage({ action: 'trackProduct', product });
        const btn = document.querySelector(`.track-btn[data-id="${id}"]`);
        if (btn) {
            btn.textContent = chrome.i18n.getMessage('trackingProduct');
            btn.disabled = true;
        }
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

            this.products = result.comparisonProducts;
            this.renderComparison();
        } catch (error) {
            this.showError(chrome.i18n.getMessage('failedToLoadSavedProducts'));
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
            this.showError(chrome.i18n.getMessage('failedToSaveProducts'));
        }
    }

    addProduct(product) {
        if (!product || !product.id) return;
        if (this.products.some(p => p.id === product.id)) return;

        this.products.unshift(product);
        if (this.products.length > this.maxProducts) {
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
            text.textContent = chrome.i18n.getMessage('selectProductsToCompare');
            empty.appendChild(text);

            const hint = document.createElement('small');
            hint.textContent = chrome.i18n.getMessage('clickCompareOnProductListing');
            empty.appendChild(hint);

            this.comparisonResults.appendChild(empty);
            return;
        }

        if (this.products.length > 4) {
            const warning = document.createElement('div');
            warning.className = 'warning';

            const strong = document.createElement('strong');
            strong.textContent = chrome.i18n.getMessage('tooManyProductsWarningTitle');

            const small = document.createElement('small');
            small.textContent = chrome.i18n.getMessage('tooManyProductsWarningText');

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
            img.src = product.image || chrome.runtime.getURL('img/deals/placeholder.jpg');
            img.alt = product.title || chrome.i18n.getMessage('product');
            img.className = 'product-image';
            img.addEventListener('error', () => {
                img.src = chrome.runtime.getURL('img/deals/placeholder.jpg');
            });

            const title = document.createElement('h3');
            title.className = 'product-title';
            title.textContent = product.title || chrome.i18n.getMessage('unknownProduct');

            const price = document.createElement('div');
            price.className = 'product-price';
            price.textContent = product.price ? `$${product.price.toFixed(2)}` : chrome.i18n.getMessage('notAvailable');

            const rating = document.createElement('div');
            rating.className = 'product-rating';
            rating.textContent = product.rating ? `⭐ ${product.rating}` : `⭐ ${chrome.i18n.getMessage('notAvailable')}`;

            const actions = document.createElement('div');
            actions.className = 'action-buttons';

            const viewBtn = document.createElement('button');
            viewBtn.className = 'action-btn view-btn';
            viewBtn.dataset.url = product.url || '';
            viewBtn.textContent = chrome.i18n.getMessage('view');

            const trackBtn = document.createElement('button');
            trackBtn.className = 'action-btn track-btn';
            trackBtn.dataset.id = product.id;
            trackBtn.textContent = chrome.i18n.getMessage('track');

            const removeBtn = document.createElement('button');
            removeBtn.className = 'action-btn remove-btn';
            removeBtn.dataset.id = product.id;
            removeBtn.textContent = chrome.i18n.getMessage('remove');

            actions.append(viewBtn, trackBtn, removeBtn);
            card.append(img, title, price, rating, actions);
            productsRow.appendChild(card);
        });

        grid.appendChild(productsRow);

        if (this.products.length >= 2) {
            grid.appendChild(this.createComparisonTable());
        }

        this.comparisonResults.appendChild(grid);
    }

    createComparisonTable() {
        const features = ['price', 'rating'];
        const tableSection = document.createElement('div');
        tableSection.className = 'comparison-section';

        const heading = document.createElement('h3');
        heading.textContent = chrome.i18n.getMessage('featureComparison');
        tableSection.appendChild(heading);

        const table = document.createElement('table');
        table.className = 'comparison-table';

        const thead = document.createElement('thead');
        const hRow = document.createElement('tr');

        const thFeature = document.createElement('th');
        thFeature.textContent = chrome.i18n.getMessage('feature');
        hRow.appendChild(thFeature);

        this.products.forEach((_, i) => {
            const th = document.createElement('th');
            th.textContent = `${chrome.i18n.getMessage('product')} ${i + 1}`;
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
                td.className = this.getFeatureClass(feature, product);
                row.appendChild(td);
            });

            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        tableSection.appendChild(table);
        return tableSection;
    }

    formatFeatureName(f) {
        const names = {
            price: chrome.i18n.getMessage('price'),
            rating: chrome.i18n.getMessage('rating')
        };
        return names[f] || f;
    }

    formatFeatureValue(f, p) {
        const notAvailable = chrome.i18n.getMessage('notAvailable');
        if (f === 'price') return p.price ? `$${p.price.toFixed(2)}` : notAvailable;
        if (f === 'rating') return p.rating ? `⭐ ${p.rating}` : `⭐ ${notAvailable}`;
        return notAvailable;
    }

    getFeatureClass(feature, product) {
        const values = this.products.map(p => p[feature] || 0).filter(v => v);
        if (values.length === 0) return '';

        const current = product[feature] || 0;
        const best = feature === 'price' ? Math.min(...values) : Math.max(...values);
        const worst = feature === 'price' ? Math.max(...values) : Math.min(...values);

        return current === best ? 'feature-better' : current === worst ? 'feature-worse' : 'feature-equal';
    }

    exportToCsv() {
        if (this.products.length === 0) {
            alert(chrome.i18n.getMessage('noProductsToExport'));
            return;
        }

        const headers = [
            chrome.i18n.getMessage('csvTitle'),
            chrome.i18n.getMessage('csvPrice'),
            chrome.i18n.getMessage('csvRating'),
            chrome.i18n.getMessage('csvUrl')
        ];
        const rows = this.products.map(p => [
            p.title || chrome.i18n.getMessage('unknownProduct'),
            p.price ? `$${p.price.toFixed(2)}` : chrome.i18n.getMessage('notAvailable'),
            p.rating || chrome.i18n.getMessage('notAvailable'),
            p.url || ''
        ]);

        let csv = [headers, ...rows].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
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
            alert(chrome.i18n.getMessage('noProductsToSave'));
            return;
        }

        const name = this.listNameInput?.value.trim() || `${chrome.i18n.getMessage('comparison')} ${new Date().toLocaleDateString()}`;

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
                alert(chrome.i18n.getMessage('listSavedAs', [name]));
                if (this.listNameInput) this.listNameInput.value = '';
                this.loadSavedLists();
            });
        });
    }

    loadSavedLists() {
        chrome.storage.sync.get(['savedComparisons'], (result) => {
            const lists = result.savedComparisons || [];
            const select = this.loadListSelect;
            if (!select) return;

            const currentVal = select.value;
            const placeholderText = chrome.i18n.getMessage('loadSavedComparisonOption');
            select.innerHTML = `<option value="" disabled>${placeholderText}</option>`;

            lists.forEach(list => {
                const option = document.createElement('option');
                option.value = list.name;
                option.textContent = list.name;
                select.appendChild(option);
            });
            select.value = currentVal;
        });
    }

    loadSavedList(name) {
        chrome.storage.sync.get(['savedComparisons'], (result) => {
            const lists = result.savedComparisons || [];
            const found = lists.find(l => l.name === name);
            if (found) {
                this.products = found.products;
                this.saveComparison();
                this.renderComparison();
                if (this.listNameInput) this.listNameInput.value = name;
            } else {
                alert(chrome.i18n.getMessage('couldNotFindList', [name]));
            }
        });
    }

    deleteSavedList(name) {
        chrome.storage.sync.get(['savedComparisons'], (result) => {
            let lists = result.savedComparisons || [];
            const initialLength = lists.length;
            lists = lists.filter(l => l.name !== name);

            if (lists.length < initialLength) {
                chrome.storage.sync.set({ savedComparisons: lists }, () => {
                    alert(chrome.i18n.getMessage('listDeleted', [name]));
                    this.loadSavedLists();
                });
            } else {
                alert(chrome.i18n.getMessage('couldNotFindList', [name]));
            }
        });
    }

    showError(message, duration = 3000) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-toast';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        setTimeout(() => {
            errorDiv.remove();
        }, duration);
    }
}

// Initialize the class when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ProductComparison();
    applyTranslations();
});