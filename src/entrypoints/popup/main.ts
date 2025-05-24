import "./style.css";
import { Reader, SpeechOptions } from "../modules/reader";
import { SettingsManager } from "../modules/settings";

let speechOptions: SpeechOptions = {};

let settingsChanged = false;
let currentTab: Browser.tabs.Tab | null = null;

// Speech synthesis state
let isSpeaking = false;
let isPaused = false;

// Initialize the popup UI
document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="read-aloud-container">
    <h1>Read Aloud</h1>
    
    <div class="controls">
      <button id="readButton" class="primary-button">
        <span class="icon">▶</span> Read Aloud
      </button>
      <button id="pauseButton" class="control-button" disabled>
        <span class="icon">⏸</span> Pause
      </button>
      <button id="stopButton" class="control-button" disabled>
        <span class="icon">⏹</span> Stop
      </button>
    </div>
    
    <div class="settings">
      <h2>Settings</h2>
      
      <div class="setting-group">
        <label for="voiceSelect">Voice:</label>
        <select id="voiceSelect"></select>
      </div>
      
      <div class="setting-group">
        <label for="rateRange">Speed:</label>
        <input type="range" id="rateRange" min="0.5" max="2" step="0.1" value="1">
        <span id="rateValue">1.0</span>
      </div>
      
      <div class="setting-group">
        <label for="pitchRange">Pitch:</label>
        <input type="range" id="pitchRange" min="0.5" max="2" step="0.1" value="1">
        <span id="pitchValue">1.0</span>
      </div>
      
      <div class="setting-group">
        <label for="volumeRange">Volume:</label>
        <input type="range" id="volumeRange" min="0" max="1" step="0.1" value="1">
        <span id="volumeValue">1.0</span>
      </div>
    </div>
    
    <div class="status" id="statusMessage"></div>
  </div>
