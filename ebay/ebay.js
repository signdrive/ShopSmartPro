// ebay/ebay.js - ShopSmart Pro | Fixed: Async Response + Pagination

document.addEventListener('DOMContentLoaded', function () {
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    const resultsContainer = document.getElementById('results');
    const loadingIndicator = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const clearSearchBtn = document.getElementById('clearSearch');
    const closeBtn = document.getElementById('closeBtn');
    const darkModeToggle = document.getElementById('darkModeToggle');

    const EBAY_AFFILIATE_CAMPAIGN_ID = '5339120658';

    // Pagination variables
    let currentPage = 1;
    let totalPages = 1;
    let currentQuery = '';

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

    async function searchEbay(query, page = 1) {
        if (!query || !query.trim()) {
            showError('Please enter a search term');
            return;
        }

        const cleanQuery = query.trim();
        currentQuery = cleanQuery;
        currentPage = page;
        
        showLoading();

        try {
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'fetchEbaySearch',
                    query: cleanQuery,
                    page: page,
                    limit: 20
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else if (response && response.error) {
                        reject(new Error(response.error));
                    } else if (response) {
                        resolve(response);
                    } else {
                        reject(new Error('No response from background script'));
                    }
                });
            });

            if (response.warning) {
                showError('⚠️ ' + response.warning);
            }

            if (!response.success) {
                throw new Error(response.error || 'Search failed');
            }

            const data = response.data;
            totalPages = response.totalPages || 1;
            
            let items = [];
            if (data?.itemSummaries && Array.isArray(data.itemSummaries)) {
                items = data.itemSummaries;
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
                const image = item.image?.imageUrl || item.imageUrl || '';
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
                            <img src="${image}" alt="${title}" class="product-image" onerror="this.src='https://via.placeholder.com/150'">
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

            // Add pagination controls
            const paginationHtml = createPaginationControls();
            updateResults(resultsHtml + paginationHtml);

            // Setup event listeners
            setupEventListeners();

        } catch (err) {
            console.error('Search failed:', err);
            showError(`Search failed: ${err.message}`);
            
            // Fallback to mock data
            const mock = getMockEbayData(cleanQuery, currentPage, 20);
            const mockHtml = mock.itemSummaries.map(item => {
                const title = item.title || 'No title';
                const priceValue = item.price?.value || 0;
                const currency = item.price?.currency || 'USD';
                const image = item.image?.imageUrl || item.imageUrl || '';
                const itemUrl = item.itemWebUrl || '#';
                const condition = item.condition || 'Unknown';
                const shippingCost = item.shippingOptions?.[0]?.shippingCost?.value || 0;

                const totalPrice = parseFloat(priceValue) + parseFloat(shippingCost);

                return `
                    <div class="product-card">
                        <a href="${itemUrl}" target="_blank" class="product-link" rel="noopener">
                            <img src="${image}" alt="${title}" class="product-image">
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
                            url: itemUrl,
                            image: image,
                            price: parseFloat(priceValue),
                            rating: 0,
                            source: 'eBay'
                        })}'>Add to Comparison</button>
                    </div>
                `;
            }).join('');
            
            const paginationHtml = createPaginationControls();
            updateResults(mockHtml + paginationHtml);
            setupEventListeners();
            
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
            if (response?.status === 'added') {
                alert('Added to comparison!');
            }
        });
    }

    // Create pagination controls
    function createPaginationControls() {
        if (totalPages <= 1) return '';
        
        let paginationHtml = '<div class="pagination-controls">';
        
        // Previous button
        if (currentPage > 1) {
            paginationHtml += `<button class="pagination-btn prev-btn" data-page="${currentPage - 1}">← Previous</button>`;
        }
        
        // Page info
        paginationHtml += `<span class="page-info">Page ${currentPage} of ${totalPages}</span>`;
        
        // Next button
        if (currentPage < totalPages) {
            paginationHtml += `<button class="pagination-btn next-btn" data-page="${currentPage + 1}">Next →</button>`;
        }
        
        paginationHtml += '</div>';
        return paginationHtml;
    }

    // Setup event listeners
    function setupEventListeners() {
        // Compare buttons
        resultsContainer.removeEventListener('click', handleCompareClick);
        resultsContainer.addEventListener('click', handleCompareClick);

        // Pagination buttons
        const paginationButtons = document.querySelectorAll('.pagination-btn');
        paginationButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(button.getAttribute('data-page'));
                searchEbay(currentQuery, page);
                
                // Scroll to top
                window.scrollTo(0, 0);
            });
        });
    }

    // Mock data fallback
    function getMockEbayData(query, page = 1, limit = 20) {
        const mockItems = [];
        const totalItems = 35;
        
        for (let i = 1; i <= limit; i++) {
            const itemNumber = (page - 1) * limit + i;
            if (itemNumber > totalItems) break;
            
            mockItems.push({
                title: `${query} - Robot Toy #${itemNumber}`,
                price: { value: (24.99 + itemNumber).toFixed(2), currency: "USD" },
                imageUrl: "https://via.placeholder.com/150",
                itemWebUrl: `https://www.ebay.com/itm/${1234567890 + itemNumber}`,
                shippingOptions: [{ shippingCost: { value: "5.99", currency: "USD" } }],
                condition: itemNumber % 2 === 0 ? "New" : "Used",
                itemId: `mock_${1234567890 + itemNumber}`
            });
        }
        
        return {
            itemSummaries: mockItems,
            total: totalItems
        };
    }

    // Handle form submit
    searchForm.addEventListener('submit', e => {
        e.preventDefault();
        currentPage = 1;
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
            currentPage = 1;
            searchEbay(searchInput.value);
        }
    });

    // UI buttons
    clearSearchBtn?.addEventListener('click', () => {
        searchInput.value = '';
        updateResults('');
        searchInput.focus();
        currentPage = 1;
        totalPages = 1;
        currentQuery = '';
    });

    closeBtn?.addEventListener('click', () => {
        window.close();
    });

    darkModeToggle?.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        document.body.classList.toggle('light-mode');
    });
});