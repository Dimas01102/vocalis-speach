import { appState } from './core/state.js';
import { Toast } from './components/toast.js';
import { ErrorHandler } from './core/error-handler.js';
import { TTSService } from './services/tts-service.js';
import { HistoryService } from './services/history-service.js';
import { TextEditor } from './components/text-editor.js';
import { VoiceSelector } from './components/voice-selector.js';
import { VoiceGallery } from './components/voice-gallery.js';
import { SettingsPanel } from './components/settings-panel.js';
import { AudioPlayer } from './components/audio-player.js';
import { HistoryPanel } from './components/history-panel.js';

const GENERATE_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Generate Voice`;

class App {
    constructor() {
        this.ttsService = new TTSService();
        this.playbackState = 'idle';
        this.aiStatus = { elevenlabsConfigured: false, requiresAccessCode: false };
        this.aiUnlocked = false;

        this.DOM = this.cacheDOM();
        this.init();
    }

    cacheDOM() {
        return {
            themeSelect: document.getElementById('theme-selector'),
            navBtns: document.querySelectorAll('.nav-btn'),
            sections: document.querySelectorAll('.view-section'),

            textInput: document.getElementById('text-input'),
            charCount: document.getElementById('char-count'),
            wordCount: document.getElementById('word-count'),
            clearTextBtn: document.getElementById('clear-text'),

            // Engine switch
            engineBrowserBtn: document.getElementById('engine-browser-btn'),
            enginePremiumBtn: document.getElementById('engine-premium-btn'),
            browserVoiceGroup: document.getElementById('browser-voice-group'),
            browserSliders: document.getElementById('browser-sliders'),
            premiumSliders: document.getElementById('premium-sliders'),

            // Browser voices
            langSelect: document.getElementById('language-select'),
            voiceSelect: document.getElementById('voice-select'),
            speedRange: document.getElementById('speed-range'),
            speedVal: document.getElementById('speed-val'),
            pitchRange: document.getElementById('pitch-range'),
            pitchVal: document.getElementById('pitch-val'),

            // AI 
            apiKeySection: document.getElementById('api-key-section'),
            premiumConnected: document.getElementById('premium-connected'),
            voiceGalleryWrap: document.getElementById('voice-gallery-wrap'),
            voiceGallery: document.getElementById('voice-gallery'),
            stabilityRange: document.getElementById('stability-range'),
            stabilityVal: document.getElementById('stability-val'),
            similarityRange: document.getElementById('similarity-range'),
            similarityVal: document.getElementById('similarity-val'),

            // Browser: rekam & unduh (opsional)
            recordToggleBtn: document.getElementById('record-toggle-btn'),

            generateBtn: document.getElementById('generate-btn'),

            playerPanel: document.getElementById('audio-player'),
            playPauseBtn: document.getElementById('play-pause-btn'),
            stopBtn: document.getElementById('stop-btn'),
            downloadBtn: document.getElementById('download-btn'),
            timeCurrent: document.getElementById('time-current'),
            progressBar: document.getElementById('progress-bar'),
            visualizer: document.getElementById('visualizer'),

            historyList: document.getElementById('history-list'),
            historyEmpty: document.getElementById('history-empty'),
            clearHistoryBtn: document.getElementById('clear-history-btn')
        };
    }

    async init() {
        this.setupTheme();
        this.setupNavigation();

        this.textEditor = new TextEditor(
            this.DOM.textInput,
            this.DOM.charCount,
            this.DOM.wordCount,
            this.DOM.clearTextBtn,
            () => this.checkGenerateState()
        );

        this.settingsPanel = new SettingsPanel({
            speedRange: this.DOM.speedRange, speedVal: this.DOM.speedVal,
            pitchRange: this.DOM.pitchRange, pitchVal: this.DOM.pitchVal,
            stabilityRange: this.DOM.stabilityRange, stabilityVal: this.DOM.stabilityVal,
            similarityRange: this.DOM.similarityRange, similarityVal: this.DOM.similarityVal
        });

        this.audioPlayer = new AudioPlayer(
            this.DOM.playerPanel, this.DOM.playPauseBtn, this.DOM.stopBtn,
            this.DOM.timeCurrent, this.DOM.progressBar, this.DOM.visualizer
        );

        this.voiceGallery = new VoiceGallery(this.DOM.voiceGallery, (id) => {
            appState.set('voiceURI', id);
            this.checkGenerateState();
        });

        this.historyPanel = new HistoryPanel(
            this.DOM.historyList, this.DOM.historyEmpty, this.DOM.clearHistoryBtn,
            (text, voiceURI, provider) => this.replayFromHistory(text, voiceURI, provider),
            (voiceURI, provider) => this.resolveVoiceName(voiceURI, provider)
        );

        this.DOM.clearTextBtn.addEventListener('click', () => this.stopPlayback());
        this.DOM.engineBrowserBtn.addEventListener('click', () => this.switchEngine('browser'));
        this.DOM.enginePremiumBtn.addEventListener('click', () => this.switchEngine('elevenlabs'));
        this.DOM.recordToggleBtn.addEventListener('click', () => this.toggleRecording());

        if (!this.ttsService.getProvider('browser').isRecordingSupported()) {
            this.DOM.recordToggleBtn.disabled = true;
            this.DOM.recordToggleBtn.title = 'Fitur rekam tab tidak didukung di browser/perangkat ini.';
        }

        try {
            const res = await fetch('/api/status');
            if (res.ok) this.aiStatus = await res.json();
        } catch (e) {

        }

        const cachedCode = sessionStorage.getItem('vocalis_access_code');
        if (cachedCode) {
            this.ttsService.getProvider('elevenlabs').setAccessCode(cachedCode);
        }

        this._applyEngineUI('browser');

        try {
            const ok = await this.ttsService.init(); // initializes the default 'browser' provider
            if (!ok) throw new Error('TTS engine failed to initialize');

            this.voiceSelector = new VoiceSelector(
                this.DOM.langSelect, this.DOM.voiceSelect,
                this.ttsService.getProvider('browser'),
                () => this.checkGenerateState()
            );
            await this.voiceSelector.loadVoices();

            if (!this.voiceSelector.voices.length) {
                Toast.error('No voices found. Speech synthesis might not be supported on this device.');
            }

            this.bindEvents();
            this.historyPanel.render();

            const savedEngine = appState.get('activeProvider');
            const provider = this.ttsService.getProvider('elevenlabs');
            const canAutoReconnect = this.aiStatus.elevenlabsConfigured && (!this.aiStatus.requiresAccessCode || !!provider.accessCode);
            if (savedEngine === 'elevenlabs' && canAutoReconnect) {
                const restored = await this.switchEngine('elevenlabs');
                if (!restored) appState.set('activeProvider', 'browser');
            }

            this.checkGenerateState();
        } catch (error) {
            ErrorHandler.handle(error, 'Failed to initialize Text-to-Speech engine.');
        }
    }

    setupTheme() {
        const theme = appState.get('theme');
        this.DOM.themeSelect.value = theme;
        this.applyTheme(theme);

        this.DOM.themeSelect.addEventListener('change', (e) => {
            appState.set('theme', e.target.value);
            this.applyTheme(e.target.value);
        });

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (appState.get('theme') === 'system') this.applyTheme('system');
        });
    }

    applyTheme(theme) {
        const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }

    setupNavigation() {
        this.DOM.navBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget.dataset.target;

                this.DOM.navBtns.forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');

                this.DOM.sections.forEach(sec => {
                    if (sec.id === target) sec.classList.add('active');
                    else sec.classList.remove('active');
                });
            });
        });
    }

    async switchEngine(key) {
        if (key === 'elevenlabs') {
            if (!this.aiStatus.elevenlabsConfigured) {

                this._applyEngineUI('elevenlabs');
                return false;
            }

            const provider = this.ttsService.getProvider('elevenlabs');
            const needsCode = this.aiStatus.requiresAccessCode && !this.aiUnlocked && !provider.accessCode;
            if (needsCode) {
                this._applyEngineUI('elevenlabs'); 
                return false;
            }
        }

        this.ttsService.setActiveProvider(key);
        appState.set('activeProvider', key);
        appState.set('voiceURI', '');
        this._applyEngineUI(key);

        if (key === 'browser') {
            this.voiceSelector?.renderVoices();
        } else {
            const ok = await this._loadPremiumVoices();
            this.aiUnlocked = ok;
            if (!ok) this._applyEngineUI('elevenlabs');
        }

        this.checkGenerateState();
        return true;
    }

    _applyEngineUI(key) {
        const isPremium = key === 'elevenlabs';
        const showGate = isPremium && !this.aiUnlocked;

        this.DOM.engineBrowserBtn.classList.toggle('active', !isPremium);
        this.DOM.enginePremiumBtn.classList.toggle('active', isPremium);

        this.DOM.browserVoiceGroup.classList.toggle('hidden', isPremium);
        this.DOM.browserSliders.classList.toggle('hidden', isPremium);

        this.DOM.apiKeySection.classList.toggle('hidden', !showGate);
        this.DOM.premiumConnected.classList.toggle('hidden', !isPremium || !this.aiUnlocked);
        this.DOM.voiceGalleryWrap.classList.toggle('hidden', !isPremium || !this.aiUnlocked);
        this.DOM.premiumSliders.classList.toggle('hidden', !isPremium || !this.aiUnlocked);

        if (showGate) this._renderAiGate();
    }

    _renderAiGate() {
        if (!this.aiStatus.elevenlabsConfigured) {
            this.DOM.apiKeySection.innerHTML = '<p class="api-key-hint">Suara AI belum aktif di server ini.</p>';
            return;
        }

        this.DOM.apiKeySection.innerHTML = `
            <label for="access-code-input">Kode Akses</label>
            <div class="api-key-row">
                <input type="password" id="access-code-input" placeholder="Masukkan kode akses" autocomplete="off">
                <button type="button" id="access-code-btn" class="btn-primary btn-sm">Masuk</button>
            </div>
            <p class="api-key-hint">Suara AI di app ini dibatasi pemiliknya. Minta kode akses kalau kamu belum punya.</p>
        `;
        const input = this.DOM.apiKeySection.querySelector('#access-code-input');
        this.DOM.apiKeySection.querySelector('#access-code-btn').addEventListener('click', () => this.submitAccessCode());
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.submitAccessCode();
        });
    }

    async submitAccessCode() {
        const input = this.DOM.apiKeySection.querySelector('#access-code-input');
        const code = input ? input.value.trim() : '';
        if (!code) {
            Toast.error('Masukkan kode akses dulu.');
            return;
        }

        const provider = this.ttsService.getProvider('elevenlabs');
        provider.setAccessCode(code);

        const btn = this.DOM.apiKeySection.querySelector('#access-code-btn');
        if (btn) { btn.disabled = true; btn.textContent = 'Memeriksa...'; }

        const ok = await this._loadPremiumVoices();
        if (ok) {
            this.aiUnlocked = true;
            sessionStorage.setItem('vocalis_access_code', code);
            this.ttsService.setActiveProvider('elevenlabs');
            appState.set('activeProvider', 'elevenlabs');
            appState.set('voiceURI', '');
            this._applyEngineUI('elevenlabs');
            this.checkGenerateState();
            Toast.success('Kode diterima!');
        } else {
            provider.setAccessCode('');
            if (btn) { btn.disabled = false; btn.textContent = 'Masuk'; }
        }
    }

    async _loadPremiumVoices() {
        this.DOM.voiceGallery.innerHTML = '<div class="gallery-loading">Memuat daftar suara...</div>';
        try {
            const voices = await this.ttsService.getVoices();
            if (!voices.length) {
                this.DOM.voiceGallery.innerHTML = '<p class="gallery-empty">Tidak ada suara ditemukan.</p>';
                return true; 
            }
            this.voiceGallery.render(voices);
            return true;
        } catch (error) {
            this.DOM.voiceGallery.innerHTML = '<p class="gallery-empty">Gagal memuat suara.</p>';
            Toast.error(error?.message || 'Gagal memuat suara AI.');
            return false;
        }
    }

    async toggleRecording() {
        const provider = this.ttsService.getProvider('browser');

        if (provider.isRecordingEnabled()) {
            provider.disableRecording();
            this._updateRecordingUI(false);
            Toast.success('Perekaman dimatikan.');
            return;
        }

        try {
            await provider.enableRecording();
            this._updateRecordingUI(true);
            Toast.success('Perekaman aktif! Generate suara untuk bisa diunduh.');
        } catch (error) {
            Toast.error(error?.message || 'Gagal mengaktifkan perekaman.');
        }
    }

    _updateRecordingUI(enabled) {
        this.DOM.recordToggleBtn.textContent = enabled ? 'Matikan Rekam' : 'Aktifkan Rekam & Unduh';
        this.DOM.recordToggleBtn.classList.toggle('recording-active', enabled);
    }

    resolveVoiceName(voiceURI, provider) {
        if (provider === 'elevenlabs') {
            const p = this.ttsService.getProvider('elevenlabs');
            const v = p.voices.find(x => x.id === voiceURI);
            return v ? v.name : voiceURI;
        }
        if (this.voiceSelector) {
            const v = this.voiceSelector.voices.find(x => x.id === voiceURI);
            if (v) return v.name;
        }
        return voiceURI;
    }

    checkGenerateState() {
        const text = (appState.get('text') || '').trim();
        const voice = appState.get('voiceURI');
        const activeKey = this.ttsService.activeKey;
        const engineReady = activeKey === 'browser' || this.aiUnlocked;
        this.DOM.generateBtn.disabled = !(text.length > 0 && !!voice && engineReady);
    }

    bindEvents() {
        this.DOM.generateBtn.addEventListener('click', () => this.generateVoice());
        this.DOM.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.DOM.stopBtn.addEventListener('click', () => this.stopPlayback());
    }

    async generateVoice(textToSpeak = null, overrideOptions = null) {
        const text = textToSpeak || this.textEditor.getValue().trim();
        if (!text) return;

        if (overrideOptions?.provider && overrideOptions.provider !== this.ttsService.activeKey) {
            const switched = await this.switchEngine(overrideOptions.provider);
            if (!switched) {
                Toast.error('Sambungkan ulang ElevenLabs untuk memutar ulang riwayat suara AI ini.');
                return;
            }
        }

        const voiceURI = overrideOptions?.voiceURI || appState.get('voiceURI');
        if (!voiceURI) {
            Toast.error('Please select a voice first.');
            return;
        }

        const synthOptions = { voiceURI };
        if (this.ttsService.activeKey === 'elevenlabs') {
            const s = appState.get('elevenSettings');
            synthOptions.stability = s.stability;
            synthOptions.similarity = s.similarity;
        } else {
            const s = appState.get('settings');
            synthOptions.rate = s.rate;
            synthOptions.pitch = s.pitch;
        }

        this.DOM.generateBtn.disabled = true;
        this.DOM.generateBtn.innerHTML = 'Generating...';
        this._hideDownloadButton();

        this.audioPlayer.show();
        this.audioPlayer.reset();
        this.playbackState = 'playing';
        this.audioPlayer.setPlaying(true);

        try {
            await this.ttsService.synthesize(
                text,
                synthOptions,
                (elapsed, percent) => this.audioPlayer.updateProgress(elapsed, percent),
                () => {
                    this.playbackState = 'finished';
                    this.audioPlayer.setPlaying(false);
                    HistoryService.addEntry(text, voiceURI, this.ttsService.activeKey);
                    this.historyPanel.render();
                    Toast.success('Voice playback finished');
                },
                (err) => {
                    this.playbackState = 'idle';
                    this.audioPlayer.setPlaying(false);
                    Toast.error(err?.message || 'Error generating voice');
                }
            );

            this._updateDownloadButton();
        } catch (e) {
            this.playbackState = 'idle';
            this.audioPlayer.setPlaying(false);
            ErrorHandler.handle(e, 'An error occurred during synthesis.');
        } finally {
            this.DOM.generateBtn.disabled = false;
            this.DOM.generateBtn.innerHTML = GENERATE_ICON;
        }
    }

    _updateDownloadButton() {
        if (this.ttsService.supportsDownload()) {
            const info = this.ttsService.getDownloadInfo();
            this.DOM.downloadBtn.href = info.url;
            this.DOM.downloadBtn.setAttribute('download', info.filename);
            this.DOM.downloadBtn.classList.remove('hidden');
        } else {
            this._hideDownloadButton();
        }
    }

    _hideDownloadButton() {
        this.DOM.downloadBtn.classList.add('hidden');
        this.DOM.downloadBtn.removeAttribute('href');
    }

    togglePlayPause() {
        if (this.playbackState === 'playing') {
            this.ttsService.pause();
            this.playbackState = 'paused';
            this.audioPlayer.setPlaying(false);
        } else if (this.playbackState === 'paused') {
            this.ttsService.resume();
            this.playbackState = 'playing';
            this.audioPlayer.setPlaying(true);
        } else {
            this.generateVoice();
        }
    }

    stopPlayback() {
        this.ttsService.stop();
        this.playbackState = 'idle';
        this.audioPlayer.reset();
    }

    async replayFromHistory(text, voiceURI, provider) {
        this.DOM.navBtns[0].click();
        this.textEditor.setValue(text);
        this.checkGenerateState();
        await this.generateVoice(text, { voiceURI, provider });
    }
}

// Initialize App on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
    window.vocalisApp = new App();
});