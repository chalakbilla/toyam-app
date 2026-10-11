// policyStorage.js
//
// Saves extracted policies into  <documentDirectory>/policies/<number>_<dateStr>/
// with a messages.txt plus any media files copied out of the zip - identical
// folder layout to the desktop app's ./policies/, so the naming Drive upload
// expects ("2234555_25-06-2025") stays the same. Also writes a small
// meta.json per folder (time of the opening message + attachment count) so
// screens can show that without re-reading every file.

import * as FileSystem from 'expo-file-system';
import { extractMediaToDisk } from './zipImporter';

export const POLICIES_ROOT = `${FileSystem.documentDirectory}policies`;

// A folder only counts as "already saved" once messages.txt actually exists
// inside it - not just because the folder itself is present. A folder can
// exist but be empty/partial if a previous import run was interrupted (e.g.
// crashed mid-extraction) after makeDirectoryAsync but before the content
// was written; checking bare folder existence made every policy in that
// batch look permanently "already saved" even though nothing was in them.
async function folderIsComplete(folderUri) {
  const info = await FileSystem.getInfoAsync(`${folderUri}/messages.txt`);
  return info.exists;
}

/**
 * @param {string} extractedDir - the on-disk folder from ingestExportZip
 * @param {Array} policies - output of buildPoliciesFromMessages
 * @returns {Array<{number, dateStr, timeStr, folder, folderUri, status, messageCount, mediaCount, error}>}
 */
export async function saveExtractedPolicies(extractedDir, policies) {
  await FileSystem.makeDirectoryAsync(POLICIES_ROOT, { intermediates: true }).catch(() => {});
  const results = [];

  for (const policy of policies) {
    const folderName = `${policy.number}_${policy.dateStr}`;
    const folderUri = `${POLICIES_ROOT}/${folderName}`;

    if (await folderIsComplete(folderUri)) {
      const meta = await readMeta(folderUri);
      results.push({
        number: policy.number,
        dateStr: policy.dateStr,
        timeStr: policy.timeStr || meta.timeStr,
        folder: folderName,
        folderUri,
        status: 'exists',
        mediaCount: meta.mediaCount,
      });
      continue;
    }

    try {
      await FileSystem.makeDirectoryAsync(folderUri, { intermediates: true }).catch(() => {}); // idempotent - folder may already exist from a previous interrupted run
      const lines = [];
      let mediaSaved = 0;

      for (const msg of policy.messages) {
        if (typeof msg === 'string') {
          lines.push(msg);
          continue;
        }
        lines.push(msg.placeholder);
        if (msg.mediaFileName) {
          const saved = await extractMediaToDisk(extractedDir, msg.mediaFileName, folderUri, msg.destName);
          if (saved) mediaSaved++;
        }
      }

      await FileSystem.writeAsStringAsync(`${folderUri}/messages.txt`, lines.join('\n'));
      await writeMeta(folderUri, { timeStr: policy.timeStr || null, mediaCount: mediaSaved, messageCount: lines.length });
      results.push({
        number: policy.number,
        dateStr: policy.dateStr,
        timeStr: policy.timeStr,
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

async function writeMeta(folderUri, meta) {
  await FileSystem.writeAsStringAsync(`${folderUri}/meta.json`, JSON.stringify(meta)).catch(() => {});
}

async function readMeta(folderUri) {
  try {
    const raw = await FileSystem.readAsStringAsync(`${folderUri}/meta.json`);
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function listSavedPolicyFolders() {
  const exists = await FileSystem.getInfoAsync(POLICIES_ROOT).then((i) => i.exists);
  if (!exists) return [];
  const names = await FileSystem.readDirectoryAsync(POLICIES_ROOT);
  return names.filter((n) => /^.+_\d{2}-\d{2}-\d{4}$/.test(n));
}

/**
 * Reads back a saved folder's time + attachment count for display. Folders
 * saved before meta.json existed just won't have a time/count - callers
 * should treat missing fields as "unknown", not an error.
 */
export async function readPolicyMeta(folderUri) {
  return readMeta(folderUri);
}
