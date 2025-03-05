export const utils = {
    // Form handling
    getFormData(form) {
        const formData = new FormData(form);
        return Object.fromEntries(formData.entries());
    },

    // API calls
    async fetchData(url, options = {}) {
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...(options.headers || {})
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const text = await response.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                throw new Error(`Invalid JSON response: ${text}`);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    },

    // DOM manipulation
    createElement(tag, className, textContent) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (textContent) element.textContent = textContent;
        return element;
    },

    // Form validation
    validateForm(form) {
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                field.classList.add('error');
            } else {
                field.classList.remove('error');
            }
        });
        
        return isValid;
    },

    // Error handling
    handleError(error, errorContainer) {
        console.error('Error:', error);
        if (errorContainer) {
            errorContainer.textContent = error.message || 'An error occurred';
            errorContainer.style.display = 'block';
        }
    },

    // Loading state management
    setLoading(element, isLoading) {
        if (isLoading) {
            element.classList.add('loading');
            element.disabled = true;
        } else {
            element.classList.remove('loading');
            element.disabled = false;
        }
    }
}; 