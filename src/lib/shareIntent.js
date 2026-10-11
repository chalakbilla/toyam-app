// shareIntent.js
//
// Wraps expo-share-intent so the rest of the app only deals with a plain
// list of { uri, name, mimeType } items. This is what makes "Export chat ->
// Share -> Toyam" work from WhatsApp's own share sheet, instead of only
// supporting a manual file picker.
//
// IMPORTANT: the share-sheet entry point requires a custom dev client / EAS
// build - it is not available inside Expo Go. See README "Share from
// WhatsApp" section.
//
// NOTE: this used to only look at the first shared file. WhatsApp's
// "Export chat -> Include Media" direct-share can hand over EITHER a single
// .zip OR several loose files (the chat .txt plus each media file) on
// different device/OS/WhatsApp version combinations - taking only the
// first item silently dropped everything else and, if that first item
// wasn't the zip, led straight to the "could not unzip" crash. All shared
// items are collected here now; zipImporter.ingestSharedItems figures out
// which shape it got.

import { useEffect, useState } from 'react';
import { useShareIntentContext } from 'expo-share-intent';

export function useIncomingShare() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const [incoming, setIncoming] = useState(null);

  useEffect(() => {
    if (!hasShareIntent || !shareIntent) return;
    const files = shareIntent.files || [];
    if (!files.length) return;

    const items = files.map((file, i) => ({
      uri: file.path,
      name: file.fileName || file.path.split('/').pop() || `shared-${i}`,
      mimeType: file.mimeType,
    }));
    const label = items.length === 1 ? items[0].name : `${items.length} files from WhatsApp`;
    setIncoming({ items, label });
  }, [hasShareIntent, shareIntent]);

  const clear = () => {
    setIncoming(null);
    resetShareIntent();
  };

  return { incoming, clear };
}
