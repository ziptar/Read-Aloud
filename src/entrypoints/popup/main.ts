import {
  Reader,
  TTSSettings,
  SettingsManager,
  Logger,
  PlaybackState,
  MessageBus,
  Message,
  TTSVoice,
} from "../../lib/";

class PopupController {
  private ttsSettings!: TTSSettings;
  private playbackState: PlaybackState = {
    isPlaying: false,
    isPaused: false,
  };
  private voices: TTSVoice[] = [];
  private currentTab!: Browser.tabs.Tab;
  private logger: Logger;

  // DOM elements
  private playPauseBtn!: HTMLButtonElement;
  private stopBtn!: HTMLButtonElement;
  private playIcon!: SVGElement;
  private pauseIcon!: SVGElement;
  private playPauseText!: HTMLSpanElement;
  private voiceSelect!: HTMLSelectElement;
  private rateSlider!: HTMLInputElement;
  private rateValue!: HTMLSpanElement;
  private pitchSlider!: HTMLInputElement;
  private pitchValue!: HTMLSpanElement;
  private volumeSlider!: HTMLInputElement;
  private volumeValue!: HTMLSpanElement;
  private statusText!: HTMLElement;
  private settingsChanged: boolean = false;

  constructor(enableLogger?: boolean) {
    this.logger = new Logger(enableLogger);
    this.initializeElements();
    this.init();
  }

  private initializeElements(): void {
    this.playPauseBtn = document.getElementById(
      "play-pause-btn"
    ) as HTMLButtonElement;
    this.stopBtn = document.getElementById("stop-btn") as HTMLButtonElement;
    this.playIcon = document.getElementById(
      "play-icon"
    ) as unknown as SVGElement;
    this.pauseIcon = document.getElementById(
      "pause-icon"
    ) as unknown as SVGElement;
    this.playPauseText = document.getElementById(
      "play-pause-text"
    ) as HTMLSpanElement;
    this.voiceSelect = document.getElementById(
      "voice-select"
    ) as HTMLSelectElement;
    this.rateSlider = document.getElementById(
      "rate-slider"
    ) as HTMLInputElement;
    this.rateValue = document.getElementById("rate-value") as HTMLSpanElement;
    this.pitchSlider = document.getElementById(
      "pitch-slider"
    ) as HTMLInputElement;
    this.pitchValue = document.getElementById("pitch-value") as HTMLSpanElement;
    this.volumeSlider = document.getElementById(
      "volume-slider"
    ) as HTMLInputElement;
    this.volumeValue = document.getElementById(
      "volume-value"
    ) as HTMLSpanElement;
    this.statusText = document.getElementById("status-text") as HTMLElement;
  }

  private async init(): Promise<void> {
    try {
      await this.getCurrentTab();

      if (this.currentTab.url?.includes("chrome://")) {
        this.setStatus("Chrome internal page", "error");
        return;
      }

      this.setupEventListeners();

      await this.loadContentScript();

      this.ttsSettings = await SettingsManager.loadSettings();

      await this.getSpeechState();

      await this.loadVoices();

      this.logger.log("Popup initialized successfully.");
    } catch (error) {
      console.error("Failed to initialize popup:", error);
      this.setStatus("Error initializing", "error");
    }
  }

  private async getCurrentTab(): Promise<void> {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    this.currentTab = tab;
  }

  private setupEventListeners(): void {
    window.addEventListener("blur", () => this.saveSettingsOnClose());

    browser.runtime.onMessage.addListener((message: Message) =>
      this.handleMessage(message)
    );
    // Playback controls
    this.playPauseBtn.addEventListener("click", () => this.handlePlayPause());
    this.stopBtn.addEventListener("click", () => this.handleStop());

    // Settings controls
    this.voiceSelect.addEventListener("change", () => this.handleVoiceChange());
    this.rateSlider.addEventListener("input", () => this.handleRateChange());
    this.pitchSlider.addEventListener("input", () => this.handlePitchChange());
    this.volumeSlider.addEventListener("input", () =>
      this.handleVolumeChange()
    );
  }

