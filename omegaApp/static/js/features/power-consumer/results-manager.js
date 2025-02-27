class ResultsManager {
    constructor() {
        this.currentIndex = 0;
        this.results = document.querySelectorAll('.result-card');
        this.totalResults = this.results.length;
        
        // Elements
        this.prevButton = document.getElementById('prev-result');
        this.nextButton = document.getElementById('next-result');
        this.currentCounter = document.getElementById('current-result');
        this.totalCounter = document.getElementById('total-results');
        
        // Initialize immediately
        if (this.totalResults > 0) {
            // Set initial display
            this.results[0].style.display = 'block';
            this.results[0].classList.add('active');
            
            // Set total results counter
            if (this.totalCounter) {
                this.totalCounter.textContent = this.totalResults;
            }
            
            this.init();
        }
    }

    init() {
        if (this.totalResults <= 0) return;

        // Show first result immediately
        this.results[0].style.display = 'block';
        this.results[0].classList.add('active');
        
        // Event listeners
        this.prevButton?.addEventListener('click', () => this.showPrevious());
        this.nextButton?.addEventListener('click', () => this.showNext());
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') this.showPrevious();
            if (e.key === 'ArrowLeft') this.showNext();
        });

        // Initial state
        this.updateNavigationState();
    }

    showPrevious() {
        if (this.currentIndex > 0) {
            // Hide current
            this.results[this.currentIndex].style.display = 'none';
            this.results[this.currentIndex].classList.remove('active');
            
            // Show previous
            this.currentIndex--;
            this.results[this.currentIndex].style.display = 'block';
            this.results[this.currentIndex].classList.add('active');
            
            this.updateNavigationState();
        }
    }

    showNext() {
        if (this.currentIndex < this.totalResults - 1) {
            // Hide current
            this.results[this.currentIndex].style.display = 'none';
            this.results[this.currentIndex].classList.remove('active');
            
            // Show next
            this.currentIndex++;
            this.results[this.currentIndex].style.display = 'block';
            this.results[this.currentIndex].classList.add('active');
            
            this.updateNavigationState();
        }
    }

    updateNavigationState() {
        // Update counter
        if (this.currentCounter) {
            this.currentCounter.textContent = this.currentIndex + 1;
        }

        // Update buttons state
        if (this.prevButton) {
            this.prevButton.disabled = this.currentIndex === 0;
        }
        if (this.nextButton) {
            this.nextButton.disabled = this.currentIndex === this.totalResults - 1;
        }

        // עדכון הגרף הנראה
        if (window.powerChartsManager) {
            window.powerChartsManager.updateVisibleChart();
        }
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    new ResultsManager();
}); 