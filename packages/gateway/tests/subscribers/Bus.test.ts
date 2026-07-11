import path from 'node:path';

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { Seedcord } from '../../src/Seedcord';
import { testConfig } from '../utils/test-config';
import { TestEnvironment } from '../utils/test-env';

import '../utils/mock-client';
import '../utils/mock-env';

import type { HmrUpdateEvent } from '@seedcord/types';

const seedcordPath = path.resolve(__dirname, '../../src/index').replaceAll('\\', '/');

interface RegisteredSubscriberHandlerEntry {
    ctor: new (...args: unknown[]) => unknown;
    frequency: string;
}

interface PrivateBus {
    subscribersMap: Map<string, RegisteredSubscriberHandlerEntry[]>;
}

interface PrivateHmrManager {
    handleUpdate(event: HmrUpdateEvent): Promise<void>;
}

interface PrivateSeedcordHmr {
    hmrManager: PrivateHmrManager;
}

describe('Bus Integration', () => {
    let testEnv: TestEnvironment;
    let seedcord: Seedcord;

    beforeEach(async () => {
        // @ts-expect-error: Accessing private method for testing
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
        await seedcord.bus.init();

        // justified: PrivateBus exposes the private subscribersMap for assertion
        const controller = seedcord.bus as unknown as PrivateBus;
        // unknownException has a default handler (UnknownException), plus our custom one = 2
        expect(controller.subscribersMap.get('unknownException')).toHaveLength(2);
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
        await seedcord.bus.init();

        // justified: PrivateBus exposes the private subscribersMap for assertion
        let controller = seedcord.bus as unknown as PrivateBus;
        const handlersBefore = controller.subscribersMap.get('unknownException');

        expect(handlersBefore).toHaveLength(2);
        const customHandlerBefore = handlersBefore?.[1]?.ctor;

        // Simulate HMR update: Change subscriber implementation
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

        await seedcord.bus.onHmr({
            file: filePath,
            type: 'update'
        });

        // justified: re-cast after HMR to read fresh subscribersMap state
        controller = seedcord.bus as unknown as PrivateBus;
        const handlersAfter = controller.subscribersMap.get('unknownException');

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

        const onHmr = vi.spyOn(seedcord.bus, 'onHmr');
        const event: HmrUpdateEvent = { file: filePath, type: 'update' };
        // justified: reach the private hmrManager to assert the Bus is wired into HMR dispatch
        const { hmrManager } = seedcord as unknown as PrivateSeedcordHmr;
        await hmrManager.handleUpdate(event);

        expect(onHmr).toHaveBeenCalledWith(event);
    });
});
