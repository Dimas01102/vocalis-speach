export const Toast = {
    container: document.getElementById('toast-container'),
    
    show(message, type = 'info') {
        if (!this.container) {
            this.container = document.getElementById('toast-container');
        }
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let prefix = '';
        if (type === 'success') prefix = '✓ ';
        if (type === 'error') prefix = '⚠ ';
        
        toast.innerHTML = `<span>${prefix}${message}</span>`;
        this.container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            toast.addEventListener('animationend', () => toast.remove());
        }, 3000);
    },
    success(msg) { this.show(msg, 'success'); },
    error(msg) { this.show(msg, 'error'); }
};