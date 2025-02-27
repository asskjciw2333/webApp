document.addEventListener('DOMContentLoaded', () => {
    const mainContainer = document.getElementById('power-consumer-main');
    const sections = mainContainer.getElementsByClassName('info-container');
    const scrollUpBtn = document.getElementById('scroll-up');
    const scrollDownBtn = document.getElementById('scroll-down');
    
    let currentIndex = 0;

    // Update button states based on current section
    function updateButtonStates() {
        scrollUpBtn.disabled = currentIndex === 0;
        scrollDownBtn.disabled = currentIndex === sections.length - 1;
    }

    // Scroll to specific section by index
    function scrollToSection(index) {
        if (index >= 0 && index < sections.length) {
            sections[index].scrollIntoView({ behavior: 'smooth' });
            currentIndex = index;
            updateButtonStates();
        }
    }

    // Add click listeners to scroll buttons
    if (scrollUpBtn) {
        scrollUpBtn.addEventListener('click', () => {
            scrollToSection(currentIndex - 1);
        });
    }

    if (scrollDownBtn) {
        scrollDownBtn.addEventListener('click', () => {
            scrollToSection(currentIndex + 1);
        });
    }

    // Listen for keyboard navigation (up/down arrows)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp') {
            scrollToSection(currentIndex - 1);
        } else if (e.key === 'ArrowDown') {
            scrollToSection(currentIndex + 1);
        }
    });

    // Initialize button states on load
    updateButtonStates();
}); 