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

    supportsDownload() {
        return false;
    }

    getDownloadInfo() {
        return null;
    }
}