import { TextDisplayBuilder } from '@discordjs/builders';
import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it, vi } from 'vitest';

import { ButtonHandler } from '@handlers/interaction/components/ButtonHandler';
import { ModalHandler } from '@handlers/interaction/components/ModalHandler';
import { SlashHandler } from '@handlers/interaction/SlashHandler';

import type { REST } from '@discordjs/rest';
import type { Core } from '@interfaces/Core';
import type { SentMessage } from '@reply/ReplySender';
import type {
    APIChatInputApplicationCommandInteraction,
    APIMessageComponentButtonInteraction,
    APIModalSubmitInteraction
} from 'discord-api-types/v10';

const CALLBACK_ROUTE = '/interactions/int-1/tok/callback';
const WEBHOOK_ROUTE = '/webhooks/app-1/tok';
const ORIGINAL_ROUTE = '/webhooks/app-1/tok/messages/@original';

const created = { id: 'm-1' };
const withResponse = { resource: { message: created } };

interface RestMock {
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
}

function restMock(): RestMock {
    return {
        post: vi.fn().mockResolvedValue(withResponse),
        patch: vi.fn().mockResolvedValue(created),
        delete: vi.fn().mockResolvedValue(undefined)
    };
}

function coreWith(rest: RestMock): Core {
    // justified: the bases read only core.rest, the rest of Core is unused in these unit tests.
    return { rest: rest as unknown as REST } as unknown as Core;
}

function baseEvent(): { application_id: string; id: string; token: string; type: number } {
    return { application_id: 'app-1', id: 'int-1', token: 'tok', type: 2 };
}

const reply = { components: [new TextDisplayBuilder().setContent('hi')] };
const serialized = reply.components.map((c) => c.toJSON());

describe('SlashHandler base', () => {
    class Ban extends SlashHandler<never> {
        async execute(): Promise<void> {
            await this.reply(reply);
        }
    }

    it('routes reply through the sender to a type 4 callback', async () => {
        const rest = restMock();
        const event = baseEvent() as unknown as APIChatInputApplicationCommandInteraction;

        await new Ban(event, coreWith(rest)).execute();

        const [route, options] = rest.post.mock.calls[0] as [string, { body: { type: number } }];
        expect(route).toBe(CALLBACK_ROUTE);
        expect(options.body.type).toBe(4);
    });

    it('exposes showModal on a non-modal repliable kind', async () => {
        class Open extends SlashHandler<never> {
            async execute(): Promise<void> {
                await this.showModal({ toJSON: () => ({ title: 'x', custom_id: 'y', components: [] }) });
            }
        }
        const rest = restMock();
        const event = baseEvent() as unknown as APIChatInputApplicationCommandInteraction;

        await new Open(event, coreWith(rest)).execute();

        const [, options] = rest.post.mock.calls[0] as [string, { body: { type: number } }];
        expect(options.body.type).toBe(9);
    });
});

describe('ButtonHandler base', () => {
    class Page extends ButtonHandler<never> {
        async execute(): Promise<void> {
            await this.update(reply);
        }
    }

    it('routes update through the sender to a type 7 callback', async () => {
        const rest = restMock();
        const event = baseEvent() as unknown as APIMessageComponentButtonInteraction;

        await new Page(event, coreWith(rest)).execute();

        const [route, options] = rest.post.mock.calls[0] as [
            string,
            { body: { type: number; data: { components: unknown[] } } }
        ];
        expect(route).toBe(CALLBACK_ROUTE);
        expect(options.body.type).toBe(7);
        expect(options.body.data.components).toEqual(serialized);
    });
});

describe('showModal kind gating', () => {
    const modal = {
        toJSON: (): { title: string; custom_id: string; components: never[] } => ({
            title: 'x',
            custom_id: 'y',
            components: []
        })
    };

    it('rejects showModal on the modal kind at compile time', () => {
        class Blocked extends ModalHandler<never> {
            async execute(): Promise<void> {
                // @ts-expect-error a modal cannot open another modal
                await this.showModal(modal);
            }
        }
        expect(Blocked).toBeDefined();
    });

    it('keeps showModal on the component kinds', () => {
        class Opens extends ButtonHandler<never> {
            async execute(): Promise<void> {
                await this.showModal(modal);
            }
        }
        expect(Opens).toBeDefined();
    });
});