  private saveSettingsOnClose(): void {
    if (!this.settingsChanged) return;

    MessageBus.sendToBackground({
      type: "SAVE_SETTINGS",
      payload: this.ttsSettings,
    });
  }

  private handleMessage(message: Message): void {
    if (message.type === "SPEECH_STARTED") {
      this.playbackState.isPlaying = true;
      this.playbackState.isPaused = false;
      this.setStatus("Reading content...", "playing");
      this.updatePlaybackControls();
      return;
    }

    if (message.type === "SPEECH_ENDED" || message.type === "SPEECH_STOPPED") {
      this.playbackState.isPlaying = false;
      this.playbackState.isPaused = false;
      this.setStatus("Ready", "normal");
      this.updatePlaybackControls();
      return;
    }

    if (message.type === "SPEECH_PAUSED") {
      this.playbackState.isPaused = true;
      this.setStatus("Paused", "paused");
      this.updatePlaybackControls();
      return;
    }

    if (message.type === "SPEECH_RESUMED") {
      this.playbackState.isPaused = false;
      this.setStatus("Resuming...", "playing");
      this.updatePlaybackControls();
      return;
    }

    if (message.type === "SPEECH_ERROR") {
      this.playbackState.isPlaying = false;
      this.playbackState.isPaused = false;
      this.setStatus(`Error: ${message.payload || "Unknown error"}`, "error");
      this.updatePlaybackControls();
      return;
    }

    if (message.type === "UPDATE_VOICES") {
      this.voices = message.payload;
      this.populateVoiceSelect();
      this.updateUI();
      return;
    }

    if (message.type === "UPDATE_SPEECH_STATE") {
      this.playbackState = message.payload;
      this.updatePlaybackControls();

      if (!this.playbackState.isPlaying) {
        return;
      }

      if (this.playbackState.isPaused) {
        this.setStatus("Paused", "paused");
      } else {
        this.setStatus("Reading content...", "playing");
      }
    }
  }

  private async handlePlayPause(): Promise<void> {
    try {
      if (!this.playbackState?.isPlaying) {
        await MessageBus.sendToContent({
          type: "SPEAK_TEXT",
          payload: this.ttsSettings,
          tabId: this.currentTab.id,
        });
        this.updatePlaybackControls();
        return;
      }

      const messageType = this.playbackState.isPaused
        ? "RESUME_SPEECH"
        : "PAUSE_SPEECH";
      await MessageBus.sendToContent({
        type: messageType,
        tabId: this.currentTab.id,
      });

      this.updatePlaybackControls();
    } catch (error: any) {
      console.error("Playback error:", error);
      this.setStatus("Playback error", "error");
    }
  }

  private async handleStop(): Promise<void> {
    try {
      await MessageBus.sendToContent({
        type: "STOP_SPEECH",
        tabId: this.currentTab.id,
      });
      this.updatePlaybackControls();
    } catch (error) {
      console.error("Stop error:", error);
      this.setStatus("Stop error", "error");
    }
  }

  private updatePlaybackControls(): void {
    const isPlaying = this.playbackState?.isPlaying || false;
    const isPaused = this.playbackState?.isPaused || false;

    // Update play/pause button
    if (isPlaying && !isPaused) {
      this.playIcon.style.display = "none";
      this.pauseIcon.style.display = "block";
      this.playPauseText.textContent = "Pause";
      this.playPauseBtn.disabled = false;
      this.stopBtn.disabled = false;
    } else if (isPaused) {
      this.playIcon.style.display = "block";
      this.pauseIcon.style.display = "none";
      this.playPauseText.textContent = "Resume";
      this.playPauseBtn.disabled = false;
      this.stopBtn.disabled = false;
    } else {
      this.playIcon.style.display = "block";
      this.pauseIcon.style.display = "none";
      this.playPauseText.textContent = "Play";
      this.playPauseBtn.disabled = false;
      this.stopBtn.disabled = true;
    }

    // Update container class for styling
    document.body.className = "";
    if (isPlaying && !isPaused) {
      document.body.classList.add("playing");
    } else if (isPaused) {
      document.body.classList.add("paused");
    }
  }

