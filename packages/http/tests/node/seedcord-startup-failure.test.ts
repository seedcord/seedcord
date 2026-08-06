import path from 'node:path';

import { Logger, LoggerChannelRegistry } from '@seedcord/logger';
import { Envapter, merge, PortableSource } from 'envapt';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Seedcord } from '@src/node/Seedcord';
import { Plugin } from '@src/plugin';

import { createSigner } from '../helpers/ed25519';
import { VALID_TOKEN } from '../helpers/fixtures';

import type { LogRecord } from '@seedcord/logger';
import type { HttpServerConfig } from '@src/interfaces/Config';

const HANDLERS_DIR = path.resolve(__dirname, './discovery/fixtures/handlers');

function config(): HttpServerConfig {
    return {
        bot: { interactions: { path: HANDLERS_DIR }, commands: { path: null } },
        subscribers: { path: null },
        port: 0
    };
}

// ready runs in the same phase as the server bind so the rejection happens after the port is held
class FailsReadyOnce extends Plugin {
    private failed = false;

    public init(): Promise<void> {
        return Promise.resolve();
    }

    public override ready(): Promise<void> {
        if (this.failed) return Promise.resolve();
        this.failed = true;
        return Promise.reject(new Error('ready failed'));
    }
}

function reset(): void {
    // @ts-expect-error singleton reset between tests
    Seedcord.reset();
}

async function bindEnv(): Promise<void> {
    const signer = await createSigner();
    Envapter.useSource(
        merge(
            new PortableSource(process.env),
            new PortableSource({ DISCORD_PUBLIC_KEY: signer.publicKeyHex, DISCORD_BOT_TOKEN: VALID_TOKEN })
        )
    );
}

let live: Seedcord | undefined;

describe('http Seedcord startup failure', () => {
    beforeEach(reset);

    afterEach(async () => {
        await live?.shutdown.run(0, false);
        live = undefined;
        reset();
    });

    it('closes the interaction server when a later startup task rejects', async () => {
        await bindEnv();

        const host = new Seedcord(config());
        host.attach('failing', FailsReadyOnce);
        live = host;

        await expect(host.start()).rejects.toThrow();
        expect(host.port).toBeDefined();

        await expect(fetch(`http://127.0.0.1:${String(host.port)}`, { method: 'POST' })).rejects.toThrow();
    });

    // the dev TUI's capture outlives the instance that failed
    it('keeps an installed capture sink across the reset', async () => {
        await bindEnv();
        const records: LogRecord[] = [];
        const handle = LoggerChannelRegistry.instance.installSink({ kind: 'capture', onLog: (r) => records.push(r) });

        const host = new Seedcord(config());
        host.attach('failing', FailsReadyOnce);
        live = host;
        await expect(host.start()).rejects.toThrow();

        records.length = 0;
        new Logger('X').info('after the failure');
        handle.dispose();

        expect(records).toHaveLength(1);
    });

    it('rejects a restart of a failed host, the rollback removed its signal handlers', async () => {
        await bindEnv();

        const host = new Seedcord(config());
        host.attach('failing', FailsReadyOnce);
        live = host;
        await expect(host.start()).rejects.toThrow();

        // ready resolves from here on, so only the restart guard can reject this
        await expect(host.start()).rejects.toThrow(/new instance/);

        const fresh = new Seedcord(config());
        live = fresh;
        expect(fresh).toBeInstanceOf(Seedcord);
    });
});
