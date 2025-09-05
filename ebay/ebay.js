// ebay/ebay.js - FINAL: Dark Mode Persists After Refresh
document.addEventListener("DOMContentLoaded", function () {
    const searchForm = document.getElementById("searchForm");
    const searchInput = document.getElementById("searchInput");
    const resultsContainer = document.getElementById("results");
    const loadingIndicator = document.getElementById("loading");
    const errorDiv = document.getElementById("error");
    const clearSearchBtn = document.getElementById("clearSearch");
    const closeBtn = document.getElementById("closeBtn");

    const EBAY_AFFILIATE_CAMPAIGN_ID = "5339120658";

    let currentPage = 1;
    let totalPages = 1;
    let currentQuery = "";

    // ✅ Load dark mode state from settings
    function loadDarkModeFromSettings() {
        chrome.storage.sync.get(["settings"], (result) => {
            if (result.settings && typeof result.settings.darkMode !== "undefined") {
                document.body.classList.toggle("dark-mode", result.settings.darkMode);
            }
        });
    }

    function showError(message) {
        errorDiv.textContent = message;
        errorDiv.style.display = message ? "block" : "none";
    }

    function showLoading() {
        loadingIndicator.style.display = "block";
        errorDiv.style.display = "none";
    }

    function hideLoading() {
        loadingIndicator.style.display = "none";
    }

    function clearResults() {
        resultsContainer.innerHTML = "";
    }

    async function searchEbay(query, page = 1) {
        if (!query || !query.trim()) {
            showError("Please enter a search term");
            return;
        }

        const cleanQuery = query.trim();
        currentQuery = cleanQuery;
        currentPage = page;

        showLoading();
        clearResults();

        try {
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: "fetchEbaySearch",
                    query: cleanQuery,
                    page: page,
                    limit: 20
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else if (response?.error) {
                        reject(new Error(response.error));
                    } else {
                        resolve(response);
                    }
                });
            });

            if (response.warning) {
                showError("⚠️ " + response.warning);
            }

            if (!response.success) {
                throw new Error(response.error || "Search failed");
            }

            const data = response.data;
            totalPages = response.totalPages || 1;

            const items = data?.itemSummaries || [];
            if (items.length === 0) {
                const noResults = document.createElement("p");
                noResults.className = "no-results";
                noResults.textContent = `No results found for "${cleanQuery}"`;
                resultsContainer.appendChild(noResults);
                hideLoading();
                return;
            }

            // ✅ Safe DOM rendering
            const fragment = document.createDocumentFragment();
            items.forEach(item => {
                const card = createProductCard(item);
                fragment.appendChild(card);
            });

            resultsContainer.appendChild(fragment);

            // ✅ Append pagination controls
            const pagination = createPaginationControls();
            if (pagination) {
                resultsContainer.appendChild(pagination);
            }

            setupEventListeners();

        } catch (err) {
            showError(`Search failed: ${err.message}`);

            // Fallback to mock data
            const mock = getMockEbayData(cleanQuery, currentPage, 20);
            const fragment = document.createDocumentFragment();
            mock.itemSummaries.forEach(item => {
                const card = createProductCard(item);
                fragment.appendChild(card);
            });
            clearResults();
            resultsContainer.appendChild(fragment);

            const pagination = createPaginationControls();
            if (pagination) {
                resultsContainer.appendChild(pagination);
            }

            setupEventListeners();
        } finally {
            hideLoading();
        }
    }

    function createProductCard(item) {
        const title = sanitizeText(item.title || "No title");
        const priceValue = parseFloat(item.price?.value) || 0;
        const currency = item.price?.currency || "USD";
        const imageUrl = sanitizeUrl(item.image?.imageUrl || item.imageUrl || "");
        const itemUrl = item.itemWebUrl || "#";
        const condition = sanitizeText(item.condition || "Unknown");
        const shippingCost = parseFloat(item.shippingOptions?.[0]?.shippingCost?.value) || 0;
        const itemId = item.itemId || title.replace(/\s+/g, "_").toLowerCase();

        let affiliateUrl = itemUrl;
        try {
            const url = new URL(itemUrl);
            url.searchParams.set("mkcid", "1");
            url.searchParams.set("mkrid", "711-53200-19255-0");
            url.searchParams.set("campid", EBAY_AFFILIATE_CAMPAIGN_ID);
            url.searchParams.set("toolid", "10001");
            url.searchParams.set("customid", encodeURIComponent(title));
            affiliateUrl = url.toString();
        } catch (e) {
            // Silent fail
        }

        const totalPrice = priceValue + shippingCost;

        const card = document.createElement("div");
        card.className = "product-card";

        const link = document.createElement("a");
        link.href = affiliateUrl;
        link.target = "_blank";
        link.rel = "noopener";
        link.className = "product-link";

        const img = document.createElement("img");
        img.src = imageUrl;
        img.alt = title;
        img.className = "product-image";
        img.addEventListener("error", () => {
            img.src = "https://via.placeholder.com/150?text=No+Image";
        });

        const info = document.createElement("div");
        info.className = "product-info";

        const titleEl = document.createElement("h3");
        titleEl.className = "product-title";
        titleEl.textContent = title;

        const priceEl = document.createElement("div");
        priceEl.className = "product-price";
        priceEl.textContent = `${currency}$${priceValue.toFixed(2)}`;

        const shippingEl = document.createElement("div");
        shippingEl.className = "product-shipping";
        shippingEl.textContent = `+ ${currency}$${shippingCost.toFixed(2)} shipping`;

        const totalEl = document.createElement("div");
        totalEl.className = "product-total";
        totalEl.textContent = `Total: ${currency}$${totalPrice.toFixed(2)}`;

        const conditionEl = document.createElement("div");
        conditionEl.className = "product-condition";
        conditionEl.textContent = `Condition: ${condition}`;

        info.appendChild(titleEl);
        info.appendChild(priceEl);
        info.appendChild(shippingEl);
        info.appendChild(totalEl);
        info.appendChild(conditionEl);

        link.appendChild(img);
        link.appendChild(info);

        const compareBtn = document.createElement("button");
        compareBtn.className = "compare-btn";
        compareBtn.textContent = "Add to Comparison";
        compareBtn.dataset.itemId = itemId;
        compareBtn.dataset.title = title;
        compareBtn.dataset.url = affiliateUrl;
        compareBtn.dataset.image = imageUrl;
        compareBtn.dataset.price = priceValue;
        compareBtn.dataset.source = "eBay";

        compareBtn.addEventListener("click", handleCompareClick);

        card.appendChild(link);
        card.appendChild(compareBtn);

        return card;
    }

    function handleCompareClick(e) {
        e.preventDefault();
        e.stopPropagation();

        const btn = e.target.closest(".compare-btn");
        if (!btn) return;

        const productData = {
            id: btn.dataset.itemId,
            title: btn.dataset.title,
            url: btn.dataset.url,
            image: btn.dataset.image,
            price: parseFloat(btn.dataset.price),
            rating: 0,
            source: btn.dataset.source
        };

        chrome.runtime.sendMessage({
            action: "addToComparison",
            product: productData
        }, (response) => {
            if (response?.status === "added") {
                const msg = document.createElement("div");
                msg.textContent = "✅ Added to comparison!";
                msg.style.cssText = `
                    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
                    background: #28a745; color: white; padding: 10px 20px; border-radius: 6px;
                    z-index: 1000; font-weight: bold; box-shadow: 0 2px 10px rgba(0,0,0,0.2);
                `;
                document.body.appendChild(msg);
                setTimeout(() => {
                    msg.style.opacity = "0";
                    setTimeout(() => document.body.removeChild(msg), 300);
                }, 1500);
            }
        });
    }

    function createPaginationControls() {
        if (totalPages <= 1) return null;

        const container = document.createElement("div");
        container.className = "pagination-controls";

        if (currentPage > 1) {
            const prevBtn = document.createElement("button");
            prevBtn.className = "pagination-btn prev-btn";
            prevBtn.textContent = "← Previous";
            prevBtn.dataset.page = currentPage - 1;
            container.appendChild(prevBtn);
        }

        const pageInfo = document.createElement("span");
        pageInfo.className = "page-info";
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        container.appendChild(pageInfo);

        if (currentPage < totalPages) {
            const nextBtn = document.createElement("button");
            nextBtn.className = "pagination-btn next-btn";
            nextBtn.textContent = "Next →";
            nextBtn.dataset.page = currentPage + 1;
            container.appendChild(nextBtn);
        }

        return container;
    }

    function setupEventListeners() {
        // Pagination
        document.querySelectorAll(".pagination-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const page = parseInt(e.target.dataset.page);
                searchEbay(currentQuery, page);
                window.scrollTo(0, 0);
            });
        });

        // Compare buttons
        resultsContainer.removeEventListener("click", handleCompareClick);
        resultsContainer.addEventListener("click", (e) => {
            if (e.target.classList.contains("compare-btn") || e.target.closest(".compare-btn")) {
                handleCompareClick(e);
            }
        });

        // ✅ Dark mode toggle
        // Removed direct dark mode toggle as it's now handled by settings.js
    }

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
        return { itemSummaries: mockItems, total: totalItems };
    }

    function sanitizeText(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    function sanitizeUrl(url) {
        try {
            const parsed = new URL(url);
            if (["http:", "https:", "data:"].includes(parsed.protocol)) {
                return url;
            }
        } catch (e) {
            // Silent fail
        }
        return "https://via.placeholder.com/150?text=No+Image";
    }

    // Form submit
    searchForm.addEventListener("submit", e => {
        e.preventDefault();
        currentPage = 1;
        searchEbay(searchInput.value);
    });

    // Auto-search
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get("search");
    if (query) {
        searchInput.value = query;
        searchEbay(query);
    }

    searchInput.focus();

    // Keyboard
    searchInput.addEventListener("keypress", e => {
        if (e.key === "Enter") {
            e.preventDefault();
            currentPage = 1;
            searchEbay(searchInput.value);
        }
    });

    // UI buttons
    clearSearchBtn?.addEventListener("click", () => {
        searchInput.value = "";
        clearResults();
        searchInput.focus();
        currentPage = 1;
        totalPages = 1;
        currentQuery = "";
    });

    closeBtn?.addEventListener("click", () => window.close());

    // ✅ Initialize dark mode on load from settings
    loadDarkModeFromSettings();

    // Listen for settings updates from background script or settings page
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "settingsUpdated") {
            const newSettings = request.settings;
            if (newSettings && typeof newSettings.darkMode !== "undefined") {
                document.body.classList.toggle("dark-mode", newSettings.darkMode);
            }
        }
    });
});

