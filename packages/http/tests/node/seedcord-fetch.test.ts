import path from 'node:path';
import { setTimeout } from 'node:timers/promises';

import { shutdownOf, StartupPhase } from '@seedcord/core/node/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { Envapter, PortableSource } from 'envapt';
import { describe, expect, it } from 'vitest';

import { Seedcord } from '#src/node/Seedcord';
import { signedRequest } from '#tests/helpers/ed25519';
import { VALID_TOKEN } from '#tests/helpers/fixtures';
import { slashPayload } from '#tests/helpers/interactions';
import { bindSignedEnv, serverConfig } from '#tests/helpers/nodeHost';

import { nextSlowGateEntry } from './discovery/fixtures/handlers/SlowGateCommand';
import { drainSlow } from './fixtures/drain-handlers/DrainSlowCommand';

import type { HttpServerConfig } from '#src/interfaces/Config';

const HANDLERS_DIR = path.resolve(__dirname, './discovery/fixtures/handlers');
const DRAIN_HANDLERS_DIR = path.resolve(__dirname, './fixtures/drain-handlers');
const PING = '{"type":1}';
// far longer than verifying one signed ping
const HELD_START_MS = 50;

function config(handlers: string = HANDLERS_DIR): HttpServerConfig {
    return serverConfig({ interactions: { path: handlers } });
}

describe('http Seedcord.fetch on node', () => {
    it('throws before start() is called', async () => {
        const signer = await bindSignedEnv();
        await using host = new Seedcord(config());

        await expect(host.fetch(await signedRequest(signer, PING))).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CoreFetchBeforeStart })
        );
    });

    it('waits for start() before answering', async () => {
        const signer = await bindSignedEnv();
        await using host = new Seedcord(config());
        const order: string[] = [];
        host.startup.addTask(StartupPhase.Ready, 'slow', async () => {
            await setTimeout(HELD_START_MS);
            order.push('started');
        });

        const starting = host.start();
        const response = await host.fetch(await signedRequest(signer, PING));
        order.push('answered');
        await starting;

        expect(order).toEqual(['started', 'answered']);
        expect(response.status).toBe(200);
    });

    it('leaves host.port undefined on port: false', async () => {
        await bindSignedEnv();
        await using host = new Seedcord({ ...config(), port: false });

        await host.start();

        expect(host.port).toBeUndefined();
    });

    it('rejects start() on port: false when DISCORD_PUBLIC_KEY is unset', async () => {
        Envapter.useSource(new PortableSource({ DISCORD_BOT_TOKEN: VALID_TOKEN }));
        await using host = new Seedcord({ ...config(), port: false });

        await expect(host.start()).rejects.toMatchObject({
            code: SeedcordErrorCode.LifecyclePhaseFailures,
            errors: [expect.objectContaining({ code: SeedcordErrorCode.ConfigMissingEnv })]
        });
    });

    it('waits at shutdown for a handler a fetch request started on port: false', async () => {
        const signer = await bindSignedEnv();
        await using host = new Seedcord({ ...config(DRAIN_HANDLERS_DIR), port: false });
        await host.start();

        const response = await host.fetch(await signedRequest(signer, JSON.stringify(slashPayload('drainslow'))));
        expect(response.status).toBe(202);
        expect(drainSlow.finished).toBe(false);

        await shutdownOf(host).run(0, false);

        expect(drainSlow.finished).toBe(true);
    });

    it('finishes shutdown after a fetch request that was still before its 202', async () => {
        const signer = await bindSignedEnv();
        await using host = new Seedcord({ ...config(), port: false });
        await host.start();
        const order: string[] = [];

        const entered = nextSlowGateEntry();
        const answered = host
            .fetch(await signedRequest(signer, JSON.stringify(slashPayload('slowping'))))
            .then(() => order.push('answered'));
        await entered;
        await shutdownOf(host).run(0, false);
        order.push('shut down');
        await answered;

        expect(order).toEqual(['answered', 'shut down']);
    });

    it('answers 503 once shutdown has run', async () => {
        const signer = await bindSignedEnv();
        await using host = new Seedcord({ ...config(), port: false });
        await host.start();

        await shutdownOf(host).run(0, false);
        const response = await host.fetch(await signedRequest(signer, PING));

        expect(response.status).toBe(503);
    });
});
