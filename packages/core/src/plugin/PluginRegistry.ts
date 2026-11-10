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

interface HandlerClass {
    readonly name: string;
    readonly prototype: object;
}

// each transport's test fails if a handler method or gate field is missing here
const RESERVED_MEMBERS: ReadonlySet<string> = new Set([
    'after',
    'api',
    'appGuildPermissions',
    'appPermissions',
    'channelId',
    'channels',
    'core',
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

function throwTaken(member: string, first: string, second: string, note?: string): never {
    throw new SeedcordTypeError(SeedcordErrorCode.CoreDuplicateName, [
        'dispatch member',
        member,
        [first, second],
        note
    ]);
}

interface ClaimedMember {
    readonly key: string;
    readonly plugin: string;
    readonly instance: PluginLike;
    readonly build: (origin: DispatchOrigin) => unknown;
}

// the attached plugins in attach order, and the dispatch members they add
export class PluginRegistry {
    private readonly claimed = new Map<string, ClaimedMember>();
    private readonly list: Attachment[] = [];

    public get attachments(): readonly Attachment[] {
        return this.list;
    }

    public get keys(): readonly string[] {
        return this.list.map((attachment) => attachment.key);
    }

    public get members(): readonly { readonly key: string; readonly member: string }[] {
        return [...this.claimed].map(([member, { key }]) => ({ key, member }));
    }

    public add(attachment: Attachment): void {
        const { key, instance } = attachment;
        const plugin = `${paint.sky(instance.constructor.name)} at ${paint.sky(key)}`;
        const functions = Object.entries(instance.dispatchMembers ?? {});
        for (const [member] of functions) this.assertFree(member, key, plugin, instance);
        for (const [member, build] of functions) this.claimed.set(member, { key, plugin, instance, build });
        this.list.push(attachment);
    }

    private assertFree(member: string, key: string, plugin: string, instance: PluginLike): void {
        if (isReservedMember(member)) {
            throw new SeedcordTypeError(SeedcordErrorCode.CorePluginMemberReserved, [member, plugin]);
        }
        const owner = this.claimed.get(member);
        if (!owner) return;
        if (owner.instance.constructor === instance.constructor) {
            throw new SeedcordTypeError(SeedcordErrorCode.CorePluginAttachedTwice, [
                instance.constructor.name,
                owner.key,
                key
            ]);
        }
        throwTaken(member, owner.plugin, plugin);
    }

    // a method or getter with a member's name breaks the assign in BaseHandler
    public assertFreeOn(handler: HandlerClass): void {
        for (const [member, { plugin }] of this.claimed) {
            if (member in handler.prototype) {
                throwTaken(member, paint.sky(handler.name), plugin, 'A handler method or getter would hide the value.');
            }
        }
    }

    // a subclass field replaces a member because it runs after BaseHandler assigns them
    public assertMembersKept<Handler extends object>(handler: Handler, dispatch: DispatchContext): Handler {
        for (const [member, { plugin }] of this.claimed) {
            if (Object.is(Reflect.get(handler, member), dispatch[MemberValues][member])) {
                continue;
            }

            const handlerName = paint.sky(handler.constructor.name);
            throwTaken(member, handlerName, plugin, 'The handler field replaces the value the plugin built.');
        }
        return handler;
    }

    public async buildMembers(dispatch: DispatchContext, origin: DispatchOrigin): Promise<void> {
        const built = await Promise.all(
            [...this.claimed].map(async ([member, { plugin, build }]) => {
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
