// tracked.js - ShopSmart Pro | FINAL: Global Dark Mode Sync, No Local Toggle
document.addEventListener("DOMContentLoaded", function () {
    const trackedResults = document.getElementById("trackedResults");
    const closeBtn = document.getElementById("closeBtn");
    const searchInput = document.getElementById("searchInput");
    const categoryFilter = document.getElementById("categoryFilter");
    const exportCsvBtn = document.getElementById("exportCsvBtn");

    let allProducts = [];
    const charts = new Map(); // Store chart instances

    // Close button
    closeBtn?.addEventListener("click", () => window.close());

    // ✅ Load dark mode from global settings
    function loadDarkMode() {
        chrome.storage.sync.get(['settings'], (result) => {
            const settings = result.settings || {};
            document.body.classList.toggle('dark-mode', !!settings.darkMode);
        });
    }

    // ✅ Listen for global settings update
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'settingsUpdated') {
            document.body.classList.toggle('dark-mode', !!request.settings.darkMode);
            sendResponse({ status: 'success' });
        }
        return true;
    });

    // Load tracked products safely
    function loadTrackedProducts() {
        chrome.storage.sync.get(["trackedProducts"], (result) => {
            let products = [];

            // ✅ Only use trackedProducts array
            if (Array.isArray(result?.trackedProducts)) {
                products = result.trackedProducts;
            } else {
                console.log("No tracked products found.");
            }

            allProducts = products;

            // ✅ Populate category filter
            const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
            categoryFilter.innerHTML = `<option value="all">${chrome.i18n.getMessage('allCategories')}</option>`;
            categories.forEach(cat => {
                const opt = document.createElement("option");
                opt.value = cat;
                opt.textContent = cat;
                categoryFilter.appendChild(opt);
            });

            filterAndRender();
        });
    }

    // Filter and render
    function filterAndRender() {
        const query = (searchInput?.value || "").toLowerCase();
        const category = categoryFilter?.value || "all";

        const filtered = allProducts.filter(p => {
            const matchesSearch = !query || (p.title && p.title.toLowerCase().includes(query));
            const matchesCategory = category === "all" || p.category === category;
            return matchesSearch && matchesCategory;
        });

        renderProducts(filtered);
    }

    // Render products
    function renderProducts(products) {
        trackedResults.innerHTML = "";
        if (products.length === 0) {
            trackedResults.innerHTML = `
                <div class="empty-state">
                    <p>🔍 ${chrome.i18n.getMessage('noProductsMatchSearch')}</p>
                </div>
            `;
            return;
        }

        const fragment = document.createDocumentFragment();

        products.forEach(product => {
            const card = createProductCard(product);
            fragment.appendChild(card);

            // Render chart after DOM insertion
            requestAnimationFrame(() => {
                renderPriceChart(product.id, product);
            });
        });

        trackedResults.appendChild(fragment);
    }

    // Create product card - FIXED: Proper layout and button attributes
    function createProductCard(product) {
        const card = document.createElement("div");
        card.className = "product-card";
        card.dataset.id = product.id;
        card.dataset.category = product.category || "unknown";

        const img = document.createElement("img");
        img.src = product.image || chrome.runtime.getURL("img/deals/placeholder.jpg");
    img.alt = product.title || chrome.i18n.getMessage('product');
        img.className = "product-image";
        img.addEventListener("error", () => {
            img.src = chrome.runtime.getURL("img/deals/placeholder.jpg");
        });

        const title = document.createElement("h3");
        title.className = "product-title";
    title.textContent = product.title || chrome.i18n.getMessage('unknownProduct');

        const priceInfo = document.createElement("div");
        priceInfo.className = "price-info";

        const originalPrice = document.createElement("span");
        originalPrice.className = "original-price";
    originalPrice.textContent = `${chrome.i18n.getMessage('originalPrice')}: $${(product.originalPrice ?? product.price ?? 0).toFixed(2)}`;

        const currentPrice = document.createElement("span");
        currentPrice.className = "current-price";
    currentPrice.textContent = `${chrome.i18n.getMessage('currentPrice')}: $${product.price?.toFixed(2) ?? "N/A"}`;

        priceInfo.append(originalPrice, document.createElement("br"), currentPrice);

        const actions = document.createElement("div");
        actions.className = "action-buttons";

        const viewBtn = document.createElement("button");
        viewBtn.className = "action-btn view-btn";
        viewBtn.setAttribute("data-url", product.url || "");
    viewBtn.textContent = chrome.i18n.getMessage('viewOnAmazon');

        const stopBtn = document.createElement("button");
        stopBtn.className = "action-btn remove-btn";
        stopBtn.setAttribute("data-id", product.id);
    stopBtn.textContent = chrome.i18n.getMessage('stopTracking');

        actions.append(viewBtn, stopBtn);

        const priceHistory = document.createElement("div");
        priceHistory.className = "price-history";
        priceHistory.innerHTML = "<div class=\"price-chart-container\"><canvas></canvas></div>";

        card.append(img, title, priceInfo, priceHistory, actions);
        return card;
    }

    // Render price chart
    function renderPriceChart(productId, product) {
        const canvas = trackedResults.querySelector(`[data-id="${productId}"] canvas`);
        if (!canvas) return;

        // Wait for Chart.js to load
        if (typeof Chart === "undefined") {
            console.warn("Chart.js not loaded yet");
            return;
        }

        // Destroy existing chart
        const existingChart = Chart.getChart(canvas);
        if (existingChart) existingChart.destroy();

        const priceHistory = product.priceHistory || [];
        const prices = priceHistory.map(p => p.price);
        const dates = priceHistory.map(p => new Date(p.timestamp).toLocaleDateString());

        // Only render chart if we have data
        if (prices.length > 0 && dates.length > 0) {
            new Chart(canvas, {
                type: "line",
                data: {
                    labels: dates,
                    datasets: [{
                        label: chrome.i18n.getMessage('priceChartLabel'),
                        data: prices,
                        borderColor: "#0078d4",
                        backgroundColor: "rgba(0, 120, 212, 0.1)",
                        borderWidth: 2,
                        pointRadius: 3,
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: context => `$${context.parsed.y.toFixed(2)}`
                            }
                        }
                    },
                    scales: {
                        y: {
                            ticks: { callback: value => "$" + value }
                        },
                        x: {
                            ticks: { maxRotation: 45, minRotation: 45 }
                        }
                    }
                }
            });
        } else {
            // If no data, ensure the chart container is visible and display message
            const chartContainer = canvas.closest(".price-chart-container");
            if (chartContainer) {
                chartContainer.innerHTML = `<p>${chrome.i18n.getMessage('noPriceHistory')}</p>`;
            }
        }
    }

    // Export to CSV
    exportCsvBtn?.addEventListener("click", () => {
        if (allProducts.length === 0) {
            alert(chrome.i18n.getMessage('noProductsToExport'));
            return;
        }

        const headers = [
            chrome.i18n.getMessage('csvTitle'),
            chrome.i18n.getMessage('csvPrice'),
            chrome.i18n.getMessage('csvOriginalPrice'),
            chrome.i18n.getMessage('csvCategory'),
            chrome.i18n.getMessage('csvUrl'),
            chrome.i18n.getMessage('csvDateTracked')
        ];
        const rows = allProducts.map(p => [
            p.title || chrome.i18n.getMessage('unknown'),
            p.price?.toFixed(2) || "N/A",
            p.originalPrice?.toFixed(2) || "N/A",
            p.category || chrome.i18n.getMessage('uncategorized'),
            p.url || "",
            new Date(p.trackedAt || Date.now()).toLocaleDateString()
        ]);

        const csv = [headers, ...rows]
            .map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(","))
            .join("\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `shopsmart-tracked-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();

        URL.revokeObjectURL(url);
    });

    // Event listeners
    searchInput?.addEventListener("input", filterAndRender);
    categoryFilter?.addEventListener("change", filterAndRender);

    // ✅ Handle button clicks with proper event delegation
    trackedResults.addEventListener("click", (e) => {
        const button = e.target.closest("button");
        if (!button) return;
        
        if (button.classList.contains("view-btn")) {
            handleViewButton(button);
        } else if (button.classList.contains("remove-btn")) {
            handleRemoveButton(button);
        }
    });

    // Handle View button click
    function handleViewButton(button) {
        const url = button.getAttribute("data-url");
        if (url) {
            try {
                const affiliateUrl = new URL(url);
                affiliateUrl.searchParams.set("tag", "elise200f-20");
                chrome.tabs.create({ url: affiliateUrl.toString() });
            } catch (err) {
                chrome.tabs.create({ url });
            }
        }
    }

    // Handle Remove button click
    function handleRemoveButton(button) {
        const id = button.getAttribute("data-id");
        if (!id) return;

        chrome.storage.sync.get(["trackedProducts"], (result) => {
            const filtered = (result.trackedProducts || []).filter(p => p.id !== id);
            chrome.storage.sync.set({ trackedProducts: filtered }, () => {
                loadTrackedProducts();
            });
        });
    }

    // Initial load
    loadDarkMode();
    loadTrackedProducts();
    if (typeof applyTranslations === 'function') {
        applyTranslations();
    }
});