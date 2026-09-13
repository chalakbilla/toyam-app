// googleDrive.js
//
// Mobile equivalent of the desktop app's gdrive.js. The desktop version used
// a "Desktop app" OAuth client (with a client secret) and a loopback
// redirect - that flow doesn't exist on mobile. Instead this uses an
// Android/iOS OAuth client (public, no secret) with PKCE via
// expo-auth-session, and talks to the Drive v3 REST API directly with
// fetch instead of the googleapis Node SDK.
//
// Folder layout on Drive is identical to the desktop app:
//   WhatsApp Policies / <folder name you type> / <number>_<dateStr> / files...
//
// SETUP REQUIRED (see README): create an OAuth client of type "Android" or
// "iOS" in the same Google Cloud project as client_secret.json, and put its
// client ID below (or in app.json -> expo.extra).

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

const ROOT_FOLDER_NAME = 'WhatsApp Policies';
const LOG_PATH = `${FileSystem.documentDirectory}drive_upload_log.log`;

async function appendLog(line) {
  const existing = await FileSystem.getInfoAsync(LOG_PATH);
  const prefix = existing.exists ? await FileSystem.readAsStringAsync(LOG_PATH) : '';
  await FileSystem.writeAsStringAsync(LOG_PATH, `${prefix}[${new Date().toISOString()}] ${line}\n`);
}

export async function readUploadLog() {
  const info = await FileSystem.getInfoAsync(LOG_PATH);
  if (!info.exists) return '';
  return FileSystem.readAsStringAsync(LOG_PATH);
}
const TOKEN_KEY = 'toyam_google_token';
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

function getClientId() {
  const extra = Constants.expoConfig?.extra || {};
  const id = extra.googleClientId;
  if (!id) {
    throw new Error(
      'No Google OAuth client id configured. Add expo.extra.googleClientId in app.json - see README "Google Drive setup".'
    );
  }
  return id;
}

export async function getStoredToken() {
  const raw = await SecureStore.getItemAsync(TOKEN_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function storeToken(token) {
  await SecureStore.setItemAsync(TOKEN_KEY, JSON.stringify(token));
}

export async function signOut() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

/**
 * Runs the interactive PKCE sign-in flow. Returns the token object
 * ({ accessToken, refreshToken, expiresIn, issuedAt }).
 */
export async function signIn() {
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'toyam' });
  const request = new AuthSession.AuthRequest({
    clientId: getClientId(),
    scopes: SCOPES,
    redirectUri,
    usePKCE: true,
    responseType: AuthSession.ResponseType.Code,
    extraParams: { access_type: 'offline', prompt: 'consent' },
  });

  await request.makeAuthUrlAsync(discovery);
  const result = await request.promptAsync(discovery);

  if (result.type !== 'success') {
    throw new Error('Google sign-in was cancelled.');
  }

  const tokenResult = await AuthSession.exchangeCodeAsync(
    {
      clientId: getClientId(),
      code: result.params.code,
      redirectUri,
      extraParams: { code_verifier: request.codeVerifier },
    },
    discovery
  );

  const token = {
    accessToken: tokenResult.accessToken,
    refreshToken: tokenResult.refreshToken,
    expiresIn: tokenResult.expiresIn,
    issuedAt: Date.now(),
  };
  await storeToken(token);
  return token;
}

async function refreshToken(token) {
  const tokenResult = await AuthSession.refreshAsync(
    { clientId: getClientId(), refreshToken: token.refreshToken },
    discovery
  );
  const next = {
    accessToken: tokenResult.accessToken,
    refreshToken: tokenResult.refreshToken || token.refreshToken,
    expiresIn: tokenResult.expiresIn,
    issuedAt: Date.now(),
  };
  await storeToken(next);
  return next;
}

