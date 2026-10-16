import { randomUUID } from 'node:crypto';
import { cp, rm, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

import { bindings } from 'cf/config';
import { Routes } from 'discord-api-types/v10';
import { onTestFinished } from 'vitest';

import { EdgeBuild } from '#commands/build/builder/EdgeBuild';

import { quickBuildRunner } from './quickBuildRunner';
import { APP_ID, ED25519_KEY_BYTES, FAKE_TOKEN } from './smoke';

import type { BuildRunner } from '#commands/build/BuildRunner';
import type { REST } from '@discordjs/rest';
import type { WorkerConfig } from 'cf/config';

const EDGE_BOT = join(import.meta.dirname, '../../fixtures/edge-bot');
const BUILD_OUTPUT = new Set(['dist', '.cloudflare']);

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
    // vite keeps its dep cache beside the nearest package.json. one cache per copy lets test files run at once
    await writeFile(join(projectDir, 'package.json'), JSON.stringify({ name: 'edge-bot', type: 'module' }));
    return { projectDir, remove: () => rm(projectDir, { recursive: true, force: true }) };
}

export async function copyEdgeBotForTest(): Promise<string> {
    const { projectDir, remove } = await copyEdgeBot();
    onTestFinished(remove);
    return projectDir;
}

const ANY_PUBLIC_KEY = 'ab'.repeat(ED25519_KEY_BYTES);

// what discord returns to an edge build, with no command or emoji deployed
export function fakeDiscord(publicKey = ANY_PUBLIC_KEY): Pick<REST, 'get'> {
    const answers: Record<string, unknown> = {
        [Routes.currentApplication()]: { id: APP_ID, verify_key: publicKey },
        [Routes.applicationCommands(APP_ID)]: []
    };
    return {
        get: (route: string) =>
            route in answers ? Promise.resolve(answers[route]) : Promise.reject(new Error(`unreachable ${route}`))
    };
}

export function edgeBuildRunner(discord = fakeDiscord()): BuildRunner {
    return quickBuildRunner((project) => {
        const { target } = project.config;
        if (target.kind !== 'edge') throw new Error(`edgeBuildRunner got a ${target.kind} project`);
        return new EdgeBuild(project, target, { openDiscord: () => discord });
    });
}

// replaces the fixture's cloudflare.config.ts, keeping its name, date and token
export async function writeCloudflareConfig(
    projectDir: string,
    { env, ...worker }: Partial<WorkerConfig>
): Promise<void> {
    const config: WorkerConfig = {
        name: 'edge-bot',
        compatibilityDate: '2026-08-04',
        ...worker,
        env: { DISCORD_BOT_TOKEN: bindings.secret(), ...env }
    };
    // the binding helpers return plain objects
    await writeFile(
        join(projectDir, 'cloudflare.config.ts'),
        `export default { worker: ${JSON.stringify(config)} };\n`
    );
}

export type SignRequest = (body: string) => Promise<Headers>;

interface SigningEnv {
    publicKey: string;
    sign: SignRequest;
}

// the plugin reads .dev.vars beside cloudflare.config.ts into the worker's env
export async function writeSigningEnv(projectDir: string): Promise<SigningEnv> {
    // justified: @types/node has no CryptoKeyPair global for what generateKey('Ed25519') returns
    const pair = (await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify'])) as {
        publicKey: CryptoKey;
        privateKey: CryptoKey;
    };
    const publicKey = toHex(await crypto.subtle.exportKey('raw', pair.publicKey));
    await writeFile(join(projectDir, '.dev.vars'), `DISCORD_BOT_TOKEN=${FAKE_TOKEN}\n`);

    return {
        publicKey,
        sign: async (body) => {
            const timestamp = String(Math.floor(Date.now() / 1000));
            const signature = await crypto.subtle.sign('Ed25519', pair.privateKey, encoder.encode(timestamp + body));
            return new Headers({ 'x-signature-ed25519': toHex(signature), 'x-signature-timestamp': timestamp });
        }
    };
}
