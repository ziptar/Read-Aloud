import './style.css';
import { Reader, SpeechOptions } from '../modules/reader';
import { SettingsManager } from "../modules/settings"

let speechOptions: SpeechOptions = {};

let settingsManager = new SettingsManager();
let settingsChanged = false;


// Initialize the popup UI
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
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
const readButton = document.getElementById('readButton') as HTMLButtonElement;
const pauseButton = document.getElementById('pauseButton') as HTMLButtonElement;
const stopButton = document.getElementById('stopButton') as HTMLButtonElement;
const voiceSelect = document.getElementById('voiceSelect') as HTMLSelectElement;
const rateRange = document.getElementById('rateRange') as HTMLInputElement;
const pitchRange = document.getElementById('pitchRange') as HTMLInputElement;
const volumeRange = document.getElementById('volumeRange') as HTMLInputElement;
const rateValue = document.getElementById('rateValue') as HTMLSpanElement;
const pitchValue = document.getElementById('pitchValue') as HTMLSpanElement;
const volumeValue = document.getElementById('volumeValue') as HTMLSpanElement;
const statusMessage = document.getElementById('statusMessage') as HTMLDivElement;

// Load available voices
async function loadVoices() {
  try {
    const voices = await Reader.getVoices();

    // Populate voice select dropdown
    voiceSelect.innerHTML = '';
    voices.forEach(voice => {
      const option = document.createElement('option');
      option.value = voice.name;
      option.textContent = `${voice.name} (${voice.lang})`;
      voiceSelect.appendChild(option);
    });

    // Select default voice
    if (voices.length > 0) {
      speechOptions.voice = voices[0].name;
    }
  } catch (error) {
    console.error('Error loading voices:', error);
    statusMessage.textContent = 'Error loading voices. Please try again.';
  }
}

// Add event listeners
voiceSelect.addEventListener('change', () => {
  speechOptions.voice = voiceSelect.value;
  settingsChanged = true;
});
rateRange.addEventListener('input', () => {
  speechOptions.rate = parseFloat(rateRange.value);
  rateValue.textContent = rateRange.value;
  settingsChanged = true;
});
pitchRange.addEventListener('input', () => {
  speechOptions.pitch = parseFloat(pitchRange.value);
  pitchValue.textContent = pitchRange.value;
  settingsChanged = true;
});
volumeRange.addEventListener('input', () => {
  speechOptions.volume = parseFloat(volumeRange.value);
  volumeValue.textContent = volumeRange.value;
  settingsChanged = true;
});

// Save settings when popup is closed
window.addEventListener('blur', () => {
  if (settingsChanged) {
    browser.runtime.sendMessage({
      action: 'saveSettings', options: speechOptions
    });
  }
});

// Initialize
async function initialize() {
  try {
    console.debug('Initializing popup...');

    // Load voices
    await loadVoices();

    // Load saved settings first
    speechOptions = await SettingsManager.loadSettings();

  } catch (error) {
    console.error('Error initializing:', error);
    statusMessage.textContent = 'Error initializing. Please try again.';
  }
}

// Start initialization
initialize();