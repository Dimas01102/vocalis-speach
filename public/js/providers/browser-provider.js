import { BaseProvider } from "./base-provider.js";

export class BrowserProvider extends BaseProvider {
  constructor() {
    super();
    this.name = "Browser Web Speech API";
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.capabilities = { pitch: true, rate: true, download: false };
    this.currentUtterance = null;

    this.progressInterval = null;
    this.elapsed = 0;
    this.estimatedDuration = 0;
    this.onProgressCallback = null;

    this.recordingStream = null;
    this.recordingEnabled = false;
    this.currentObjectUrl = null;
    this.lastVoiceName = "voice";
  }

  async init() {
    return new Promise((resolve) => {
      let voices = this.synth.getVoices();
      if (voices.length > 0) {
        this.voices = voices;
        resolve(true);
        return;
      }

      this.synth.onvoiceschanged = () => {
        this.voices = this.synth.getVoices();
        resolve(true);
      };

      setTimeout(() => {
        if (this.voices.length === 0) {
          this.voices = this.synth.getVoices();
        }
        resolve(true);
      }, 1000);
    });
  }

  async getVoices() {
    return this.voices.map((v) => ({
      id: v.voiceURI,
      name: v.name,
      lang: v.lang,
      localService: v.localService,
      raw: v,
    }));
  }

  isRecordingSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
  }

  isRecordingEnabled() {
    return this.recordingEnabled;
  }

  async enableRecording() {
    if (!this.isRecordingSupported()) {
      throw new Error("Perekaman tab tidak didukung di browser ini.");
    }

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });
    const audioTracks = stream.getAudioTracks();
    stream.getVideoTracks().forEach((t) => t.stop());

    if (!audioTracks.length) {
      stream.getTracks().forEach((t) => t.stop());
      throw new Error(
        'Tidak ada audio yang dibagikan. Saat memilih tab, centang "Share tab audio" / "Bagikan audio tab".',
      );
    }

    this.recordingStream = new MediaStream(audioTracks);
    this.recordingEnabled = true;

    // If the user stops sharing via the browser's own UI, reflect that.
    audioTracks[0].addEventListener("ended", () => this.disableRecording());
  }

  disableRecording() {
    if (this.recordingStream) {
      this.recordingStream.getTracks().forEach((t) => t.stop());
    }
    this.recordingStream = null;
    this.recordingEnabled = false;
  }

  async synthesize(text, options, onProgress, onEnd, onError) {
    this._clearProgressTimer();

    if (this.synth.speaking || this.synth.pending) {
      this.synth.cancel();
    }

    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = this.voices.find((v) => v.voiceURI === options.voiceURI);

    if (voice) utterance.voice = voice;
    utterance.rate = options.rate || 1;
    utterance.pitch = options.pitch || 1;
    this.lastVoiceName = voice ? voice.name : "voice";

    this.estimatedDuration = (text.length / 15) * (1 / utterance.rate);
    this.elapsed = 0;
    this.onProgressCallback = onProgress;

    let recorder = null;
    let chunks = [];
    if (this.recordingEnabled && this.recordingStream) {
      try {
        recorder = new MediaRecorder(this.recordingStream);
        chunks = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        recorder.start();
      } catch (e) {
        recorder = null;
      }
    }

    utterance.onstart = () => {
      this._startProgressTimer();
    };

    utterance.onend = () => {
      this._clearProgressTimer();
      this.currentUtterance = null;
      onProgress(this.estimatedDuration, 100);

      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: "audio/webm" });
          this.currentObjectUrl = URL.createObjectURL(blob);
          onEnd();
        };
        recorder.stop();
      } else {
        onEnd();
      }
    };

    utterance.onerror = (e) => {
      this._clearProgressTimer();
      this.currentUtterance = null;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      // 'canceled' fires from stop()/clear, and 'interrupted' fires when
      // we call cancel() above to replace an in-progress utterance with
      // a new one (e.g. pressing Generate again). Neither is a real
      // failure, so they shouldn't surface as error toasts.
      if (e.error !== "canceled" && e.error !== "interrupted") {
        onError(e);
      }
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  _startProgressTimer() {
    this._clearProgressTimer();
    this.progressInterval = setInterval(() => {
      this.elapsed += 0.1;
      const percent = Math.min(
        (this.elapsed / this.estimatedDuration) * 100,
        99,
      );
      if (this.onProgressCallback)
        this.onProgressCallback(this.elapsed, percent);
    }, 100);
  }

  _clearProgressTimer() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  stop() {
    this._clearProgressTimer();
    if (this.synth) this.synth.cancel();
  }

  pause() {
    this._clearProgressTimer();
    if (this.synth) this.synth.pause();
  }

  resume() {
    if (this.synth) this.synth.resume();
    this._startProgressTimer();
  }

  supportsDownload() {
    return !!this.currentObjectUrl;
  }

  getDownloadInfo() {
    if (!this.currentObjectUrl) return null;
    const safeName =
      (this.lastVoiceName || "voice")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "voice";
    return {
      url: this.currentObjectUrl,
      filename: `vocalis-${safeName}-${Date.now()}.webm`,
    };
  }
}
