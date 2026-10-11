// policyBuilder.js
//
// Policy start/continue/end rules:
//   - A policy OPENS only on a text message that starts with a DOUBLE HASH
//     "##", then optional spaces/tabs, then an alphanumeric ID:
//         "##MOTI3434"   "## 934MT"   "##   sadasbd3232"
//     The "##" is compulsory - a bare "0631upasana" or "123455" is just chat,
//     not a policy. (A lone "#" or three "###" does not count either.)
//   - messages collect under that policy until one contains the standalone
//     word "end" in any casing (END / end / End / eND ...)
//   - media messages become "Type index dateTime" placeholder lines; the
//     real file is copied from the export rather than re-downloaded
//   - messages outside an open policy are ignored

import { extname, classifyExtension } from './chatParser';

// "##" (exactly two, at the very start) + optional non-newline whitespace + ID.
// The ID must be followed by whitespace / end of message, so "##abc-def" or
// "##12,34" are not half-matched.
const POLICY_TOKEN_RE = /^##[^\S\n]*([A-Za-z0-9]{1,24})(?=\s|$)/;

function extractPolicyNumber(body) {
  const m = POLICY_TOKEN_RE.exec(body);
  if (!m) return null;
  const token = m[1];
  if (/^end$/i.test(token)) return null; // "## END" closes a policy, it never opens one
  return token;
}

function enGB(date) {
  return date
    .toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    .replace(',', '');
}

function dashDate(date) {
  return date
    .toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    .replace(/\//g, '-');
}

function hhmm(date) {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/**
 * @param {Array} messages - output of parseChatText, already filtered to the
 *   sender(s) the user picked.
 * @returns {Array<{number, dateStr, timeStr, messages: Array<string|{placeholder, mediaFileName, destName}>}>}
 */
export function buildPoliciesFromMessages(messages) {
  const policies = [];
  let currentPolicy = null;
  let policyMessages = [];
  let mediaIndex = 1;

  // Two different policies can share the same ID on the same day. They map to the
  // same folder (<number>_<date>), so without this the 2nd would be skipped as
  // "already saved" and its content lost. Give repeats a -2, -3 ... suffix.
  const seen = new Map();
  const uniqueNumber = (number, dateStr) => {
    const key = `${number}_${dateStr}`;
    const n = (seen.get(key) || 0) + 1;
    seen.set(key, n);
    return n === 1 ? number : `${number}-${n}`;
  };

  const flush = () => {
    if (currentPolicy) {
      policies.push({ number: uniqueNumber(currentPolicy.number, currentPolicy.dateStr), dateStr: currentPolicy.dateStr, timeStr: currentPolicy.timeStr, messages: policyMessages });
    }
    policyMessages = [];
    mediaIndex = 1;
  };

  for (const msg of messages) {
    const dateTimeStr = enGB(msg.date);
    const dateStr = dashDate(msg.date);
    const body = msg.body || '';

    const policyNumber = !msg.isMedia ? extractPolicyNumber(body) : null;
    if (policyNumber) {
      if (currentPolicy) flush();
      currentPolicy = { number: policyNumber, dateStr, timeStr: hhmm(msg.date) };
      policyMessages.push(`${currentPolicy.number} ${dateTimeStr}\n${body}`);
    } else if (currentPolicy && !msg.isMedia && /\bend\b/i.test(body.trim())) {
      policyMessages.push(`${dateTimeStr}\n${body}`);
      flush();
      currentPolicy = null;
    } else if (currentPolicy) {
      if (!msg.isMedia) {
        policyMessages.push(`${dateTimeStr}\n${body}`);
      } else {
        const ext = msg.mediaFileName ? extname(msg.mediaFileName) : '';
        const type = classifyExtension(ext);
        policyMessages.push({
          placeholder: `${type} ${mediaIndex} ${dateTimeStr}`,
          mediaFileName: msg.mediaFileName || null,
          destName: `${type.toLowerCase()}_${mediaIndex}_${dateStr}${ext || '.bin'}`,
        });
        mediaIndex++;
      }
    }
    // messages outside an open policy are ignored, same as the live bot.
  }

  if (currentPolicy) flush();

  return policies;
}