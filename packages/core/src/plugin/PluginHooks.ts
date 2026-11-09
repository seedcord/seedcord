import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, SeedcordTypeError } from '@seedcord/errors/internal';
import { asError } from '@seedcord/utils/internal';

import { MemberValues } from '#src/dispatch/DispatchContext';

import type { DispatchContext } from '#src/dispatch/DispatchContext';
import type { DispatchOrigin } from '#src/dispatch/DispatchOrigin';
import type { PluginLike } from './Plugin';
import type { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';

export type DispatchMemberFunctions = Readonly<Record<string, (origin: DispatchOrigin) => unknown>>;

// a test on each transport fails if a handler method or gate context field isn't in this list
const RESERVED_MEMBERS: ReadonlySet<string> = new Set([
    'after',
    'api',
    'appGuildPermissions',
    'appPermissions',
    'channelId',
    'channels',
    'core',
    'decodedFocused',
    'decodedRoute',
    'defer',
    'deferUpdate',
    'delete',
    'developerUsername',
    'dispatch',
    'edit',
    'ensureSourceMessage',
    'event',
    'eventName',
    'execute',
    'fields',
    'focused',
    'followUp',
    'getEvent',
    'guild',
    'guildId',
    'guildLocale',
    'interaction',
    'kind',
    'logger',
    'match',
    'member',
    'memberGuildPermissions',
    'memberPermissions',
    'memberRoleIds',
    'members',
    'options',
    'params',
    'payload',
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
    'userId',
    'userLocale',
    'users',
    'uuid',
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

export class PluginHooks {
    private readonly members = new Map<string, ClaimedMember>();
    private readonly plugins: PluginLike[] = [];

    public add(name: string, plugin: PluginLike): void {
        for (const [member, build] of Object.entries(plugin.dispatchMembers ?? {})) {
            if (isReservedMember(member)) {
                throw new SeedcordTypeError(SeedcordErrorCode.CorePluginMemberReserved, [member, name]);
            }
            const owner = this.members.get(member);
            if (owner) {
                throw new SeedcordTypeError(SeedcordErrorCode.CoreDuplicateName, [
                    'dispatch member',
                    member,
                    [owner.plugin, name],
                    'If both are the same plugin, attach it once.'
                ]);
            }
            this.members.set(member, { plugin: name, build });
        }
        this.plugins.push(plugin);
    }

    public async buildMembers(dispatch: DispatchContext, origin: DispatchOrigin): Promise<void> {
        const values: Record<string, unknown> = {};
        for (const [member, { plugin, build }] of this.members) {
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
        dispatch[MemberValues] = values;
    }

    public async prepareCommands(commands: readonly RESTPostAPIApplicationCommandsJSONBody[]): Promise<void> {
        for (const plugin of this.plugins) await plugin.prepareCommands?.(commands);
    }
}
