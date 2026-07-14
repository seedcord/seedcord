import { TextDisplayBuilder } from '@discordjs/builders';
import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { MessageFlags } from 'discord.js';
import { describe, expect, it } from 'vitest';

import { ButtonHandler } from '@handlers/interaction/components/ButtonHandler';
import { ModalHandler } from '@handlers/interaction/components/ModalHandler';
import { SlashHandler } from '@handlers/interaction/SlashHandler';

import { mockInteraction, message } from '../utils/senderMock';

import type { ModalLike } from '@bot/ReplySender';
import type { Core } from '@interfaces/Core';
import type { ButtonInteraction, ChatInputCommandInteraction, ModalSubmitInteraction } from 'discord.js';

// justified: the fixture implements only the interaction surface the sender reads, cached-cache matches the base generic
type Slash = ChatInputCommandInteraction<'cached'>;
type Button = ButtonInteraction<'cached'>;
type Modal = ModalSubmitInteraction<'cached'>;

// justified: the bases read only the interaction and a Logger name off core, the rest of Core is unused here.
const core = {} as Core;

const reply = { components: [new TextDisplayBuilder().setContent('hi')] };
const serialized = reply.components.map((c) => c.toJSON());
const modal: ModalLike = { toJSON: () => ({ title: 'x', custom_id: 'y', components: [] }) };

// a command interaction carries no source message, so it seeds unacked and rejects update
const commandFlags = { isMessageComponent: false, isModalSubmit: false } as const;

describe('SlashHandler base', () => {
    class Ban extends SlashHandler<never> {
        async execute(): Promise<void> {
            await this.reply(reply);
        }
    }

    it('routes reply through the sender to a type 4 reply with withResponse', async () => {
        const mock = mockInteraction(commandFlags);
        await new Ban(mock as unknown as Slash, core).execute();

        const options = mock.reply.mock.calls[0]?.[0] as { withResponse?: boolean; flags?: number };
        expect(mock.reply).toHaveBeenCalledOnce();
        expect(options.withResponse).toBe(true);
        expect(options.flags).toBe(MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral);
    });

    it('exposes showModal on a non-modal repliable kind', async () => {
        class Open extends SlashHandler<never> {
            async execute(): Promise<void> {
                await this.showModal(modal);
            }
        }
        const mock = mockInteraction(commandFlags);
        await new Open(mock as unknown as Slash, core).execute();

        expect(mock.showModal).toHaveBeenCalledWith({ title: 'x', custom_id: 'y', components: [] });
    });
});

describe('ButtonHandler base', () => {
    class Page extends ButtonHandler<never> {
        async execute(): Promise<void> {
            await this.update(reply);
        }
    }

    it('routes update through the sender to interaction.update', async () => {
        const mock = mockInteraction();
        await new Page(mock as unknown as Button, core).execute();

        const options = mock.update.mock.calls[0]?.[0] as { components?: unknown[]; withResponse?: boolean };
        expect(mock.update).toHaveBeenCalledOnce();
        expect(options.withResponse).toBe(true);
        expect(options.components).toEqual(serialized);
    });

    it('opens a modal from a button', async () => {
        class Opens extends ButtonHandler<never> {
            async execute(): Promise<void> {
                await this.showModal(modal);
            }
        }
        const mock = mockInteraction();
        await new Opens(mock as unknown as Button, core).execute();
        expect(mock.showModal).toHaveBeenCalledOnce();
    });
});

describe('showModal kind gating', () => {
    it('rejects showModal on the modal kind at compile time', () => {
        class Blocked extends ModalHandler<never> {
            async execute(): Promise<void> {
                // @ts-expect-error a modal cannot open another modal
                await this.showModal(modal);
            }
        }
        expect(Blocked).toBeDefined();
    });

    it('keeps showModal on the button kind', () => {
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
            await this.update(reply);
        }
    }

    it('inherits update and rejects a command-opened modal with 1504 before any djs call', async () => {
        // a modal opened from a command has no source message, so update throws through the sender's narrowing
        const mock = mockInteraction({ isMessageComponent: false, isModalSubmit: true, isFromMessage: false });

        await expect(new Save(mock as unknown as Modal, core).execute()).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyUpdateWithoutSource)
        );
        expect(mock.update).not.toHaveBeenCalled();
    });

    it('updates a message-opened modal through the sender', async () => {
        const mock = mockInteraction({ isMessageComponent: false, isModalSubmit: true, isFromMessage: true });
        await new Save(mock as unknown as Modal, core).execute();
        expect(mock.update).toHaveBeenCalledOnce();
    });
});

describe('reply returns', () => {
    it('resolves the created message off the withResponse callback', async () => {
        class Ban extends SlashHandler<never> {
            async execute(): Promise<void> {
                const sent = await this.reply(reply);
                expect(sent).toBe(message);
            }
        }
        const mock = mockInteraction(commandFlags);
        await new Ban(mock as unknown as Slash, core).execute();
    });
});
