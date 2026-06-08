import { describe, expect, it } from 'vitest';

import { ButtonRoute, ModalRoute, SelectMenuRoute, SelectMenuType } from '@bDecorators/Interactions';
import { ButtonHandler, CustomId, InvalidCustomId, ModalHandler, SelectHandler, StaleCustomId } from '@customId/index';

import type { Core } from '@interfaces/Core';
import type { ButtonInteraction, ModalSubmitInteraction, UserSelectMenuInteraction } from 'discord.js';

const USER = '853472916483920128';
const GUILD = '697894561234567890';
const ROLE = '912345678901234567';
const MSG = '1284567890123456789';

const core = {} as unknown as Core; // fixture

// the bases read only a couple fields off the event, so a minimal fake per kind is enough.
function button(customId: string): ButtonInteraction<'cached'> {
    return { customId } as unknown as ButtonInteraction<'cached'>; // fixture
}
function modal(customId: string, inputs: Record<string, string>): ModalSubmitInteraction<'cached'> {
    return {
        customId,
        fields: { getTextInputValue: (id: string) => inputs[id] ?? '' }
    } as unknown as ModalSubmitInteraction<'cached'>; // fixture
}
function userSelect(customId: string, values: string[]): UserSelectMenuInteraction<'cached'> {
    return { customId, values } as unknown as UserSelectMenuInteraction<'cached'>; // fixture
}

// a moderation approve button carrying one field of every kind.
const Approve = new CustomId('approve')
    .snowflake('userId')
    .int('caseId')
    .bool('urgent')
    .oneOf('action', ['approve', 'deny'])
    .str('note');

@ButtonRoute(Approve)
class ApproveButton extends ButtonHandler<[typeof Approve]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
    read(): { userId: string; caseId: number; urgent: boolean; action: 'approve' | 'deny'; note: string } {
        return this.params;
    }
}

// a button with no route decorator, to prove the runtime guard fires.
class Undecorated extends ButtonHandler<[typeof Approve]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
    read(): unknown {
        return this.params;
    }
}

// a pager with two routes on one message, dispatched by match().
const Page = new CustomId('page').int('index', 0, 50);
const Jump = new CustomId('jump').snowflake('messageId');

@ButtonRoute(Page, Jump)
class NavButtons extends ButtonHandler<[typeof Page, typeof Jump]> {
    public log = '';
    async execute(): Promise<void> {
        await this.match({
            page: (params) => {
                this.log = `page ${params.index}`;
            },
            jump: async (params) => {
                await Promise.resolve();
                this.log = `jump ${params.messageId}`;
            }
        });
    }
}

const Config = new CustomId('config').snowflake('guildId');

@ModalRoute(Config)
class ConfigModal extends ModalHandler<[typeof Config]> {
    public saved = '';
    execute(): Promise<void> {
        const { guildId } = this.params;
        this.saved = `${this.event.fields.getTextInputValue('name')}@${guildId}`;
        return Promise.resolve();
    }
}

const Assign = new CustomId('assign').snowflake('roleId');

@SelectMenuRoute(SelectMenuType.User, Assign)
class AssignSelect extends SelectHandler<SelectMenuType.User, [typeof Assign]> {
    public summary = '';
    execute(): Promise<void> {
        const { roleId } = this.params;
        this.summary = `${this.event.values.length}->${roleId}`;
        return Promise.resolve();
    }
}

describe('this.params on a single-route handler', () => {
    it('decodes every field kind off the wire', () => {
        const wire = Approve.encode({ userId: USER, caseId: 42, urgent: true, action: 'deny', note: 'spam reports' });
        const handler = new ApproveButton(button(wire), core);
        expect(handler.read()).toEqual({
            userId: USER,
            caseId: 42,
            urgent: true,
            action: 'deny',
            note: 'spam reports'
        });
    });

    it('decodes once and reuses the cached result', () => {
        const wire = Approve.encode({ userId: USER, caseId: 1, urgent: false, action: 'approve', note: '' });
        const handler = new ApproveButton(button(wire), core);
        expect(handler.read()).toBe(handler.read()); // same cached object across reads
    });

    it('throws StaleCustomId when the shape changed since the wire was minted', () => {
        const older = new CustomId('approve').snowflake('userId');
        const handler = new ApproveButton(button(older.encode({ userId: USER })), core);
        expect(() => handler.read()).toThrow(StaleCustomId);
    });

    it('throws InvalidCustomId on a corrupt wire', () => {
        // the Approve body already holds several delimited pieces, so this extra one pushes the count
        // past what the shape expects and decode rejects it.
        const wire = Approve.encode({ userId: USER, caseId: 1, urgent: false, action: 'approve', note: '' });
        const handler = new ApproveButton(button(`${wire}\x1fJUNK`), core);
        expect(() => handler.read()).toThrow(InvalidCustomId);
    });

    it('throws when the handler has no route decorator', () => {
        const handler = new Undecorated(button('approveXyz:'), core);
        expect(() => handler.read()).toThrow(/route decorator/);
    });

    it('throws InvalidCustomId when no registered route owns the wire', () => {
        const stranger = new CustomId('stranger').snowflake('x');
        const handler = new ApproveButton(button(stranger.encode({ x: USER })), core);
        expect(() => handler.read()).toThrow(InvalidCustomId);
    });
});

describe('this.match on a multi-route handler', () => {
    it('runs the sync arm of the route the wire was minted from', async () => {
        const handler = new NavButtons(button(Page.encode({ index: 7 })), core);
        await handler.execute();
        expect(handler.log).toBe('page 7');
    });

    it('runs the async arm of the other route', async () => {
        const handler = new NavButtons(button(Jump.encode({ messageId: MSG })), core);
        await handler.execute();
        expect(handler.log).toBe(`jump ${MSG}`);
    });
});

describe('modal and select handlers decode this.params alongside their event data', () => {
    it('modal reads this.params and the submitted inputs', async () => {
        const handler = new ConfigModal(modal(Config.encode({ guildId: GUILD }), { name: 'My Server' }), core);
        await handler.execute();
        expect(handler.saved).toBe(`My Server@${GUILD}`);
    });

    it('select reads this.params and the chosen values', async () => {
        const handler = new AssignSelect(userSelect(Assign.encode({ roleId: ROLE }), ['1', '2', '3']), core);
        await handler.execute();
        expect(handler.summary).toBe(`3->${ROLE}`);
    });
});
