import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

const DOWNLOADS = 'https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/';

export function installHint(platform: NodeJS.Platform): string {
    if (platform === 'darwin') return 'brew install cloudflared';
    if (platform === 'win32') return 'winget install -e --id Cloudflare.cloudflared';

    return DOWNLOADS;
}

export function missingNotice(platform: NodeJS.Platform): string {
    return `\`seedcord dev\` opens a cloudflared tunnel so Discord can reach your bot. Install it with:\n${installHint(platform)}`;
}

export async function probeCloudflared(binary = 'cloudflared'): Promise<boolean> {
    const found = await run(binary, ['--version']).catch(() => null);
    return found !== null;
}
