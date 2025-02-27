class ScrollControls {
    constructor() {
        this.currentIndex = 0;
        this.sections = document.querySelectorAll('.info-container');
        this.upButton = document.getElementById('scroll-up');
        this.downButton = document.getElementById('scroll-down');
        this.mainContainer = document.getElementById('power-consumer-main');
        
        // Check if we have results before initializing
        if (this.sections.length > 0) {
            this.init();
        } else {
            // Hide scroll buttons if no results
            const scrollBtn = document.getElementById('scrollBtn');
            if (scrollBtn) {
                scrollBtn.style.display = 'none';
            }
        }
    }

    init() {
        if (!this.sections.length) return;
        
        // Bind click events
        this.upButton?.addEventListener('click', () => this.scrollToPrevious());
        this.downButton?.addEventListener('click', () => this.scrollToNext());
        
        // Add keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp') this.scrollToPrevious();
            if (e.key === 'ArrowDown') this.scrollToNext();
        });

        // Initial button state
        this.updateButtonStates();
    }

    scrollToPrevious() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.scrollToSection();
        }
    }

    scrollToNext() {
        if (this.currentIndex < this.sections.length - 1) {
            this.currentIndex++;
            this.scrollToSection();
        }
    }

    scrollToSection() {
        const section = this.sections[this.currentIndex];
        section.scrollIntoView({ behavior: 'smooth' });
        this.updateButtonStates();
    }

    updateButtonStates() {
        if (this.upButton) {
            this.upButton.disabled = this.currentIndex === 0;
            this.upButton.classList.toggle('disabled', this.currentIndex === 0);
        }
        if (this.downButton) {
            this.downButton.disabled = this.currentIndex === this.sections.length - 1;
            this.downButton.classList.toggle('disabled', this.currentIndex === this.sections.length - 1);
        }
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    new ScrollControls();
}); 