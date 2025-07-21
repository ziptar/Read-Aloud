import {
  Reader,
  TTSSettings,
  SettingsManager,
  Logger,
  PlaybackState,
  MessageBus,
  Message,
} from "../../lib/";

class PopupController {
  private logger = new Logger(true);
  private ttsSettings!: TTSSettings;
  private playbackState: PlaybackState = {
    isPlaying: false,
    isPaused: false,
  };
  private settingsChanged = false;
  private currentTabId?: number;
  // Get DOM elements
  private readButton!: HTMLButtonElement;
  private pauseButton!: HTMLButtonElement;
  private stopButton!: HTMLButtonElement;
  private voiceSelect!: HTMLSelectElement;
  private rateRange!: HTMLInputElement;
  private pitchRange!: HTMLInputElement;
  private volumeRange!: HTMLInputElement;
  private rateValue!: HTMLSpanElement;
  private pitchValue!: HTMLSpanElement;
  private volumeValue!: HTMLSpanElement;
  private statusMessage!: HTMLDivElement;

  constructor() {
    this.initializeElements();
    this.init();
  }
  private initializeElements(): void {
    this.readButton = document.getElementById(
      "readButton"
    ) as HTMLButtonElement;
    this.pauseButton = document.getElementById(
      "pauseButton"
    ) as HTMLButtonElement;
    this.stopButton = document.getElementById(
      "stopButton"
    ) as HTMLButtonElement;
    this.voiceSelect = document.getElementById(
      "voiceSelect"
    ) as HTMLSelectElement;
    this.rateRange = document.getElementById("rateRange") as HTMLInputElement;
    this.pitchRange = document.getElementById("pitchRange") as HTMLInputElement;
    this.volumeRange = document.getElementById(
      "volumeRange"
    ) as HTMLInputElement;
    this.rateValue = document.getElementById("rateValue") as HTMLSpanElement;
    this.pitchValue = document.getElementById("pitchValue") as HTMLSpanElement;
    this.volumeValue = document.getElementById(
      "volumeValue"
    ) as HTMLSpanElement;
    this.statusMessage = document.getElementById(
      "statusMessage"
    ) as HTMLDivElement;
  }
  private async init(): Promise<void> {
    try {
      await this.getCurrentTab();

      this.setupEventListeners();

      await this.loadContentScript();

      await this.loadVoices();

      // Load saved settings first
      this.ttsSettings = await SettingsManager.loadSettings();

      this.applySettingsToUI();

      // Check if reader is currently speaking
      await this.checkSpeechState();
    } catch (error) {
      console.error("Error initializing:", error);
      this.statusMessage.textContent = "Error initializing. Please try again.";
    }
  }

  private async getCurrentTab(): Promise<void> {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    this.currentTabId = tab?.id;
  }

