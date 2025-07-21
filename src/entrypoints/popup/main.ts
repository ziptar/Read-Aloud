import { Reader, TTSSettings, SettingsManager, Logger, PlaybackState } from "../../lib/";

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
  private initializeElements() {
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
  private async init() {
    try {
      await this.getCurrentTab();
      // Setup event listeners
      this.logger.log("Setup event listeners.");
      this.setupEventListeners();
      // Load content script
      await this.loadContentScript();

      // Load voices
      await this.loadVoices();

      // Load saved settings first
      this.ttsSettings = await SettingsManager.loadSettings();

      // Apply settings to UI
      this.applySettingsToUI();

      // Check if reader is currently speaking
      await this.checkSpeechState();
    } catch (error) {
      console.error("Error initializing:", error);
      this.statusMessage.textContent = "Error initializing. Please try again.";
    }
  }
  private setupEventListeners() {
    // Save settings when popup is closed
    window.addEventListener("blur", () => {
      if (this.settingsChanged) {
        browser.runtime.sendMessage({
          action: "saveSettings",
          options: this.ttsSettings,
        });
      }
    });

    // Listen for messages from background script
    browser.runtime.onMessage.addListener((message) => {
      if (message.action === "speechStarted") {
        this.playbackState.isPlaying = true;
        this.playbackState.isPaused = false;
        this.statusMessage.textContent = "Reading page content...";
        this.updateUI();
      } else if (
        message.action === "speechEnded" ||
        message.action === "speechStopped"
      ) {
        this.playbackState.isPlaying = false;
        this.playbackState.isPaused = false;
        this.statusMessage.textContent = "Finished reading.";
        this.updateUI();
      } else if (message.action === "speechPaused") {
        this.playbackState.isPaused = true;
        this.statusMessage.textContent = "Paused reading.";
        this.updateUI();
      } else if (message.action === "speechResumed") {
        this.playbackState.isPaused = false;
        this.statusMessage.textContent = "Resumed reading...";
        this.updateUI();
      } else if (message.action === "speechError") {
        this.playbackState.isPlaying = false;
        this.playbackState.isPaused = false;
        this.statusMessage.textContent = `Error: ${
          message.error || "Unknown error"
        }`;
        this.updateUI();
      } else if (message.action === "updateSpeechState") {
        this.playbackState.isPlaying = message.state.isSpeaking;
        this.playbackState.isPaused = message.state.isPaused;
        if (this.playbackState.isPlaying) {
          this.statusMessage.textContent = this.playbackState.isPaused
            ? "Paused reading."
            : "Reading page content...";
        }
        this.updateUI();
      }
    });

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
  // Get the current active tab
  private async getCurrentTab() {
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      this.currentTabId = tab?.id;
    } catch (error) {
      console.error("Error getting current tab:", error);
      this.statusMessage.textContent = "Error accessing current tab.";
    }
  }

  // Load content script
  private async loadContentScript() {
    if (this.currentTabId) {
      try {
        // First check if we can communicate with the content script
        await browser.tabs.sendMessage(this.currentTabId, { action: "ping" });
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
  private async loadVoices() {
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
  private applySettingsToUI() {
    this.voiceSelect.value = this.ttsSettings.voice;

    this.rateRange.value = this.ttsSettings.rate.toString();
    this.rateValue.textContent = this.ttsSettings.rate.toString();

    this.pitchRange.value = this.ttsSettings.pitch.toString();
    this.pitchValue.textContent = this.ttsSettings.pitch.toString();

    this.volumeRange.value = this.ttsSettings.volume.toString();
    this.volumeValue.textContent = this.ttsSettings.volume.toString();
  }

  // Check if reader is currently speaking
  private async checkSpeechState() {
    await browser.tabs
      .sendMessage(this.currentTabId!, {
        action: "getSpeechState",
      })
      .catch((error) => {
        console.error("Error checking speech state:", error);
      });
  }

  // Update UI based on speech state
  private updateUI() {
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
  private startSpeaking() {
    if (this.playbackState.isPlaying) return;

    browser.tabs
      .sendMessage(this.currentTabId!, {
        action: "startSpeaking",
        options: this.ttsSettings,
      })
      .catch((error) => {
        console.error("Error starting speech:", error.message);
        this.statusMessage.textContent =
          "Error starting speech. Please try again.";
      });
  }

  // Stop speech
  private stopSpeaking() {
    if (!this.playbackState.isPlaying && !this.playbackState.isPaused) return;

    browser.tabs
      .sendMessage(this.currentTabId!, { action: "stopSpeaking" })
      .catch((error) => {
        console.error("Error stopping speech:", error);
        this.statusMessage.textContent =
          "Error stopping speech. Please try again.";
      });
  }

  // Pause or resume speech
  private togglePause() {
    if (!this.playbackState.isPlaying) return;

    try {
      if (this.playbackState.isPaused) {
        browser.tabs.sendMessage(this.currentTabId!, {
          action: "resumeSpeaking",
        });
      } else {
        browser.tabs.sendMessage(this.currentTabId!, {
          action: "pauseSpeaking",
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
