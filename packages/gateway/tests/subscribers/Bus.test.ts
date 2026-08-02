import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { Seedcord } from '@src/Seedcord';

import { seedcordPath } from '../utils/source-path';
import { testConfig } from '../utils/test-config';
import { TestEnvironment } from '../utils/test-env';

import '../utils/mock-env';

import type { HmrUpdateEvent } from '@seedcord/types';

interface Registration {
    ctor?: (new (...args: unknown[]) => unknown) | undefined;
    frequency: string;
}

interface PrivateBus {
    subscribersMap: Map<string, Registration[]>;
}

interface PrivateHmrManager {
    handleUpdate(event: HmrUpdateEvent): Promise<void>;
}

interface PrivateSeedcordInternals {
    hmrManager: PrivateHmrManager;
    subscribers: { init(): Promise<void>; onHmr(event: HmrUpdateEvent): Promise<void> };
}

// justified: the loader is private on the host, and it runs discovery and hot reload
function internalsOf(instance: Seedcord): PrivateSeedcordInternals {
    return instance as unknown as PrivateSeedcordInternals;
}

// justified: PrivateBus exposes the private subscribersMap for assertion
function registrationsOf(instance: Seedcord, key: string): Registration[] | undefined {
    return (instance.bus as unknown as PrivateBus).subscribersMap.get(key);
}

describe('Bus Integration', () => {
    let testEnv: TestEnvironment;
    let seedcord: Seedcord;

    beforeEach(async () => {
        // @ts-expect-error reset the Seedcord singleton between tests
        Seedcord.reset();
        testEnv = new TestEnvironment('subscribers-test-');
        await testEnv.setup();
    });

    afterEach(async () => {
        await testEnv.teardown();
        vi.clearAllMocks();
    });

    it('should load subscribers from directory', async () => {
        const subscribersDir = 'subscribers';
        await testEnv.createFile(
            `${subscribersDir}/LogSubscriber.ts`,
            `
            import { Subscriber, Subscribe } from '${seedcordPath}';

            @Subscribe('unknownException')
            export class LogSubscriber extends Subscriber {
                public async execute() {
                    console.log('Subscriber executed');
                }
            }
            `
        );

        const config = testConfig({ subscribers: testEnv.resolvePath(subscribersDir) });

        seedcord = new Seedcord(config);
        await internalsOf(seedcord).subscribers.init();

        // unknownException has a default handler (UnknownException), plus our custom one = 2
        expect(registrationsOf(seedcord, 'unknownException')).toHaveLength(2);
    });

    it('should handle HMR updates for subscribers', async () => {
        const subscribersDir = 'subscribers';
        const filePath = await testEnv.createFile(
            `${subscribersDir}/LogSubscriber.ts`,
            `
            import { Subscriber, Subscribe } from '${seedcordPath}';

            @Subscribe('unknownException')
            export class LogSubscriber extends Subscriber {
                public async execute() {
                    console.log('Subscriber executed');
                }
            }
            `
        );

        const config = testConfig({ subscribers: testEnv.resolvePath(subscribersDir) });

        seedcord = new Seedcord(config);
        await internalsOf(seedcord).subscribers.init();

        const handlersBefore = registrationsOf(seedcord, 'unknownException');

        expect(handlersBefore).toHaveLength(2);
        const customHandlerBefore = handlersBefore?.[1]?.ctor;

        await testEnv.createFile(
            `${subscribersDir}/LogSubscriber.ts`,
            `
            import { Subscriber, Subscribe } from '${seedcordPath}';

            @Subscribe('unknownException')
            export class LogSubscriber extends Subscriber {
                public async execute() {
                    console.log('Subscriber updated');
                }
            }
            `
        );

        await internalsOf(seedcord).subscribers.onHmr({
            file: filePath,
            type: 'update'
        });

        const handlersAfter = registrationsOf(seedcord, 'unknownException');

        expect(handlersAfter).toHaveLength(2);
        const customHandlerAfter = handlersAfter?.[1]?.ctor;
        expect(customHandlerAfter).not.toBe(customHandlerBefore);
        expect(customHandlerAfter?.name).toBe('LogSubscriber');
    });

    it('registers the Bus with the HMR manager, so an update dispatch reaches it', async () => {
        const subscribersDir = 'subscribers';
        const filePath = await testEnv.createFile(
            `${subscribersDir}/LogSubscriber.ts`,
            `
            import { Subscriber, Subscribe } from '${seedcordPath}';

            @Subscribe('unknownException')
            export class LogSubscriber extends Subscriber {
                public async execute() {
                    console.log('Subscriber executed');
                }
            }
            `
        );

        const config = testConfig({ subscribers: testEnv.resolvePath(subscribersDir) });

        seedcord = new Seedcord(config);
        // HMR registration runs in the Configuration phase, before Bot Init (which needs a real token
        // the test env omits), so let the later phase fail, the wiring we assert has already run
        await seedcord.startup.run().catch(() => undefined);

        const { hmrManager, subscribers } = internalsOf(seedcord);
        const onHmr = vi.spyOn(subscribers, 'onHmr');
        const event: HmrUpdateEvent = { file: filePath, type: 'update' };
        await hmrManager.handleUpdate(event);

        expect(onHmr).toHaveBeenCalledWith(event);
    });
});
