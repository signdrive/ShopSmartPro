document.addEventListener('DOMContentLoaded', function() {
    // Get all the buttons
    const chromeBtn = document.getElementById('chromeBtn');
    const firefoxBtn = document.getElementById('firefoxBtn');
    const edgeBtn = document.getElementById('edgeBtn');
    const contactBtn = document.getElementById('contactBtn');
    const guideBtn = document.getElementById('guideBtn');
    const installMessage = document.getElementById('installMessage');
    
    // Browser extension store URLs (replace with your actual extension URLs)
    const extensionUrls = {
        chrome: "https://chrome.google.com/webstore/detail/amazon-search-pro/your-extension-id",
        firefox: "https://addons.mozilla.org/en-US/firefox/addon/amazon-search-pro/",
        edge: "https://microsoftedge.microsoft.com/addons/detail/amazon-search-pro/your-extension-id"
    };
    
    // Support URLs
    const supportUrls = {
        contact: "mailto:support@example.com",
        guide: "https://example.com/user-guide"
    };
    
    // Function to show a message
    function showMessage(message, type) {
        installMessage.textContent = message;
        installMessage.className = `install-message ${type}`;
        
        // Hide message after 5 seconds
        setTimeout(() => {
            installMessage.style.display = 'none';
        }, 5000);
    }
    
    // Function to redirect to extension store
    function redirectToStore(browser) {
        const url = extensionUrls[browser];
        if (url) {
            // Show loading message
            showMessage(`Redirecting to ${browser.charAt(0).toUpperCase() + browser.slice(1)} Web Store...`, 'success');
            
            // Open the store page in a new tab after a brief delay
            setTimeout(() => {
                window.open(url, '_blank');
            }, 1000);
        } else {
            showMessage('Sorry, this browser is not supported yet.', 'error');
        }
    }
    
    // Function to redirect to support
    function redirectToSupport(type) {
        const url = supportUrls[type];
        if (url) {
            window.open(url, '_blank');
        }
    }
    
    // Add event listeners to browser buttons
    if (chromeBtn) {
        chromeBtn.addEventListener('click', function() {
            redirectToStore('chrome');
        });
    }
    
    if (firefoxBtn) {
        firefoxBtn.addEventListener('click', function() {
            redirectToStore('firefox');
        });
    }
    
    if (edgeBtn) {
        edgeBtn.addEventListener('click', function() {
            redirectToStore('edge');
        });
    }
    
    // Add event listeners to support buttons
    if (contactBtn) {
        contactBtn.addEventListener('click', function() {
            redirectToSupport('contact');
        });
    }
    
    if (guideBtn) {
        guideBtn.addEventListener('click', function() {
            redirectToSupport('guide');
        });
    }
    
    // Add animation to feature cards on scroll
    const featureCards = document.querySelectorAll('.feature-card');
    
    function checkScroll() {
        featureCards.forEach(card => {
            const cardPosition = card.getBoundingClientRect().top;
            const screenPosition = window.innerHeight / 1.3;
            
            if (cardPosition < screenPosition) {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }
        });
    }
    
    // Initialize card styles for animation
    featureCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });
    
    // Check scroll position on load and scroll
    window.addEventListener('load', checkScroll);
    window.addEventListener('scroll', checkScroll);
    
    // FAQ accordion functionality
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    faqQuestions.forEach(question => {
        question.style.cursor = 'pointer';
        
        question.addEventListener('click', function() {
            const answer = this.nextElementSibling;
            const isVisible = answer.style.display === 'block';
            
            // Toggle answer visibility
            answer.style.display = isVisible ? 'none' : 'block';
            
            // Add animation class
            if (!isVisible) {
                answer.classList.add('faq-answer-visible');
            } else {
                answer.classList.remove('faq-answer-visible');
            }
        });
    });
    
    // Initially hide all FAQ answers
    document.querySelectorAll('.faq-answer').forEach(answer => {
        answer.style.display = 'none';
    });
    
    // Add a simple animation to the header logo
    const logo = document.querySelector('.logo');
    if (logo) {
        setInterval(() => {
            logo.style.transform = 'rotate(5deg)';
            setTimeout(() => {
                logo.style.transform = 'rotate(-5deg)';
            }, 500);
        }, 3000);
    }
});