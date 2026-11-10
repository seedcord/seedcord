import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError, SeedcordTypeError } from '@seedcord/errors/internal';
import { asError } from '@seedcord/utils/internal';

import { MemberValues } from '#src/dispatch/DispatchContext';

import type { DispatchContext } from '#src/dispatch/DispatchContext';
import type { DispatchOrigin } from '#src/dispatch/DispatchOrigin';
import type { ResolvedPluginLifecycleSpec } from './lifecycle';
import type { PluginLike } from './Plugin';
import type { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';

export interface Attachment {
    readonly key: string;
    readonly instance: PluginLike;
    readonly spec: ResolvedPluginLifecycleSpec;
}

export type DispatchMemberFunctions = Readonly<Record<string, (origin: DispatchOrigin) => unknown>>;

// a test on each transport fails if a handler method or gate field is missing here. instance fields aren't checked
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

// a key like constructor would replace this.constructor on every handler
function isReservedMember(name: string): boolean {
    return RESERVED_MEMBERS.has(name) || name in Object.prototype;
}

interface ClaimedMember {
    readonly plugin: string;
    readonly build: (origin: DispatchOrigin) => unknown;
}

// every attached plugin, in attach order
export class PluginRegistry {
    private readonly members = new Map<string, ClaimedMember>();
    private readonly list: Attachment[] = [];

    public get attachments(): readonly Attachment[] {
        return this.list;
    }

    public get keys(): readonly string[] {
        return this.list.map((attachment) => attachment.key);
    }

    public add(attachment: Attachment): void {
        const { key, instance } = attachment;
        const name = `${paint.sky(instance.constructor.name)} at ${paint.sky(key)}`;
        for (const [member, build] of Object.entries(instance.dispatchMembers ?? {})) {
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
        this.list.push(attachment);
    }

    public async buildMembers(dispatch: DispatchContext, origin: DispatchOrigin): Promise<void> {
        const built = await Promise.all(
            [...this.members].map(async ([member, { plugin, build }]) => {
                try {
                    return [member, await build(origin)] as const;
                } catch (caught) {
                    throw new SeedcordError(
                        SeedcordErrorCode.CorePluginMemberThrew,
                        [member, plugin, asError(caught).message],
                        { cause: caught }
                    );
                }
            })
        );
        dispatch[MemberValues] = Object.fromEntries(built);
    }

    public async prepareCommands(commands: readonly RESTPostAPIApplicationCommandsJSONBody[]): Promise<void> {
        for (const { instance } of this.list) await instance.prepareCommands?.(commands);
    }
}
