import { REST } from '@discordjs/rest';
import { Logger } from '@seedcord/logger';
import { ComponentType } from 'discord-api-types/v10';
import { Envapter, FileSource, PortableSource } from 'envapt';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { PublishDefault } from '#src/subscribers/publishDefault';
import { WebhookLog } from '#subscribers/bases/WebhookLog';
import { Bus } from '#subscribers/Bus';
import { Subscribe } from '#subscribers/decorators/Subscribe';
import { WebhookUrl } from '#subscribers/decorators/WebhookUrl';
import { RegisterSubscriber } from '#subscribers/slots';

import type { CoreBase } from '#interfaces/CoreBase';
import type { WebhookReport } from '#subscribers/bases/WebhookLog';
import type { AllSubscriptions } from '#subscribers/types/Subscriptions';
import type { APIMessageTopLevelComponent } from 'discord-api-types/v10';

// envapt snapshots process.env on its first read, before any test runs
const WEBHOOK_ENV = vi.hoisted(() => {
    const env = {
        REPORTER_WEBHOOK_URL: 'https://discord.com/api/webhooks/77/tok-en'
    };
    Object.assign(process.env, env);
    return env;
});

afterAll(() => {
    for (const key of Object.keys(WEBHOOK_ENV)) Reflect.deleteProperty(process.env, key);
});

// justified: report() under test ignores the payload
const data = {} as unknown as AllSubscriptions['unknownException'];
// justified: WebhookLog reads only rest off the core
const core = { rest: new REST() } as unknown as CoreBase;

// the throttle keys on the core
const freshCore = (): CoreBase => ({ rest: new REST() }) as unknown as CoreBase;

interface SentBody {
    body: { username: string; avatar_url?: string };
}

const component = { toJSON: (): APIMessageTopLevelComponent => ({ type: ComponentType.Container, components: [] }) };

let post: MockInstance<REST['post']>;

