import { BaseProvider } from './base-provider.js';

export class ElevenLabsProvider extends BaseProvider {
    constructor() {
        super();
        this.name = 'ElevenLabs AI';
        this.capabilities = { pitch: false, rate: false, download: true };
        this.voices = [];
        this.currentAudio = null;
        this.currentObjectUrl = null;
        this.lastVoiceName = 'voice';

        this.accessCode = '';
    }

    setAccessCode(code) {
        this.accessCode = (code || '').trim();
    }

    _headers(extra = {}) {
        const headers = { ...extra };
        if (this.accessCode) headers['x-app-access-code'] = this.accessCode;
        return headers;
    }

    async init() {
        return true;
    }

    async getVoices() {
        const res = await fetch('/api/voices', { headers: this._headers() });
        if (!res.ok) {
            throw await this._toError(res, 'Failed to load voices.');
        }

        const data = await res.json();
        this.voices = (data.voices || []).map(v => ({
            id: v.voice_id,
            name: v.name,
            lang: 'multi',
            gender: v.labels?.gender || '',
            accent: v.labels?.accent || '',
            description: v.labels?.description || v.labels?.use_case || '',
            previewUrl: v.preview_url || '',
            raw: v
        }));
        return this.voices;
    }

    async synthesize(text, options, onProgress, onEnd, onError) {
        if (!options.voiceURI) {
            onError({ error: 'no-voice', message: 'Please pick a voice first.' });
            return;
        }

        this.stop();

        const voice = this.voices.find(v => v.id === options.voiceURI);
        this.lastVoiceName = voice ? voice.name : 'voice';

        let res;
        try {
            res = await fetch('/api/tts', {
                method: 'POST',
                headers: this._headers({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    text,
                    voiceId: options.voiceURI,
                    stability: options.stability ?? 0.5,
                    similarity: options.similarity ?? 0.75
                })
            });
        } catch (networkErr) {
            onError({ error: 'network', message: 'Tidak bisa terhubung ke server.' });
            return;
        }

        if (!res.ok) {
            const err = await this._toError(res, 'Failed to generate voice.');
            onError({ error: 'api-error', message: err.message, status: err.status });
            return;
        }

        const blob = await res.blob();

        if (this.currentObjectUrl) {
            URL.revokeObjectURL(this.currentObjectUrl);
        }
        this.currentObjectUrl = URL.createObjectURL(blob);

        const audio = new Audio(this.currentObjectUrl);
        this.currentAudio = audio;

        audio.addEventListener('timeupdate', () => {
            const duration = isFinite(audio.duration) ? audio.duration : 0;
            const percent = duration ? Math.min((audio.currentTime / duration) * 100, 100) : 0;
            onProgress(audio.currentTime, percent);
        });

        audio.addEventListener('ended', () => {
            onProgress(audio.duration || 0, 100);
            onEnd();
        });

        audio.addEventListener('error', () => {
            onError({ error: 'playback-error', message: 'Audio playback failed.' });
        });

        try {
            await audio.play();
        } catch (playErr) {
            onError({ error: 'playback-blocked', message: 'Playback was blocked by the browser.' });
        }
    }

    stop() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
        }
    }

    pause() {
        if (this.currentAudio) this.currentAudio.pause();
    }

    resume() {
        if (this.currentAudio) this.currentAudio.play();
    }

    supportsDownload() {
        return this.capabilities.download && !!this.currentObjectUrl;
    }

    getDownloadInfo() {
        if (!this.currentObjectUrl) return null;
        const safeName = (this.lastVoiceName || 'voice').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'voice';
        return {
            url: this.currentObjectUrl,
            filename: `vocalis-${safeName}-${Date.now()}.mp3`
        };
    }

    async _toError(res, fallbackMessage) {
        let message = fallbackMessage;
        try {
            const data = await res.json();
            message = data?.error || fallbackMessage;
        } catch (e) {

        }
        const err = new Error(message);
        err.status = res.status;
        return err;
    }
}