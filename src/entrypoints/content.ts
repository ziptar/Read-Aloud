import { Readability } from '@mozilla/readability';
import { Reader } from "./modules/reader";

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    const reader = new Reader(
      {
        onSpeechStart: () => {
          console.debug('Speech started.');
          browser.runtime.sendMessage({ action: 'speechStarted' });
        },
        onSpeechEnd: () => {
          console.debug('Speech ended.');
          browser.runtime.sendMessage({ action: 'speechEnded' });
        },
        onSpeechError: (err) => {
          console.error('Speech error:', err);
          // browser.runtime.sendMessage({
          //   action: 'speechError',
          //   error: err
          // });
        },
        onSpeechPause: () => {
          console.debug('Speech paused.');
          browser.runtime.sendMessage({ action: 'speechPaused' });
        },
        onSpeechResume: () => {
          console.debug('Speech resumed.');
          browser.runtime.sendMessage({ action: 'speechResumed' });
        },
        onSpeechStop: () => {
          console.debug('Speech stopped.');
          browser.runtime.sendMessage({ action: 'speechStopped' });
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

      if (message.action === 'startReading') {
        // Extract selected text or page content
        const selectedText = window.getSelection()?.toString();
        const textToRead = selectedText || extractReadableContent() || document.body.innerText;
        console.debug(textToRead);

        if (textToRead) {
          reader.speak(textToRead, message.options);
        }
      } else if (message.action === 'stopSpeaking') {
        reader.stop();
      } else if (message.action === 'pauseSpeaking') {
        reader.pause();
      } else if (message.action === 'resumeSpeaking') {
        reader.resume();
      } else if (message.action === 'getSpeechState') {
        browser.runtime.sendMessage({
          action: 'updateSpeechState',
          state: {
            isSpeaking: reader.isSpeaking(),
            isPaused: reader.isPaused()
          }
        });
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
