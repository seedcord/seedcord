import { DiscordAPIError, REST } from '@discordjs/rest';
import { busLoggerOf, VerifyWebhooks, SubscriberLoader } from '@seedcord/core/internal';
import { describe, expect, afterAll, afterEach, vi, type MockInstance } from 'vitest';

import { Seedcord } from '#src/Seedcord';
import { seedcordPath } from '#tests/utils/source-path';
import { testConfig } from '#tests/utils/test-config';
import { it } from '#tests/utils/test-env';

// Seedcord builds the same loader from its config
function loaderOf(instance: Seedcord): SubscriberLoader {
    return new SubscriberLoader(instance.bus, instance.config.subscribers.path);
}

// envapt snapshots process.env on its first read, before any test runs
const WEBHOOK_ENV = vi.hoisted(() => {
    const env = {
        MALFORMED_REPORTER_WEBHOOK_URL: 'https://example.com/not-a-webhook',
        DUPLICATE_A_WEBHOOK_URL: 'https://discord.com/api/webhooks/9/shared-tok',
        DUPLICATE_B_WEBHOOK_URL: 'https://discord.com/api/webhooks/9/shared-tok',
        // hard-assign the default reporter urls, a shell exporting garbage would change the suite
        UNKNOWN_EXCEPTION_WEBHOOK_URL: 'https://discord.com/api/webhooks/1/aaa',
        HANDLED_EXCEPTION_WEBHOOK_URL: 'https://discord.com/api/webhooks/2/bbb'
    };
    Object.assign(process.env, env);
    return env;
});

// the webhook GET each sender's verify() sends to discord
function discordRejectsWebhookGet(error: Error): MockInstance<REST['get']> {
    return vi.spyOn(REST.prototype, 'get').mockRejectedValue(error);
}

const unknownWebhook = (): DiscordAPIError =>
    new DiscordAPIError({ message: 'Unknown Webhook', code: 10_015 }, 10_015, 404, 'GET', 'url', {});

interface PrivateBus {
    subscribersMap: Map<string, { ctor: unknown }[]>;
}

describe('Bus webhook reporter registration', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    // the setup file sets the default reporter urls again for the next file
    afterAll(() => {
        for (const key of Object.keys(WEBHOOK_ENV)) Reflect.deleteProperty(process.env, key);
    });

    it('warns and skips a reporter whose env var is unset', async ({ testEnv }) => {
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

        await using seedcord = new Seedcord(testConfig({ subscribers: testEnv.resolvePath('subscribers') }));
        const warnSpy = vi.spyOn(busLoggerOf(seedcord.bus), 'warn');
        await loaderOf(seedcord).init();

        // justified: PrivateBus exposes the private subscribersMap for assertion
        const bus = seedcord.bus as unknown as PrivateBus;
        // the default UnknownException only, the url-less reporter is skipped
        expect(bus.subscribersMap.get('unknownException')).toHaveLength(1);
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('UNSET_REPORTER_WEBHOOK_URL'));
    });

    it('throws at boot when a reporter env var is set but malformed', async ({ testEnv }) => {
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

        await using seedcord = new Seedcord(testConfig({ subscribers: testEnv.resolvePath('subscribers') }));
        await expect(loaderOf(seedcord).init()).rejects.toThrow('MALFORMED_REPORTER_WEBHOOK_URL');
    });

    it('throws at verify when a configured webhook does not exist on discord', async () => {
        await using seedcord = new Seedcord(testConfig({}));
        await loaderOf(seedcord).init();

        const get = discordRejectsWebhookGet(unknownWebhook());
        // one boot reports every dead webhook, both default urls are mocked dead here
        await expect(seedcord.bus[VerifyWebhooks]()).rejects.toThrow(
            /UNKNOWN_EXCEPTION_WEBHOOK_URL.+HANDLED_EXCEPTION_WEBHOOK_URL/
        );
        expect(get).toHaveBeenCalledTimes(2);
    });

    it('names every env key behind one dead url at verify', async ({ testEnv }) => {
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

        await using seedcord = new Seedcord(testConfig({ subscribers: testEnv.resolvePath('subscribers') }));
        await loaderOf(seedcord).init();

        discordRejectsWebhookGet(unknownWebhook());
        await expect(seedcord.bus[VerifyWebhooks]()).rejects.toThrow(
            /DUPLICATE_A_WEBHOOK_URL.+DUPLICATE_B_WEBHOOK_URL/
        );
    });

    it('warns and continues when discord is unreachable at verify', async () => {
        await using seedcord = new Seedcord(testConfig({}));
        await loaderOf(seedcord).init();

        discordRejectsWebhookGet(new TypeError('fetch failed'));
        const warnSpy = vi.spyOn(busLoggerOf(seedcord.bus), 'warn');
        await expect(seedcord.bus[VerifyWebhooks]()).resolves.toBeUndefined();
        expect(warnSpy).toHaveBeenCalled();
    });

    it('throws at boot for a WebhookLog subclass without @WebhookUrl', async ({ testEnv }) => {
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

        await using seedcord = new Seedcord(testConfig({ subscribers: testEnv.resolvePath('subscribers') }));
        await expect(loaderOf(seedcord).init()).rejects.toThrow('UndeclaredReporter');
    });
});
