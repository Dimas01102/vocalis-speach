import { appState } from '../core/state.js';

export class SettingsPanel {
    /**
     * @param {Object} refs - DOM refs: speedRange, speedVal, pitchRange, pitchVal
     *                        (required) and stabilityRange, stabilityVal,
     *                        similarityRange, similarityVal (optional, for
     *                        the ElevenLabs/premium engine).
     */
    constructor(refs) {
        this.refs = refs;
        this.init();
    }

    init() {
        this.refs.speedRange.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            this.refs.speedVal.textContent = `${val}x`;
            const settings = appState.get('settings');
            settings.rate = val;
            appState.set('settings', settings);
        });

        this.refs.pitchRange.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            this.refs.pitchVal.textContent = val;
            const settings = appState.get('settings');
            settings.pitch = val;
            appState.set('settings', settings);
        });

        if (this.refs.stabilityRange) {
            this.refs.stabilityRange.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.refs.stabilityVal.textContent = val.toFixed(2);
                const settings = appState.get('elevenSettings');
                settings.stability = val;
                appState.set('elevenSettings', settings);
            });
        }

        if (this.refs.similarityRange) {
            this.refs.similarityRange.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.refs.similarityVal.textContent = val.toFixed(2);
                const settings = appState.get('elevenSettings');
                settings.similarity = val;
                appState.set('elevenSettings', settings);
            });
        }
    }
}
