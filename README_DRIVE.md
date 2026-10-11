# No-login Drive upload setup
1. Google Cloud Console -> OAuth consent screen: set Publishing status to **In production**
   (in "Testing" the refresh token dies after 7 days). Scope used: drive.file (no verification needed).
2. Use a **Desktop app** OAuth client (your desktop tool's client_secret.json). Copy its client id + secret.
3. `node get-refresh-token.js <CLIENT_ID> <CLIENT_SECRET>` -> sign in with the Gmail that should own the files -> copy the REFRESH TOKEN.
4. Paste all three into app.json -> expo.extra (googleClientId, googleClientSecret, googleRefreshToken).
5. Rebuild: `eas build -p android --profile preview`. Keep the APK private.
