import { HmrManager } from '@seedcord/core/internal';
import { SubscriberLoader } from '@seedcord/core/node/internal';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { Seedcord } from '#src/Seedcord';
import { seedcordPath } from '#tests/utils/source-path';
import { testConfig } from '#tests/utils/test-config';
import { TestEnvironment } from '#tests/utils/test-env';

import '#tests/utils/mock-env';

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

// Seedcord builds the same loader from its config
function loaderOf(instance: Seedcord): SubscriberLoader {
    return new SubscriberLoader(instance.bus, instance.config.subscribers.path);
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
        await loaderOf(seedcord).init();

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
        const loader = loaderOf(seedcord);
        await loader.init();

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

        await loader.onHmr({
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

        const register = vi.spyOn(HmrManager.prototype, 'register');
        seedcord = new Seedcord(config);
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
