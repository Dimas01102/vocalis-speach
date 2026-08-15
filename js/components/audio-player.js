import { formatTime } from '../utils/format.js';

export class AudioPlayer {
    constructor(containerEl, playPauseBtn, stopBtn, timeCurrent, progressBar, visualizer) {
        this.container = containerEl;
        this.playPauseBtn = playPauseBtn;
        this.stopBtn = stopBtn;
        this.timeCurrent = timeCurrent;
        this.progressBar = progressBar;
        this.visualizer = visualizer;

        this.iconPlay = playPauseBtn.querySelector('.icon-play');
        this.iconPause = playPauseBtn.querySelector('.icon-pause');
    }

    show() {
        this.container.classList.remove('hidden');
    }

    hide() {
        this.container.classList.add('hidden');
    }

    setPlaying(isPlaying) {
        if (isPlaying) {
            this.iconPlay.classList.add('hidden');
            this.iconPause.classList.remove('hidden');
            this.visualizer.classList.remove('hidden');
        } else {
            this.iconPlay.classList.remove('hidden');
            this.iconPause.classList.add('hidden');
            this.visualizer.classList.add('hidden');
        }
    }

    updateProgress(elapsedSeconds, percent) {
        this.timeCurrent.textContent = formatTime(elapsedSeconds);
        this.progressBar.style.width = `${percent}%`;
    }

    reset() {
        this.setPlaying(false);
        this.timeCurrent.textContent = '00:00';
        this.progressBar.style.width = '0%';
    }
}