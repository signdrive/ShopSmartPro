// documentation.js - Enhanced with Dark Mode Support
document.addEventListener('DOMContentLoaded', function () {
    console.log('Documentation page loaded');

    // DOM Elements
    const navLinks = document.querySelectorAll('.sidebar a');
    const sections = document.querySelectorAll('.content section');
    const body = document.body;

    // ================================
    // 1. Smooth Scrolling & Active Link
    // ================================

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();

            const targetId = this.getAttribute('href')?.substring(1);
            const targetSection = document.getElementById(targetId);

            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });

                // Update active link
                navLinks.forEach(navLink => navLink.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });

    // Highlight current section in viewport
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.3
    };

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        observer.observe(section);
    });

    // ================================
    // 2. Copy Code Blocks (Only if present)
    // ================================
    const codeBlocks = document.querySelectorAll('pre');
    
    if (codeBlocks.length > 0) {
        codeBlocks.forEach(block => {
            const codeElement = block.querySelector('code') || block;
            const copyButton = document.createElement('button');
            copyButton.textContent = '📋 Copy';
            copyButton.className = 'copy-btn';
            copyButton.setAttribute('aria-label', 'Copy code to clipboard');
            copyButton.style.cssText = `
                position: absolute;
                top: 8px;
                right: 8px;
                background: #3498db;
                color: white;
                border: none;
                padding: 6px 10px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: background 0.3s ease;
                z-index: 10;
            `;

            copyButton.addEventListener('mouseenter', () => {
                copyButton.style.background = '#2980b9';
            });

            copyButton.addEventListener('mouseleave', () => {
                copyButton.style.background = '#3498db';
            });

            block.style.position = 'relative';
            block.appendChild(copyButton);

            copyButton.addEventListener('click', function () {
                const code = codeElement.textContent.trim();
                navigator.clipboard.writeText(code).then(() => {
                    copyButton.textContent = '✅ Copied!';
                    setTimeout(() => {
                        copyButton.textContent = '📋 Copy';
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy: ', err);
                    copyButton.textContent = '❌ Failed';
                    setTimeout(() => {
                        copyButton.textContent = '📋 Copy';
                    }, 2000);
                });
            });
        });
    }

    // ================================
    // 3. Print Button
    // ================================

    const printButton = document.createElement('button');
    printButton.textContent = '🖨️ Print Guide';
    printButton.className = 'print-btn';
    printButton.setAttribute('aria-label', 'Print this documentation');
    printButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #27ae60;
        color: white;
        border: none;
        padding: 12px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        z-index: 1000;
        box-shadow: 0 4px 10px rgba(0,0,0,0.2);
        transition: transform 0.2s, box-shadow 0.2s;
    `;

    printButton.addEventListener('mouseenter', () => {
        printButton.style.transform = 'translateY(-2px)';
        printButton.style.boxShadow = '0 6px 15px rgba(0,0,0,0.3)';
    });

    printButton.addEventListener('mouseleave', () => {
        printButton.style.transform = 'translateY(0)';
        printButton.style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)';
    });

    document.body.appendChild(printButton);

    printButton.addEventListener('click', function () {
        window.print();
    });

    // ================================
    // 4. Dark Mode Sync
    // ================================

    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Load settings and apply dark mode
    chrome.storage.sync.get(['settings'], (result) => {
        const settings = result.settings || {};
        const useDark = settings.syncWithSystem !== false ? prefersDark : !!settings.darkMode;

        if (useDark) {
            body.classList.add('dark-mode');
        }

        // Listen for future changes
        chrome.runtime.onMessage.addListener((request) => {
            if (request.action === 'settingsUpdated') {
                const shouldUseDark = request.settings.syncWithSystem !== false
                    ? window.matchMedia('(prefers-color-scheme: dark)').matches
                    : request.settings.darkMode;

                body.classList.toggle('dark-mode', shouldUseDark);
            }
        });
    });

    // ================================
    // 5. Keyboard Navigation
    // ================================

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            console.log('Escape pressed');
        }

        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.querySelector('input[type="search"]');
            if (searchInput) searchInput.focus();
        }
    });
});