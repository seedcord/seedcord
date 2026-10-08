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

import { whileGateHolds } from './discovery/fixtures/handlers/SlowGateCommand';
import { nextDrainSlowRun } from './fixtures/drain-handlers/DrainSlowCommand';

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
    it('rejects before start() is called', async () => {
        const signer = await bindSignedEnv();
        await using host = new Seedcord(config());

        await expect(host.fetch(await signedRequest(signer, PING))).rejects.toThrow(
            expect.objectContaining({ code: SeedcordErrorCode.CoreFetchBeforeStart })
        );
    });

    it('waits for start() before answering', async () => {
        const signer = await bindSignedEnv();
        await using host = new Seedcord(config());
        const request = await signedRequest(signer, PING);
        const held = Promise.withResolvers<undefined>();
        host.startup.addTask(StartupPhase.Ready, 'held', () => held.promise);
        const order: string[] = [];

        const starting = host.start();
        const answering = host.fetch(request).then((response) => {
            order.push('answered');
            return response;
        });
        await setTimeout(HELD_START_MS);
        order.push('released');
        held.resolve(undefined);

        const [response] = await Promise.all([answering, starting]);
        expect(response.status).toBe(200);
        expect(order).toEqual(['released', 'answered']);
    });

    it('leaves host.port undefined on port: false', async () => {
        await bindSignedEnv();
        await using host = new Seedcord({ ...config(), port: false });

        await host.start();

        expect(host.port).toBeUndefined();
    });

    it('reads port when start() runs', async () => {
        await bindSignedEnv();
        await using host = new Seedcord(config());
        host.config.port = false;

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

    it('answers 503 after start() fails', async () => {
        const signer = await bindSignedEnv();
        await using host = new Seedcord({ ...config(), port: false });
        host.startup.addTask(StartupPhase.Configuration, 'boom', () => Promise.reject(new Error('boot failed')));
        await expect(host.start()).rejects.toThrow();

        const response = await host.fetch(await signedRequest(signer, PING));

        expect(response.status).toBe(503);
    });

    it('waits at shutdown for a handler a fetch request started on port: false', async () => {
        const signer = await bindSignedEnv();
        await using host = new Seedcord({ ...config(DRAIN_HANDLERS_DIR), port: false });
        await host.start();
        const drainSlow = nextDrainSlowRun();

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

        await whileGateHolds(
            async () => {
                await host.fetch(await signedRequest(signer, JSON.stringify(slashPayload('slowping'))));
                order.push('answered');
            },
            async () => {
                await shutdownOf(host).run(0, false);
                order.push('shut down');
            }
        );

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
