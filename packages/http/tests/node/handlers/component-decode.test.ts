import { CustomId, Notice } from '@seedcord/core';
import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { ButtonHandler } from '#handlers/interaction/components/ButtonHandler';
import { ModalHandler } from '#handlers/interaction/components/ModalHandler';
import { UserMenuHandler } from '#handlers/interaction/components/SelectMenuHandler';
import { ButtonRoute, ModalRoute, UserMenuRoute } from '#src/index';

import type { Core } from '#interfaces/Core';
import type { MatchArms } from '@seedcord/core/internal';
import type {
    APIMessageComponentButtonInteraction,
    APIMessageComponentSelectMenuInteraction,
    APIMessageUserSelectInteractionData,
    APIModalSubmitInteraction,
    Snowflake
} from 'discord-api-types/v10';

type UserSelectEvent = APIMessageComponentSelectMenuInteraction & { data: APIMessageUserSelectInteractionData };

const ApproveId = new CustomId('approve').snowflake('userId');
const RejectId = new CustomId('reject').snowflake('userId');
const AssignId = new CustomId('assign').snowflake('roleId');
const ConfigId = new CustomId('config').str('name');

// justified: the decode path reads only data.custom_id (and data.values on selects)
function buttonEvent(customId: string): APIMessageComponentButtonInteraction {
    return {
        application_id: 'app-1',
        id: 'int-1',
        token: 'tok',
        type: 3,
        data: { component_type: 2, custom_id: customId }
    } as unknown as APIMessageComponentButtonInteraction;
}

function selectEvent(customId: string, values: string[]): UserSelectEvent {
    return {
        application_id: 'app-1',
        id: 'int-1',
        token: 'tok',
        type: 3,
        data: { component_type: 5, custom_id: customId, values }
    } as unknown as UserSelectEvent;
}

function modalEvent(customId: string): APIModalSubmitInteraction {
    return {
        application_id: 'app-1',
        id: 'int-1',
        token: 'tok',
        type: 5,
        data: { custom_id: customId, components: [] }
    } as unknown as APIModalSubmitInteraction;
}

// justified: the decode path never reaches core
const core = {} as unknown as Core;

// runs fn, asserts it threw a Notice, and returns the concrete notice's constructor name
function noticeNameFrom(fn: () => unknown): string {
    try {
        fn();
    } catch (error) {
        expect(error).toBeInstanceOf(Notice);
        return (error as Notice).constructor.name;
    }
    throw new Error('expected a Notice');
}

