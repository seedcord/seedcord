import { busLoggerOf } from '@seedcord/core/internal';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { Seedcord } from '#src/Seedcord';

import { seedcordPath } from '../utils/source-path';
import { testConfig } from '../utils/test-config';
import { TestEnvironment } from '../utils/test-env';

// justified: the loader is private on the host, and it runs discovery plus the webhook verify step
function loaderOf(instance: Seedcord): { init(): Promise<void> } {
    return (instance as unknown as { subscribers: { init(): Promise<void> } }).subscribers;
}

const restMocks = vi.hoisted(() => {
    process.env.MALFORMED_REPORTER_WEBHOOK_URL = 'https://example.com/not-a-webhook';
    process.env.DUPLICATE_A_WEBHOOK_URL = 'https://discord.com/api/webhooks/9/shared-tok';
    process.env.DUPLICATE_B_WEBHOOK_URL = 'https://discord.com/api/webhooks/9/shared-tok';
    // hard-assign the default reporter urls, a shell exporting garbage would change the suite
    process.env.UNKNOWN_EXCEPTION_WEBHOOK_URL = 'https://discord.com/api/webhooks/1/aaa';
    process.env.HANDLED_EXCEPTION_WEBHOOK_URL = 'https://discord.com/api/webhooks/2/bbb';
    return { getMock: vi.fn().mockResolvedValue({}), postMock: vi.fn().mockResolvedValue(undefined) };
});

vi.mock('@discordjs/rest', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@discordjs/rest')>()),
    REST: class {
        get = restMocks.getMock;
        post = restMocks.postMock;
    }
}));

interface PrivateBus {
    subscribersMap: Map<string, { ctor: unknown }[]>;
}

describe('Bus webhook reporter registration', () => {
    let testEnv: TestEnvironment;
    let seedcord: Seedcord;

    beforeEach(async () => {
        // @ts-expect-error: Accessing private method for testing
        Seedcord.reset();
        testEnv = new TestEnvironment('webhook-registration-test-');
        await testEnv.setup();
    });

    afterEach(async () => {
        await testEnv.teardown();
        vi.clearAllMocks();
        // clearAllMocks keeps implementations, a rejecting getMock must never leak into the next test
        restMocks.getMock.mockReset().mockResolvedValue({});
    });

    it('warns and skips a reporter whose env var is unset', async () => {
        await testEnv.createFile(
            'subscribers/QuietReporter.ts',
            `
            import { WebhookLog, WebhookUrl, Subscribe } from '${seedcordPath}';

            @Subscribe('unknownException')
            @WebhookUrl('UNSET_REPORTER_WEBHOOK_URL')
            export class QuietReporter extends WebhookLog<'unknownException'> {
                public report() {
                    return { components: [] };
                }
            }
            `
        );

        seedcord = new Seedcord(testConfig({ subscribers: testEnv.resolvePath('subscribers') }));
        const warnSpy = vi.spyOn(busLoggerOf(seedcord.bus), 'warn');
        await loaderOf(seedcord).init();

        // justified: PrivateBus exposes the private subscribersMap for assertion
        const bus = seedcord.bus as unknown as PrivateBus;
        // the default UnknownException only, the url-less reporter is skipped
        expect(bus.subscribersMap.get('unknownException')).toHaveLength(1);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('UNSET_REPORTER_WEBHOOK_URL'));
    });

    it('throws at boot when a reporter env var is set but malformed', async () => {
        await testEnv.createFile(
            'subscribers/BadUrlReporter.ts',
            `
            import { WebhookLog, WebhookUrl, Subscribe } from '${seedcordPath}';

            @Subscribe('unknownException')
            @WebhookUrl('MALFORMED_REPORTER_WEBHOOK_URL')
            export class BadUrlReporter extends WebhookLog<'unknownException'> {
                public report() {
                    return { components: [] };
                }
            }
            `
        );

        seedcord = new Seedcord(testConfig({ subscribers: testEnv.resolvePath('subscribers') }));
        await expect(loaderOf(seedcord).init()).rejects.toThrow('MALFORMED_REPORTER_WEBHOOK_URL');
    });

    it('throws at verify when a configured webhook does not exist on discord', async () => {
        seedcord = new Seedcord(testConfig({}));
        await loaderOf(seedcord).init();

        const { DiscordAPIError } = await import('@discordjs/rest');
        restMocks.getMock.mockRejectedValue(
            new DiscordAPIError({ message: 'Unknown Webhook', code: 10_015 }, 10_015, 404, 'GET', 'url', {})
        );
        // one boot reports every dead webhook, both default urls are mocked dead here
        await expect(seedcord.bus.verifyWebhooks()).rejects.toThrow(
            /UNKNOWN_EXCEPTION_WEBHOOK_URL.+HANDLED_EXCEPTION_WEBHOOK_URL/
        );
    });

    it('names every env key behind one dead url at verify', async () => {
        await testEnv.createFile(
            'subscribers/SharedUrlReporters.ts',
            `
            import { WebhookLog, WebhookUrl, Subscribe } from '${seedcordPath}';

            @Subscribe('unknownException')
            @WebhookUrl('DUPLICATE_A_WEBHOOK_URL')
            export class ReporterA extends WebhookLog<'unknownException'> {
                public report() {
                    return { components: [] };
                }
            }

            @Subscribe('unknownException')
            @WebhookUrl('DUPLICATE_B_WEBHOOK_URL')
            export class ReporterB extends WebhookLog<'unknownException'> {
                public report() {
                    return { components: [] };
                }
            }
            `
        );

        seedcord = new Seedcord(testConfig({ subscribers: testEnv.resolvePath('subscribers') }));
        await loaderOf(seedcord).init();

        const { DiscordAPIError } = await import('@discordjs/rest');
        restMocks.getMock.mockRejectedValue(
            new DiscordAPIError({ message: 'Unknown Webhook', code: 10_015 }, 10_015, 404, 'GET', 'url', {})
        );
        await expect(seedcord.bus.verifyWebhooks()).rejects.toThrow(/DUPLICATE_A_WEBHOOK_URL.+DUPLICATE_B_WEBHOOK_URL/);
    });

    it('warns and continues when discord is unreachable at verify', async () => {
        seedcord = new Seedcord(testConfig({}));
        await loaderOf(seedcord).init();

        restMocks.getMock.mockRejectedValue(new TypeError('fetch failed'));
        const warnSpy = vi.spyOn(busLoggerOf(seedcord.bus), 'warn');
        await expect(seedcord.bus.verifyWebhooks()).resolves.toBeUndefined();
        expect(warnSpy).toHaveBeenCalled();
    });

    it('throws at boot for a WebhookLog subclass without @WebhookUrl', async () => {
        await testEnv.createFile(
            'subscribers/UndeclaredReporter.ts',
            `
            import { WebhookLog, Subscribe } from '${seedcordPath}';

            @Subscribe('unknownException')
            export class UndeclaredReporter extends WebhookLog<'unknownException'> {
                public report() {
                    return { components: [] };
                }
            }
            `
        );

        seedcord = new Seedcord(testConfig({ subscribers: testEnv.resolvePath('subscribers') }));
        await expect(loaderOf(seedcord).init()).rejects.toThrow('UndeclaredReporter');
    });
});
