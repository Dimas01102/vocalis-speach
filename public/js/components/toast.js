import { refreshIcons } from '../utils/dom.js';

export const Toast = {
    container: document.getElementById('toast-container'),

    show(message, type = 'info') {
        if (!this.container) {
            this.container = document.getElementById('toast-container');
        }
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        let icon = '';
        if (type === 'success') icon = '<i data-lucide="check-circle" class="icon"></i>';
        if (type === 'error') icon = '<i data-lucide="alert-triangle" class="icon"></i>';

        toast.innerHTML = `${icon}<span>${message}</span>`;
        this.container.appendChild(toast);
        refreshIcons();

        setTimeout(() => {
            toast.classList.add('fade-out');
            toast.addEventListener('animationend', () => toast.remove());
        }, 3000);
    },
    success(msg) { this.show(msg, 'success'); },
    error(msg) { this.show(msg, 'error'); }
};
