export class Tutorial {
    constructor() {
        this.currentStep = 0;
        // Step mapping by page
        this.tutorialSteps = {
            'index': [
                {
                    title: 'ברוכים הבאים לאומגה!',
                    description: 'בואו נלמד יחד את הפונקציות המרכזיות של המערכת',
                    element: null
                },
                {
                    title: 'חיפוש מהיר',
                    description: 'לחץ על כפתור החיפוש כדי לפתוח את תיבת החיפוש המהיר',
                    element: '#openSearchBtn',
                },
                {
                    title: 'מעבר לפאנלים',
                    description: 'נעבור כעת לדף הפאנלים',
                    element: 'a[href*="panels"]',
                    autoProgress: true,
                    action: () => {
                        const panelsLink = document.querySelector('a[href*="panels"]');
                        if (panelsLink) {
                            localStorage.setItem('tutorialPage', 'panels');
                            localStorage.setItem('tutorialPending', 'true');
                            panelsLink.click();
                        }
                    }
                }
            ],
            'panels': [
                {
                    title: 'ניהול פאנלים',
                    description: 'כאן תוכל לצפות ולנהל את כל הפאנלים במערכת',
                    element: '#panels-container'
                },
                {
                    title: 'סינון מתקדם',
                    description: 'סנן פאנלים לפי חדר, מסד או חיפוש חופשי',
                    element: '#filter-form',
                    action: async () => {
                        // Fill search input with example panel
                        const searchInput = document.querySelector('#filter-input');
                        if (searchInput) {
                            searchInput.value = 'A01-C03';
                            // Trigger the search
                            const filterForm = document.querySelector('#filter-form');
                            if (filterForm) {
                                filterForm.dispatchEvent(new Event('submit', { cancelable: true }));
                            }
                        }
                    }
                },
                {
                    title: 'עריכת פאנל',
                    description: 'לחץ על כפתור העריכה כדי לראות את אפשרויות העריכה',
                    element: '.edit-btn',
                    action: async () => {
                        // First, remove the highlight
                        const highlight = document.querySelector('.tutorial-highlight');
                        if (highlight) {
                            highlight.classList.add('fade-out');
                            await new Promise(resolve => setTimeout(resolve, 300));
                            highlight.remove();
                        }
                        // Then, open the modal
                        const editBtn = document.querySelector('.edit-btn');
                        if (editBtn) editBtn.click();
                    }
                },
                {
                    title: 'טופס עריכה',
                    description: 'כאן תוכל לערוך את פרטי הפאנל',
                    element: '.edit-form-col',
                    waitForElement: true
                },
                {
                    title: 'חיפוש מסלול',
                    description: 'לחץ כאן כדי למצוא את המסלול הטוב ביותר בין שני פאנלים',
                    element: '.route-search-btn',
                    action: async () => {
                        // First, remove the highlight
                        const highlight = document.querySelector('.tutorial-highlight');
                        if (highlight) {
                            highlight.classList.add('fade-out');
                            await new Promise(resolve => setTimeout(resolve, 300));
                            highlight.remove();
                        }
                        // Then, open the modal
                        const routeBtn = document.querySelector('.route-search-btn');
                        if (routeBtn) routeBtn.click();
                    }
                },
                {
                    title: 'הגדרות מסלול',
                    description: 'הגדר את הפרמטרים למציאת המסלול המתאים ביותר',
                    element: '#route-form',
                    waitForElement: true
                },
                {
                    title: 'מעבר לאוטומציות',
                    description: 'נעבור כעת לדף האוטומציות',
                    element: 'a[href*="automations"]',
                    autoProgress: true,
                    action: () => {
                        const autoLink = document.querySelector('a[href*="automations"]');
                        if (autoLink) {
                            localStorage.setItem('tutorialPage', 'automations');
                            localStorage.setItem('tutorialPending', 'true');
                            autoLink.click();
                        }
                    }
                }
            ],
            'automations': [
                {
                    title: 'כלים אוטומטיים',
                    description: 'כאן תמצא כלים שיעזרו לך לעבוד בצורה יעילה יותר',
                    element: '.cards'
                },
                {
                    title: 'עדכון שרתים',
                    description: 'עדכן גרסאות קושחה בשרתים בקלות',
                    element: '[data-id="1"]',
                    dynamicContent: `
                        <div id="automation-circles-container">
                            <div class="automation-circle active" data-title="שרת 1">
                                <h4>50%</h4>
                                <div class="delete-button"></div>
                            </div>
                            <div class="automation-circle failed" data-title="שרת 2">
                                <h4>!</h4>
                                <div class="delete-button"></div>
                            </div>
                            <div class="automation-circle completed" data-title="שרת 3">
                                <h4>✓</h4>
                                <div class="delete-button"></div>
                            </div>
                        </div>
                    `
                },
                {
                    title: 'קיצורי דרך',
                    description: 'צור קיצורי דרך לפעולות נפוצות',
                    element: '[data-id="2"]'
                },
                {
                    title: 'בדיקת טקסט',
                    description: 'בדוק ותקן טקסט באופן אוטומטי',
                    element: '[data-id="3"]'
                },
                {
                    title: 'סיום המדריך',
                    description: 'כעת אתה מוכן להתחיל לעבוד! נחזור לדף הבית',
                    element: null,
                    autoProgress: true,
                    action: () => {
                        const homeLink = document.querySelector('a[href="/"]');
                        if (homeLink) {
                            localStorage.setItem('tutorialPage', 'index');
                            localStorage.setItem('tutorialComplete', 'true');
                            homeLink.click();
                        }
                    }
                }
            ]
        };

        // Identify current page from URL
        this.currentPage = this.identifyCurrentPage();
        this.steps = this.tutorialSteps[this.currentPage] || [];

        this.initializeElements();
        this.bindEvents();
        this.checkPendingTutorial();
    }

