import { randomUUID } from 'node:crypto';
import { cp, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

import { onTestFinished } from 'vitest';

import { FAKE_TOKEN } from './smoke';

const EDGE_BOT = join(import.meta.dirname, '../../fixtures/edge-bot');
const BUILD_OUTPUT = new Set(['dist', '.wrangler']);

const encoder = new TextEncoder();

function toHex(bytes: ArrayBuffer): string {
    return Buffer.from(bytes).toString('hex');
}

interface EdgeBotCopy {
    projectDir: string;
    remove: () => Promise<void>;
}

// the fixture's imports resolve only from inside this package
export async function copyEdgeBot(): Promise<EdgeBotCopy> {
    const projectDir = join(import.meta.dirname, '../../temp', `edge-bot-${randomUUID()}`);
    await cp(EDGE_BOT, projectDir, { recursive: true, filter: (source) => !BUILD_OUTPUT.has(basename(source)) });
    return { projectDir, remove: () => rm(projectDir, { recursive: true, force: true }) };
}

export async function copyEdgeBotForTest(): Promise<string> {
    const { projectDir, remove } = await copyEdgeBot();
    onTestFinished(remove);
    return projectDir;
}

export type SignRequest = (body: string) => Promise<Headers>;

// wrangler reads .dev.vars beside the wrangler config into the worker's env
export async function writeSigningEnv(projectDir: string): Promise<SignRequest> {
    // justified: @types/node has no CryptoKeyPair global for what generateKey('Ed25519') returns
    const pair = (await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify'])) as {
        publicKey: CryptoKey;
        privateKey: CryptoKey;
    };
    const publicKey = toHex(await crypto.subtle.exportKey('raw', pair.publicKey));
    await writeFile(
        join(projectDir, '.dev.vars'),
        `DISCORD_PUBLIC_KEY=${publicKey}\nDISCORD_BOT_TOKEN=${FAKE_TOKEN}\n`
    );

    return async (body) => {
        const timestamp = String(Math.floor(Date.now() / 1000));
        const signature = await crypto.subtle.sign('Ed25519', pair.privateKey, encoder.encode(timestamp + body));
        return new Headers({ 'x-signature-ed25519': toHex(signature), 'x-signature-timestamp': timestamp });
    };
}
