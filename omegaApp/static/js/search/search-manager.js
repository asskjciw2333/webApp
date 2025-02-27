export class SearchManager {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.isOpen = false;
    }

    initializeElements() {
        this.openSearchBtn = document.getElementById('openSearchBtn');
        this.searchContainer = document.getElementById('searchContainer');
        this.searchChoices = document.getElementById('searchChoices');
        this.searchForm = document.getElementById('searchForm');
        this.searchInput = document.getElementById('search');
        this.selectType = document.getElementById('selectType');
        this.searchSubmitBtn = document.getElementById('searchSubmitBtn');
        this.flashMessage = document.getElementById('flash');
        
        // Set ARIA attributes for accessibility
        if (this.searchContainer) {
            this.searchContainer.setAttribute('role', 'dialog');
            this.searchContainer.setAttribute('aria-modal', 'true');
            this.searchContainer.setAttribute('aria-label', 'חיפוש');
        }
        
        if (this.searchInput) {
            this.searchInput.setAttribute('aria-label', 'חיפוש לפי שם או מיקום');
        }
        
        if (this.selectType) {
            this.selectType.setAttribute('aria-label', 'בחר סוג חיפוש');
        }
    }

    bindEvents() {
        // Search button click handler
        this.openSearchBtn?.addEventListener('click', () => this.toggleSearch());

        // Close search when clicking outside
        this.searchContainer?.addEventListener('click', (e) => this.handleOutsideClick(e));

        // Flash message handler
        if (this.flashMessage) {
            this.initializeFlashMessage();
        }

        // Form submission handler
        this.searchForm?.addEventListener('submit', (e) => this.handleSubmit(e));

        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));

        // Input event handlers
        this.searchInput?.addEventListener('input', () => this.handleInput());
    }

    handleKeyPress(e) {
        if (!this.isOpen) return;

        switch (e.key) {
            case 'Escape':
                this.closeSearch();
                break;
            case 'Tab':
                // Trap focus within modal
                const focusableElements = this.searchContainer.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                const firstFocusable = focusableElements[0];
                const lastFocusable = focusableElements[focusableElements.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === firstFocusable) {
                        e.preventDefault();
                        lastFocusable.focus();
                    }
                } else {
                    if (document.activeElement === lastFocusable) {
                        e.preventDefault();
                        firstFocusable.focus();
                    }
                }
                break;
        }
    }

    handleInput() {
        // Add aria-live region for screen readers
        const liveRegion = document.getElementById('search-live-region') || this.createLiveRegion();
        liveRegion.textContent = `מחפש: ${this.searchInput.value}`;
    }

    createLiveRegion() {
        const region = document.createElement('div');
        region.id = 'search-live-region';
        region.setAttribute('aria-live', 'polite');
        region.setAttribute('class', 'sr-only');
        document.body.appendChild(region);
        return region;
    }

    toggleSearch() {
        this.isOpen = !this.isOpen;
        
        if (this.isOpen) {
            // Show container first
            this.searchContainer.style.display = 'block';
            
            // Force a reflow to ensure the transition works
            this.searchContainer.offsetHeight;
            
            // Then add active classes to trigger transitions
            this.openSearchBtn.classList.add('active');
            this.searchContainer.classList.add('active');
            this.searchChoices.classList.add('active');
            
            // Store last focused element to restore focus when closing
            this.lastFocusedElement = document.activeElement;
            
            // Prevent background scrolling
            document.body.style.overflow = 'hidden';
            
            // Focus search input after animation
            setTimeout(() => {
                this.searchInput?.focus();
            }, 300);

            // Announce modal opening to screen readers
            this.announceToScreenReader('פתיחת חלון חיפוש');
        } else {
            // Remove active classes first
            this.openSearchBtn.classList.remove('active');
            this.searchContainer.classList.remove('active');
            this.searchChoices.classList.remove('active');
            
            // Wait for transition to complete before hiding
            setTimeout(() => {
                if (!this.isOpen) {
                    this.searchContainer.style.display = 'none';
                }
            }, 300);
            
            // Restore focus and scroll
            this.lastFocusedElement?.focus();
            document.body.style.overflow = '';
            
            // Announce modal closing to screen readers
            this.announceToScreenReader('סגירת חלון חיפוש');
        }
    }

    handleOutsideClick(e) {
        if (e.target === this.searchContainer) {
            this.closeSearch();
        }
    }

    closeSearch() {
        if (!this.isOpen) return;
        
        this.isOpen = false;
        this.openSearchBtn.classList.remove('active');
        this.searchContainer.classList.remove('active');
        this.searchChoices.classList.remove('active');
        document.body.style.overflow = '';
        
        // Restore focus
        this.lastFocusedElement?.focus();
        
        // Clear input
        if (this.searchInput) {
            this.searchInput.value = '';
        }

        // Announce modal closing to screen readers
        this.announceToScreenReader('סגירת חלון חיפוש');
    }

    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'assertive');
        announcement.classList.add('sr-only');
        announcement.textContent = message;
        document.body.appendChild(announcement);
        
        // Remove after announcement
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    initializeFlashMessage() {
        this.flashMessage.addEventListener('click', () => {
            this.flashMessage.style.display = 'none';
        });
        
        setTimeout(() => {
            this.flashMessage.style.display = 'none';
        }, 5000);
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        if (!this.searchInput?.value.trim()) {
            this.searchInput?.classList.add('error');
            this.announceToScreenReader('נא להזין ערך לחיפוש');
            return;
        }

        const originalButtonContent = this.searchSubmitBtn?.innerHTML || '';

        try {
            if (!this.searchSubmitBtn) {
                throw new Error('Search button not found');
            }

            // Show loading state
            this.searchSubmitBtn.disabled = true;
            this.searchSubmitBtn.innerHTML = `
                <svg class="spinner" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="3" />
                </svg>
            `;

            // Submit the form directly
            this.searchForm.submit();

        } catch (error) {
            console.error('Search error:', error);
            this.announceToScreenReader('שגיאה בביצוע החיפוש');
            
            // Show error state
            this.searchInput?.classList.add('error');
            setTimeout(() => this.searchInput?.classList.remove('error'), 500);
        } finally {
            // Reset button state if button exists
            if (this.searchSubmitBtn) {
                this.searchSubmitBtn.disabled = false;
                this.searchSubmitBtn.innerHTML = originalButtonContent;
            }
        }
    }
}

// Initialize search manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SearchManager();
}); 