/** Returns a valid access token, refreshing (or asking to sign in) as needed. */
export async function ensureAccessToken() {
  let token = await getStoredToken();
  if (!token) throw new Error('Not signed in to Google Drive yet.');
  const ageMs = Date.now() - token.issuedAt;
  const expiresMs = (token.expiresIn || 3600) * 1000;
  if (ageMs > expiresMs - 60_000) {
    token = await refreshToken(token);
  }
  return token.accessToken;
}

export async function isSignedIn() {
  return !!(await getStoredToken());
}

async function driveFetch(url, accessToken, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Drive API error ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function findFolder(name, parentId, accessToken) {
  const parentClause = parentId ? `and '${parentId}' in parents` : '';
  const q = encodeURIComponent(
    `mimeType='application/vnd.google-apps.folder' and name='${name.replace(/'/g, "\\'")}' and trashed=false ${parentClause}`
  );
  const data = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&spaces=drive`,
    accessToken
  );
  return data.files && data.files.length > 0 ? data.files[0].id : null;
}

async function createFolder(name, parentId, accessToken) {
  const body = { name, mimeType: 'application/vnd.google-apps.folder', ...(parentId ? { parents: [parentId] } : {}) };
  const data = await driveFetch('https://www.googleapis.com/drive/v3/files?fields=id', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return data.id;
}

async function getOrCreateFolder(name, parentId, accessToken) {
  const existing = await findFolder(name, parentId, accessToken);
  if (existing) return existing;
  return createFolder(name, parentId, accessToken);
}

function guessMimeType(fileName) {
  const ext = (/\.[^./\\]+$/.exec(fileName) || [''])[0].toLowerCase();
  const map = {
    '.txt': 'text/plain',
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.mp4': 'video/mp4',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.opus': 'audio/ogg',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return map[ext] || 'application/octet-stream';
}

async function uploadFile(fileUri, fileName, parentId, accessToken) {
  const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
  const boundary = 'toyam-boundary-' + Date.now();
  const metadata = { name: fileName, parents: [parentId] };
  const mimeType = guessMimeType(fileName);

  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType}\r\n` +
    `Content-Transfer-Encoding: base64\r\n\r\n` +
    `${base64}\r\n` +
    `--${boundary}--`;

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Upload failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Uploads a set of saved policy folders to Drive under
 * "WhatsApp Policies / <driveFolderName> / <number>_<dateStr> / files".
 * @param {Array<{number, dateStr, folderUri}>} policies
 * @param {string} driveFolderName
 * @param {(progress: {done, total, current}) => void} onProgress
 * @returns {Array<{policy, status, files, error}>}
 */
export async function uploadPolicyToDrive(policies, driveFolderName, onProgress) {
  const accessToken = await ensureAccessToken();
  const rootFolderId = await getOrCreateFolder(ROOT_FOLDER_NAME, null, accessToken);
  const targetFolderId = await getOrCreateFolder(driveFolderName || ROOT_FOLDER_NAME, rootFolderId, accessToken);

  const results = [];
  let done = 0;

  for (const policy of policies) {
    const label = `${policy.number}_${policy.dateStr}`;
    try {
      const policyFolderId = await getOrCreateFolder(label, targetFolderId, accessToken);
      const files = await FileSystem.readDirectoryAsync(policy.folderUri);
      let uploadedCount = 0;
      for (const file of files) {
        await uploadFile(`${policy.folderUri}/${file}`, file, policyFolderId, accessToken);
        uploadedCount++;
      }
      results.push({ policy: policy.number, status: 'success', folder: driveFolderName, files: uploadedCount });
      await appendLog(`Success: Policy ${policy.number} uploaded to "${driveFolderName}" (${uploadedCount} files)`);
    } catch (error) {
      results.push({ policy: policy.number, status: 'failed', error: error.message });
      await appendLog(`Failed: Policy ${policy.number} to "${driveFolderName}" - ${error.message}`);
    }
    done++;
    if (onProgress) onProgress({ done, total: policies.length, current: label });
  }

  return results;
}