describe('button decode', () => {
    it('decodes params for a single registered def', async () => {
        let seen: string | null = null;
        @ButtonRoute(ApproveId)
        class Approve extends ButtonHandler<[typeof ApproveId]> {
            async execute(): Promise<void> {
                expectTypeOf(this.params).toEqualTypeOf<{ userId: string }>();
                seen = this.params.userId;
                await Promise.resolve();
            }
        }

        await new Approve(buttonEvent(ApproveId.encode({ userId: '853472916483920128' })), core).execute();

        expect(seen).toBe('853472916483920128');
    });

    it('dispatches the arm for the minted route on a multi-def handler', async () => {
        @ButtonRoute(ApproveId, RejectId)
        class Review extends ButtonHandler<[typeof ApproveId, typeof RejectId]> {
            execute(): Promise<void> {
                expectTypeOf(this.params).toBeNever();
                return Promise.resolve();
            }

            run(): Promise<string> {
                return this.match({
                    approve: ({ userId }) => `approved ${userId}`,
                    reject: ({ userId }) => `rejected ${userId}`
                });
            }
        }

        const wire = RejectId.encode({ userId: '42' });
        await expect(new Review(buttonEvent(wire), core).run()).resolves.toBe('rejected 42');
    });

    it('throws CustomIdMatchArmMissing when the minted route has no arm', async () => {
        @ButtonRoute(ApproveId, RejectId)
        class Review extends ButtonHandler<[typeof ApproveId, typeof RejectId]> {
            async execute(): Promise<void> {
                // justified: the arms omit 'reject' to reach the runtime backstop the type layer forbids
                const arms = { approve: () => undefined } as unknown as MatchArms<
                    [typeof ApproveId, typeof RejectId],
                    undefined
                >;
                await this.match(arms);
            }
        }

        const wire = RejectId.encode({ userId: '42' });
        await expect(new Review(buttonEvent(wire), core).execute()).rejects.toSatisfy((e: unknown) =>
            isSeedcordError(e, 'SeedcordTypeError', SeedcordErrorCode.CustomIdMatchArmMissing)
        );
    });

    it('decodes once and reuses the cached result', async () => {
        let first: unknown;
        let second: unknown;
        @ButtonRoute(ApproveId)
        class Approve extends ButtonHandler<[typeof ApproveId]> {
            execute(): Promise<void> {
                first = this.params;
                second = this.params;
                return Promise.resolve();
            }
        }

        await new Approve(buttonEvent(ApproveId.encode({ userId: '7' })), core).execute();

        expect(first).toBe(second);
    });

    it('refuses a wire minted from an older shape with StaleCustomId', () => {
        const OldApprove = new CustomId('approve').snowflake('userId');
        const NewApprove = new CustomId('approve').snowflake('userId').str('reason');
        @ButtonRoute(NewApprove)
        class Approve extends ButtonHandler<[typeof NewApprove]> {
            execute(): Promise<void> {
                void this.params;
                return Promise.resolve();
            }
        }

        expect(noticeNameFrom(() => new Approve(buttonEvent(OldApprove.encode({ userId: '1' })), core).execute())).toBe(
            'StaleCustomId'
        );
    });

    it('refuses a corrupt wire with InvalidCustomId', () => {
        @ButtonRoute(ApproveId)
        class Approve extends ButtonHandler<[typeof ApproveId]> {
            execute(): Promise<void> {
                void this.params;
                return Promise.resolve();
            }
        }

        const wire = `${ApproveId.encode({ userId: '1' })}\u{1F}JUNK`;
        expect(noticeNameFrom(() => new Approve(buttonEvent(wire), core).execute())).toBe('InvalidCustomId');
    });

    it('throws CustomIdMatchArmMissing for a prototype-named prefix with no arm', async () => {
        const Ctor = new CustomId('constructor').snowflake('userId');
        @ButtonRoute(Ctor)
        class Weird extends ButtonHandler<[typeof Ctor]> {
            async execute(): Promise<void> {
                // justified: omit the prefix to test the runtime backstop
                await this.match({} as unknown as MatchArms<[typeof Ctor], undefined>);
            }
        }

        await expect(new Weird(buttonEvent(Ctor.encode({ userId: '1' })), core).execute()).rejects.toSatisfy(
            (e: unknown) => isSeedcordError(e, 'SeedcordTypeError', SeedcordErrorCode.CustomIdMatchArmMissing)
        );
    });

    it('throws CustomIdHandlerRouteMissing when the handler has no route decorator', () => {
        class Bare extends ButtonHandler<[typeof ApproveId]> {
            execute(): Promise<void> {
                void this.params;
                return Promise.resolve();
            }
        }

        let caught: unknown = null;
        try {
            void new Bare(buttonEvent(ApproveId.encode({ userId: '1' })), core).execute();
        } catch (error) {
            caught = error;
        }
        expect(isSeedcordError(caught, 'SeedcordError', SeedcordErrorCode.CustomIdHandlerRouteMissing)).toBe(true);
    });
});

describe('select menu decode', () => {
    it('decodes params and narrows values for the declared kind', async () => {
        let role: string | null = null;
        let picked: readonly string[] = [];
        @UserMenuRoute(AssignId)
        class Assign extends UserMenuHandler<[typeof AssignId]> {
            async execute(): Promise<void> {
                expectTypeOf(this.event.data.values).toEqualTypeOf<Snowflake[]>();
                role = this.params.roleId;
                picked = this.event.data.values;
                await Promise.resolve();
            }
        }

        await new Assign(selectEvent(AssignId.encode({ roleId: '99' }), ['u1', 'u2']), core).execute();

        expect(role).toBe('99');
        expect(picked).toEqual(['u1', 'u2']);
    });
});

describe('modal decode', () => {
    it('decodes params off the modal custom_id', async () => {
        let name: string | null = null;
        @ModalRoute(ConfigId)
        class Config extends ModalHandler<[typeof ConfigId]> {
            async execute(): Promise<void> {
                name = this.params.name;
                await Promise.resolve();
            }
        }

        await new Config(modalEvent(ConfigId.encode({ name: 'staging' })), core).execute();

        expect(name).toBe('staging');
    });
});
