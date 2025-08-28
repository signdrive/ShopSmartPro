// ebay/ebay.js - ShopSmart Pro | FINAL: No CSP Violations, Working Images

document.addEventListener('DOMContentLoaded', function () {
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    const resultsContainer = document.getElementById('results');
    const loadingIndicator = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const clearSearchBtn = document.getElementById('clearSearch');
    const closeBtn = document.getElementById('closeBtn');
    const darkModeToggle = document.getElementById('darkModeToggle');

    // ✅ Your affiliate tag
    const EBAY_AFFILIATE_CAMPAIGN_ID = '5339120658';

    function showError(message) {
        errorDiv.textContent = message;
        errorDiv.style.display = message ? 'block' : 'none';
    }

    function showLoading() {
        loadingIndicator.style.display = 'block';
        errorDiv.style.display = 'none';
    }

    function hideLoading() {
        loadingIndicator.style.display = 'none';
    }

    function updateResults(html) {
        resultsContainer.innerHTML = html;
    }

    async function searchEbay(query) {
        if (!query || !query.trim()) {
            showError('Please enter a search term');
            return;
        }

        const cleanQuery = query.trim();
        showLoading();
        showError(''); // Clear previous error

        try {
            const response = await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: 'fetchEbaySearch',
                    query: cleanQuery
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('Background script error:', chrome.runtime.lastError);
                        resolve({ error: chrome.runtime.lastError.message });
                    } else {
                        resolve(response || { error: 'No response from background script' });
                    }
                });
            });

            if (response.warning) {
                showError('⚠️ ' + response.warning);
            }

            if (response.error) {
                throw new Error(response.error);
            }

            const data = response.data;
            let items = [];

            if (data?.itemSummaries && Array.isArray(data.itemSummaries)) {
                items = data.itemSummaries;
            } else if (response.mockData) {
                items = response.mockData.itemSummaries;
            } else {
                throw new Error('Invalid response format or no results');
            }

            if (items.length === 0) {
                updateResults('<p class="no-results">No results found for "' + cleanQuery + '"</p>');
                hideLoading();
                return;
            }

            const resultsHtml = items.map(item => {
                const title = item.title || 'No title';
                const priceValue = item.price?.value || 0;
                const currency = item.price?.currency || 'USD';
                const image = item.imageUrl || '';
                const itemUrl = item.itemWebUrl || '#';
                const condition = item.condition || 'Unknown';
                const shippingCost = item.shippingOptions?.[0]?.shippingCost?.value || 0;

                const url = new URL(itemUrl);
                url.searchParams.set('mkcid', '1');
                url.searchParams.set('mkrid', '711-53200-19255-0');
                url.searchParams.set('campid', EBAY_AFFILIATE_CAMPAIGN_ID);
                url.searchParams.set('toolid', '10001');
                url.searchParams.set('customid', encodeURIComponent(title));

                const totalPrice = parseFloat(priceValue) + parseFloat(shippingCost);

                return `
                    <div class="product-card">
                        <a href="${url.toString()}" target="_blank" class="product-link" rel="noopener">
                            <img src="${image}" alt="${title}" class="product-image" data-fallback="https://via.placeholder.com/150?text=No+Image">
                            <div class="product-info">
                                <h3 class="product-title">${title}</h3>
                                <div class="product-price">${currency}$${parseFloat(priceValue).toFixed(2)}</div>
                                <div class="product-shipping">+ ${currency}$${parseFloat(shippingCost).toFixed(2)} shipping</div>
                                <div class="product-total">Total: ${currency}$${totalPrice.toFixed(2)}</div>
                                <div class="product-condition">Condition: ${condition}</div>
                            </div>
                        </a>
                        <button class="compare-btn" data-item='${JSON.stringify({
                            id: item.itemId || item.title.replace(/\s+/g, '_').toLowerCase(),
                            title: title,
                            url: url.toString(),
                            image: image,
                            price: parseFloat(priceValue),
                            rating: 0,
                            source: 'eBay'
                        })}'>Add to Comparison</button>
                    </div>
                `;
            }).join('');

            updateResults(resultsHtml);

            // ✅ Fix image fallbacks
            resultsContainer.querySelectorAll('.product-image').forEach(img => {
                if (!img.dataset.listenerAdded) {
                    img.dataset.listenerAdded = 'true';
                    img.addEventListener('error', function () {
                        if (this.src !== this.dataset.fallback) {
                            this.src = this.dataset.fallback;
                        }
                    });
                }
            });

            // ✅ Use event delegation for buttons
            resultsContainer.removeEventListener('click', handleCompareClick);
            resultsContainer.addEventListener('click', handleCompareClick);

        } catch (err) {
            console.error('Search failed:', err);
            showError(`Search failed: ${err.message}`);
            updateResults('');
        } finally {
            hideLoading();
        }
    }

    function handleCompareClick(e) {
        const btn = e.target.closest('.compare-btn');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();

        const itemData = JSON.parse(btn.getAttribute('data-item'));
        chrome.runtime.sendMessage({
            action: 'addToComparison',
            product: itemData
        }, function (response) {
            if (response && response.status === 'added') {
                alert('Added to comparison!');
            }
        });
    }

    // Handle form submit
    searchForm.addEventListener('submit', e => {
        e.preventDefault();
        searchEbay(searchInput.value);
    });

    // Auto-search if query in URL
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('search');
    if (query) {
        searchInput.value = query;
        searchEbay(query);
    }

    // Focus input
    searchInput.focus();

    // Keyboard shortcut
    searchInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchForm.dispatchEvent(new Event('submit'));
        }
    });

    // UI buttons
    clearSearchBtn?.addEventListener('click', () => {
        searchInput.value = '';
        updateResults('');
        searchInput.focus();
    });

    closeBtn?.addEventListener('click', () => {
        window.close();
    });

    darkModeToggle?.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        document.body.classList.toggle('light-mode');
    });
});