document.addEventListener('DOMContentLoaded', function() {
    console.log('About page loaded successfully');
    
    // Add any interactive functionality here if needed
    // For example: smooth scrolling, animations, etc.
    
    // Example: Add click handlers to feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    
    featureCards.forEach(card => {
        card.addEventListener('click', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.transition = 'transform 0.2s ease';
            
            setTimeout(() => {
                this.style.transform = 'translateY(0)';
            }, 200);
        });
    });
    
    // Add keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            // Handle escape key if needed
        }
    });
    
    // Check if page is loaded in extension context
    if (chrome && chrome.runtime) {
        console.log('Running in extension context');
    }
});