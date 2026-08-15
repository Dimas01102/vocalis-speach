/**
 * Abstract interface for TTS Providers.
 * Future providers (ElevenLabs, Google, Azure) should extend this class.
 */
export class BaseProvider {
    constructor() {
        this.name = 'Base';
        this.capabilities = {
            pitch: false,
            rate: false,
            download: false
        };
    }

    async init() {
        return true;
    }

    async getVoices() {
        throw new Error('getVoices() must be implemented by provider');
    }

    async synthesize(text, options) {
        throw new Error('synthesize() must be implemented by provider');
    }
    
    stop() {}
    pause() {}
    resume() {}

    // Override in providers that can produce a real downloadable audio file
    // (e.g. an API-based provider). Browser's Web Speech API cannot expose
    // its audio output, so the base/default behavior is "not downloadable".
    supportsDownload() {
        return false;
    }

    getDownloadInfo() {
        return null;
    }
}