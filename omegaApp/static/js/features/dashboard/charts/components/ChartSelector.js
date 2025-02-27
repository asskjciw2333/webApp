export class ChartSelector {
    constructor(container, options = {}) {
        if (!container) {
            throw new Error('Container element is required');
        }

        this.container = container;
        this.options = {
            types: ['bar', 'line', 'pie'],
            defaultType: 'bar',
            onChange: () => {},
            ...options
        };
        
        this.currentType = this.options.defaultType;
        this.render();
    }

    getChartTypeIcon(type) {
        const icons = {
            bar: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>`,
            line: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3.5 18.5L9.5 12.5L13.5 16.5L22 6.92L20.59 5.5L13.5 13.5L9.5 9.5L2 17L3.5 18.5Z"/></svg>`,
            pie: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11 2v20c-5.1-.5-9-4.8-9-10s3.9-9.5 9-10m2 0v9h9c-.5-4.8-4.2-8.5-9-9m0 11v9c4.7-.5 8.5-4.2 9-9h-9"/></svg>`,
            doughnut: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8s8 3.58 8 8s-3.58 8-8 8z"/></svg>`,
            radar: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm0 2c4.42 0 8 3.58 8 8c0 1.85-.63 3.55-1.69 4.9L12 12V4zm-1.11 13.41L13 13.3v-2.59L18.31 8c.63 1.23.99 2.63.99 4.1c0 4.42-3.58 8-8 8c-2.08 0-3.97-.79-5.38-2.08l4.98-2.61z"/></svg>`
        };
        return icons[type] || icons.bar;
    }

    getChartTypeName(type) {
        const names = {
            bar: 'תרשים עמודות',
            line: 'תרשים קווי',
            pie: 'תרשים עוגה',
            doughnut: 'תרשים טבעת',
            radar: 'תרשים רדאר'
        };
        return names[type] || type;
    }

    render() {
        // Clear existing content
        this.container.innerHTML = '';
        this.container.className = 'chart-type-selector';
        
        // Create buttons for each chart type
        this.options.types.forEach(type => {
            const button = document.createElement('button');
            button.className = `chart-type-btn ${type === this.currentType ? 'active' : ''}`;
            button.dataset.type = type;
            
            // Create icon element
            const iconSpan = document.createElement('span');
            iconSpan.className = 'icon';
            iconSpan.innerHTML = this.getChartTypeIcon(type);
            button.appendChild(iconSpan);
            
            // Create tooltip (shown on hover)
            const tooltipSpan = document.createElement('span');
            tooltipSpan.className = 'tooltip';
            tooltipSpan.textContent = this.getChartTypeName(type);
            button.appendChild(tooltipSpan);
            
            button.addEventListener('click', () => {
                if (type === this.currentType) return;
                
                // Update active state
                this.container.querySelectorAll('.chart-type-btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                button.classList.add('active');
                
                this.currentType = type;
                
                // Call onChange handler
                if (this.options.onChange) {
                    this.options.onChange(type);
                }
            });
            
            this.container.appendChild(button);
        });
    }

    getCurrentType() {
        return this.currentType;
    }

    setType(type) {
        if (this.options.types.includes(type)) {
            this.currentType = type;
            this.render();
        }
    }

    updateTypes(types) {
        if (Array.isArray(types) && types.length > 0) {
            this.options.types = types;
            if (!types.includes(this.currentType)) {
                this.currentType = types[0];
            }
            this.render();
        }
    }
} 