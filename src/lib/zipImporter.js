// zipImporter.js
//
// On-device equivalent of the desktop app's ingestExportZip. Reads the
// exported WhatsApp .zip (from the file picker, or from a share-sheet hand-
// off — see shareIntent.js) straight into memory with JSZip, finds the chat
// transcript, and runs it through chatParser. The JSZip instance is kept
// around (in ImportContext) so media files can be pulled out lazily, only
// for the policies actually being saved.

import * as FileSystem from 'expo-file-system';
import JSZip from 'jszip';
import { parseChatText } from './chatParser';

function isTextEntry(name) {
  return /\.txt$/i.test(name);
}

function findChatEntry(zip) {
  const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
  const chatName = names.find((n) => /_chat\.txt$/i.test(n)) || names.find((n) => isTextEntry(n));
  return chatName || null;
}

/**
 * @param {string} fileUri - local file:// uri of the picked/shared .zip
 * @param {'DMY'|'MDY'} dateFormat
 */
export async function ingestExportZip(fileUri, dateFormat) {
  const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
  const zip = await JSZip.loadAsync(base64, { base64: true });

  const chatEntryName = findChatEntry(zip);
  if (!chatEntryName) {
    throw new Error('No chat .txt file found inside this zip. Make sure it\u2019s a WhatsApp "Export chat" file.');
  }

  const mediaFileNames = Object.keys(zip.files).filter((n) => !zip.files[n].dir && !isTextEntry(n));

  const rawText = await zip.files[chatEntryName].async('string');
  const messages = parseChatText(rawText, dateFormat === 'MDY' ? 'MDY' : 'DMY', mediaFileNames);

  const participants = Array.from(new Set(messages.filter((m) => m.sender).map((m) => m.sender)));
  const timestamps = messages.map((m) => m.date.getTime());

  const dateRange = timestamps.length
    ? {
        from: new Date(Math.min(...timestamps)).toLocaleDateString('en-GB'),
        to: new Date(Math.max(...timestamps)).toLocaleDateString('en-GB'),
      }
    : null;

  return { zip, messages, participants, messageCount: messages.length, dateRange };
}

/**
 * Extracts one media entry from the zip to a real file on disk (base64
 * decode via expo-file-system) and returns its local file:// uri.
 */
export async function extractMediaToDisk(zip, mediaFileName, destDir, destName) {
  const entry = zip.files[mediaFileName];
  if (!entry) return null;
  await FileSystem.makeDirectoryAsync(destDir, { intermediates: true }).catch(() => {});
  const base64 = await entry.async('base64');
  const destUri = `${destDir}/${destName}`;
  await FileSystem.writeAsStringAsync(destUri, base64, { encoding: FileSystem.EncodingType.Base64 });
  return destUri;
}
