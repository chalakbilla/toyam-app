// Run once on your computer:  node get-refresh-token.js
// Needs the Desktop-app OAuth client id + secret (your client_secret.json).
const http = require('http');
const { exec } = require('child_process');
const CLIENT_ID = process.argv[2] || process.env.CLIENT_ID;
const CLIENT_SECRET = process.argv[3] || process.env.CLIENT_SECRET;
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.log('Usage: node get-refresh-token.js <CLIENT_ID> <CLIENT_SECRET>');
  process.exit(1);
}
const PORT = 53682;
const REDIRECT = `http://127.0.0.1:${PORT}`;
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
  client_id: CLIENT_ID, redirect_uri: REDIRECT, response_type: 'code',
  scope: SCOPE, access_type: 'offline', prompt: 'consent',
});
const server = http.createServer(async (req, res) => {
  const code = new URL(req.url, REDIRECT).searchParams.get('code');
  if (!code) { res.end('No code'); return; }
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT, grant_type: 'authorization_code' }).toString(),
  });
  const data = await r.json();
  res.end('Done - you can close this tab.');
  console.log('\nREFRESH TOKEN:\n' + (data.refresh_token || JSON.stringify(data)));
  server.close();
});
server.listen(PORT, () => {
  console.log('Open this URL and approve:\n' + url);
  exec(`${process.platform === 'win32' ? 'start ""' : process.platform === 'darwin' ? 'open' : 'xdg-open'} "${url}"`);
});
