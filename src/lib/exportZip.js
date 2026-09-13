import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';

/**
 * Zips the given saved-policy folders (each { folder, folderUri }) into one
 * archive and opens the native share sheet so the person can save it
 * wherever they like (Files, Drive, email, etc.) — the mobile equivalent of
 * the desktop app's "Download Selected as ZIP" button.
 */
export async function shareSelectedPoliciesAsZip(policies) {
  const zip = new JSZip();

  for (const policy of policies) {
    const folder = zip.folder(policy.folder);
    const files = await FileSystem.readDirectoryAsync(policy.folderUri);
    for (const file of files) {
      const base64 = await FileSystem.readAsStringAsync(`${policy.folderUri}/${file}`, {
        encoding: FileSystem.EncodingType.Base64,
      });
      folder.file(file, base64, { base64: true });
    }
  }

  const base64Zip = await zip.generateAsync({ type: 'base64' });
  const destUri = `${FileSystem.cacheDirectory}toyam-policies-${Date.now()}.zip`;
  await FileSystem.writeAsStringAsync(destUri, base64Zip, { encoding: FileSystem.EncodingType.Base64 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(destUri, { mimeType: 'application/zip', dialogTitle: 'Share policies' });
  }
  return destUri;
}
