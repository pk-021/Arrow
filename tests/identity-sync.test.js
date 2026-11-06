const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('manifest declares stable unpacked identity and identity metadata permissions', () => {
  const manifest = JSON.parse(read('manifest.json'));
  assert.match(manifest.key, /^MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A/);
  assert.ok(manifest.permissions.includes('identity'));
  assert.ok(manifest.permissions.includes('identity.email'));
});

test('sync writes are quota bounded and reject runtime last errors', () => {
  const worker = read('js/background.js');
  assert.match(worker, /SYNC_MAX_ITEM_BYTES = 8 \* 1024/);
  assert.match(worker, /SYNC_MAX_TOTAL_BYTES = 100 \* 1024/);
  assert.match(worker, /chrome\.runtime\.lastError/);
  assert.match(worker, /areaName !== 'sync'/);
  assert.match(worker, /mirrorToSync: false/);
  assert.doesNotMatch(worker, /extensionPassword/);
  assert.doesNotMatch(worker, /arrow_session_end_at.*SYNC_PREFERENCE_KEYS/);
});

test('popup exposes profile-only identity and real-time sync feedback', () => {
  const popup = read('popup.html');
  const controller = read('js/popup.js');
  const settings = popup.match(/<div class="home-list" aria-label="Settings controls">([\s\S]*?)<\/div>\s*<\/section>/)?.[1] || '';
  assert.match(settings, /^\s*<button type="button" id="sync-status-row" class="home-row home-row-button sync-status"/);
  assert.match(popup, /id="sync-status-message"[^>]*aria-live="polite"/);
  assert.match(popup, /id="sync-status-error"[^>]*role="alert"/);
  assert.match(popup, /<dialog id="sync-info-dialog"[^>]*aria-labelledby="sync-info-title"[^>]*closedby="any">/);
  assert.match(popup, /Arrow does not send data to Arrow-operated servers/);
  assert.match(popup, /Uninstalling Arrow removes its local data/);
  assert.match(controller, /sync-info-dialog'\)\?\.showModal\(\)/);
  assert.match(controller, /chrome\.identity\.getProfileUserInfo/);
  assert.doesNotMatch(popup, /Connect Google account/);
  assert.doesNotMatch(controller, /getAuthToken/);
  assert.match(controller, /area === 'sync'/);
});

test('shared-identity build creates a keyless Store draft before final packages', () => {
  const build = read('scripts/build-extension.ps1');
  assert.match(build, /\[ValidateSet\('development', 'web-store', 'web-store-draft'\)\]/);
  assert.match(build, /Properties\.Remove\('key'\)/);
  assert.match(build, /\$Target -eq 'web-store-draft'/);
  assert.match(build, /Compress-Archive/);
  assert.doesNotMatch(build, /OAuthClientId|oauth2/);
  const keyInstaller = read('scripts/set-extension-key.ps1');
  assert.match(keyInstaller, /Get-Clipboard -Raw/);
  assert.match(keyInstaller, /Expected Chrome extension ID/);
});

test('key installer accepts a public key and prints the expected extension ID', () => {
  const key = JSON.parse(read('manifest.json')).key;
  const result = spawnSync('powershell', [
    '-ExecutionPolicy', 'Bypass', '-File', 'scripts/set-extension-key.ps1', '-PublicKey', key
  ], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Expected Chrome extension ID: [a-p]{32}/);
});

test('privacy-focused source and package instructions contain no OAuth configuration', () => {
  assert.doesNotMatch(read('manifest.json'), /"oauth2"/);
  assert.doesNotMatch(read('docs/STORE_ID_SETUP.md'), /Google Cloud Console|OAuthClientId|Connect Google account/);
  assert.doesNotMatch(read('js/popup.js'), /getAuthToken|OAuth client/);
});
