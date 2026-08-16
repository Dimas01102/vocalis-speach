import { createElement, refreshIcons } from '../utils/dom.js';

export class Modal {
    constructor(title, contentElement, onConfirm) {
        this.title = title;
        this.contentElement = contentElement;
        this.onConfirm = onConfirm;
        this.overlay = null;
        this.init();
    }

    init() {
        this.overlay = createElement('div', 'modal-overlay');
        const container = createElement('div', 'modal-container');
        
        container.innerHTML = `
            <div class="modal-header">
                <h3>${this.title}</h3>
                <button class="btn-ghost btn-sm close-modal"><i data-lucide="x" class="icon"></i></button>
            </div>
            <div class="modal-body"></div>
            <div class="modal-footer">
                <button class="btn-ghost btn-sm cancel-modal">Cancel</button>
                <button class="btn-primary btn-sm confirm-modal">Confirm</button>
            </div>
        `;

        container.querySelector('.modal-body').appendChild(this.contentElement);
        this.overlay.appendChild(container);
        document.body.appendChild(this.overlay);
        refreshIcons();

        this.bindEvents();
    }

    bindEvents() {
        const close = () => this.destroy();
        this.overlay.querySelector('.close-modal').addEventListener('click', close);
        this.overlay.querySelector('.cancel-modal').addEventListener('click', close);
        this.overlay.querySelector('.confirm-modal').addEventListener('click', () => {
            if (this.onConfirm) this.onConfirm();
            this.destroy();
        });

        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) close();
        });
    }

    open() {
        setTimeout(() => this.overlay.classList.add('active'), 10);
    }

    destroy() {
        this.overlay.classList.remove('active');
        setTimeout(() => this.overlay.remove(), 200);
    }
}