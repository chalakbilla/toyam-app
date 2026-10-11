// googleDrive.js
//
// No-login Drive upload. The app carries your own OAuth credentials
// (client id, client secret, refresh token) in app.json -> expo.extra and
// exchanges the refresh token for a short-lived access token on each upload,
// so every upload lands in YOUR Drive and nobody has to sign in.
// Anyone who extracts the APK can read these values - keep the APK private.
//
// Folder layout on Drive:
//   WhatsApp Policies / <folder name you type> / <number>_<dateStr> / files...
//
// Get the refresh token once with: node get-refresh-token.js  (see README_DRIVE.md)

import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

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

function getCreds() {
  const extra = Constants.expoConfig?.extra || {};
  const { googleClientId, googleClientSecret, googleRefreshToken } = extra;
  const missing = [googleClientId, googleClientSecret, googleRefreshToken].some(
    (v) => !v || String(v).startsWith('PASTE_')
  );
  if (missing) {
    throw new Error(
      'Drive credentials missing. Fill googleClientId, googleClientSecret and googleRefreshToken in app.json -> expo.extra, then rebuild.'
    );
  }
  return { clientId: googleClientId, clientSecret: googleClientSecret, refreshToken: googleRefreshToken };
}

let cached = null; // { accessToken, expiresAt }

/** Returns a valid access token, minted from the embedded refresh token. */
export async function ensureAccessToken() {
  if (cached && Date.now() < cached.expiresAt - 60_000) return cached.accessToken;
  const { clientId, clientSecret, refreshToken } = getCreds();
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(`Google token error ${res.status}: ${data.error_description || data.error || 'unknown'}`);
  }
  cached = { accessToken: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 };
  return cached.accessToken;
}

// Kept so existing screens keep working; there is no login any more.
export async function isSignedIn() { return true; }
export async function signIn() { return true; }
export async function signOut() { return true; }

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

/**
 * Uploads one file to Drive in two steps:
 *  1) create the file's metadata (name + parent) with a tiny JSON request
 *  2) stream its bytes straight from disk to Drive via FileSystem.uploadAsync
 *
 * Previously this read the whole file into memory as a base64 string and
 * built a multipart/related body by hand before calling fetch() - for a
 * single large video from a WhatsApp export, that base64 string alone can
 * be large enough to spike memory and visibly stall the UI (each upload
 * runs one at a time, so it doesn't compound across files the way the old
 * zip export did, but a single big file is still a real risk). uploadAsync
 * hands the file to native code, which streams it from disk to the network
 * socket directly - the bytes never pass through the JS runtime.
 */
async function uploadFile(fileUri, fileName, parentId, accessToken) {
  const mimeType = guessMimeType(fileName);

  const created = await driveFetch('https://www.googleapis.com/drive/v3/files?fields=id,webViewLink', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: fileName, parents: [parentId] }),
  });

  const uploadResult = await FileSystem.uploadAsync(
    `https://www.googleapis.com/upload/drive/v3/files/${created.id}?uploadType=media&fields=id,webViewLink`,
    fileUri,
    {
      httpMethod: 'PATCH',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': mimeType },
    }
  );

  if (uploadResult.status < 200 || uploadResult.status >= 300) {
    throw new Error(`Upload failed (${uploadResult.status}): ${(uploadResult.body || '').slice(0, 200)}`);
  }

  try {
    return JSON.parse(uploadResult.body);
  } catch {
    return created;
  }
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
