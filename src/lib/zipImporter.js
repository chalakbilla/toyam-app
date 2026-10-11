// zipImporter.js
//
// On-device equivalent of the desktop app's ingestExportZip.
//
// IMPORTANT: this used to read the whole exported .zip into memory as a
// base64 string (`FileSystem.readAsStringAsync(..., Base64)`) and hand that
// to JSZip. For a WhatsApp "Export chat" with media, that .zip can be
// hundreds of MB - holding the raw bytes AND their base64-encoded string
// AND JSZip's decompressed copy in the JS heap at once is what caused the
// OutOfMemoryError on import ("Failed to allocate a 134217744 byte
// allocation...").
//
// Instead, we unzip natively straight to a cache folder on disk (via
// react-native-zip-archive) and never bring the archive's bytes into JS
// memory at all. Only the small chat .txt is ever read as a string; media
// files are copied out lazily, on disk, only for the policies actually
// being saved (see extractMediaToDisk below).

import * as FileSystem from 'expo-file-system';
import { unzip } from 'react-native-zip-archive';
import { parseChatText } from './chatParser';

function isTextEntry(name) {
  return /\.txt$/i.test(name);
}

// react-native-zip-archive wants plain filesystem paths, not file:// uris.
function stripFileScheme(uri) {
  return uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
}

async function listFilesRecursive(dirUri, relativePrefix = '') {
  const entries = await FileSystem.readDirectoryAsync(dirUri);
  let files = [];
  for (const entry of entries) {
    const entryUri = `${dirUri}/${entry}`;
    const relativeName = relativePrefix ? `${relativePrefix}/${entry}` : entry;
    const info = await FileSystem.getInfoAsync(entryUri);
    if (info.isDirectory) {
      files = files.concat(await listFilesRecursive(entryUri, relativeName));
    } else {
      files.push({ relativeName, uri: entryUri });
    }
  }
  return files;
}

function findChatEntry(files) {
  return files.find((f) => /_chat\.txt$/i.test(f.relativeName)) || files.find((f) => isTextEntry(f.relativeName)) || null;
}

/**
 * Parses an already-extracted export folder (a real unzip target, or a
 * staging folder that loose shared files were copied into) into messages.
 */
async function ingestFromDir(extractedDir, dateFormat) {
  const files = await listFilesRecursive(extractedDir);
  const chatEntry = findChatEntry(files);
  if (!chatEntry) {
    await cleanupExtractedDir(extractedDir);
    throw new Error('No chat .txt file found in that export. Make sure it\u2019s a WhatsApp "Export chat" file.');
  }

  const mediaFileNames = files.filter((f) => f !== chatEntry && !isTextEntry(f.relativeName)).map((f) => f.relativeName);

  // The chat transcript itself is tiny (text only) - safe to read as a string.
  const rawText = await FileSystem.readAsStringAsync(chatEntry.uri, { encoding: FileSystem.EncodingType.UTF8 });
  const messages = parseChatText(rawText, dateFormat === 'MDY' ? 'MDY' : 'DMY', mediaFileNames);

  const participants = Array.from(new Set(messages.filter((m) => m.sender).map((m) => m.sender)));
  const timestamps = messages.map((m) => m.date.getTime());

  const dateRange = timestamps.length
    ? {
        from: new Date(Math.min(...timestamps)).toLocaleDateString('en-GB'),
        to: new Date(Math.max(...timestamps)).toLocaleDateString('en-GB'),
      }
    : null;

  return { extractedDir, messages, participants, messageCount: messages.length, dateRange };
}

/**
 * @param {string} fileUri - local file:// uri of the picked/shared .zip
 * @param {'DMY'|'MDY'} dateFormat
 */
export async function ingestExportZip(fileUri, dateFormat) {
  const extractedDir = `${FileSystem.cacheDirectory}toyam-import-${Date.now()}`;
  await FileSystem.makeDirectoryAsync(extractedDir, { intermediates: true }).catch(() => {});

  try {
    // Streams straight to disk on the native side - the archive's bytes
    // never have to be held (let alone duplicated as base64) in JS memory,
    // so this scales to media-heavy exports that previously OOM'd.
    await unzip(stripFileScheme(fileUri), stripFileScheme(extractedDir));
  } catch (err) {
    await cleanupExtractedDir(extractedDir);
    throw new Error(`Could not unzip that export: ${err.message || err}`);
  }

  return ingestFromDir(extractedDir, dateFormat);
}

