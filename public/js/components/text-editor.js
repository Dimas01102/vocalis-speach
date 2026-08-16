import { validateText } from "../utils/validation.js";
import { debounce } from "../utils/debounce.js";
import { appState } from "../core/state.js";
import { Toast } from "./toast.js";

export class TextEditor {
  constructor(
    textareaEl,
    charCountEl,
    wordCountEl,
    clearBtnEl,
    onChangeCallback,
  ) {
    this.textarea = textareaEl;
    this.charCount = charCountEl;
    this.wordCount = wordCountEl;
    this.clearBtn = clearBtnEl;
    this.onChange = onChangeCallback;
    this.maxLength = 5000;

    this.init();
  }

  init() {
    const savedText = appState.get("text") || "";
    this.textarea.value = savedText;
    this.updateStats(savedText);

    const handleInput = debounce((e) => {
      let val = e.target.value;
      if (val.length > this.maxLength) {
        val = val.substring(0, this.maxLength);
        this.textarea.value = val;
        Toast.error("Text exceeds the maximum allowed length.");
      }
      appState.set("text", val);
      this.updateStats(val);
      if (this.onChange) this.onChange(val);
    }, 200);

    this.textarea.addEventListener("input", handleInput);
    this.clearBtn.addEventListener("click", () => this.clear());
  }

  updateStats(text) {
    const validation = validateText(text, this.maxLength);
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;

    this.charCount.textContent = `${chars} / ${this.maxLength} characters`;
    this.wordCount.textContent = `${words} words`;

    if (chars >= this.maxLength) {
      this.charCount.classList.add("error-text");
    } else {
      this.charCount.classList.remove("error-text");
    }

    return validation;
  }

  clear() {
    this.textarea.value = "";
    appState.set("text", "");
    this.updateStats("");
    if (this.onChange) this.onChange("");
  }

  getValue() {
    return this.textarea.value;
  }

  setValue(text) {
    this.textarea.value = text;
    appState.set("text", text);
    this.updateStats(text);
  }
}
