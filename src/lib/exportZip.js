import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { zip, subscribe } from 'react-native-zip-archive';

// react-native-zip-archive wants plain filesystem paths, not file:// uris.
function stripFileScheme(uri) {
  return uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
}

/**
 * Zips the given saved-policy folders (each { folder, folderUri }) into one
 * archive and opens the native share sheet so the person can save it
 * wherever they like (Files, Drive, email, etc.) — the mobile equivalent of
 * the desktop app's "Download Selected as ZIP" button.
 *
 * This used to read every file into memory as a base64 string and build the
 * whole archive with JSZip in JS - for a handful of policies with photos or
 * videos that's enough to visibly freeze the UI thread (and at a large
 * enough selection, risks the same OutOfMemoryError the import path hit).
 * Instead we stage a temp folder on disk that mirrors the desired archive
 * layout (one subfolder per policy, plain file copies - no base64), then
 * hand the whole thing to react-native-zip-archive for a single native
 * compress. File contents never pass through JS memory.
 *
 * @param {Array} policies - selected save results ({ folder, folderUri })
 * @param {(fraction: number) => void} [onProgress] - called with 0..1 as
 *   copying (first half) then native zipping (second half) proceed.
 */
export async function shareSelectedPoliciesAsZip(policies, onProgress) {
  const report = (p) => onProgress && onProgress(Math.max(0, Math.min(1, p)));
  const stagingDir = `${FileSystem.cacheDirectory}toyam-export-${Date.now()}`;
  await FileSystem.makeDirectoryAsync(stagingDir, { intermediates: true }).catch(() => {});

  try {
    const fileLists = await Promise.all(policies.map((p) => FileSystem.readDirectoryAsync(p.folderUri)));
    const totalFiles = fileLists.reduce((sum, list) => sum + list.length, 0) || 1;
    let copied = 0;
    report(0);

    for (let i = 0; i < policies.length; i++) {
      const policyDir = `${stagingDir}/${policies[i].folder}`;
      await FileSystem.makeDirectoryAsync(policyDir, { intermediates: true }).catch(() => {});
      for (const file of fileLists[i]) {
        await FileSystem.copyAsync({ from: `${policies[i].folderUri}/${file}`, to: `${policyDir}/${file}` });
        copied++;
        report((copied / totalFiles) * 0.5); // copying is roughly the first half of the work
      }
    }

    const destUri = `${FileSystem.cacheDirectory}toyam-policies-${Date.now()}.zip`;
    const sub = subscribe(({ progress }) => report(0.5 + progress * 0.5)); // native compression is the second half
    try {
      // Single native call: reads, compresses, and writes on disk without
      // ever bringing file bytes into the JS runtime.
      await zip(stripFileScheme(stagingDir), stripFileScheme(destUri));
    } finally {
      sub.remove();
    }
    report(1);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(destUri, { mimeType: 'application/zip', dialogTitle: 'Share policies' });
    }
    return destUri;
  } finally {
    await FileSystem.deleteAsync(stagingDir, { idempotent: true }).catch(() => {});
  }
}
