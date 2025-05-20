import { Readability } from '@mozilla/readability';
import { Reader, SpeechOptions } from "./modules/reader";

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    const reader = new Reader(
      {
        onSpeechStart: () => {
          console.debug('Speech started.');
        },
        onSpeechEnd: () => {
          console.debug('Speech ended.');
        },
        onSpeechError: (error) => {
          console.error('Speech error:', error);
        },
        onSpeechPause: () => {
          console.debug('Speech paused.');
        },
        onSpeechResume: () => {
          console.debug('Speech resumed.');
        },
        onSpeechStop: () => {
          console.debug('Speech stopped.');
        }
      }
    );

    // Listen for messages from the popup or background script
    browser.runtime.onMessage.addListener((message) => {
      console.debug('Content script received message:', message);

      // Add a ping handler to check if content script is loaded
      if (message.action === 'ping') {
        console.debug('Received ping.');
      }

      if (message.action === 'readAloud') {
        // Extract selected text or page content
        const selectedText = window.getSelection()?.toString();
        const textToRead = selectedText || extractReadableContent() || document.body.innerText;
        console.log(textToRead);

        if (textToRead) {
          const voices = reader.getVoices();
          console.log(voices);
          const speechOptions: SpeechOptions = {
            voice: voices[3].name,
            rate: 1.0,
            pitch: 1.0,
            volume: 0.5,
            lang: 'en-US'
          };
          reader.speak(textToRead, speechOptions);
        }
      }
    });

    function extractReadableContent(): string | undefined {
      try {
        const doc = document.cloneNode(true) as Document;
        const reader = new Readability(doc);
        const article = reader.parse();
        return article?.textContent?.trim();
      } catch (error) {
        console.error("Error extracting readable content:", error);
      }
    }
  },
});