beforeEach(() => {
    post = vi.spyOn(REST.prototype, 'post');
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('WebhookLog', () => {
    it('sends the report to the url from the decorated env key', async () => {
        @Subscribe(['unknownException'])
        @WebhookUrl('REPORTER_WEBHOOK_URL')
        class CustomReporter extends WebhookLog<'unknownException', CoreBase> {
            report(): WebhookReport {
                return { username: 'Custom', components: [component] };
            }
        }

        await new CustomReporter(data, core, 'unknownException').execute();

        const [route, options] = post.mock.calls[0] as [string, { body: { username: string } }];
        expect(route).toBe('/webhooks/77/tok-en');
        expect(options.body.username).toBe('Custom');
    });

    it('defaults the username to the class name', async () => {
        @Subscribe(['unknownException'])
        @WebhookUrl('REPORTER_WEBHOOK_URL')
        class NamedReporter extends WebhookLog<'unknownException', CoreBase> {
            report(): WebhookReport {
                return { components: [component] };
            }
        }

        await new NamedReporter(data, core, 'unknownException').execute();

        const [, options] = post.mock.calls[0] as [string, { body: { username: string } }];
        expect(options.body.username).toBe('NamedReporter');
    });

    it('sends the avatar url only when the report carries one', async () => {
        @Subscribe(['unknownException'])
        @WebhookUrl('REPORTER_WEBHOOK_URL')
        class Faced extends WebhookLog<'unknownException', CoreBase> {
            report(): WebhookReport {
                return { avatarUrl: 'https://cdn.example/av.png', components: [component] };
            }
        }

        @Subscribe(['unknownException'])
        @WebhookUrl('REPORTER_WEBHOOK_URL')
        class Plain extends WebhookLog<'unknownException', CoreBase> {
            report(): WebhookReport {
                return { components: [component] };
            }
        }

        await new Faced(data, freshCore(), 'unknownException').execute();
        await new Plain(data, freshCore(), 'unknownException').execute();

        const bodies = post.mock.calls.map(([, options]) => (options as SentBody).body);
        expect(bodies[0]?.avatar_url).toBe('https://cdn.example/av.png');
        expect(bodies[1]).not.toHaveProperty('avatar_url');
    });

    it('logs a send failure and resolves', async () => {
        @Subscribe(['unknownException'])
        @WebhookUrl('REPORTER_WEBHOOK_URL')
        class FailingReporter extends WebhookLog<'unknownException', CoreBase> {
            report(): WebhookReport {
                return { components: [] };
            }
        }

        post.mockRejectedValueOnce(new Error('down'));
        const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

        await expect(new FailingReporter(data, core, 'unknownException').execute()).resolves.toBeUndefined();
        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
    });

    it('warns once at registration and never registers a reporter whose env var is unset', () => {
        @Subscribe(['unknownException'], ['handledException'])
        @WebhookUrl('NEVER_SET_WEBHOOK_URL')
        class UnsetReporter extends WebhookLog<'unknownException' | 'handledException', CoreBase> {
            report(): WebhookReport {
                return { components: [] };
            }
        }

        const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
        const bus = new Bus(core);

        bus[RegisterSubscriber](UnsetReporter);
        bus[PublishDefault]('unknownException', data);

        expect(warnSpy).toHaveBeenCalledOnce();
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('UnsetReporter'));
        expect(post).not.toHaveBeenCalled();
        warnSpy.mockRestore();
    });

    it('sends every event when the reporter leaves the throttle key unset', async () => {
        @Subscribe(['unknownException'])
        @WebhookUrl('REPORTER_WEBHOOK_URL')
        class Chatty extends WebhookLog<'unknownException', CoreBase> {
            report(): WebhookReport {
                return { components: [component] };
            }
        }

        const own = freshCore();
        await new Chatty(data, own, 'unknownException').execute();
        await new Chatty(data, own, 'unknownException').execute();

        expect(post).toHaveBeenCalledTimes(2);
    });

    it('puts the suppressed count on the next card', async () => {
        @Subscribe(['unknownException'])
        @WebhookUrl('REPORTER_WEBHOOK_URL')
        class Grouped extends WebhookLog<'unknownException', CoreBase> {
            protected override throttleKey(): string {
                return 'grouped';
            }

            report(suppressed: number): WebhookReport {
                return { username: `n=${suppressed}`, components: [component] };
            }
        }

        const own = freshCore();
        vi.useFakeTimers();
        await new Grouped(data, own, 'unknownException').execute();
        await new Grouped(data, own, 'unknownException').execute();
        vi.advanceTimersByTime(61_000);
        await new Grouped(data, own, 'unknownException').execute();
        vi.useRealTimers();

        const sent = post.mock.calls.map(([, options]) => (options as SentBody).body.username);
        expect(sent).toEqual(['n=0', 'n=1']);
    });

    it('waits out the window after a failed send, carrying the lost card into the next one', async () => {
        @Subscribe(['unknownException'])
        @WebhookUrl('REPORTER_WEBHOOK_URL')
        class Retried extends WebhookLog<'unknownException', CoreBase> {
            protected override throttleKey(): string {
                return 'retried';
            }

            report(suppressed: number): WebhookReport {
                return { username: `n=${suppressed}`, components: [component] };
            }
        }

        const own = freshCore();
        const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
        post.mockRejectedValueOnce(new Error('down'));

        vi.useFakeTimers();
        await new Retried(data, own, 'unknownException').execute();
        await new Retried(data, own, 'unknownException').execute();
        vi.advanceTimersByTime(61_000);
        await new Retried(data, own, 'unknownException').execute();
        vi.useRealTimers();

        const sent = post.mock.calls.map(([, options]) => (options as SentBody).body.username);
        expect(sent).toEqual(['n=0', 'n=2']);
        errorSpy.mockRestore();
    });

    it('counts a card that report threw on, so the next one carries it', async () => {
        let calls = 0;

        @Subscribe(['unknownException'])
        @WebhookUrl('REPORTER_WEBHOOK_URL')
        class Flaky extends WebhookLog<'unknownException', CoreBase> {
            protected override throttleKey(): string {
                return 'flaky';
            }

            report(suppressed: number): WebhookReport {
                calls += 1;
                if (calls === 1) throw new Error('render blew up');
                return { username: `n=${suppressed}`, components: [component] };
            }
        }

        const own = freshCore();
        const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

        vi.useFakeTimers();
        await new Flaky(data, own, 'unknownException').execute();
        vi.advanceTimersByTime(61_000);
        await new Flaky(data, own, 'unknownException').execute();
        vi.useRealTimers();

        const sent = post.mock.calls.map(([, options]) => (options as SentBody).body.username);
        expect(sent).toEqual(['n=1']);
        errorSpy.mockRestore();
    });

    it('throws at execute when the decorator is missing', async () => {
        @Subscribe(['unknownException'])
        // eslint-disable-next-line @seedcord/subscriber-missing-decorators -- the missing @WebhookUrl is the case under test
        class UndeclaredReporter extends WebhookLog<'unknownException', CoreBase> {
            report(): WebhookReport {
                return { components: [] };
            }
        }

        await expect(new UndeclaredReporter(data, core, 'unknownException').execute()).rejects.toThrow();
    });
});

describe('WebhookLog.urlOf', () => {
    afterEach(() => Envapter.useSource(new FileSource()));

    const urlFor = (value: string): string | null => {
        Envapter.useSource(new PortableSource({ URL_UNDER_TEST: value }));
        return WebhookLog.urlOf('URL_UNDER_TEST');
    };

    it.each(['', '   '])('returns null for %j', (value) => {
        expect(urlFor(value)).toBeNull();
    });

    it('returns the trimmed url', () => {
        expect(urlFor('  https://discord.com/api/webhooks/1/aaa  ')).toBe('https://discord.com/api/webhooks/1/aaa');
    });
});
