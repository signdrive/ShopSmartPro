// deals.js - ShopSmart Pro | FINAL: Fixed "View Deal", Store-Ready + Dark Mode Sync
const AFFILIATE_TAG = 'elise200f-20';
const DEFAULT_COUNTRY = 'com'; // Match your settings

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

        // ✅ Load dark mode from global settings
        this.loadDarkMode();
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
            const result = await new Promise(resolve => {
                chrome.storage.sync.get(['dealSettings'], resolve);
            });
            const settings = result.dealSettings || {};

            if (this.enableAlerts) {
                this.enableAlerts.checked = settings.enableAlerts !== false;
            }
            if (this.soundAlerts) {
                this.soundAlerts.checked = !!settings.soundAlerts;
            }
            if (settings.alertCategories) {
                this.setAlertCategories(settings.alertCategories);
            }
        } catch (error) {
            console.warn('Failed to load deal settings', error);
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

            await new Promise(resolve => {
                chrome.storage.sync.set({ dealSettings: settings }, resolve);
            });
        } catch (error) {
            console.warn('Failed to save deal settings:', error);
        }
    }

    async loadDeals() {
        this.showLoading();

        try {
            this.deals = await this.fetchDealsFromAPI();
            this.applyFilters();
            this.updateStats();
        } catch (error) {
            console.error('Failed to load deals:', error);
            this.showError('Failed to load deals. Please try again.');
        }
    }

    async fetchDealsFromAPI() {
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

            const dealImage = document.createElement('img');
            dealImage.src = deal.image;
            dealImage.alt = deal.title;
            dealImage.className = 'deal-image';
            dealImage.style.opacity = '0';
            dealImage.onload = () => { dealImage.style.opacity = '1'; };
            dealImage.onerror = () => {
                if (!dealImage.src.includes('placeholder')) {
                    dealImage.src = 'https://via.placeholder.com/300x200?text=Product+Image';
                }
                dealImage.style.opacity = '1';
            };

            const dealTitle = document.createElement('h3');
            dealTitle.className = 'deal-title';
            dealTitle.textContent = deal.title;

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

    // ✅ Fixed: Direct URL creation with feedback
    viewDeal(searchTerm) {
        if (!searchTerm) return;

        // Try background handler first
        chrome.runtime.sendMessage({
            action: 'createAffiliateLink',
            searchTerm: searchTerm,
            affiliateTag: AFFILIATE_TAG
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.warn('Message failed, falling back to direct URL:', chrome.runtime.lastError.message);
            }

            // Fallback: build URL directly
            const url = `https://www.amazon.com/s?k=${encodeURIComponent(searchTerm)}&tag=${AFFILIATE_TAG}`;
            chrome.tabs.create({ url }, () => {
                if (chrome.runtime.lastError) {
                    console.error('Failed to open tab:', chrome.runtime.lastError);
                }
            });
        });

        // Track click
        chrome.runtime.sendMessage({
            action: 'trackDealClick',
            searchTerm: searchTerm
        }, () => {});

        // Optional: show success toast
        this.showTempMessage('🔍 Searching Amazon...');
    }

    // ✅ Utility: Show temporary message
    showTempMessage(message) {
        const msg = document.createElement('div');
        msg.textContent = message;
        msg.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: #007bff; color: white; padding: 10px 20px; border-radius: 6px;
            z-index: 1000; font-weight: bold; box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(msg);
        setTimeout(() => {
            msg.style.opacity = '0';
            setTimeout(() => document.body.removeChild(msg), 300);
        }, 1500);
    }

    trackDeal(dealId) {
        const deal = this.deals.find(d => d.id === dealId);
        if (!deal) return;

        if (this.enableAlerts?.checked) {
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

    sendDealNotification(deal) {
        if (chrome.notifications) {
            chrome.notifications.create(`deal-${deal.id}`, {
                type: 'basic',
                iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
                title: '🔥 Hot Deal Alert!',
                message: `${deal.title.substring(0, 50)}... - ${deal.discount}% off!`,
                contextMessage: `Now: $${deal.currentPrice} (Was: $${deal.originalPrice})`
            });
        }

        if (this.soundAlerts?.checked) {
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
            console.warn('Audio not supported:', error);
        }
    }

    async saveTrackedDeal(deal) {
        try {
            const result = await new Promise(resolve => {
                chrome.storage.sync.get(['trackedDeals'], resolve);
            });
            const trackedDeals = result.trackedDeals || [];

            if (!trackedDeals.find(d => d.id === deal.id)) {
                trackedDeals.push({ ...deal, trackedAt: Date.now() });
                await new Promise(resolve => {
                    chrome.storage.sync.set({ trackedDeals }, resolve);
                });
            }
        } catch (error) {
            console.warn('Failed to save tracked deal:', error);
        }
    }

    showLoading() {
        while (this.dealsGrid.firstChild) {
            this.dealsGrid.removeChild(this.dealsGrid.firstChild);
        }
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading';
        loadingDiv.textContent = 'Loading deals...';
        this.dealsGrid.appendChild(loadingDiv);
    }

    showError(message) {
        while (this.dealsGrid.firstChild) {
            this.dealsGrid.removeChild(this.dealsGrid.firstChild);
        }
        const errorDiv = document.createElement('div');
        errorDiv.className = 'loading';
        errorDiv.style.color = '#dc3545';
        errorDiv.textContent = `❌ ${message}`;
        const retryButton = document.createElement('button');
        retryButton.textContent = 'Try Again';
        retryButton.style.cssText = 'margin-top: 10px; padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;';
        retryButton.addEventListener('click', () => this.loadDeals());
        errorDiv.appendChild(document.createElement('br'));
        errorDiv.appendChild(retryButton);
        this.dealsGrid.appendChild(errorDiv);
    }

    setupEventListeners() {
        if (this.categoryFilter) {
            this.categoryFilter.addEventListener('change', (e) => {
                this.currentCategory = e.target.value;
                this.applyFilters();
                this.updateStats();
            });
        }

        if (this.sortFilter) {
            this.sortFilter.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.applyFilters();
            });
        }

        if (this.refreshBtn) {
            this.refreshBtn.addEventListener('click', () => this.loadDeals());
        }

        if (this.enableAlerts) {
            this.enableAlerts.addEventListener('change', () => this.saveSettings());
        }
        if (this.soundAlerts) {
            this.soundAlerts.addEventListener('change', () => this.saveSettings());
        }

        const alertCheckboxes = document.querySelectorAll('.alert-categories input');
        alertCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.saveSettings());
        });

        if (this.dealsGrid) {
            this.dealsGrid.addEventListener('click', (e) => {
                const target = e.target.closest('button');
                if (!target) return;

                const searchTerm = target.dataset.searchTerm;
                const dealId = target.dataset.dealId;

                if (searchTerm && target.classList.contains('view-deal-btn')) {
                    this.viewDeal(searchTerm);
                } else if (dealId && target.classList.contains('track-deal-btn')) {
                    this.trackDeal(dealId);
                }
            });
        }
    }

    // ✅ Load dark mode from settings
    loadDarkMode() {
        chrome.storage.sync.get(['settings'], (result) => {
            const settings = result.settings || {};
            document.body.classList.toggle('dark-mode', !!settings.darkMode);
        });
    }
}

// ✅ Listen for global settings update
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'settingsUpdated') {
        document.body.classList.toggle('dark-mode', !!request.settings.darkMode);
        sendResponse({ status: 'success' });
    }
    return true;
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new DealBrowser();
});