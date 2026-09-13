// shareIntent.js
//
// Wraps expo-share-intent so the rest of the app only deals with a plain
// { fileUri, fileName } pair. This is what makes "Export chat -> Share ->
// Toyam" work from WhatsApp's own share sheet, instead of only supporting a
// manual file picker.
//
// IMPORTANT: the share-sheet entry point requires a custom dev client / EAS
// build - it is not available inside Expo Go. See README "Share from
// WhatsApp" section.

import { useEffect, useState } from 'react';
import { useShareIntentContext } from 'expo-share-intent';

export function useIncomingShare() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const [incoming, setIncoming] = useState(null);

  useEffect(() => {
    if (!hasShareIntent || !shareIntent) return;
    const file = (shareIntent.files || [])[0];
    if (file && (file.mimeType || '').includes('zip')) {
      setIncoming({ fileUri: file.path, fileName: file.fileName || 'shared-chat.zip' });
    } else if (file) {
      // WhatsApp sometimes hands the zip over as octet-stream; accept any
      // single shared file and let the unzip step fail loudly if it isn't one.
      setIncoming({ fileUri: file.path, fileName: file.fileName || 'shared-file' });
    }
  }, [hasShareIntent, shareIntent]);

  const clear = () => {
    setIncoming(null);
    resetShareIntent();
  };

  return { incoming, clear };
}
