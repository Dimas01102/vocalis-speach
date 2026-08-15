import { Storage } from './storage.js';

class StateManager {
    constructor() {
        this.state = {
            text: Storage.get('vocalis_draft', ''),
            language: '',
            voiceURI: '',
            settings: {
                rate: 1,
                pitch: 1
            },
            elevenSettings: Storage.get('vocalis_eleven_settings', { stability: 0.5, similarity: 0.75 }),
            history: Storage.get('vocalis_history', []),
            theme: Storage.get('vocalis_theme', 'system'),
            activeProvider: Storage.get('vocalis_provider', 'browser')
        };
        this.listeners = new Map();
    }

    get(key) {
        return this.state[key];
    }

    set(key, value) {
        this.state[key] = value;
        this.notify(key, value);
        
        // Auto persist certain states
        if (key === 'text') Storage.set('vocalis_draft', value);
        if (key === 'history') Storage.set('vocalis_history', value);
        if (key === 'theme') Storage.set('vocalis_theme', value);
        if (key === 'elevenSettings') Storage.set('vocalis_eleven_settings', value);
        if (key === 'activeProvider') Storage.set('vocalis_provider', value);
    }

    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push(callback);
    }

    notify(key, value) {
        if (this.listeners.has(key)) {
            this.listeners.get(key).forEach(callback => callback(value));
        }
    }
}

export const appState = new StateManager();