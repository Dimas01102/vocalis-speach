import { appState } from "../core/state.js";
import { formatLanguageLabel, formatFlagOnly } from "../utils/locale.js";

export class VoiceSelector {
  constructor(langSelectEl, voiceSelectEl, provider, onChangeCallback) {
    this.langSelect = langSelectEl;
    this.voiceSelect = voiceSelectEl;
    this.provider = provider;
    this.onChange = onChangeCallback;
    this.voices = [];
  }

  async loadVoices() {
    this.voices = await this.provider.getVoices();
    if (!this.voices.length) return;

    const languages = [...new Set(this.voices.map((v) => v.lang))]
      .map((lang) => ({ lang, label: formatLanguageLabel(lang) }))
      .sort((a, b) => a.label.localeCompare(b.label));

    this.langSelect.innerHTML = '<option value="all">🌐 All Languages</option>';
    languages.forEach(({ lang, label }) => {
      const opt = document.createElement("option");
      opt.value = lang;
      opt.textContent = label;
      this.langSelect.appendChild(opt);
    });

    this.langSelect.disabled = false;
    this.voiceSelect.disabled = false;

    // Auto select user's browser language if available
    const navLang = navigator.language;
    if (languages.some((l) => l.lang === navLang)) {
      this.langSelect.value = navLang;
    }

    this.renderVoices();

    this.langSelect.addEventListener("change", () => this.renderVoices());
    this.voiceSelect.addEventListener("change", (e) => {
      appState.set("voiceURI", e.target.value);
      if (this.onChange) this.onChange();
    });
  }

  renderVoices() {
    const selectedLang = this.langSelect.value;
    const filtered =
      selectedLang === "all"
        ? this.voices
        : this.voices.filter((v) => v.lang === selectedLang);

    this.voiceSelect.innerHTML = "";
    filtered.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v.id;
      const flag = formatFlagOnly(v.lang);
      const localBadge = v.localService ? " · offline" : "";
      opt.textContent = `${flag} ${v.name}${localBadge}`;
      this.voiceSelect.appendChild(opt);
    });

    if (filtered.length > 0) {
      appState.set("voiceURI", filtered[0].id);
      if (this.onChange) this.onChange();
    } else {
      appState.set("voiceURI", "");
      if (this.onChange) this.onChange();
    }
  }
}
