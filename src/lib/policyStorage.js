// policyStorage.js
//
// Saves extracted policies into  <documentDirectory>/policies/<number>_<dateStr>/
// with a messages.txt plus any media files copied out of the zip - identical
// folder layout to the desktop app's ./policies/, so the naming Drive upload
// expects ("2234555_25-06-2025") stays the same.

import * as FileSystem from 'expo-file-system';
import { extractMediaToDisk } from './zipImporter';

export const POLICIES_ROOT = `${FileSystem.documentDirectory}policies`;

async function folderExists(path) {
  const info = await FileSystem.getInfoAsync(path);
  return info.exists;
}

/**
 * @param {object} zip - the JSZip instance from ingestExportZip
 * @param {Array} policies - output of buildPoliciesFromMessages
 * @returns {Array<{number, dateStr, folder, folderUri, status, messageCount, mediaCount, error}>}
 */
export async function saveExtractedPolicies(zip, policies) {
  await FileSystem.makeDirectoryAsync(POLICIES_ROOT, { intermediates: true }).catch(() => {});
  const results = [];

  for (const policy of policies) {
    const folderName = `${policy.number}_${policy.dateStr}`;
    const folderUri = `${POLICIES_ROOT}/${folderName}`;

    if (await folderExists(folderUri)) {
      results.push({ number: policy.number, dateStr: policy.dateStr, folder: folderName, folderUri, status: 'exists' });
      continue;
    }

    try {
      await FileSystem.makeDirectoryAsync(folderUri, { intermediates: true });
      const lines = [];
      let mediaSaved = 0;

      for (const msg of policy.messages) {
        if (typeof msg === 'string') {
          lines.push(msg);
          continue;
        }
        lines.push(msg.placeholder);
        if (msg.mediaFileName) {
          const saved = await extractMediaToDisk(zip, msg.mediaFileName, folderUri, msg.destName);
          if (saved) mediaSaved++;
        }
      }

      await FileSystem.writeAsStringAsync(`${folderUri}/messages.txt`, lines.join('\n'));
      results.push({
        number: policy.number,
        dateStr: policy.dateStr,
        folder: folderName,
        folderUri,
        status: 'saved',
        messageCount: lines.length,
        mediaCount: mediaSaved,
      });
    } catch (error) {
      results.push({ number: policy.number, dateStr: policy.dateStr, folder: folderName, folderUri, status: 'error', error: error.message });
    }
  }

  return results;
}

export async function listSavedPolicyFolders() {
  const exists = await folderExists(POLICIES_ROOT);
  if (!exists) return [];
  const names = await FileSystem.readDirectoryAsync(POLICIES_ROOT);
  return names.filter((n) => /^.+_\d{2}-\d{2}-\d{4}$/.test(n));
}
