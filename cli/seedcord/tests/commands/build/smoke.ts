import { spawn } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';

type Kind = 'http' | 'gateway';

// a discord token is base64 of the app id, a 6 char timestamp, and a 27 char hmac
const APP_ID = '1000000000000000000';
const TIMESTAMP_CHARS = 6;
const HMAC_CHARS = 27;
const FAKE_TOKEN = `${btoa(APP_ID).replaceAll('=', '')}.${'b'.repeat(TIMESTAMP_CHARS)}.${'c'.repeat(HMAC_CHARS)}`;

const ED25519_KEY_BYTES = 32;
const UNAUTHORIZED = 401;
const SMOKE_TIMEOUT_MS = 30_000;

// an spki-encoded ed25519 key ends with its raw bytes
function publicKeyHex(): string {
    const { publicKey } = generateKeyPairSync('ed25519');
    return publicKey.export({ type: 'spki', format: 'der' }).subarray(-ED25519_KEY_BYTES).toString('hex');
}

export async function smoke(kind: Kind, command: string, args: string[] = []): Promise<string> {
    const child = spawn(command, args, {
        env: { ...process.env, DISCORD_BOT_TOKEN: FAKE_TOKEN, DISCORD_PUBLIC_KEY: publicKeyHex() },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    let output = '';
    const exited = new Promise<number | null>((resolve) => child.once('exit', resolve));
    const ready = new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`no answer in ${String(SMOKE_TIMEOUT_MS)}ms:\n${output}`));
        }, SMOKE_TIMEOUT_MS);
        const collect = (chunk: Buffer): void => {
            output += String(chunk);
            const port = /fixture:listening (\d+)/.exec(output)?.[1];
            // a gateway bot loads its handlers inside login, before it would reach discord
            if (kind === 'http' ? port === undefined : !output.includes('fixture:handlers-loaded')) return;

            clearTimeout(timer);
            resolve(port ?? '');
        };
        child.stdout.on('data', collect);
        child.stderr.on('data', collect);
        void exited.then((code) => {
            clearTimeout(timer);
            reject(new Error(`exited with ${String(code)} before it was ready:\n${output}`));
        });
    });

    try {
        const port = await ready;
        if (!output.includes('fixture:handlers-loaded')) throw new Error(`handlers never loaded:\n${output}`);

        if (kind === 'http') {
            const response = await fetch(`http://127.0.0.1:${port}/`, { method: 'POST', body: '{}' });
            if (response.status !== UNAUTHORIZED) {
                throw new Error(`unsigned POST got ${String(response.status)}:\n${output}`);
            }
        }
        return output;
    } finally {
        child.kill();
    }
}