`;

// Get DOM elements
const readButton = document.getElementById("readButton") as HTMLButtonElement;
const pauseButton = document.getElementById("pauseButton") as HTMLButtonElement;
const stopButton = document.getElementById("stopButton") as HTMLButtonElement;
const voiceSelect = document.getElementById("voiceSelect") as HTMLSelectElement;
const rateRange = document.getElementById("rateRange") as HTMLInputElement;
const pitchRange = document.getElementById("pitchRange") as HTMLInputElement;
const volumeRange = document.getElementById("volumeRange") as HTMLInputElement;
const rateValue = document.getElementById("rateValue") as HTMLSpanElement;
const pitchValue = document.getElementById("pitchValue") as HTMLSpanElement;
const volumeValue = document.getElementById("volumeValue") as HTMLSpanElement;
const statusMessage = document.getElementById(
  "statusMessage"
) as HTMLDivElement;

// Get the current active tab
async function getCurrentTab() {
  try {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tabs.length > 0) {
      currentTab = tabs[0];
    }
  } catch (error) {
    console.error("Error getting current tab:", error);
    statusMessage.textContent = "Error accessing current tab.";
  }
}

// Load available voices
async function loadVoices() {
  try {
    const voices = await Reader.getVoices();

    // Populate voice select dropdown
    voiceSelect.innerHTML = "";
    voices.forEach((voice) => {
      const option = document.createElement("option");
      option.value = voice.name;
      option.textContent = `${voice.name} (${voice.lang})`;
      voiceSelect.appendChild(option);
    });

    // Select default voice
    if (voices.length > 0) {
      speechOptions.voice = voices[0].name;
    }
  } catch (error) {
    console.error("Error loading voices:", error);
    statusMessage.textContent = "Error loading voices. Please try again.";
  }
}

// Apply settings to UI controls
function applySettingsToUI() {
  if (speechOptions.voice) {
    voiceSelect.value = speechOptions.voice;
  }

  if (speechOptions.rate) {
    rateRange.value = speechOptions.rate.toString();
    rateValue.textContent = speechOptions.rate.toString();
  }

  if (speechOptions.pitch) {
    pitchRange.value = speechOptions.pitch.toString();
    pitchValue.textContent = speechOptions.pitch.toString();
  }

  if (speechOptions.volume) {
    volumeRange.value = speechOptions.volume.toString();
    volumeValue.textContent = speechOptions.volume.toString();
  }
}

// Update UI based on speech state
function updateUI() {
  readButton.disabled = isSpeaking;
  pauseButton.disabled = !isSpeaking;
  stopButton.disabled = !isSpeaking && !isPaused;

  if (isSpeaking) {
    readButton.innerHTML = '<span class="icon">▶</span> Reading...';
    pauseButton.innerHTML = isPaused ?
      '<span class="icon">▶</span> Resume' :
      '<span class="icon">⏸</span> Pause';
  } else {
    readButton.innerHTML = '<span class="icon">▶</span> Read Aloud';
    pauseButton.innerHTML = '<span class="icon">⏸</span> Pause';
  }
}

// Start reading the page content
function startReading() {
  if (currentTab?.id) {
    // First check if we can communicate with the content script
    browser.tabs
      .sendMessage(currentTab.id, { action: "ping" })
      .then(() => {
        // Content script is already loaded, send the readAloud message
        console.debug("Content script is loaded. Sending startReading message.");
        return browser.tabs.sendMessage(currentTab?.id!, {
          action: "startReading",
          options: speechOptions,
        });
      })
      .catch(() => {
        // Content script is not loaded, inject it first
        console.debug("Content script not loaded. Injecting it now.");
        browser.scripting
          .executeScript({
            target: { tabId: currentTab?.id! },
            files: ["content-scripts/content.js"], // Make sure this path matches your build output
          })
          .then(() => {
            console.debug("Content script injected.");
            console.debug(
              "Sending startReading message to newly injected content script."
            );
            return browser.tabs.sendMessage(currentTab?.id!, {
              action: "startReading",
              options: speechOptions,
            });
          })
          .catch((err) => {
            console.error("Error communicating with content script:", err);
            statusMessage.textContent =
              "Error starting speech. Please try again.";
          });
      });
  }
}

// Stop speech
function stopReading() {
  if (!isSpeaking && !isPaused) return;

  browser.tabs.sendMessage(currentTab?.id!, { action: 'stopSpeaking' }).catch((err) => {
    console.error('Error stopping speech:', err);
    statusMessage.textContent = 'Error stopping speech. Please try again.';
  });
}

// Pause or resume speech
function togglePause() {
  console.debug('togglePause called');
  if (!isSpeaking) return;

  console.debug("isSpeaking: ", isSpeaking);
  try {
    if (isPaused) {
      browser.tabs.sendMessage(currentTab?.id!, {
        action: "resumeSpeaking",
      });
    } else {
      browser.tabs.sendMessage(currentTab?.id!, {
        action: 'pauseSpeaking'
      }
      );
    }
    updateUI();
  } catch (err) {
    console.error('Error toggling pause:', err);
    statusMessage.textContent = 'Error controlling speech. Please try again.';
  }
}

// Listen for messages from background script
browser.runtime.onMessage.addListener((message) => {
  if (message.action === 'speechStarted') {
    console.debug('Popup onMessage listener: message.action: ', message.action);
    isSpeaking = true;
    isPaused = false;
    statusMessage.textContent = 'Reading page content...';
    updateUI();
  } else if (message.action === 'speechEnded' || message.action === 'speechStopped') {
    isSpeaking = false;
    isPaused = false;
    statusMessage.textContent = 'Finished reading.';
    updateUI();
  } else if (message.action === 'speechPaused') {
    isPaused = true;
    statusMessage.textContent = 'Paused reading.';
    updateUI();
  } else if (message.action === 'speechResumed') {
    isPaused = false;
    statusMessage.textContent = 'Resumed reading...';
    updateUI();
  } else if (message.action === 'speechError') {
    isSpeaking = false;
    isPaused = false;
    statusMessage.textContent = `Error: ${message.error || 'Unknown error'}`;
    updateUI();
  }
});

// Add event listeners
readButton.addEventListener("click", startReading);
stopButton.addEventListener("click", stopReading);
pauseButton.addEventListener('click', togglePause);
voiceSelect.addEventListener("change", () => {
  speechOptions.voice = voiceSelect.value;
  settingsChanged = true;
});
rateRange.addEventListener("input", () => {
  speechOptions.rate = parseFloat(rateRange.value);
  rateValue.textContent = rateRange.value;
  settingsChanged = true;
});
pitchRange.addEventListener("input", () => {
  speechOptions.pitch = parseFloat(pitchRange.value);
  pitchValue.textContent = pitchRange.value;
  settingsChanged = true;
});
volumeRange.addEventListener("input", () => {
  speechOptions.volume = parseFloat(volumeRange.value);
  volumeValue.textContent = volumeRange.value;
  settingsChanged = true;
});

// Save settings when popup is closed
window.addEventListener("blur", () => {
  if (settingsChanged) {
    browser.runtime.sendMessage({
      action: "saveSettings",
      options: speechOptions,
    });
  }
});

// Initialize
async function initialize() {
  try {
    console.debug("Initializing popup...");
    await getCurrentTab();

    // Load voices
    await loadVoices();

    // Load saved settings first
    speechOptions = await SettingsManager.loadSettings();

    // Apply settings to UI
    applySettingsToUI();
  } catch (error) {
    console.error("Error initializing:", error);
    statusMessage.textContent = "Error initializing. Please try again.";
  }
}

// Start initialization
initialize();
