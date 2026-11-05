import { mkdir, readFile, writeFile } from 'node:fs/promises';

const clientId = process.env.TWITCH_CLIENT_ID;
const clientSecret = process.env.TWITCH_CLIENT_SECRET;
const login = process.env.TWITCH_LOGIN || 'edgesquirrell';
const outputPath = 'content/twitch-status.json';

async function saveStatus(status) {
  await mkdir('content', { recursive: true });
  const next = `${JSON.stringify(status, null, 2)}\n`;
  let previous = '';
  try { previous = await readFile(outputPath, 'utf8'); } catch {}
  if (previous !== next) await writeFile(outputPath, next, 'utf8');
  return previous !== next;
}

if (!clientId || !clientSecret) {
  console.log('Twitch credentials are not set yet; publishing the badge in its neutral state.');
  await saveStatus({ is_live: null });
} else {
  const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials'
    })
  });
  if (!tokenResponse.ok) throw new Error(`Could not get a Twitch app token (${tokenResponse.status}).`);
  const { access_token: token } = await tokenResponse.json();

  async function twitchJson(url) {
    const response = await fetch(url, {
      headers: { 'Client-Id': clientId, 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error(`Twitch API returned ${response.status}. Check the Twitch app credentials.`);
    return response.json();
  }

  const users = await twitchJson(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`);
  const user = users.data?.[0];
  if (!user) throw new Error(`Could not find the Twitch channel "${login}".`);

  const streams = await twitchJson(`https://api.twitch.tv/helix/streams?user_id=${encodeURIComponent(user.id)}`);
  const current = streams.data?.[0];
  const changed = await saveStatus(current ? {
    is_live: true,
    title: current.title || '',
    game: current.game_name || '',
    started_at: current.started_at || ''
  } : { is_live: false });
  console.log(changed ? 'Twitch live status changed.' : 'Twitch live status is unchanged.');
}
