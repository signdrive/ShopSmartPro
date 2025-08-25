class ProductComparison {
    constructor() {
        this.products = [];
        this.initializeElements();
        this.setupEventListeners();
        this.loadComparison();
    }

    initializeElements() {
        this.comparisonResults = document.getElementById('comparisonResults');
        this.clearBtn = document.getElementById('clearComparison');
        this.closeBtn = document.getElementById('closeComparison');
    }

    setupEventListeners() {
        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => this.clearComparison());
        }

        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => window.close());
        }

        // Listen for messages from content script
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'addToComparison') {
                this.addProduct(request.product);
                sendResponse({ status: 'added' });
            }
            return true;
        });
    }

    async loadComparison() {
        try {
            const result = await chrome.storage.sync.get('comparisonProducts');
            this.products = result.comparisonProducts || [];
            this.renderComparison();
        } catch (error) {
            this.showError('Failed to load comparison');
        }
    }

    async saveComparison() {
        try {
            await chrome.storage.sync.set({ comparisonProducts: this.products });
        } catch (error) {
            this.showError('Failed to save comparison');
        }
    }

    addProduct(product) {
        // Check if product already exists
        const existingIndex = this.products.findIndex(p => p.id === product.id);
        
        if (existingIndex === -1) {
            this.products.push(product);
            if (this.products.length > 4) {
                this.products.shift(); // Keep only last 4 products
            }
            this.saveComparison();
            this.renderComparison();
        }
    }

    removeProduct(productId) {
        this.products = this.products.filter(product => product.id !== productId);
        this.saveComparison();
        this.renderComparison();
    }

    clearComparison() {
        this.products = [];
        this.saveComparison();
        this.renderComparison();
    }

    renderComparison() {
        // Clear existing content safely
        while (this.comparisonResults.firstChild) {
            this.comparisonResults.removeChild(this.comparisonResults.firstChild);
        }

        if (this.products.length === 0) {
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'loading';
            
            const mainText = document.createElement('div');
            mainText.textContent = 'Select products to compare from search results';
            
            const smallText = document.createElement('small');
            smallText.textContent = 'Right-click on products and choose "Compare with ShopSmart Pro"';
            
            loadingDiv.appendChild(mainText);
            loadingDiv.appendChild(smallText);
            this.comparisonResults.appendChild(loadingDiv);
            return;
        }

        const comparisonGrid = document.createElement('div');
        comparisonGrid.className = 'comparison-grid';
        
        const productsRow = document.createElement('div');
        productsRow.className = 'products-row';
        
        // Create product cards safely
        this.products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.dataset.productId = product.id;
            
            const productImage = document.createElement('img');
            productImage.src = product.image;
            productImage.alt = product.title;
            productImage.className = 'product-image';
            productImage.onerror = function() {
                this.src = 'https://via.placeholder.com/100x100?text=Product';
            };
            
            const productTitle = document.createElement('h3');
            productTitle.className = 'product-title';
            productTitle.textContent = product.title;
            
            const productPrice = document.createElement('div');
            productPrice.className = 'product-price';
            productPrice.textContent = `$${product.price}`;
            
            const productRating = document.createElement('div');
            productRating.className = 'product-rating';
            productRating.textContent = `⭐ ${product.rating || 'N/A'}`;
            
            const actionButtons = document.createElement('div');
            actionButtons.className = 'action-buttons';
            
            const viewBtn = document.createElement('button');
            viewBtn.className = 'action-btn view-btn';
            viewBtn.dataset.productUrl = product.url;
            viewBtn.textContent = 'View Product';
            
            const trackBtn = document.createElement('button');
            trackBtn.className = 'action-btn track-btn';
            trackBtn.dataset.productId = product.id;
            trackBtn.textContent = 'Track Price';
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'action-btn remove-btn';
            removeBtn.dataset.productId = product.id;
            removeBtn.textContent = 'Remove';
            
            actionButtons.appendChild(viewBtn);
            actionButtons.appendChild(trackBtn);
            actionButtons.appendChild(removeBtn);
            
            productCard.appendChild(productImage);
            productCard.appendChild(productTitle);
            productCard.appendChild(productPrice);
            productCard.appendChild(productRating);
            productCard.appendChild(actionButtons);
            
            productsRow.appendChild(productCard);
        });
        
        comparisonGrid.appendChild(productsRow);
        
        // Add comparison table if we have at least 2 products
        if (this.products.length >= 2) {
            const comparisonTable = this.createComparisonTable();
            comparisonGrid.appendChild(comparisonTable);
        }
        
        this.comparisonResults.appendChild(comparisonGrid);

        // Add event listeners to buttons
        this.addProductEventListeners();
    }

    createComparisonTable() {
        const features = ['price', 'rating', 'shipping', 'prime'];
        
        const comparisonSection = document.createElement('div');
        comparisonSection.className = 'comparison-section';
        
        const tableHeading = document.createElement('h3');
        tableHeading.textContent = '📊 Feature Comparison';
        comparisonSection.appendChild(tableHeading);
        
        const comparisonTable = document.createElement('table');
        comparisonTable.className = 'comparison-table';
        
        // Create table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        const featureHeader = document.createElement('th');
        featureHeader.textContent = 'Feature';
        headerRow.appendChild(featureHeader);
        
        this.products.forEach((_, index) => {
            const productHeader = document.createElement('th');
            productHeader.textContent = `Product ${index + 1}`;
            headerRow.appendChild(productHeader);
        });
        
        thead.appendChild(headerRow);
        comparisonTable.appendChild(thead);
        
        // Create table body
        const tbody = document.createElement('tbody');
        
        features.forEach(feature => {
            const featureRow = document.createElement('tr');
            
            const featureNameCell = document.createElement('td');
            featureNameCell.textContent = this.formatFeatureName(feature);
            featureRow.appendChild(featureNameCell);
            
            this.products.forEach(product => {
                const featureValueCell = document.createElement('td');
                const featureClass = this.getFeatureClass(feature, product);
                if (featureClass) {
                    featureValueCell.className = featureClass;
                }
                featureValueCell.textContent = this.formatFeatureValue(feature, product);
                featureRow.appendChild(featureValueCell);
            });
            
            tbody.appendChild(featureRow);
        });
        
        comparisonTable.appendChild(tbody);
        comparisonSection.appendChild(comparisonTable);
        
        return comparisonSection;
    }

    formatFeatureName(feature) {
        const names = {
            'price': '💰 Price',
            'rating': '⭐ Rating',
            'shipping': '🚚 Shipping',
            'prime': '🎯 Prime'
        };
        return names[feature] || feature;
    }

    formatFeatureValue(feature, product) {
        switch (feature) {
            case 'price':
                return product.price ? `$${product.price}` : 'N/A';
            case 'rating':
                return product.rating || 'N/A';
            case 'shipping':
                return product.freeShipping ? 'Free' : 'Paid';
            case 'prime':
                return product.primeEligible ? 'Yes' : 'No';
            default:
                return product[feature] || 'N/A';
        }
    }

    getFeatureClass(feature, product) {
        if (!product[feature]) return '';
        
        const values = this.products.map(p => {
            switch (feature) {
                case 'price':
                    return parseFloat(p.price) || Infinity;
                case 'rating':
                    return parseFloat(p.rating) || 0;
                case 'shipping':
                    return p.freeShipping ? 1 : 0;
                case 'prime':
                    return p.primeEligible ? 1 : 0;
                default:
                    return 0;
            }
        });

        const currentValue = values[this.products.indexOf(product)];
        const bestValue = feature === 'price' ? Math.min(...values) : Math.max(...values);

        if (currentValue === bestValue) return 'feature-better';
        if (currentValue === (feature === 'price' ? Math.max(...values) : Math.min(...values))) return 'feature-worse';
        return 'feature-equal';
    }

    addProductEventListeners() {
        // View product buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const url = e.target.dataset.productUrl;
                if (url) {
                    chrome.tabs.create({ url: url });
                }
            });
        });

        // Track price buttons
        document.querySelectorAll('.track-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.target.dataset.productId;
                this.trackProduct(productId);
            });
        });

        // Remove product buttons
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.target.dataset.productId;
                this.removeProduct(productId);
            });
        });
    }

    trackProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (product) {
            chrome.runtime.sendMessage({
                action: 'trackProduct',
                product: product
            });

            // Update button to show tracking status
            const button = document.querySelector(`.track-btn[data-product-id="${productId}"]`);
            if (button) {
                button.textContent = '✅ Tracking';
                button.disabled = true;
            }
        }
    }

    showError(message) {
        // Clear existing content safely
        while (this.comparisonResults.firstChild) {
            this.comparisonResults.removeChild(this.comparisonResults.firstChild);
        }

        const errorDiv = document.createElement('div');
        errorDiv.className = 'loading';
        errorDiv.style.color = '#dc3545';
        
        const errorIcon = document.createTextNode('❌ ');
        const errorText = document.createTextNode(message);
        
        errorDiv.appendChild(errorIcon);
        errorDiv.appendChild(errorText);
        this.comparisonResults.appendChild(errorDiv);
    }
}

// Initialize the comparison manager
document.addEventListener('DOMContentLoaded', () => {
    new ProductComparison();
});