  private handleVoiceChange(): void {
    this.ttsSettings.voice = this.voiceSelect.value;
    this.settingsChanged = true;
  }

  private handleRateChange(): void {
    this.ttsSettings.rate = parseFloat(this.rateSlider.value);
    this.rateValue.textContent = this.rateSlider.value;
    this.settingsChanged = true;
  }

  private handlePitchChange(): void {
    this.ttsSettings.pitch = parseFloat(this.pitchSlider.value);
    this.pitchValue.textContent = this.pitchSlider.value;
    this.settingsChanged = true;
  }

  private handleVolumeChange(): void {
    const volume = parseFloat(this.volumeSlider.value);
    this.volumeValue.textContent = `${Math.round(volume * 100)}%`;
    this.ttsSettings.volume = volume;
  }

  private async loadContentScript(): Promise<void> {
    if (this.currentTab) {
      try {
        // First check if we can communicate with the content script
        await MessageBus.sendToContent({
          type: "PING",
          tabId: this.currentTab.id,
        });
        // Content script is already loaded
        this.logger.log("Content script is loaded.");
      } catch (error) {
        try {
          // Content script is not loaded, inject it first
          this.logger.log("Content script not loaded. Injecting it now.");
          await browser.scripting.executeScript({
            target: { tabId: this.currentTab.id! },
            files: ["content-scripts/content.js"],
          });
          this.logger.log("Content script injected successfully.");
        } catch (error: any) {
          console.error("Failed to inject content script:", error.message);
        }
      }
    }
  }

  private async getSpeechState(): Promise<void> {
    await MessageBus.sendToContent({
      type: "GET_SPEECH_STATE",
      tabId: this.currentTab.id,
    });
  }

  private async loadVoices(): Promise<void> {
    try {
      // Clear existing options
      this.voiceSelect.innerHTML =
        '<option value="">Loading voices...</option>';

      // Get voices from background script
      await MessageBus.sendToContent({
        type: "GET_VOICES",
        tabId: this.currentTab.id,
      });
    } catch (error) {
      console.error("Failed to load voices:", error);
      this.voiceSelect.innerHTML =
        '<option value="">No voices available</option>';
    }
  }

  private populateVoiceSelect(): void {
    this.voiceSelect.innerHTML = "";

    if (this.voices.length === 0) {
      this.voiceSelect.innerHTML =
        '<option value="">No voices available</option>';
      return;
    }

    this.voices.forEach((voice) => {
      const option = document.createElement("option");
      option.value = voice.name;
      option.textContent = `${voice.name} (${voice.lang})`;
      this.voiceSelect.appendChild(option);
    });
  }

  private updateUI(): void {
    this.voiceSelect.value = this.ttsSettings.voice;

    // Update sliders and values
    this.rateSlider.value = this.ttsSettings.rate.toString();
    this.rateValue.textContent = `${this.ttsSettings.rate.toFixed(1)}x`;

    this.pitchSlider.value = this.ttsSettings.pitch.toString();
    this.pitchValue.textContent = `${this.ttsSettings.pitch.toFixed(1)}`;

    this.volumeSlider.value = this.ttsSettings.volume.toString();
    this.volumeValue.textContent = `${Math.round(
      this.ttsSettings.volume * 100
    )}%`;
  }

  private setStatus(
    text: string,
    type: "normal" | "playing" | "paused" | "error" = "normal"
  ): void {
    this.statusText.textContent = text;
    this.statusText.className = type;
  }
}

// Initialize popup when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new PopupController(true);
});
