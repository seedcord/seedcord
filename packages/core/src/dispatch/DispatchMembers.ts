import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, SeedcordTypeError } from '@seedcord/errors/internal';
import { asError } from '@seedcord/utils/internal';

import type { DispatchOrigin } from './DispatchOrigin';

export type DispatchMemberFunctions = Readonly<Record<string, (origin: DispatchOrigin) => unknown>>;

// a test on each transport fails if a handler gets a new method that isn't in this list
const RESERVED_MEMBERS: ReadonlySet<string> = new Set([
    'after',
    'api',
    'channels',
    'core',
    'decodedFocused',
    'decodedRoute',
    'defer',
    'deferUpdate',
    'delete',
    'dispatch',
    'edit',
    'ensureSourceMessage',
    'event',
    'execute',
    'fields',
    'focused',
    'followUp',
    'getEvent',
    'logger',
    'match',
    'members',
    'options',
    'params',
    'reader',
    'reply',
    'resolver',
    'respond',
    'roles',
    'route',
    'send',
    'sender',
    'showModal',
    'target',
    'targetMember',
    'update',
    'user',
    'users',
    'values'
]);

// a member called constructor would replace this.constructor on every handler
function isReservedMember(name: string): boolean {
    return RESERVED_MEMBERS.has(name) || name in Object.prototype;
}

interface ClaimedMember {
    readonly plugin: string;
    readonly build: (origin: DispatchOrigin) => unknown;
}

export const DispatchMembersSlot = Symbol('seedcord:host:dispatch-members');

export class DispatchMembers {
    // attach order, which is the order build() runs them in
    private readonly claimed = new Map<string, ClaimedMember>();

    public claim(plugin: string, functions: DispatchMemberFunctions = {}): void {
        for (const [member, build] of Object.entries(functions)) {
            if (isReservedMember(member)) {
                throw new SeedcordTypeError(SeedcordErrorCode.CorePluginMemberReserved, [member, plugin]);
            }
            const owner = this.claimed.get(member);
            if (owner) {
                throw new SeedcordTypeError(SeedcordErrorCode.CoreDuplicateName, [
                    'dispatch member',
                    member,
                    [owner.plugin, plugin],
                    'If both are the same plugin, attach it once.'
                ]);
            }
            this.claimed.set(member, { plugin, build });
        }
    }

    public async build(origin: DispatchOrigin): Promise<Record<string, unknown>> {
        const values: Record<string, unknown> = {};
        for (const [member, { plugin, build }] of this.claimed) {
            try {
                values[member] = await build(origin);
            } catch (caught) {
                throw new SeedcordError(
                    SeedcordErrorCode.CorePluginMemberThrew,
                    [member, plugin, asError(caught).message],
                    { cause: caught }
                );
            }
        }
        return values;
    }
}
