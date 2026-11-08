import { HmrManager, PublishDefault, RegisteredCount, SubscriberLoader } from '@seedcord/core/internal';
import { describe, expect, afterEach, vi } from 'vite-plus/test';

import { Seedcord } from '#src/Seedcord';
import { seedcordPath } from '#tests/utils/source-path';
import { testConfig } from '#tests/utils/test-config';
import { it } from '#tests/utils/test-env';

import type { HmrUpdateEvent } from '@seedcord/types';
import type { Interaction } from 'discord.js';

// UnknownException and HandledException
const DEFAULT_SUBSCRIBERS = 2;
const RUNS_SLOT = '__seedcordBusTestRuns';

interface PrivateHmrManager {
    handleUpdate(event: HmrUpdateEvent): Promise<void>;
}

// Seedcord builds the same loader from its config
function loaderOf(instance: Seedcord): SubscriberLoader {
    return new SubscriberLoader(instance.bus, instance.config.subscribers.path);
}

function fixtureRecording(label: string): string {
    return `
            import { Subscriber, Subscribe } from '${seedcordPath}';

            @Subscribe(['anyInteraction'])
            export class LogSubscriber extends Subscriber {
                public async execute() {
                    globalThis.${RUNS_SLOT}.push('${label}');
                }
            }
            `;
}

describe('Bus Integration', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should load subscribers from directory', async ({ testEnv }) => {
        const subscribersDir = 'subscribers';
        await testEnv.createFile(
            `${subscribersDir}/LogSubscriber.ts`,
            `
            import { Subscriber, Subscribe } from '${seedcordPath}';

            @Subscribe(['unknownException'])
            export class LogSubscriber extends Subscriber {
                public async execute() {
                    console.log('Subscriber executed');
                }
            }
            `
        );

        const config = testConfig({ subscribers: testEnv.resolvePath(subscribersDir) });

        await using seedcord = new Seedcord(config);
        // subscribers load in Configuration. Login rejects later without a real token
        await seedcord.start().catch(() => undefined);

        expect(seedcord.bus[RegisteredCount]).toBe(DEFAULT_SUBSCRIBERS + 1);
    });

    it('should handle HMR updates for subscribers', async ({ testEnv }) => {
        const runs: string[] = [];
        Reflect.set(globalThis, RUNS_SLOT, runs);
        using _runsSlot = { [Symbol.dispose]: () => Reflect.deleteProperty(globalThis, RUNS_SLOT) };
        const subscribersDir = 'subscribers';
        const filePath = await testEnv.createFile(`${subscribersDir}/LogSubscriber.ts`, fixtureRecording('before'));

        const config = testConfig({ subscribers: testEnv.resolvePath(subscribersDir) });

        await using seedcord = new Seedcord(config);
        const loader = loaderOf(seedcord);
        await loader.init();
        // justified: the fixture subscriber ignores the payload
        const interaction = {} as Interaction;
        const publish = (): boolean => seedcord.bus[PublishDefault]('anyInteraction', { interaction });

        publish();
        await vi.waitFor(() => expect(runs).toEqual(['before']));
        runs.length = 0;

        await testEnv.createFile(`${subscribersDir}/LogSubscriber.ts`, fixtureRecording('after'));
        await loader.onHmr({ file: filePath, type: 'update' });

        expect(seedcord.bus[RegisteredCount]).toBe(DEFAULT_SUBSCRIBERS + 1);
        publish();
        await vi.waitFor(() => expect(runs).toEqual(['after']));
    });

    it('runs a subscriber once per event when a barrel re-exports it', async ({ testEnv }) => {
        const runs: string[] = [];
        Reflect.set(globalThis, RUNS_SLOT, runs);
        using _runsSlot = { [Symbol.dispose]: () => Reflect.deleteProperty(globalThis, RUNS_SLOT) };
        await testEnv.createFile('subscribers/LogSubscriber.ts', fixtureRecording('run'));
        await testEnv.createFile('subscribers/index.ts', `export { LogSubscriber } from './LogSubscriber';\n`);

        await using seedcord = new Seedcord(testConfig({ subscribers: testEnv.resolvePath('subscribers') }));
        await loaderOf(seedcord).init();
        // justified: the fixture subscriber ignores the payload
        seedcord.bus[PublishDefault]('anyInteraction', { interaction: {} as Interaction });

        await vi.waitFor(() => expect(runs).toEqual(['run']));
    });

    it('registers the Bus with the HMR manager, so an update dispatch reaches it', async ({ testEnv }) => {
        const subscribersDir = 'subscribers';
        const filePath = await testEnv.createFile(
            `${subscribersDir}/LogSubscriber.ts`,
            `
            import { Subscriber, Subscribe } from '${seedcordPath}';

            @Subscribe(['unknownException'])
            export class LogSubscriber extends Subscriber {
                public async execute() {
                    console.log('Subscriber executed');
                }
            }
            `
        );

        const config = testConfig({ subscribers: testEnv.resolvePath(subscribersDir) });

        const register = vi.spyOn(HmrManager.prototype, 'register');
        await using seedcord = new Seedcord(config);
        // hmr registration runs in Configuration. Login rejects later without a real token
        await seedcord.start().catch(() => undefined);

        // justified: only the vite dev channel calls the private handleUpdate
        const hmrManager = register.mock.contexts[0] as PrivateHmrManager;
        const subscribers = register.mock.calls.map(([module]) => module).find((m) => m instanceof SubscriberLoader)!;
        const onHmr = vi.spyOn(subscribers, 'onHmr');
        const event: HmrUpdateEvent = { file: filePath, type: 'update' };
        await hmrManager.handleUpdate(event);

        expect(onHmr).toHaveBeenCalledWith(event);
    });
});
