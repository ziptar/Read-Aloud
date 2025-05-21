import './style.css';
import { Reader, SpeechOptions } from '../modules/reader';

let speechOptions: SpeechOptions = {
    voice: '',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    lang: 'en-US'
};


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

// Add event listeners
voiceSelect.addEventListener('change', () => {
    speechOptions.voice = voiceSelect.value;
});
rateRange.addEventListener('input', () => {
    speechOptions.rate = parseFloat(rateRange.value);
    rateValue.textContent = rateRange.value;
});
pitchRange.addEventListener('input', () => {
    speechOptions.pitch = parseFloat(pitchRange.value);
    pitchValue.textContent = pitchRange.value;
});
volumeRange.addEventListener('input', () => {
    speechOptions.volume = parseFloat(volumeRange.value);
    volumeValue.textContent = volumeRange.value;
});
