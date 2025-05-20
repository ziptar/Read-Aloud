import { Readability } from '@mozilla/readability';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    const speechSynthesis = window.speechSynthesis;
    const voices = speechSynthesis.getVoices();
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
          const voices = speechSynthesis.getVoices();
          console.log(voices);                   
          const utterance = new SpeechSynthesisUtterance(textToRead);
          utterance.voice = voices[3];
          utterance.volume = 0.5;
          speechSynthesis.speak(utterance);
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