    identifyCurrentPage() {
        const path = window.location.pathname;
        if (path.includes('/panels')) return 'panels';
        if (path.includes('/automations')) return 'automations';
        return 'index';
    }

    checkPendingTutorial() {
        const pendingPage = localStorage.getItem('tutorialPage');
        const isPending = localStorage.getItem('tutorialPending');
        
        if (pendingPage === this.currentPage && isPending === 'true') {
            localStorage.removeItem('tutorialPending');
            this.start();
        }
    }

    initializeElements() {
        // Remove existing modal if exists
        const existingModal = document.querySelector('.tutorial-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal HTML
        const modalHTML = `
            <div class="tutorial-modal">
                <div class="tutorial-content">
                    <button class="tutorial-btn-close">&times;</button>
                    <h3 class="tutorial-title"></h3>
                    <p class="tutorial-description"></p>
                    <div class="tutorial-navigation">
                        <button class="tutorial-btn tutorial-btn-prev">הקודם</button>
                        <button class="tutorial-btn tutorial-btn-next">הבא</button>
                    </div>
                    <div class="tutorial-progress"></div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Cache DOM elements
        this.modal = document.querySelector('.tutorial-modal');
        this.content = document.querySelector('.tutorial-content');
        this.title = document.querySelector('.tutorial-title');
        this.description = document.querySelector('.tutorial-description');
        this.prevBtn = document.querySelector('.tutorial-btn-prev');
        this.nextBtn = document.querySelector('.tutorial-btn-next');
        this.closeBtn = document.querySelector('.tutorial-btn-close');
        this.progress = document.querySelector('.tutorial-progress');

        // Create progress dots
        this.steps.forEach(() => {
            this.progress.insertAdjacentHTML('beforeend', '<div class="tutorial-progress-dot"></div>');
        });
    }

    bindEvents() {
        // Bind button events
        this.prevBtn.addEventListener('click', () => this.previousStep());
        this.nextBtn.addEventListener('click', () => this.nextStep());
        this.closeBtn.addEventListener('click', () => this.close());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.modal.classList.contains('active')) {
                if (e.key === 'Escape') this.close();
                if (e.key === 'ArrowRight') this.previousStep();
                if (e.key === 'ArrowLeft') this.nextStep();
            }
        });

        // Handle window resize for highlight position
        window.addEventListener('resize', () => {
            if (this.modal.classList.contains('active')) {
                this.updateStep();
            }
        });

        // Prevent clicks on modal from closing it
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Improve window resize handling
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.handleResize(), 100);
        });
    }

    async updateStep() {
        const step = this.steps[this.currentStep];
        this.title.textContent = step.title;
        this.description.textContent = step.description;

        // Handle dynamic content
        const dynamicContainer = this.content.querySelector('.tutorial-dynamic-content');
        if (dynamicContainer) {
            dynamicContainer.remove();
        }
        
        if (step.dynamicContent) {
            const container = document.createElement('div');
            container.className = 'tutorial-dynamic-content';
            container.innerHTML = step.dynamicContent;
            this.description.insertAdjacentElement('afterend', container);
        }

        // Reset previous styles
        this.content.style.right = 'auto';
        this.content.style.left = 'auto';
        this.content.style.top = 'auto';
        this.content.style.bottom = 'auto';
        this.content.style.transform = 'none';

        // Calculate optimal position
        if (step.element) {
            const element = document.querySelector(step.element);
            if (element) {
                const elementRect = element.getBoundingClientRect();
                const modalRect = this.content.getBoundingClientRect();
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;

                // Find largest available space
                const spaceRight = windowWidth - elementRect.right;
                const spaceLeft = elementRect.left;
                const spaceTop = elementRect.top;
                const spaceBottom = windowHeight - elementRect.bottom;

                // List of available spaces
                const spaces = [
                    { side: 'right', space: spaceRight },
                    { side: 'left', space: spaceLeft },
                    { side: 'top', space: spaceTop },
                    { side: 'bottom', space: spaceBottom }
                ].sort((a, b) => b.space - a.space);

                // Position modal according to best available space
                const bestPosition = spaces[0];

                switch (bestPosition.side) {
                    case 'right':
                        this.content.style.left = `${elementRect.right + 20}px`;
                        this.content.style.top = `${Math.max(20, elementRect.top - (modalRect.height / 2) + (elementRect.height / 2))}px`;
                        break;
                    case 'left':
                        this.content.style.right = `${windowWidth - elementRect.left + 20}px`;
                        this.content.style.top = `${Math.max(20, elementRect.top - (modalRect.height / 2) + (elementRect.height / 2))}px`;
                        break;
                    case 'top':
                        this.content.style.bottom = `${windowHeight - elementRect.top + 20}px`;
                        this.content.style.left = `${Math.max(20, elementRect.left - (modalRect.width / 2) + (elementRect.width / 2))}px`;
                        break;
                    case 'bottom':
                        this.content.style.top = `${elementRect.bottom + 20}px`;
                        this.content.style.left = `${Math.max(20, elementRect.left - (modalRect.width / 2) + (elementRect.width / 2))}px`;
                        break;
                }

                // Ensure modal stays within screen bounds
                const updatedModalRect = this.content.getBoundingClientRect();
                
                if (updatedModalRect.right > windowWidth - 20) {
                    this.content.style.left = `${windowWidth - updatedModalRect.width - 20}px`;
                }
                if (updatedModalRect.left < 20) {
                    this.content.style.left = '20px';
                }
                if (updatedModalRect.bottom > windowHeight - 20) {
                    this.content.style.top = `${windowHeight - updatedModalRect.height - 20}px`;
                }
                if (updatedModalRect.top < 20) {
                    this.content.style.top = '20px';
                }
            }
        } else {
            // If no element is highlighted, center the modal
            this.content.style.left = '50%';
            this.content.style.top = '50%';
            this.content.style.transform = 'translate(-50%, -50%)';
        }

        // Remove existing highlight
        const existingHighlight = document.querySelector('.tutorial-highlight');
        if (existingHighlight) {
            existingHighlight.classList.add('fade-out');
            await new Promise(resolve => setTimeout(resolve, 300));
            existingHighlight.remove();
        }

        // Close unrelated open modals
        this.closeOpenModals(step);

        // Wait for element if needed
        if (step.waitForElement && step.element) {
            const element = await this.waitForElement(step.element);
            if (!element) {
                console.warn(`Element ${step.element} not found after waiting`);
                return;
            }
        }

        // Update buttons state
        this.prevBtn.disabled = this.currentStep === 0;
        this.nextBtn.textContent = this.currentStep === this.steps.length - 1 ? 'סיום' : 'הבא';

        // Update progress dots
        const dots = this.progress.querySelectorAll('.tutorial-progress-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === this.currentStep);
        });

        // Handle element highlighting
        if (step.element) {
            const element = document.querySelector(step.element);
            if (element) {
                const rect = element.getBoundingClientRect();
                const highlight = document.createElement('div');
                highlight.className = 'tutorial-highlight fade-in';
                highlight.style.top = `${rect.top}px`;
                highlight.style.left = `${rect.left}px`;
                highlight.style.width = `${rect.width}px`;
                highlight.style.height = `${rect.height}px`;
                document.body.appendChild(highlight);

                // Smooth scroll to element
                element.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center',
                    inline: 'center'
                });
            }
        }
    }

    start() {
        this.currentStep = 0;
        this.modal.style.display = 'flex';
        setTimeout(() => {
            this.modal.classList.add('active');
            this.updateStep();
        }, 50);
        
        if (!localStorage.getItem('tutorialShown')) {
            localStorage.setItem('tutorialShown', 'true');
        }
    }

    close() {
        this.modal.classList.remove('active');
        setTimeout(() => {
            this.modal.style.display = 'none';
            const highlight = document.querySelector('.tutorial-highlight');
            if (highlight) highlight.remove();
        }, 300);
    }

    async nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            const currentStep = this.steps[this.currentStep];
            this.currentStep++;
            const nextStep = this.steps[this.currentStep];
            
            // If the first step includes modal opening, remove the highlight first
            if (nextStep.action && 
                (nextStep.element?.includes('form') || nextStep.element?.includes('Modal'))) {
                const highlight = document.querySelector('.tutorial-highlight');
                if (highlight) {
                    highlight.classList.add('fade-out');
                    await new Promise(resolve => setTimeout(resolve, 300));
                    highlight.remove();
                }
            }

            await this.updateStep();
            
            if (nextStep.action) {
                await new Promise(resolve => setTimeout(resolve, 500));
                await nextStep.action();
            }
            
            if (nextStep.autoProgress) {
                await new Promise(resolve => setTimeout(resolve, 3500));
                await this.nextStep();
            }
        } else {
            this.close();
        }
    }

    previousStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.updateStep();
        }
    }

    // Method to check for dynamic elements
    async waitForElement(selector, timeout = 5000) {
        const start = Date.now();
        
        while (Date.now() - start < timeout) {
            const element = document.querySelector(selector);
            if (element) {
                return element;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return null;
    }

    // Method to close modals not related to current step
    closeOpenModals(currentStep) {
        // List of modal selectors and their related elements
        const modalMappings = {
            '#edit-form': '#editModal',
            '#route-form': '#routeModal'
        };

        // Check if current step is related to any open modal
        const currentElement = currentStep.element;
        let isRelatedToCurrentModal = false;

        for (const [formSelector, modalSelector] of Object.entries(modalMappings)) {
            const modal = document.querySelector(modalSelector);
            if (modal) {
                // Check if the current element is related to this modal
                const isRelated = currentElement && (
                    currentElement.includes(formSelector) || 
                    currentElement === modalSelector ||
                    modal.contains(document.querySelector(currentElement))
                );

                if (isRelated) {
                    isRelatedToCurrentModal = true;
                } else if (modal.style.display === 'flex' || modal.classList.contains('active')) {
                    // Close the modal if it's open and not related to the current element
                    if (typeof window.closeModal === 'function') {
                        window.closeModal(modal);
                    } else {
                        modal.style.display = 'none';
                        modal.classList.remove('active');
                    }
                }
            }
        }
    }

    // Method to check element overlap
    isOverlapping(rect1, rect2) {
        return !(rect1.right < rect2.left || 
                 rect1.left > rect2.right || 
                 rect1.bottom < rect2.top || 
                 rect1.top > rect2.bottom);
    }

    // Handle window resize events
    handleResize() {
        // Update highlight position if active
        if (this.modal?.classList.contains('active')) {
            const step = this.steps[this.currentStep];
            if (step?.element) {
                const element = document.querySelector(step.element);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    const highlight = document.querySelector('.tutorial-highlight');
                    if (highlight) {
                        highlight.style.top = `${rect.top}px`;
                        highlight.style.left = `${rect.left}px`;
                        highlight.style.width = `${rect.width}px`;
                        highlight.style.height = `${rect.height}px`;
                    }
                }
            }
        }
    }
} 