# Toyam (mobile)

A React Native / Expo app that splits the desktop tool's two jobs — turning
a WhatsApp chat export into policy folders, and pushing those folders to
Google Drive — into a phone app you (or anyone on your team) can install,
with no server running on a laptop.

It covers the same two flows as `toyam-drive-edition`:

| Desktop file | Mobile equivalent |
|---|---|
| `chatExportImport.js` (parse + policy rules) | `src/lib/chatParser.js` + `src/lib/policyBuilder.js` |
| `gdrive.js` (Drive upload) | `src/lib/googleDrive.js` |
| `ImportChat.html` | Import → Sender select → Review screens |
| `UploadDrive.html` | Saved Policies screen |

The parsing and policy rules (number opens a policy, "end" closes it, media
becomes a placeholder line) are line-for-line the same logic as the desktop
version, just rewritten without Node's `fs`/`path` so they run on-device.

## What's new versus the desktop tool

- **Share straight from WhatsApp.** Export a chat in WhatsApp, tap Share,
  pick Toyam — no manual file-picking needed. (Manual upload still works
  too.)
- **No server, no `.bat` file.** Everything — unzip, parse, save, upload —
  happens inside the app.
- **Google sign-in instead of a desktop OAuth loopback.** Mobile apps can't
  use the "Desktop app" OAuth client type your `client_secret.json` is, so
  this uses a proper mobile OAuth client instead (see below). This is also
  why `client_secret.json` was **not** copied into this app — it isn't the
  right credential type, and a client secret should never be bundled inside
  a mobile app binary anyway.

## 1. Install dependencies

```bash
cd toyam-app
npm install
```

## 2. Google Drive setup (one-time)

The desktop app's `client_secret.json` is a **Desktop app** OAuth client —
it has a client secret and uses a `localhost` redirect, neither of which
work in a mobile app. You need a second, mobile-shaped client in the same
Google Cloud project:

1. Open the same project in [Google Cloud Console](https://console.cloud.google.com/apis/credentials) that `client_secret.json` came from.
2. **Create Credentials → OAuth client ID**.
3. Application type: **Android** (needs your app's package name
   `com.toyam.app` and its SHA-1 signing fingerprint — `eas credentials` will
   show you this once you build) — or **iOS** (needs the bundle id
   `com.toyam.app`). These client types have no secret, which is correct for
   a mobile app.
4. Make sure the **Google Drive API** is enabled on the project (it already
   is, if the desktop app's Drive upload works).
5. Copy the new client ID into `app.json`:

   ```json
   "extra": {
     "googleClientId": "xxxxxxxx.apps.googleusercontent.com"
   }
   ```

The app requests only the `drive.file` scope — it can only see/create files
it uploads itself, not your whole Drive. That's a narrower ask than the
desktop app's full `drive` scope, and it's why folders created here won't
show up when the *desktop* tool searches Drive for a folder by name — each
app only sees what it created. If you want one shared "WhatsApp Policies"
tree between both tools, widen the scope in `src/lib/googleDrive.js`
(`SCOPES`) to `https://www.googleapis.com/auth/drive` and request that
scope on the OAuth consent screen instead.

## 3. Run it

For everyday screens (Home, Import via file picker, Review, Drive upload),
Expo Go is enough:

```bash
npx expo start
```

**The WhatsApp share-sheet entry point needs a custom dev build**, because
`expo-share-intent` registers a native share target — Expo Go can't do
that. Build a dev client once:

```bash
npx expo prebuild
npx expo run:android    # or: npx expo run:ios
```

(or use `eas build --profile development` if you're not building locally).
After that, "Export chat → Share → Toyam" will appear in WhatsApp's share
sheet on that device.

## Project layout

```
App.js                        fonts, splash, share-intent + nav providers
app.json                      app config, Android/iOS share intent filters
src/
  theme/theme.js               colors, type, spacing — palette taken from
                                the reference photo (treeline, lavender
                                field, warm haze)
  components/                  GradientBackground, ToyamWordmark, buttons,
                                cards — shared UI
  screens/
    SplashScreen.js            animated "Toyam" wordmark on load
    HomeScreen.js               entry point + incoming-share banner
    ImportScreen.js             pick/receive the .zip, choose date format
    SenderSelectScreen.js       pick whose messages hold the policies
    ReviewScreen.js              select extracted policies, share as .zip
                                 or send to Drive
    SavedPoliciesScreen.js       browse everything already saved on-device
    DriveUploadScreen.js         Google sign-in, folder name, upload + log
  lib/
    chatParser.js                message parsing (ported from
                                 chatExportImport.js)
    policyBuilder.js             policy start/continue/end rules
    zipImporter.js                unzips the export in memory (JSZip)
    policyStorage.js              saves policies to on-device storage
    exportZip.js                  re-zips selected policies to share out
    googleDrive.js                 OAuth (PKCE) + Drive v3 REST upload
    shareIntent.js                 wraps expo-share-intent
  context/ImportContext.js         wizard state shared across screens
```

## Notes

- Saved policies live at `FileSystem.documentDirectory + 'policies/'` on the
  device, in the same `<number>_<dateStr>` folder shape the desktop app
  uses (e.g. `2234555_25-06-2025`), so anything you build on top of that
  naming later keeps working.
- The Drive upload log is written to `drive_upload_log.log` next to the
  policies folder, appending one line per success/failure — same idea as
  the desktop app's log, just on-device.
- This app doesn't touch the live-WhatsApp/QR-code side of the desktop tool
  (`server.js` + WPPConnect) — only the two pieces you asked to move over:
  importing from an export, and uploading to Drive.
