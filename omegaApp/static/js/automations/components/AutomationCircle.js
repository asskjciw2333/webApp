import { utils } from '../../core/utils.js';

export class AutomationCircle {
    constructor(automation, onClose, onClick) {
        this.automation = automation;
        this.onClose = onClose;
        this.onClick = onClick;
        this.element = this.createElement();
    }

    createElement() {
        const circle = utils.createElement('div', 'automation-circle');
        circle.id = `automation-${this.automation.id}`;
        circle.setAttribute('data-title', this.automation.server_name);
        
        circle.addEventListener('click', () => {
            if (this.onClick) {
                this.onClick(this.automation);
            }
        });
        
        const circleText = utils.createElement('h4');
        circleText.innerHTML = '<div class="spinner-small"></div>';
        circle.appendChild(circleText);

        const closeBtn = utils.createElement('div', 'delete-button');
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            this.onClose(this.automation.id);
        };
        circle.appendChild(closeBtn);

        circle.classList.add("active");
        return circle;
    }

    update(progress, status) {
        const textElement = this.element.querySelector('h4');
        
        this.element.classList.remove('active', 'completed', 'failed', 'stopped');
        
        if (progress === 101) {
            textElement.textContent = '✔';
            this.element.classList.add('completed');
            return;
        }

        switch(status) {
            case 'completed':
                textElement.textContent = '✔';
                this.element.classList.add('completed');
                break;
            case 'failed':
                textElement.textContent = '❕';
                this.element.classList.add('failed');
                break;
            case 'stopped':
                textElement.textContent = `${progress}%`;
                this.element.classList.add('stopped');
                break;
            default:
                textElement.textContent = `${progress}%`;
                this.element.classList.add('active');
        }
    }

    remove() {
        this.element.remove();
    }
} 