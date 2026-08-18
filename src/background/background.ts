import { toggleExtensionEnabled } from '../storage/storage.js';

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-extension') {
    void toggleExtensionEnabled();
  }
});
