# Set up Arrow’s Chrome Web Store identity

Follow this once, in order. You do not need to understand public keys, OAuth,
or Chrome extension IDs. Do not change `manifest.json` by hand.

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

## Part 3 — Create the one Google OAuth client

This is needed only for Arrow’s explicit **Connect Google account** button.
Chrome Sync itself works from the user’s normal Chrome sign-in.

1. Keep the Store draft’s **Item ID** available.

2. Open [Google Cloud Console credentials](https://console.cloud.google.com/apis/credentials).

3. Create a project if Google asks you to choose one.

4. Click **Create credentials**, then **OAuth client ID**.

5. Choose application type **Chrome Extension**.

6. Give it a clear name, such as `Arrow Chrome Extension`.

7. Paste the Store draft’s **Item ID** into the **Application ID** or
   **Extension ID** field.

8. Click **Create**.

9. Copy the generated client ID. It ends in
   `.apps.googleusercontent.com`. This is safe to put in a build command; it
   is not a client secret.

## Part 4 — Build and test locally

1. In PowerShell, replace the placeholder and run:

   ```powershell
   npm run build:dev -- -OAuthClientId 'PASTE_THE_CLIENT_ID_HERE'
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

7. Open Arrow, go to Settings, then test **Connect Google account**. Complete
   the Google prompt. The Sync area should show the signed-in email when Chrome
   makes it available.

## Part 5 — Build the final Store ZIP

After the local test works, run:

```powershell
npm run build:web-store -- -OAuthClientId 'PASTE_THE_SAME_CLIENT_ID_HERE'
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
| Google Cloud rejects the ID | Use the Store draft’s Item ID, not an ID from an old unpacked Arrow installation. |
| Arrow says Google sign-in needs OAuth configuration | Rebuild `dist/development` using Part 4’s command, then remove and reload that unpacked directory in Chrome. |
| You moved the project folder | Rebuild `dist/development`; the Store public key keeps the ID stable. |
