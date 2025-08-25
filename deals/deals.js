 // Configuration - moved to top for easy management
const AFFILIATE_TAG = 'elise200f-20';

class DealBrowser {
    constructor() {
        this.deals = [];
        this.filteredDeals = [];
        this.currentCategory = 'all';
        this.currentSort = 'discount';
        
        this.initializeElements();
        this.loadSettings();
        this.loadDeals();
        this.setupEventListeners();
    }

    initializeElements() {
        this.dealsGrid = document.getElementById('dealsGrid');
        this.categoryFilter = document.getElementById('categoryFilter');
        this.sortFilter = document.getElementById('sortFilter');
        this.refreshBtn = document.getElementById('refreshBtn');
        this.activeDealsCount = document.getElementById('activeDealsCount');
        this.totalSavings = document.getElementById('totalSavings');
        this.avgDiscount = document.getElementById('avgDiscount');
        this.enableAlerts = document.getElementById('enableAlerts');
        this.soundAlerts = document.getElementById('soundAlerts');
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get('dealSettings');
            const settings = (result && result.dealSettings) || {};
            
            if (this.enableAlerts && settings.enableAlerts !== undefined) {
                this.enableAlerts.checked = settings.enableAlerts;
            }
            if (this.soundAlerts && settings.soundAlerts !== undefined) {
                this.soundAlerts.checked = settings.soundAlerts;
            }
            if (settings.alertCategories) {
                this.setAlertCategories(settings.alertCategories);
            }
        } catch (error) {
            if (this.enableAlerts) this.enableAlerts.checked = true;
            if (this.soundAlerts) this.soundAlerts.checked = false;
        }
    }

    setAlertCategories(categories) {
        const checkboxes = document.querySelectorAll('.alert-categories input');
        checkboxes.forEach(checkbox => {
            checkbox.checked = categories.includes(checkbox.value);
        });
    }

    async saveSettings() {
        try {
            const alertCategories = Array.from(
                document.querySelectorAll('.alert-categories input:checked')
            ).map(checkbox => checkbox.value);

            const settings = {
                enableAlerts: this.enableAlerts ? this.enableAlerts.checked : true,
                soundAlerts: this.soundAlerts ? this.soundAlerts.checked : false,
                alertCategories: alertCategories
            };

            await chrome.storage.sync.set({ dealSettings: settings });
        } catch (error) {
            // Error handled silently
        }
    }

    async loadDeals() {
        this.showLoading();
        
        try {
            this.deals = await this.fetchDealsFromAPI();
            this.applyFilters();
            this.updateStats();
        } catch (error) {
            this.showError('Failed to load deals. Please try again.');
        }
    }

    async fetchDealsFromAPI() {
        // Use popular search terms instead of specific ASINs
        const popularSearches = [
            {
                searchTerm: 'wireless+headphones',
                title: 'Wireless Bluetooth Headphones - Noise Cancelling',
                category: 'electronics',
                image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=200&fit=crop'
            },
            {
                searchTerm: 'smart+speaker',
                title: 'Smart Speaker with Voice Assistant',
                category: 'electronics',
                image: 'https://images.unsplash.com/photo-1589003077984-894e133dabab?w=300&h=200&fit=crop'
            },
            {
                searchTerm: 'pressure+cooker',
                title: 'Electric Pressure Cooker - 6 Quart',
                category: 'home',
                image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&h=200&fit=crop'
            },
            {
                searchTerm: 'e+reader',
                title: 'E-Reader with Backlit Display',
                category: 'books',
                image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&h=200&fit=crop'
            },
            {
                searchTerm: 'air+fryer',
                title: 'Air Fryer - 4 Quart Capacity',
                category: 'home',
                image: 'https://images.unsplash.com/photo-1555072956-7758afc43b8a?w=300&h=200&fit=crop'
            },
            {
                searchTerm: 'wireless+earbuds',
                title: 'Wireless Earbuds with Charging Case',
                category: 'electronics',
                image: 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=300&h=200&fit=crop'
            }
        ];

        return popularSearches.map((product, index) => {
            const discount = Math.floor(Math.random() * 50) + 15;
            const originalPrice = Math.floor(Math.random() * 200) + 50;
            const currentPrice = originalPrice * (1 - discount / 100);
            
            return {
                id: `deal-${index + 1}`,
                title: product.title,
                image: product.image,
                originalPrice: originalPrice,
                currentPrice: parseFloat(currentPrice.toFixed(2)),
                discount: discount,
                category: product.category,
                timeLeft: `${Math.floor(Math.random() * 8) + 1}h ${Math.floor(Math.random() * 60)}m`,
                claimed: `${Math.floor(Math.random() * 80) + 10}%`,
                searchTerm: product.searchTerm
            };
        });
    }

    applyFilters() {
        this.filteredDeals = this.currentCategory === 'all' 
            ? [...this.deals] 
            : this.deals.filter(deal => deal.category === this.currentCategory);

        this.sortDeals();
        this.renderDeals();
    }

    sortDeals() {
        switch (this.currentSort) {
            case 'discount':
                this.filteredDeals.sort((a, b) => b.discount - a.discount);
                break;
            case 'price':
                this.filteredDeals.sort((a, b) => a.currentPrice - b.currentPrice);
                break;
            case 'time':
                this.filteredDeals.sort((a, b) => this.parseTimeLeft(a.timeLeft) - this.parseTimeLeft(b.timeLeft));
                break;
        }
    }

    parseTimeLeft(timeString) {
        const hours = parseInt(timeString.match(/(\d+)h/)?.[1] || 0);
        const minutes = parseInt(timeString.match(/(\d+)m/)?.[1] || 0);
        return hours * 60 + minutes;
    }

    renderDeals() {
        // Clear existing content safely
        while (this.dealsGrid.firstChild) {
            this.dealsGrid.removeChild(this.dealsGrid.firstChild);
        }

        if (this.filteredDeals.length === 0) {
            const noDealsDiv = document.createElement('div');
            noDealsDiv.className = 'loading';
            noDealsDiv.textContent = 'No deals found for the selected filters.';
            this.dealsGrid.appendChild(noDealsDiv);
            return;
        }

        const fragment = document.createDocumentFragment();
        
        this.filteredDeals.forEach(deal => {
            const dealCard = document.createElement('div');
            dealCard.className = 'deal-card new-deal';
            
            // Create deal image
            const dealImage = document.createElement('img');
            dealImage.src = deal.image;
            dealImage.alt = deal.title;
            dealImage.className = 'deal-image';
            dealImage.onerror = function() {
                this.src = 'https://via.placeholder.com/300x200?text=Product+Image';
            };
            
            // Create deal title
            const dealTitle = document.createElement('h3');
            dealTitle.className = 'deal-title';
            dealTitle.textContent = deal.title;
            
            // Create deal price section
            const dealPrice = document.createElement('div');
            dealPrice.className = 'deal-price';
            
            const originalPrice = document.createElement('span');
            originalPrice.className = 'original-price';
            originalPrice.textContent = `$${deal.originalPrice.toFixed(2)}`;
            
            const currentPrice = document.createElement('span');
            currentPrice.className = 'current-price';
            currentPrice.textContent = `$${deal.currentPrice.toFixed(2)}`;
            
            const discountBadge = document.createElement('span');
            discountBadge.className = 'discount-badge';
            discountBadge.textContent = `-${deal.discount}%`;
            
            dealPrice.appendChild(originalPrice);
            dealPrice.appendChild(currentPrice);
            dealPrice.appendChild(discountBadge);
            
            // Create deal meta section
            const dealMeta = document.createElement('div');
            dealMeta.className = 'deal-meta';
            
            const timeLeft = document.createElement('span');
            timeLeft.className = 'time-left';
            if (this.parseTimeLeft(deal.timeLeft) < 120) {
                timeLeft.classList.add('ending-soon');
            }
            timeLeft.textContent = `⏰ ${deal.timeLeft}`;
            
            const claimed = document.createElement('span');
            claimed.className = 'claimed';
            claimed.textContent = `✅ ${deal.claimed} claimed`;
            
            dealMeta.appendChild(timeLeft);
            dealMeta.appendChild(claimed);
            
            // Create deal actions section
            const dealActions = document.createElement('div');
            dealActions.className = 'deal-actions';
            
            const viewDealBtn = document.createElement('button');
            viewDealBtn.className = 'view-deal-btn';
            viewDealBtn.dataset.searchTerm = deal.searchTerm;
            viewDealBtn.textContent = 'View Deal';
            
            const trackDealBtn = document.createElement('button');
            trackDealBtn.className = 'track-deal-btn';
            trackDealBtn.dataset.dealId = deal.id;
            trackDealBtn.textContent = '🔔 Track';
            
            dealActions.appendChild(viewDealBtn);
            dealActions.appendChild(trackDealBtn);
            
            // Assemble the deal card
            dealCard.appendChild(dealImage);
            dealCard.appendChild(dealTitle);
            dealCard.appendChild(dealPrice);
            dealCard.appendChild(dealMeta);
            dealCard.appendChild(dealActions);
            
            fragment.appendChild(dealCard);
        });
        
        this.dealsGrid.appendChild(fragment);
    }

    updateStats() {
        this.activeDealsCount.textContent = this.filteredDeals.length;
        
        const totalSavings = this.filteredDeals.reduce((sum, deal) => 
            sum + (deal.originalPrice - deal.currentPrice), 0
        );
        this.totalSavings.textContent = `$${totalSavings.toFixed(2)}`;
        
        const avgDiscount = this.filteredDeals.length > 0 
            ? this.filteredDeals.reduce((sum, deal) => sum + deal.discount, 0) / this.filteredDeals.length
            : 0;
        this.avgDiscount.textContent = `${avgDiscount.toFixed(1)}%`;
    }

    viewDeal(searchTerm) {
        // Use background script to create affiliate link securely
        chrome.runtime.sendMessage({
            action: 'createAffiliateLink',
            searchTerm: searchTerm,
            affiliateTag: AFFILIATE_TAG
        }, function(response) {
            if (response && response.url) {
                chrome.tabs.create({ url: response.url });
            }
        });
        
        chrome.runtime.sendMessage({
            action: 'trackDealClick',
            searchTerm: searchTerm
        });
    }

    trackDeal(dealId) {
        const deal = this.deals.find(d => d.id === dealId);
        if (deal) {
            if (this.enableAlerts && this.enableAlerts.checked) {
                this.sendDealNotification(deal);
            }
            
            const button = document.querySelector(`.track-deal-btn[data-deal-id="${dealId}"]`);
            if (button) {
                button.textContent = '✅ Tracking';
                button.classList.add('tracking');
                button.disabled = true;
            }
            
            this.saveTrackedDeal(deal);
        }
    }

    sendDealNotification(deal) {
        if (chrome.notifications) {
            chrome.notifications.create(`deal-${deal.id}`, {
                type: 'basic',
                iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
                title: '🔥 Hot Deal Alert!',
                message: `${deal.title} - ${deal.discount}% off!`,
                contextMessage: `Now: $${deal.currentPrice} (Was: $${deal.originalPrice})`
            });
        }

        if (this.soundAlerts && this.soundAlerts.checked) {
            this.playNotificationSound();
        }
    }

    playNotificationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            gainNode.gain.value = 0.1;
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            // Audio not supported
        }
    }

    async saveTrackedDeal(deal) {
        try {
            const result = await chrome.storage.sync.get('trackedDeals');
            const trackedDeals = result.trackedDeals || [];
            
            if (!trackedDeals.find(d => d.id === deal.id)) {
                trackedDeals.push({
                    ...deal,
                    trackedAt: Date.now()
                });
                
                await chrome.storage.sync.set({ trackedDeals: trackedDeals });
            }
        } catch (error) {
            // Error handled silently
        }
    }

    showLoading() {
        if (this.dealsGrid) {
            // Clear existing content safely
            while (this.dealsGrid.firstChild) {
                this.dealsGrid.removeChild(this.dealsGrid.firstChild);
            }
            
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'loading';
            loadingDiv.textContent = 'Loading deals...';
            this.dealsGrid.appendChild(loadingDiv);
        }
    }

    showError(message) {
        if (this.dealsGrid) {
            // Clear existing content safely
            while (this.dealsGrid.firstChild) {
                this.dealsGrid.removeChild(this.dealsGrid.firstChild);
            }
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'loading';
            errorDiv.style.color = '#dc3545';
            
            const errorText = document.createTextNode(`❌ ${message}`);
            errorDiv.appendChild(errorText);
            
            const lineBreak = document.createElement('br');
            errorDiv.appendChild(lineBreak);
            
            const retryButton = document.createElement('button');
            retryButton.textContent = 'Try Again';
            retryButton.style.cssText = 'margin-top: 10px; padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;';
            retryButton.addEventListener('click', () => this.loadDeals());
            
            errorDiv.appendChild(retryButton);
            this.dealsGrid.appendChild(errorDiv);
        }
    }

    setupEventListeners() {
        // Category filter
        if (this.categoryFilter) {
            this.categoryFilter.addEventListener('change', (e) => {
                this.currentCategory = e.target.value;
                this.applyFilters();
                this.updateStats();
            });
        }

        // Sort filter
        if (this.sortFilter) {
            this.sortFilter.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.applyFilters();
            });
        }

        // Refresh button
        if (this.refreshBtn) {
            this.refreshBtn.addEventListener('click', () => this.loadDeals());
        }

        // Alert checkboxes
        if (this.enableAlerts) {
            this.enableAlerts.addEventListener('change', () => this.saveSettings());
        }
        if (this.soundAlerts) {
            this.soundAlerts.addEventListener('change', () => this.saveSettings());
        }

        // Alert category checkboxes
        const alertCheckboxes = document.querySelectorAll('.alert-categories input');
        alertCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.saveSettings());
        });

        // Deal actions using event delegation
        if (this.dealsGrid) {
            this.dealsGrid.addEventListener('click', (e) => {
                const target = e.target;
                const dealId = target.dataset.dealId;
                const searchTerm = target.dataset.searchTerm;
                
                if (searchTerm && target.classList.contains('view-deal-btn')) {
                    this.viewDeal(searchTerm);
                } else if (dealId && target.classList.contains('track-deal-btn')) {
                    this.trackDeal(dealId);
                }
            });
        }
    }
}

// Initialize the deals manager
document.addEventListener('DOMContentLoaded', () => {
    const dealsManager = new DealBrowser();
});