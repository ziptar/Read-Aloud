export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('Read Aloud content script loaded.');
  },
});
