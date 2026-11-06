# Set up Arrow’s Chrome Web Store identity

Follow this once, in order. You do not need to understand public keys or Chrome
extension IDs. Do not change `manifest.json` by hand.

This setup does one thing: it makes Arrow’s unpacked development build and its
Chrome Web Store item use the same extension ID. That lets Chrome Sync treat
them as the same extension, so the same preferences can sync between them.

## Before you start

You need:

- A Chrome Web Store developer account.
- Google Chrome installed.
- A terminal open in `C:\Users\pawan\Web\Arrow`.

## Part 1 — Create Arrow’s Store draft

1. In PowerShell, run:

   ```powershell
   npm run build:web-store-draft
   ```

2. Wait for this success message:

   ```text
   Created Chrome Web Store package: C:\Users\pawan\Web\Arrow\dist\arrow-web-store-draft.zip
   ```

3. Open the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

4. Click **Add new item**.

5. Click **Choose file**, select this exact file, then upload it:

   ```text
   C:\Users\pawan\Web\Arrow\dist\arrow-web-store-draft.zip
   ```

6. Do **not** click **Submit for review** or publish the item. It is only a
   draft at this point.

## Part 2 — Copy the Store public key

1. On the draft’s page, open the **Package** tab.

2. Click **View public key**.

3. Click **Copy** in that dialog. If there is no Copy button, select all text
   between and including these lines, then press `Ctrl+C`:

   ```text
   -----BEGIN PUBLIC KEY-----
   [a very long block of letters, numbers, +, and /]
   -----END PUBLIC KEY-----
   ```

4. Return to PowerShell. Do not paste anything. Run exactly:

   ```powershell
   npm run set:store-key
   ```

5. The command reads the copied key from your clipboard and updates
   `manifest.json` for you. It must print:

   ```text
   Updated manifest.json. Expected Chrome extension ID: [32 lowercase letters]
   ```

6. On the Dashboard page, find the item’s **Item ID**. It must exactly match
   the 32 lowercase letters printed by the command. If it does not match, stop
   here and do not publish; copy the Dashboard public key again and rerun the
   command.

## Part 3 — Build and test locally

1. In PowerShell, run:

   ```powershell
   npm run build:dev
   ```

2. In Chrome, open `chrome://extensions`.

3. Turn on **Developer mode**.

4. Click **Load unpacked**.

5. Select:

   ```text
   C:\Users\pawan\Web\Arrow\dist\development
   ```

6. Find Arrow’s **ID** on the extension card. It must match both the Dashboard
   Item ID and the ID printed in Part 2.

7. Open Arrow and go to Settings. The Sync area should show the signed-in email
   when Chrome makes it available. No extra Google-account setup is required.

## Part 4 — Build the final Store ZIP

After the local test works, run:

```powershell
npm run build:web-store
```

Upload this file to the existing Store draft:

```text
C:\Users\pawan\Web\Arrow\dist\arrow-web-store.zip
```

Complete the remaining required Store listing, privacy, and distribution fields
from `CHROMEWEBSTORE.md` before submitting it for review.

## If something goes wrong

| What you see | What to do |
|---|---|
| `No valid public key was found` | Go back to the Store draft, click **View public key**, copy the key again, then rerun `npm run set:store-key`. |
| The printed ID and Dashboard Item ID differ | Do not publish. Copy the public key from that exact Dashboard draft, rerun the setup command, then rebuild. |
| You moved the project folder | Rebuild `dist/development`; the Store public key keeps the ID stable. |
