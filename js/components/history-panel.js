import { HistoryService } from '../services/history-service.js';
import { formatDate, escapeHtml } from '../utils/format.js';

const ENGINE_BADGE = {
    browser: 'Browser',
    elevenlabs: 'AI'
};

export class HistoryPanel {
    /**
     * @param {Function} onReplayCallback - (text, voiceURI, provider) => void
     * @param {Function} getVoiceNameFn - (voiceURI, provider) => friendly name
     */
    constructor(listEl, emptyEl, clearBtnEl, onReplayCallback, getVoiceNameFn = null) {
        this.listEl = listEl;
        this.emptyEl = emptyEl;
        this.clearBtnEl = clearBtnEl;
        this.onReplay = onReplayCallback;
        this.getVoiceName = getVoiceNameFn;

        this.init();
    }

    init() {
        this.clearBtnEl.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear generation history?')) {
                HistoryService.clearAll();
                this.render();
            }
        });
    }

    render() {
        const history = HistoryService.getHistory();
        this.listEl.innerHTML = '';

        if (!history.length) {
            this.emptyEl.classList.remove('hidden');
            return;
        }

        this.emptyEl.classList.add('hidden');

        history.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'history-item';

            const provider = item.provider || 'browser';
            const voiceName = this.getVoiceName ? (this.getVoiceName(item.voiceURI, provider) || item.voiceURI) : item.voiceURI;
            const badge = ENGINE_BADGE[provider] || ENGINE_BADGE.browser;

            itemEl.innerHTML = `
                <div class="history-content">
                    <div class="history-text" title="${escapeHtml(item.text)}">${escapeHtml(item.shortText)}</div>
                    <div class="history-meta">
                        <span class="history-engine-badge">${badge}</span>
                        <span>${escapeHtml(voiceName)}</span>
                        <span>${formatDate(item.timestamp)}</span>
                    </div>
                </div>
                <div class="history-actions">
                    <button class="btn-ghost btn-sm btn-play-hist" data-id="${item.id}">Play</button>
                    <button class="btn-ghost btn-sm btn-del-hist" data-id="${item.id}" style="color:var(--danger)">Del</button>
                </div>
            `;
            this.listEl.appendChild(itemEl);
        });

        this.bindItemActions(history);
    }

    bindItemActions(history) {
        this.listEl.querySelectorAll('.btn-play-hist').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const item = history.find(h => h.id === id);
                if (item && this.onReplay) {
                    this.onReplay(item.text, item.voiceURI, item.provider || 'browser');
                }
            });
        });

        this.listEl.querySelectorAll('.btn-del-hist').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                HistoryService.removeEntry(id);
                this.render();
            });
        });
    }
}
