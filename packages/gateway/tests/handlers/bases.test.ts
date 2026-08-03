import { TextDisplayBuilder } from '@discordjs/builders';
import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { MessageFlags } from 'discord.js';
import { describe, expect, it } from 'vitest';

import { ButtonHandler } from '@handlers/interaction/components/ButtonHandler';
import { ModalHandler } from '@handlers/interaction/components/ModalHandler';
import { SlashHandler } from '@handlers/interaction/SlashHandler';

import { mockInteraction, message } from '../utils/senderMock';

import type { SentMessage } from '@bot/ReplySender';
import type { Core } from '@interfaces/Core';
import type { ModalLike } from '@seedcord/core/internal';
import type { ButtonInteraction, ChatInputCommandInteraction, ModalSubmitInteraction } from 'discord.js';

type Slash = ChatInputCommandInteraction<'cached'>;
type Button = ButtonInteraction<'cached'>;
type Modal = ModalSubmitInteraction<'cached'>;

// justified: the fixture implements only the interaction surface the sender reads, cached-cache matches the base generic
function asSlash(mock: ReturnType<typeof mockInteraction>): Slash {
    return mock as unknown as Slash;
}
function asButton(mock: ReturnType<typeof mockInteraction>): Button {
    return mock as unknown as Button;
}
function asModal(mock: ReturnType<typeof mockInteraction>): Modal {
    return mock as unknown as Modal;
}

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
        await new Ban(asSlash(mock), core).execute();

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
        await new Open(asSlash(mock), core).execute();

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
        await new Page(asButton(mock), core).execute();

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
        await new Opens(asButton(mock), core).execute();
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

    it('rejects update on a command-opened modal before any djs call', async () => {
        const mock = mockInteraction({ isMessageComponent: false, isModalSubmit: true, isFromMessage: false });

        await expect(new Save(asModal(mock), core).execute()).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyUpdateWithoutSource)
        );
        expect(mock.update).not.toHaveBeenCalled();
    });

    it('updates a message-opened modal through the sender', async () => {
        const mock = mockInteraction({ isMessageComponent: false, isModalSubmit: true, isFromMessage: true });
        await new Save(asModal(mock), core).execute();
        expect(mock.update).toHaveBeenCalledOnce();
    });

    it('rejects deferUpdate on a command-opened modal before any djs call', async () => {
        class Ack extends ModalHandler<never> {
            async execute(): Promise<void> {
                await this.deferUpdate();
            }
        }
        const mock = mockInteraction({ isMessageComponent: false, isModalSubmit: true, isFromMessage: false });

        await expect(new Ack(asModal(mock), core).execute()).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyUpdateWithoutSource)
        );
        expect(mock.deferUpdate).not.toHaveBeenCalled();
    });

    // the missing source outranks the ack state, matching http where the handler checks before the sender runs
    it('names the missing source on a command-opened modal that already replied', async () => {
        const mock = mockInteraction({
            isMessageComponent: false,
            isModalSubmit: true,
            isFromMessage: false,
            replied: true
        });

        await expect(new Save(asModal(mock), core).execute()).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyUpdateWithoutSource)
        );
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
        await new Ban(asSlash(mock), core).execute();
    });
});

describe('base member delegation', () => {
    it('routes defer through the sender to deferReply', async () => {
        class Wait extends SlashHandler<never> {
            async execute(): Promise<void> {
                await this.defer();
            }
        }
        const mock = mockInteraction(commandFlags);
        await new Wait(asSlash(mock), core).execute();
        expect(mock.deferReply).toHaveBeenCalledOnce();
    });

    it('routes followUp through the sender to followUp once acked', async () => {
        class After extends SlashHandler<never> {
            async execute(): Promise<void> {
                await this.followUp(reply);
            }
        }
        const mock = mockInteraction({ ...commandFlags, replied: true });
        await new After(asSlash(mock), core).execute();
        expect(mock.followUp).toHaveBeenCalledOnce();
    });

    it('routes the bare edit through the sender to editReply', async () => {
        class Fill extends SlashHandler<never> {
            async execute(): Promise<void> {
                await this.edit(reply);
            }
        }
        const mock = mockInteraction({ ...commandFlags, deferred: true, ephemeral: false });
        await new Fill(asSlash(mock), core).execute();
        expect(mock.editReply).toHaveBeenCalledOnce();
    });

    it('routes the targeted edit through the sender to webhook.editMessage', async () => {
        class Rewrite extends SlashHandler<never> {
            async execute(): Promise<void> {
                const sent = await this.followUp('confirm?');
                await this.edit(sent, 'cancelled');
            }
        }
        const mock = mockInteraction({ ...commandFlags, replied: true });
        mock.followUp.mockResolvedValueOnce({ id: 'earlier-1' });
        await new Rewrite(asSlash(mock), core).execute();
        expect(mock.webhook.editMessage).toHaveBeenCalledWith('earlier-1', expect.anything());
    });

    it('throws ReplyForeignEditTarget through the base for a message the interaction did not send', async () => {
        class Rewrite extends SlashHandler<never> {
            async execute(): Promise<void> {
                // justified: only the id is read from the edit target
                await this.edit({ id: 'foreign-1' } as SentMessage, 'x');
            }
        }
        const mock = mockInteraction({ ...commandFlags, replied: true });
        await expect(new Rewrite(asSlash(mock), core).execute()).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordError', SeedcordErrorCode.ReplyForeignEditTarget)
        );
        expect(mock.webhook.editMessage).not.toHaveBeenCalled();
    });

    it('routes send through the sender to reply on an unacked interaction', async () => {
        class Show extends SlashHandler<never> {
            async execute(): Promise<void> {
                await this.send(reply);
            }
        }
        const mock = mockInteraction(commandFlags);
        await new Show(asSlash(mock), core).execute();
        expect(mock.reply).toHaveBeenCalledOnce();
    });

    it('routes deferUpdate through the sender to deferUpdate on a component kind', async () => {
        class Ack extends ButtonHandler<never> {
            async execute(): Promise<void> {
                await this.deferUpdate();
            }
        }
        const mock = mockInteraction();
        await new Ack(asButton(mock), core).execute();
        expect(mock.deferUpdate).toHaveBeenCalledOnce();
    });

    it('routes the bare delete through the sender to deleteReply', async () => {
        class Remove extends SlashHandler<never> {
            async execute(): Promise<void> {
                await this.delete();
            }
        }
        const mock = mockInteraction({ ...commandFlags, replied: true });
        await new Remove(asSlash(mock), core).execute();
        expect(mock.deleteReply).toHaveBeenCalledWith();
    });

    it('routes the targeted delete through the sender to deleteReply with the target id', async () => {
        class Remove extends SlashHandler<never> {
            async execute(): Promise<void> {
                const sent = await this.followUp('confirm?');
                await this.delete(sent);
            }
        }
        const mock = mockInteraction({ ...commandFlags, replied: true });
        mock.followUp.mockResolvedValueOnce({ id: 'earlier-1' });
        await new Remove(asSlash(mock), core).execute();
        expect(mock.deleteReply).toHaveBeenCalledWith('earlier-1');
    });
});
