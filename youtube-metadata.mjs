import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parseSourceUrl } from './src/domain.mjs';
import { youtubeEpisodes } from './src/bulk.mjs';
const run = promisify(execFile);
let busy = false;
export async function discoverYouTube(raw) {
  const source = parseSourceUrl(raw);
  if (source.provider !== 'youtube') throw Error('Enter a YouTube video or playlist URL.');
  if (busy) throw Error('Another YouTube discovery is running. Try again shortly.');
  busy = true;
  try {
    const { stdout } = await run('yt-dlp', ['--ignore-config', '--flat-playlist', '--skip-download', '--dump-single-json',
      '--playlist-end', '201', '--socket-timeout', '10', '--retries', '0', '--', source.url],
    { timeout: 45000, maxBuffer: 8_000_000, env: { ...process.env } });
    return youtubeEpisodes(JSON.parse(stdout));
  } catch (error) {
    if (error.code === 'ENOENT') throw Error('YouTube discovery requires yt-dlp on the server PATH. Install it, then retry.');
    if (error.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') throw Error('YouTube metadata exceeded the response limit. Try a smaller playlist.');
    if (error.killed) throw Error('YouTube discovery timed out. Try a smaller playlist.');
    if (error instanceof SyntaxError) throw Error('YouTube returned unreadable metadata.');
    if (error.stderr) throw Error('YouTube metadata is unavailable. The playlist may be private, restricted, or temporarily blocked. Try an individual public video.');
    throw error;
  } finally { busy = false; }
}
