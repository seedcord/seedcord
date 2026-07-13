import { TextDisplayBuilder } from '@discordjs/builders';
import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it, vi } from 'vitest';

import { ButtonHandler } from '@handlers/interaction/components/ButtonHandler';
import { ModalHandler } from '@handlers/interaction/components/ModalHandler';
import { SlashHandler } from '@handlers/interaction/SlashHandler';

import type { REST } from '@discordjs/rest';
import type { Core } from '@interfaces/Core';
import type {
    APIChatInputApplicationCommandInteraction,
    APIMessageComponentButtonInteraction,
    APIModalSubmitInteraction
} from 'discord-api-types/v10';

const CALLBACK_ROUTE = '/interactions/int-1/tok/callback';
const ORIGINAL_ROUTE = '/webhooks/app-1/tok/messages/@original';

const created = { id: 'm-1' };
const withResponse = { resource: { message: created } };

function restMock(): { post: ReturnType<typeof vi.fn>; patch: ReturnType<typeof vi.fn> } {
    return { post: vi.fn().mockResolvedValue(withResponse), patch: vi.fn().mockResolvedValue(created) };
}

function coreWith(rest: ReturnType<typeof restMock>): Core {
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
