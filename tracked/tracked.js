// tracked.js - ShopSmart Pro | Refactored: Removed inline CSS
document.addEventListener("DOMContentLoaded", function () {
    const trackedResults = document.getElementById("trackedResults");
    const closeBtn = document.getElementById("closeBtn");
    const darkModeToggle = document.getElementById("darkModeToggle");
    const searchInput = document.getElementById("searchInput");
    const categoryFilter = document.getElementById("categoryFilter");
    const exportCsvBtn = document.getElementById("exportCsvBtn");

    let allProducts = [];
    const charts = new Map(); // Store chart instances

    // Close button
    closeBtn?.addEventListener("click", () => window.close());

    // Dark mode toggle
    darkModeToggle?.addEventListener("click", () => {
        const isDark = !document.body.classList.contains("dark-mode");
        document.body.classList.toggle("dark-mode", isDark);
        darkModeToggle.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
        chrome.storage.sync.set({ darkMode: isDark });
    });

    // Load preferences (dark mode)
    function loadPreferences() {
        chrome.storage.sync.get(["darkMode"], (result) => {
            const isDark = result?.darkMode === true;
            document.body.classList.toggle("dark-mode", isDark);
            darkModeToggle.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
        });
    }

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
            categoryFilter.innerHTML = "<option value=\"all\">All Categories</option>";
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
                    <p>🔍 No products match your search.</p>
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

    // Create product card - Refactored: Removed inline CSS
    function createProductCard(product) {
        const card = document.createElement("div");
        card.className = "product-card";
        card.dataset.id = product.id;
        card.dataset.category = product.category || "unknown";

        const img = document.createElement("img");
        img.src = product.image || chrome.runtime.getURL("img/deals/placeholder.jpg");
        img.alt = product.title || "Product";
        img.className = "product-image";
        img.addEventListener("error", () => {
            img.src = chrome.runtime.getURL("img/deals/placeholder.jpg");
        });

        const title = document.createElement("h3");
        title.className = "product-title";
        title.textContent = product.title || "Unknown Product";

        const priceInfo = document.createElement("div");
        priceInfo.className = "price-info";

        const originalPrice = document.createElement("span");
        originalPrice.className = "original-price";
        originalPrice.textContent = `Original: $${(product.originalPrice ?? product.price ?? 0).toFixed(2)}`;

        const currentPrice = document.createElement("span");
        currentPrice.className = "current-price";
        currentPrice.textContent = `Current: $${product.price?.toFixed(2) ?? "N/A"}`;

        // Use a div for price lines to control layout with CSS
        const priceLines = document.createElement("div");
        priceLines.className = "price-lines";
        priceLines.append(originalPrice, currentPrice);
        priceInfo.appendChild(priceLines);

        const actions = document.createElement("div");
        actions.className = "action-buttons";

        const viewBtn = document.createElement("button");
        viewBtn.className = "action-btn view-btn"; // Use CSS class for styling
        viewBtn.dataset.url = product.url || "";
        viewBtn.textContent = "View on Amazon";

        const stopBtn = document.createElement("button");
        stopBtn.className = "action-btn remove-btn"; // Use CSS class for styling
        stopBtn.dataset.id = product.id;
        stopBtn.textContent = "Stop Tracking";

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
                        label: "Price ($)",
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
                chartContainer.innerHTML = "<p>No price history available</p>";
            }
        }
    }

    // Export to CSV
    exportCsvBtn?.addEventListener("click", () => {
        if (allProducts.length === 0) {
            alert("No products to export.");
            return;
        }

        const headers = ["Title", "Price", "Original Price", "Category", "URL", "Date Tracked"];
        const rows = allProducts.map(p => [
            p.title || "Unknown",
            p.price?.toFixed(2) || "N/A",
            p.originalPrice?.toFixed(2) || "N/A",
            p.category || "Uncategorized",
            p.url || "",
            new Date(p.trackedAt || Date.now()).toLocaleDateString()
        ]);

        const csv = [headers, ...rows]
            .map(r => r.map(c => `"${c.replace(/"/g, "\"\"")}"`).join(","))
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

    // Handle actions
    trackedResults.addEventListener("click", (e) => {
        const viewBtn = e.target.closest(".view-btn");
        const stopBtn = e.target.closest(".remove-btn");

        if (viewBtn) {
            const url = viewBtn.dataset.url;
            if (url) {
                try {
                    const affiliateUrl = new URL(url);
                    affiliateUrl.searchParams.set("tag", "elise200f-20");
                    chrome.tabs.create({ url: affiliateUrl.toString() });
                } catch (err) {
                    chrome.Gtabs.create({ url });
                }
            }
        }

        if (stopBtn) {
            const id = stopBtn.dataset.id;
            if (!id) return;

            chrome.storage.sync.get(["trackedProducts"], (result) => {
                const filtered = (result.trackedProducts || []).filter(p => p.id !== id);
                chrome.storage.sync.set({ trackedProducts: filtered }, () => {
                    loadTrackedProducts();
                });
            });
        }
    });

    // Initial load
    loadPreferences();
    loadTrackedProducts();
});


