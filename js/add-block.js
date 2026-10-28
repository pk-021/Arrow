"use strict";

document.addEventListener('DOMContentLoaded', () => {
  const closeButton = document.getElementById('close-btn');
  const cancelButton = document.getElementById('cancel-btn');
  const saveButton = document.getElementById('save-btn');
  const urlInput = document.getElementById('website-url');

  const close = () => window.close();
  closeButton.addEventListener('click', close);
  cancelButton.addEventListener('click', close);

  async function save() {
    const url = ArrowConfig.normalizeBlockTarget(urlInput.value);
    if (!url) return alert('Please enter a website URL');

    try {
      const { blockedWebsites = [] } = await chrome.storage.local.get('blockedWebsites');
      const normalized = url.toLowerCase();
      if (blockedWebsites.some((item) => String(item.url).toLowerCase() === normalized)) {
        return alert('This website is already blocked');
      }
      await chrome.storage.local.set({
        blockedWebsites: [...blockedWebsites, { url, addedAt: Date.now() }]
      });
      close();
    } catch (error) {
      console.error('[Block] Failed to add website:', error);
      alert('Failed to block website. Please try again.');
    }
  }

  saveButton.addEventListener('click', save);
  urlInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') save();
  });
});