  private setupEventListeners(): void {
    this.logger.log("Setup event listeners.");
    // Save settings when popup is closed
    window.addEventListener("blur", () => this.saveSettingsOnClose());

    // Listen for messages from background script
    browser.runtime.onMessage.addListener((message: Message) =>
      this.handleMessage(message)
    );

    // Add event listeners
    this.readButton.addEventListener("click", () => this.startSpeaking());
    this.stopButton.addEventListener("click", () => this.stopSpeaking());
    this.pauseButton.addEventListener("click", () => this.togglePause());
    this.voiceSelect.addEventListener("change", () => {
      this.ttsSettings.voice = this.voiceSelect.value;
      this.settingsChanged = true;
    });
    this.rateRange.addEventListener("input", () => {
      this.ttsSettings.rate = parseFloat(this.rateRange.value);
      this.rateValue.textContent = this.rateRange.value;
      this.settingsChanged = true;
    });
    this.pitchRange.addEventListener("input", () => {
      this.ttsSettings.pitch = parseFloat(this.pitchRange.value);
      this.pitchValue.textContent = this.pitchRange.value;
      this.settingsChanged = true;
    });
    this.volumeRange.addEventListener("input", () => {
      this.ttsSettings.volume = parseFloat(this.volumeRange.value);
      this.volumeValue.textContent = this.volumeRange.value;
      this.settingsChanged = true;
    });
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
      this.statusMessage.textContent = "Reading page content...";
      this.updateUI();
      return;
    }
    if (message.type === "SPEECH_ENDED" || message.type === "SPEECH_STOPPED") {
      this.playbackState.isPlaying = false;
      this.playbackState.isPaused = false;
      this.statusMessage.textContent = "Finished reading.";
      this.updateUI();
      return;
    }
    if (message.type === "SPEECH_PAUSED") {
      this.playbackState.isPaused = true;
      this.statusMessage.textContent = "Paused reading.";
      this.updateUI();
      return;
    }
    if (message.type === "SPEECH_RESUMED") {
      this.playbackState.isPaused = false;
      this.statusMessage.textContent = "Resumed reading...";
      this.updateUI();
      return;
    }
    if (message.type === "SPEECH_ERROR") {
      this.playbackState.isPlaying = false;
      this.playbackState.isPaused = false;
      this.statusMessage.textContent = `Error: ${
        message.payload || "Unknown error"
      }`;
      this.updateUI();
      return;
    }
    if (message.type === "UPDATE_SPEECH_STATE") {
      this.playbackState.isPlaying = message.payload.isPlaying;
      this.playbackState.isPaused = message.payload.isPaused;
      if (this.playbackState.isPlaying) {
        this.statusMessage.textContent = this.playbackState.isPaused
          ? "Paused reading."
          : "Reading page content...";
      }
      this.updateUI();
    }
  }

  private async loadContentScript(): Promise<void> {
    if (this.currentTabId) {
      try {
        // First check if we can communicate with the content script
        await MessageBus.sendToContent({
          type: "PING",
          tabId: this.currentTabId!,
        });
        // Content script is already loaded
        this.logger.log("Content script is loaded.");
      } catch (error) {
        try {
          // Content script is not loaded, inject it first
          this.logger.log("Content script not loaded. Injecting it now.");
          await browser.scripting.executeScript({
            target: { tabId: this.currentTabId! },
            files: ["content-scripts/content.js"],
          });
          this.logger.log("Content script injected successfully.");
        } catch (error: any) {
          console.error("Failed to inject content script:", error.message);
        }
      }
    }
  }

  // Load available voices
  private async loadVoices(): Promise<void> {
    try {
      const voices = await Reader.getVoices();

      // Populate voice select dropdown
      this.voiceSelect.innerHTML = "";
      voices.forEach((voice) => {
        const option = document.createElement("option");
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang})`;
        this.voiceSelect.appendChild(option);
      });
    } catch (error) {
      console.error("Error loading voices:", error);
      this.statusMessage.textContent =
        "Error loading voices. Please try again.";
    }
  }

  // Apply settings to UI controls
  private applySettingsToUI(): void {
    this.voiceSelect.value = this.ttsSettings.voice;

    this.rateRange.value = this.ttsSettings.rate.toString();
    this.rateValue.textContent = this.ttsSettings.rate.toString();

    this.pitchRange.value = this.ttsSettings.pitch.toString();
    this.pitchValue.textContent = this.ttsSettings.pitch.toString();

    this.volumeRange.value = this.ttsSettings.volume.toString();
    this.volumeValue.textContent = this.ttsSettings.volume.toString();
  }

  // Check if reader is currently speaking
  private async checkSpeechState(): Promise<void> {
    await MessageBus.sendToContent({
      type: "GET_SPEECH_STATE",
      tabId: this.currentTabId,
    }).catch((error) => {
      console.error("Error checking speech state:", error);
    });
  }

  // Update UI based on speech state
  private updateUI(): void {
    this.readButton.disabled = this.playbackState.isPlaying;
    this.pauseButton.disabled = !this.playbackState.isPlaying;
    this.stopButton.disabled =
      !this.playbackState.isPlaying && !this.playbackState.isPaused;

    if (this.playbackState.isPlaying) {
      this.readButton.innerHTML = '<span class="icon">▶</span> Reading...';
      this.pauseButton.innerHTML = this.playbackState.isPaused
        ? '<span class="icon">▶</span> Resume'
        : '<span class="icon">⏸</span> Pause';
    } else {
      this.readButton.innerHTML = '<span class="icon">▶</span> Read Aloud';
      this.pauseButton.innerHTML = '<span class="icon">⏸</span> Pause';
    }
  }

  // Start reading the page content
  private startSpeaking(): void {
    if (this.playbackState.isPlaying) return;

    MessageBus.sendToContent({
      type: "SPEAK_TEXT",
      payload: this.ttsSettings,
      tabId: this.currentTabId,
    }).catch((error) => {
      console.error("Error starting speech:", error.message);
      this.statusMessage.textContent =
        "Error starting speech. Please try again.";
    });
  }

  // Stop speech
  private stopSpeaking(): void {
    if (!this.playbackState.isPlaying && !this.playbackState.isPaused) return;

    MessageBus.sendToContent({
      type: "STOP_SPEECH",
      tabId: this.currentTabId,
    }).catch((error) => {
      console.error("Error stopping speech:", error);
      this.statusMessage.textContent =
        "Error stopping speech. Please try again.";
    });
  }

  // Pause or resume speech
  private togglePause(): void {
    if (!this.playbackState.isPlaying) return;

    try {
      if (this.playbackState.isPaused) {
        MessageBus.sendToContent({
          type: "RESUME_SPEECH",
          tabId: this.currentTabId,
        });
      } else {
        MessageBus.sendToContent({
          type: "PAUSE_SPEECH",
          tabId: this.currentTabId,
        });
      }
      this.updateUI();
    } catch (error) {
      console.error("Error toggling pause:", error);
      this.statusMessage.textContent =
        "Error controlling speech. Please try again.";
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new PopupController();
});
