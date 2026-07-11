import { Logger } from '@seedcord/logger';
import { ComponentType } from 'discord-api-types/v10';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { WebhookLog } from '@subscribers/bases/WebhookLog';
import { Subscribe } from '@subscribers/decorators/Subscribe';
import { WebhookUrl } from '@subscribers/decorators/WebhookUrl';

import type { Core } from '@interfaces/Core';
import type { WebhookReport } from '@subscribers/bases/WebhookLog';
import type { AllSubscriptions } from '@subscribers/types/Subscriptions';
import type { APIMessageTopLevelComponent } from 'discord-api-types/v10';

const hoisted = vi.hoisted(() => {
    process.env.REPORTER_WEBHOOK_URL = 'https://discord.com/api/webhooks/77/tok-en';
    process.env.REPORTER_REUSE_WEBHOOK_URL = 'https://discord.com/api/webhooks/88/reuse-tok';
    return { postMock: vi.fn(), restConstructions: { count: 0 } };
});

vi.mock('@discordjs/rest', () => ({
    REST: class {
        post = hoisted.postMock;
        constructor() {
            hoisted.restConstructions.count += 1;
        }
    }
}));

// justified: report() under test ignores the payload
const data = {} as unknown as AllSubscriptions['unknownException'];
// justified: the Subscriber base only stores core
const core = {} as unknown as Core;

const component = { toJSON: (): APIMessageTopLevelComponent => ({ type: ComponentType.Container, components: [] }) };

beforeEach(() => {
    hoisted.postMock.mockReset().mockResolvedValue(undefined);
});

describe('WebhookLog', () => {
    it('sends the report to the url from the decorated env key', async () => {
        @Subscribe('unknownException')
        @WebhookUrl('REPORTER_WEBHOOK_URL')
        class CustomReporter extends WebhookLog<'unknownException'> {
            report(): WebhookReport {
                return { username: 'Custom', components: [component] };
            }
        }

        await new CustomReporter(data, core).execute();

        const [route, options] = hoisted.postMock.mock.calls[0] as [string, { body: { username: string } }];
        expect(route).toBe('/webhooks/77/tok-en');
        expect(options.body.username).toBe('Custom');
    });

    it('defaults the username to the class name', async () => {
        @Subscribe('unknownException')
        @WebhookUrl('REPORTER_WEBHOOK_URL')
        class NamedReporter extends WebhookLog<'unknownException'> {
            report(): WebhookReport {
                return { components: [component] };
            }
        }

        await new NamedReporter(data, core).execute();

        const [, options] = hoisted.postMock.mock.calls[0] as [string, { body: { username: string } }];
        expect(options.body.username).toBe('NamedReporter');
    });

    it('reuses one sender per url across instances', async () => {
        @Subscribe('unknownException')
        @WebhookUrl('REPORTER_REUSE_WEBHOOK_URL')
        class RepeatReporter extends WebhookLog<'unknownException'> {
            report(): WebhookReport {
                return { components: [] };
            }
        }

        const before = hoisted.restConstructions.count;
        await new RepeatReporter(data, core).execute();
        expect(hoisted.restConstructions.count - before).toBe(1);
        await new RepeatReporter(data, core).execute();

        expect(hoisted.postMock).toHaveBeenCalledTimes(2);
        expect(hoisted.restConstructions.count - before).toBe(1);
    });

    it('logs a send failure and resolves', async () => {
        @Subscribe('unknownException')
        @WebhookUrl('REPORTER_WEBHOOK_URL')
        class FailingReporter extends WebhookLog<'unknownException'> {
            report(): WebhookReport {
                return { components: [] };
            }
        }

        hoisted.postMock.mockRejectedValueOnce(new Error('down'));
        const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

        await expect(new FailingReporter(data, core).execute()).resolves.toBeUndefined();
        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
    });

    it('warns and drops the report when the env var is unset', async () => {
        @Subscribe('unknownException')
        @WebhookUrl('NEVER_SET_WEBHOOK_URL')
        class UnsetReporter extends WebhookLog<'unknownException'> {
            report(): WebhookReport {
                return { components: [] };
            }
        }

        const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

        await expect(new UnsetReporter(data, core).execute()).resolves.toBeUndefined();
        expect(hoisted.postMock).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
    });

    it('throws at execute when the decorator is missing', async () => {
        @Subscribe('unknownException')
        // eslint-disable-next-line @seedcord/subscriber-missing-decorators -- the missing @WebhookUrl is the case under test
        class UndeclaredReporter extends WebhookLog<'unknownException'> {
            report(): WebhookReport {
                return { components: [] };
            }
        }

        await expect(new UndeclaredReporter(data, core).execute()).rejects.toThrow();
    });
});
