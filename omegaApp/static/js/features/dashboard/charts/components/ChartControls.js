import { ChartSelector } from './ChartSelector.js';

export class ChartControls {
    constructor(container, options = {}) {
        if (!container) {
            throw new Error('Container element is required');
        }

        this.container = container;
        this.options = {
            onTypeChange: () => {},
            allowedTypes: ['bar', 'line', 'pie'],
            defaultType: 'bar',
            ...options
        };

        this.render();
    }

    render() {
        // Create chart type selector
        const selectorContainer = document.createElement('div');
        selectorContainer.className = 'chart-type-selector';
        this.container.appendChild(selectorContainer);

        // Initialize chart selector
        this.selector = new ChartSelector(selectorContainer, {
            types: this.options.allowedTypes,
            defaultType: this.options.defaultType,
            onChange: (type) => this.handleTypeChange(type)
        });
    }

    handleTypeChange(type) {
        if (this.options.onTypeChange) {
            this.options.onTypeChange(type);
        }
    }

    getCurrentType() {
        return this.selector?.getCurrentType();
    }

    setType(type) {
        if (this.selector && this.options.allowedTypes.includes(type)) {
            this.selector.setType(type);
        }
    }

    destroy() {
        if (this.selector) {
            this.selector.destroy();
        }
        this.container.innerHTML = '';
    }
} 