/**
 * Ingests one or more files handed over by the OS share sheet (e.g.
 * "Export chat -> Share -> Toyam" from WhatsApp), instead of the manual
 * document picker.
 *
 * WhatsApp (and other apps) hand shared files over as content:// uris
 * pointing at their OWN content provider, not real filesystem paths -
 * react-native-zip-archive's native unzip() opens paths directly and can't
 * resolve those, which is what produced errors like
 * "content://...: open failed: ENOENT (No such file or directory)" when a
 * raw share-intent path was passed straight to it. expo-file-system's
 * copyAsync goes through Android's ContentResolver and CAN read a
 * content:// uri, so every shared item is always copied into our own cache
 * folder FIRST - only a real file:// path is ever handed to the zip
 * library or read as text.
 *
 * WhatsApp has also been observed handing over a chat export as several
 * loose files (the chat .txt plus each media file individually) instead of
 * a single .zip, on some device/OS/WhatsApp version combinations. Once
 * everything is copied locally we check whether we got exactly one .zip
 * (unzip it as usual) or a set of loose files (treat the staging folder
 * itself as an already-extracted export).
 *
 * @param {Array<{uri: string, name: string, mimeType?: string}>} items
 * @param {'DMY'|'MDY'} dateFormat
 */
export async function ingestSharedItems(items, dateFormat) {
  const stagingDir = `${FileSystem.cacheDirectory}toyam-share-${Date.now()}`;
  await FileSystem.makeDirectoryAsync(stagingDir, { intermediates: true }).catch(() => {});

  const copied = [];
  const failed = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const destName = item.name || `shared-${i}`;
    const destUri = `${stagingDir}/${destName}`;
    try {
      await FileSystem.copyAsync({ from: item.uri, to: destUri });
      copied.push({ uri: destUri, name: destName, mimeType: item.mimeType });
    } catch (err) {
      failed.push(destName);
    }
  }

  if (!copied.length) {
    await cleanupExtractedDir(stagingDir);
    throw new Error(
      'WhatsApp didn\u2019t hand over a readable file. In WhatsApp, try Export chat \u2192 Save to device, then use "Choose .zip file" here instead.'
    );
  }

  const isSingleZip = copied.length === 1 && (/\.zip$/i.test(copied[0].name) || (copied[0].mimeType || '').includes('zip'));

  let result;
  if (isSingleZip) {
    result = await ingestExportZip(copied[0].uri, dateFormat);
    await cleanupExtractedDir(stagingDir); // the real extraction now lives under its own dir from ingestExportZip
  } else {
    // Loose chat.txt + media files, already copied locally above - treat
    // the staging folder exactly like a freshly-unzipped export.
    result = await ingestFromDir(stagingDir, dateFormat);
  }

  if (failed.length) {
    result.warning = `${failed.length} of ${items.length} shared item${items.length === 1 ? '' : 's'} couldn\u2019t be read and ${
      failed.length > 1 ? 'were' : 'was'
    } skipped: ${failed.join(', ')}`;
  }
  return result;
}

/**
 * Copies one media file that's already sitting on disk (from the native
 * unzip above) into a policy folder. Plain file copy - no base64 round trip
 * and no zip library involved, since the file was never re-encoded in the
 * first place.
 *
 * @param {string} extractedDir - the on-disk folder from ingestExportZip
 */
export async function extractMediaToDisk(extractedDir, mediaFileName, destDir, destName) {
  if (!mediaFileName) return null;
  const sourceUri = `${extractedDir}/${mediaFileName}`;
  const info = await FileSystem.getInfoAsync(sourceUri);
  if (!info.exists) return null;
  await FileSystem.makeDirectoryAsync(destDir, { intermediates: true }).catch(() => {});
  const destUri = `${destDir}/${destName}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destUri });
  return destUri;
}

/**
 * Best-effort cleanup of the temp extraction folder once its media has been
 * copied into permanent policy folders (or the import is abandoned).
 * Idempotent - safe to call even if the folder is already gone.
 */
export async function cleanupExtractedDir(extractedDir) {
  if (!extractedDir) return;
  await FileSystem.deleteAsync(extractedDir, { idempotent: true }).catch(() => {});
}
