# Read-Aloud

Read webpage content aloud using text-to-speech.

## Description

Read-Aloud is a browser extension that allows you to listen to the content of web pages instead of reading them. It uses text-to-speech technology to convert the text on a webpage into spoken words, making it easier to consume articles, blogs, and other online content, especially for those who prefer listening or have reading difficulties.

## Features

* **Read Entire Page:** The extension can extract and read the entire content of the current web page.
* **Read Selected Text:** Users can select specific text on a page, and the extension will read only the selected portion.
* **Context Menu Integration:** A right-click context menu option is available for start reading the entire page or the selected text.
* **Intuitive Popup Interface:** The extension's popup provides controls for:
  * **Read Aloud Button:** To start reading.
  * **Pause/Resume Button:** To pause or resume reading.
  * **Stop Button:** To completely halt reading.
  * **Voice Dropdown List:** To choose the voice for reading.
  * **Volume Slider:** To adjust the reading volume.
  * **Speed Slider:** To control the reading speed (rate).
  * **Pitch Slider:** To modify the voice's pitch.

## Installation as an Unpacked Extension (For Developers/Testing)

### For Chromium based browsers (Chrome, Edge, Brave, etc.)

Clone this repository:

```bash
git clone https://github.com/ziptar/Read-Aloud.git
```

Navigate to the `Read-Aloud` directory:

```bash
cd Read-Aloud
```

Install dependencies:

```bash
npm install
```

Build the extension:

```bash
npm run build
```

Load the extension:

1. Open your browser and go to the Extensions page. You can usually find this in the menu (`☰` or `...`) under "Extensions" > "Manage Extensions" or by typing `chrome://extensions/` or `edge://extensions/` or `brave://extensions/` in the address bar.
2. Enable "Developer mode" using the toggle switch in the top right corner.
3. Click the "Load unpacked" button in the top left corner.
4. Select the folder `.output/chrome-mv3` containing the extension's manifest file (`manifest.json`).
5. The extension should now be loaded and its icon visible in the toolbar.

### For Mozilla Firefox

Clone this repository:

```bash
git clone https://github.com/ziptar/Read-Aloud.git
```

Navigate to the `Read-Aloud` directory:

```bash
cd Read-Aloud
```

Install dependencies:

```bash
npm install
```

Build the extension:

```bash
npm run build:firefox
```

Load the extension:

1. Open Firefox and type `about:debugging#/runtime/this-firefox` in the address bar.
2. Click the "Load Temporary Add-on..." button.
3. Select `manifest.json` file inside the extension folder `.output/firefox-mv2`.
4. The extension will be loaded temporarily for the current session. It will be removed when you close Firefox.
5. For permanent installation, you need to sign the extension or use Firefox Developer Edition/Nightly with `xpinstall.signatures.required` set to false in `about:config`.

## Usage

1. **Open a Webpage**: Navigate to any webpage you want to have read aloud.
2. **Activate Read Aloud**:
    * **Click the Toolbar Icon**: Click the "Read Aloud" icon in your browser's toolbar.
    * **Context Menu**: Right-click on the page, and select "Read aloud" from the context menu.
3. **Control Playback**: A small control panel will appear, allowing you to:
    * **Read Aloud**: Click the read aloud button to start reading the content.
    * **Pause/Resume**: Click the pause/resume button to pause or resume reading.
    * **Stop**: Click the stop button to stop reading.
    * **Change Voice**: Click the voice dropdown list to choose a different voice.
    * **Adjust Speed**: Drag the slider to change the reading speed.
    * **Adjust Volume**: Drag the slider to change the volume.
    * **Adjust Pitch**: Drag the slider to change the pitch of the voice.

## License

This project is licensed under terms of the [MIT](LICENSE) License.
