document.addEventListener('DOMContentLoaded', function() {
    console.log('Privacy policy page loaded');
    
    // Update last updated date dynamically
    const lastUpdatedElement = document.querySelector('.last-updated');
    if (lastUpdatedElement) {
        const lastUpdated = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        lastUpdatedElement.textContent = `Last Updated: ${lastUpdated}`;
    }
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Add print functionality
    const printButton = document.createElement('button');
    printButton.textContent = '🖨️ Print Policy';
    printButton.className = 'print-btn';
    printButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #27ae60;
        color: white;
        border: none;
        padding: 10px 15px;
        border-radius: 5px;
        cursor: pointer;
        z-index: 1000;
        font-size: 14px;
    `;
    
    document.body.appendChild(printButton);
    
    printButton.addEventListener('click', function() {
        window.print();
    });
    
    // Add expand/collapse for privacy sections
    const sections = document.querySelectorAll('.content section');
    
    sections.forEach(section => {
        const heading = section.querySelector('h3');
        const content = section.querySelectorAll('p, .privacy-card, .privacy-list');
        
        if (heading && content.length > 0) {
            heading.style.cursor = 'pointer';
            heading.addEventListener('click', function() {
                content.forEach(element => {
                    element.style.display = element.style.display === 'none' ? '' : 'none';
                });
            });
        }
    });
    
    // Mobile menu toggle for smaller screens
    function setupMobileMenu() {
        if (window.innerWidth < 768) {
            const headings = document.querySelectorAll('.content h3');
            headings.forEach(heading => {
                heading.style.cursor = 'pointer';
                const content = heading.nextElementSibling;
                while (content && !content.matches('h3')) {
                    content.style.display = 'none';
                    content = content.nextElementSibling;
                }
                
                heading.addEventListener('click', function() {
                    let nextElement = this.nextElementSibling;
                    while (nextElement && !nextElement.matches('h3')) {
                        nextElement.style.display = nextElement.style.display === 'none' ? '' : 'none';
                        nextElement = nextElement.nextElementSibling;
                    }
                });
            });
        }
    }
    
    setupMobileMenu();
    window.addEventListener('resize', setupMobileMenu);
    
    // Add language selection if needed
    const languageSelect = document.createElement('select');
    languageSelect.innerHTML = `
        <option value="en">English</option>
        <option value="es">Español</option>
        <option value="fr">Français</option>
    `;
    languageSelect.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        padding: 5px;
        border-radius: 3px;
        border: 1px solid #ddd;
    `;
    
    document.querySelector('.header').style.position = 'relative';
    document.querySelector('.header').appendChild(languageSelect);
    
    languageSelect.addEventListener('change', function() {
        // Placeholder for language change functionality
        console.log('Language changed to:', this.value);
    });
});