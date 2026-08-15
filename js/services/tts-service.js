import { BrowserProvider } from '../providers/browser-provider.js';
import { ElevenLabsProvider } from '../providers/elevenlabs-provider.js';
import { ErrorHandler } from '../core/error-handler.js';

export class TTSService {
    constructor() {
        this.providers = {
            browser: new BrowserProvider(),
            elevenlabs: new ElevenLabsProvider()
        };
        this.activeKey = 'browser';
    }

    get activeProvider() {
        return this.providers[this.activeKey];
    }

    getProvider(key) {
        return this.providers[key];
    }

    setActiveProvider(key) {
        if (this.providers[key]) this.activeKey = key;
    }

    async init() {
        try {
            await this.activeProvider.init();
            return true;
        } catch (error) {
            ErrorHandler.handle(error, 'Failed to initialize Text-to-Speech Engine.');
            return false;
        }
    }

    async getVoices() {
        return await this.activeProvider.getVoices();
    }

    async synthesize(text, options, onProgress, onEnd, onError) {
        return await this.activeProvider.synthesize(text, options, onProgress, onEnd, onError);
    }

    stop() {
        this.activeProvider.stop();
    }

    pause() {
        this.activeProvider.pause();
    }

    resume() {
        this.activeProvider.resume();
    }

    supportsDownload() {
        return this.activeProvider.supportsDownload();
    }

    getDownloadInfo() {
        return this.activeProvider.getDownloadInfo();
    }
}