describe('ModalHandler base', () => {
    class Save extends ModalHandler<never> {
        async execute(): Promise<void> {
            await this.deferUpdate();
            await this.update(reply);
        }
    }

    it('deferUpdate then update PATCHes @original when the modal was opened from a message', async () => {
        const rest = restMock();
        const event = { ...baseEvent(), message: { id: 'src-1' } } as unknown as APIModalSubmitInteraction;

        await new Save(event, coreWith(rest)).execute();

        expect(rest.post.mock.calls[0]?.[1]).toMatchObject({ body: { type: 6 } });
        expect(rest.patch.mock.calls[0]?.[0]).toBe(ORIGINAL_ROUTE);
    });

    it('throws ReplyUpdateWithoutSource when the modal was opened from a command', async () => {
        const rest = restMock();
        const event = baseEvent() as unknown as APIModalSubmitInteraction;

        await expect(new Save(event, coreWith(rest)).execute()).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyUpdateWithoutSource)
        );
        expect(rest.post).not.toHaveBeenCalled();
    });
});

describe('base member delegation', () => {
    function slashEvent(): APIChatInputApplicationCommandInteraction {
        return baseEvent() as unknown as APIChatInputApplicationCommandInteraction;
    }

    it('routes defer through the sender to a type 5 callback', async () => {
        class Wait extends SlashHandler<never> {
            async execute(): Promise<void> {
                await this.defer();
            }
        }
        const rest = restMock();

        await new Wait(slashEvent(), coreWith(rest)).execute();

        const [route, options] = rest.post.mock.calls[0] as [string, { body: { type: number } }];
        expect(route).toBe(CALLBACK_ROUTE);
        expect(options.body.type).toBe(5);
    });

    it('routes followUp through the sender to the webhook route once acked', async () => {
        class After extends SlashHandler<never> {
            async execute(): Promise<void> {
                await this.reply(reply);
                await this.followUp(reply);
            }
        }
        const rest = restMock();

        await new After(slashEvent(), coreWith(rest)).execute();

        expect(rest.post.mock.calls[1]?.[0]).toBe(WEBHOOK_ROUTE);
    });

    it('routes the bare edit through the sender to PATCH @original', async () => {
        class Fill extends SlashHandler<never> {
            async execute(): Promise<void> {
                await this.defer();
                await this.edit(reply);
            }
        }
        const rest = restMock();

        await new Fill(slashEvent(), coreWith(rest)).execute();

        expect(rest.patch.mock.calls[0]?.[0]).toBe(ORIGINAL_ROUTE);
    });

    it('routes the targeted edit through the sender to the target message route', async () => {
        class Rewrite extends SlashHandler<never> {
            async execute(): Promise<void> {
                await this.reply(reply);
                const sent = await this.followUp('confirm?');
                await this.edit(sent, 'cancelled');
            }
        }
        const rest = restMock();
        rest.post.mockResolvedValueOnce(withResponse).mockResolvedValueOnce({ id: 'earlier-1' });

        await new Rewrite(slashEvent(), coreWith(rest)).execute();

        expect(rest.patch.mock.calls[0]?.[0]).toBe(`${WEBHOOK_ROUTE}/messages/earlier-1`);
    });

    it('throws ReplyForeignEditTarget through the base for a message the interaction did not send', async () => {
        class Rewrite extends SlashHandler<never> {
            async execute(): Promise<void> {
                await this.reply(reply);
                await this.edit({ id: 'foreign-1' } as SentMessage, 'x');
            }
        }
        const rest = restMock();

        await expect(new Rewrite(slashEvent(), coreWith(rest)).execute()).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyForeignEditTarget)
        );
        expect(rest.patch).not.toHaveBeenCalled();
    });

    it('routes send through the sender to a type 4 callback on an unacked interaction', async () => {
        class Show extends SlashHandler<never> {
            async execute(): Promise<void> {
                await this.send(reply);
            }
        }
        const rest = restMock();

        await new Show(slashEvent(), coreWith(rest)).execute();

        const [route, options] = rest.post.mock.calls[0] as [string, { body: { type: number } }];
        expect(route).toBe(CALLBACK_ROUTE);
        expect(options.body.type).toBe(4);
    });

    it('routes the bare delete through the sender to DELETE @original', async () => {
        class Remove extends SlashHandler<never> {
            async execute(): Promise<void> {
                await this.reply(reply);
                await this.delete();
            }
        }
        const rest = restMock();

        await new Remove(slashEvent(), coreWith(rest)).execute();

        expect(rest.delete.mock.calls[0]?.[0]).toBe(ORIGINAL_ROUTE);
    });

    it('routes the targeted delete through the sender to the target message route', async () => {
        class Remove extends SlashHandler<never> {
            async execute(): Promise<void> {
                await this.reply(reply);
                const sent = await this.followUp('confirm?');
                await this.delete(sent);
            }
        }
        const rest = restMock();
        rest.post.mockResolvedValueOnce(withResponse).mockResolvedValueOnce({ id: 'earlier-1' });

        await new Remove(slashEvent(), coreWith(rest)).execute();

        expect(rest.delete.mock.calls[0]?.[0]).toBe(`${WEBHOOK_ROUTE}/messages/earlier-1`);
    });
});
