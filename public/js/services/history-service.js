import { appState } from '../core/state.js';
import { generateId } from '../utils/format.js';

export class HistoryService {
    static getHistory() {
        return appState.get('history') || [];
    }

    static addEntry(text, voiceURI, provider = 'browser') {
        const history = this.getHistory();

        // Avoid immediate duplicate entries
        if (history.length > 0 && history[0].text === text && history[0].voiceURI === voiceURI && history[0].provider === provider) {
            return;
        }

        const newEntry = {
            id: generateId(),
            text: text,
            shortText: text.substring(0, 90) + (text.length > 90 ? '...' : ''),
            voiceURI,
            provider,
            timestamp: new Date().toISOString()
        };

        const updated = [newEntry, ...history].slice(0, 50); // Store up to 50 items
        appState.set('history', updated);
    }

    static removeEntry(id) {
        const history = this.getHistory();
        const updated = history.filter(item => item.id !== id);
        appState.set('history', updated);
    }

    static clearAll() {
        appState.set('history', []);
    }
}
