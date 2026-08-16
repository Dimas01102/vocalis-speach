import { escapeHtml } from '../utils/format.js';

const GENDER_ICON = { female: '♀', male: '♂' };

export class VoiceGallery {
    constructor(containerEl, onSelectCallback) {
        this.container = containerEl;
        this.onSelect = onSelectCallback;
        this.voices = [];
        this.selectedId = null;

        // A single shared <audio> so starting a new preview always stops
        // whichever preview was playing before.
        this.previewAudio = new Audio();
        this.previewingId = null;
        this.previewAudio.addEventListener('ended', () => this._setPreviewIcon(null));
        this.previewAudio.addEventListener('pause', () => this._setPreviewIcon(null));
    }

    render(voices) {
        this.voices = voices;
        this.previewAudio.pause();
        this.previewingId = null;
        this.container.innerHTML = '';

        if (!voices.length) {
            this.container.innerHTML = '<p class="gallery-empty">No voices available.</p>';
            return;
        }

        voices.forEach(v => {
            const card = document.createElement('div');
            card.className = 'voice-card';
            card.dataset.id = v.id;
            card.setAttribute('role', 'button');
            card.setAttribute('tabindex', '0');

            const initials = escapeHtml((v.name || '?').slice(0, 2).toUpperCase());
            const genderIcon = GENDER_ICON[v.gender?.toLowerCase()] || '◆';

            card.innerHTML = `
                <div class="voice-card-avatar">${initials}</div>
                <div class="voice-card-info">
                    <div class="voice-card-name">${escapeHtml(v.name)}</div>
                    <div class="voice-card-tags">
                        ${v.gender ? `<span class="voice-tag">${genderIcon} ${escapeHtml(v.gender)}</span>` : ''}
                        ${v.accent ? `<span class="voice-tag">${escapeHtml(v.accent)}</span>` : ''}
                    </div>
                </div>
                <button type="button" class="voice-card-preview" data-id="${escapeHtml(v.id)}" aria-label="Preview ${escapeHtml(v.name)}" ${v.previewUrl ? '' : 'disabled'}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                </button>
            `;

            const selectThisCard = () => this.select(v.id);
            card.addEventListener('click', (e) => {
                if (e.target.closest('.voice-card-preview')) return;
                selectThisCard();
            });
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectThisCard();
                }
            });

            const previewBtn = card.querySelector('.voice-card-preview');
            previewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.togglePreview(v.id, v.previewUrl);
            });

            this.container.appendChild(card);
        });

        if (this.selectedId && voices.some(v => v.id === this.selectedId)) {
            this._highlight(this.selectedId);
        } else {
            this.select(voices[0].id);
        }
    }

    select(id) {
        this.selectedId = id;
        this._highlight(id);
        if (this.onSelect) this.onSelect(id);
    }

    togglePreview(id, url) {
        if (!url) return;
        if (this.previewingId === id) {
            this.previewAudio.pause();
            return;
        }
        this.previewAudio.src = url;
        this.previewAudio.play();
        this._setPreviewIcon(id);
    }

    _setPreviewIcon(id) {
        this.previewingId = id;
        this.container.querySelectorAll('.voice-card-preview').forEach(btn => {
            btn.classList.toggle('is-playing', btn.dataset.id === id);
        });
    }

    _highlight(id) {
        this.container.querySelectorAll('.voice-card').forEach(c => {
            c.classList.toggle('selected', c.dataset.id === id);
        });
    }
}
