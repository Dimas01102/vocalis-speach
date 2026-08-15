import { BaseProvider } from './base-provider.js';

const API_BASE = 'https://api.elevenlabs.io/v1';
// eleven_multilingual_v2 supports 29+ languages and auto-detects the
// language from the input text, so there's no need for a language picker.
const MODEL_ID = 'eleven_multilingual_v2';

export class ElevenLabsProvider extends BaseProvider {
    constructor() {
        super();
        this.name = 'ElevenLabs AI';
        this.capabilities = { pitch: false, rate: false, download: true };
        this.apiKey = '';
        this.voices = [];
        this.currentAudio = null;
        this.currentObjectUrl = null;
        this.lastVoiceName = 'voice';
    }

    setApiKey(key) {
        this.apiKey = (key || '').trim();
    }

    hasApiKey() {
        return this.apiKey.length > 0;
    }

    async init() {
        // Nothing to warm up until an API key is supplied — getVoices()
        // fetches on demand once setApiKey() has been called.
        return true;
    }

    async getVoices() {
        if (!this.hasApiKey()) return [];

        const res = await fetch(`${API_BASE}/voices`, {
            headers: { 'xi-api-key': this.apiKey }
        });

        if (!res.ok) {
            throw await this._toError(res, 'Failed to load voices from ElevenLabs.');
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
        if (!this.hasApiKey()) {
            onError({ error: 'no-api-key', message: 'Connect your ElevenLabs API key first.' });
            return;
        }
        if (!options.voiceURI) {
            onError({ error: 'no-voice', message: 'Please pick a voice first.' });
            return;
        }

        this.stop();

        const voice = this.voices.find(v => v.id === options.voiceURI);
        this.lastVoiceName = voice ? voice.name : 'voice';

        let res;
        try {
            res = await fetch(`${API_BASE}/text-to-speech/${options.voiceURI}?output_format=mp3_44100_128`, {
                method: 'POST',
                headers: {
                    'xi-api-key': this.apiKey,
                    'Content-Type': 'application/json',
                    'Accept': 'audio/mpeg'
                },
                body: JSON.stringify({
                    text,
                    model_id: MODEL_ID,
                    voice_settings: {
                        stability: options.stability ?? 0.5,
                        similarity_boost: options.similarity ?? 0.75
                    }
                })
            });
        } catch (networkErr) {
            onError({ error: 'network', message: 'Could not reach ElevenLabs. Check your internet connection.' });
            return;
        }

        if (!res.ok) {
            const err = await this._toError(res, 'Failed to generate voice.');
            onError({ error: 'api-error', message: err.message });
            return;
        }

        const blob = await res.blob();

        // Replace any previous object URL so we don't leak memory across
        // repeated generations.
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
        const safeName = this.lastVoiceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'voice';
        return {
            url: this.currentObjectUrl,
            filename: `vocalis-${safeName}-${Date.now()}.mp3`
        };
    }

    async _toError(res, fallbackMessage) {
        let message = fallbackMessage;
        try {
            const data = await res.json();
            message = data?.detail?.message || (typeof data?.detail === 'string' ? data.detail : null) || fallbackMessage;
        } catch (e) {
            // Response wasn't JSON — keep the fallback message.
        }

        if (res.status === 401) message = 'Invalid ElevenLabs API key.';
        if (res.status === 429) message = 'ElevenLabs quota exceeded. Try again later or upgrade your plan.';

        const err = new Error(message);
        err.status = res.status;
        return err;
    }
}
