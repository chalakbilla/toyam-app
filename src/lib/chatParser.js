// chatParser.js
//
// Direct port of the parsing half of the desktop app's chatExportImport.js.
// Same regexes, same rules, so a chat exported from WhatsApp produces
// identical messages/policies whether it's fed to the old Node server or to
// this app. Kept dependency-free (no `fs`, no `path`) so it runs on-device.

export const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
export const VIDEO_EXT = ['.mp4', '.mov', '.avi', '.mkv', '.3gp', '.m4v'];
export const AUDIO_EXT = ['.opus', '.mp3', '.m4a', '.aac', '.ogg', '.wav'];

export function extname(fileName) {
  const m = /\.[^./\\]+$/.exec(fileName || '');
  return m ? m[0] : '';
}

export function classifyExtension(ext) {
  ext = (ext || '').toLowerCase();
  if (IMAGE_EXT.includes(ext)) return 'Image';
  if (VIDEO_EXT.includes(ext)) return 'Video';
  if (AUDIO_EXT.includes(ext)) return 'Audio';
  return 'Document';
}

// Removes invisible bidi/formatting characters WhatsApp exports are full of.
function stripInvisible(text) {
  return text.replace(/[\u200E\u200F\uFEFF]/g, '');
}

const LINE_PLAIN = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s?(\d{1,2}):(\d{2})(?::(\d{2}))?\s?([ap]\.?m\.?)?\s-\s(.*)$/i;
const LINE_BRACKET = /^\[(\d{1,2})\/(\d{1,2})\/(\d{2,4}),\s?(\d{1,2}):(\d{2})(?::(\d{2}))?\s?([ap]\.?m\.?)?\]\s(.*)$/i;
const SENDER_SPLIT = /^([^:\n]{1,60}?):\s(.*)$/s;
const ATTACHED_TAG = /^<attached:\s*(.+?)>$/i;
const FILE_ATTACHED_SUFFIX = /^(.+?)\s\(file attached\)$/i;

function to24Hour(hour, ampm) {
  if (!ampm) return hour;
  const isPM = /p/i.test(ampm);
  if (isPM && hour < 12) return hour + 12;
  if (!isPM && hour === 12) return 0;
  return hour;
}

/**
 * Parses raw exported chat text into an ordered list of messages.
 * dateFormat: 'DMY' (default - matches most exports, e.g. India) or 'MDY'.
 * mediaFileNames: relative paths of every non-.txt file extracted from the zip,
 * used to match a message's attachment line back to the real file.
 */
export function parseChatText(rawText, dateFormat, mediaFileNames) {
  const text = stripInvisible(rawText).replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const messages = [];
  const mediaLookup = new Map((mediaFileNames || []).map((f) => [f.toLowerCase(), f]));

  let current = null;
  const pushCurrent = () => {
    if (current) messages.push(current);
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');
    const m = LINE_BRACKET.exec(line) || LINE_PLAIN.exec(line);

    if (m) {
      pushCurrent();
      const [, p1, p2, p3, hourStr, minStr, secStr, ampm, rest] = m;
      let day, month, year;
      if (dateFormat === 'MDY') {
        month = Number(p1);
        day = Number(p2);
        year = Number(p3);
      } else {
        day = Number(p1);
        month = Number(p2);
        year = Number(p3);
      }
      if (year < 100) year += 2000;
      const hour = to24Hour(Number(hourStr), ampm);
      const date = new Date(year, month - 1, day, hour, Number(minStr), secStr ? Number(secStr) : 0);
      if (isNaN(date.getTime())) continue;

      const senderMatch = SENDER_SPLIT.exec(rest);
      const sender = senderMatch ? senderMatch[1].trim() : null;
      let body = senderMatch ? senderMatch[2] : rest;

      let isMedia = false;
      let mediaFileName = null;
      const attachedTag = ATTACHED_TAG.exec(body.trim());
      const attachedSuffix = FILE_ATTACHED_SUFFIX.exec(body.trim());
      if (attachedTag) {
        isMedia = true;
        mediaFileName = attachedTag[1].trim();
      } else if (attachedSuffix) {
        isMedia = true;
        mediaFileName = attachedSuffix[1].trim();
      } else if (mediaLookup.has(body.trim().toLowerCase())) {
        isMedia = true;
        mediaFileName = mediaLookup.get(body.trim().toLowerCase());
      }
      if (isMedia && mediaFileName && mediaLookup.has(mediaFileName.toLowerCase())) {
        mediaFileName = mediaLookup.get(mediaFileName.toLowerCase());
      }

      current = { date, sender, body: body.trim(), isMedia, mediaFileName };
    } else if (current && line.trim() !== '') {
      current.body += '\n' + line;
    }
  }
  pushCurrent();

  return messages.sort((a, b) => a.date - b.date);
}
