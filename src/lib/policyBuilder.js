// policyBuilder.js
//
// Exact same policy start/continue/end rules as the desktop app's
// buildPoliciesFromMessages (chatExportImport.js) / fetchChatMessages
// (server.js):
//   - a non-media message whose text starts with optional "#" then digits
//     opens a policy (the digits are the policy number)
//   - messages collect under that policy until one contains the standalone
//     word "end"
//   - media messages become "Type index dateTime" placeholder lines; the
//     real file is copied from the export rather than re-downloaded

import { extname, classifyExtension } from './chatParser';

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

/**
 * @param {Array} messages - output of parseChatText, already filtered to the
 *   sender(s) the user picked.
 * @returns {Array<{number, dateStr, messages: Array<string|{placeholder, mediaFileName, destName}>}>}
 */
export function buildPoliciesFromMessages(messages) {
  const policies = [];
  let currentPolicy = null;
  let policyMessages = [];
  let mediaIndex = 1;

  const flush = () => {
    if (currentPolicy) {
      policies.push({ number: currentPolicy.number, dateStr: currentPolicy.dateStr, messages: policyMessages });
    }
    policyMessages = [];
    mediaIndex = 1;
  };

  for (const msg of messages) {
    const dateTimeStr = enGB(msg.date);
    const dateStr = dashDate(msg.date);
    const body = msg.body || '';

    if (!msg.isMedia && /^#*\s*\d+/.test(body)) {
      if (currentPolicy) flush();
      currentPolicy = { number: /^#*\s*(\d+)/.exec(body)[1], dateStr };
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
