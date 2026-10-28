"use strict";

// Client for the service-worker-owned persistence contract. UI surfaces never
// perform a read-modify-write against durable product state themselves.
globalThis.ArrowState = (() => {
  function send(type, payload = {}) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({ type, ...payload }, (response) => {
          const error = chrome.runtime.lastError;
          if (error) return reject(new Error(error.message));
          if (!response?.success) return reject(new Error(response?.error || 'Unable to save changes.'));
          resolve(response);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  return Object.freeze({
    commit: (patch) => send('arrow:commit', { patch })
  });
})();
