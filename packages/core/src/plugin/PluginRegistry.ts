import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError, SeedcordTypeError } from '@seedcord/errors/internal';
import { asError } from '@seedcord/utils/internal';

import { MemberValues } from '#src/dispatch/DispatchContext';
import { pluginLoggerOf, readsCommandFile } from '#src/plugin/pluginSlots';
import { requestPath } from '#src/requestPath';
import { INTERNAL_SERVER_ERROR } from '#src/webConstants';

import type { DispatchContext } from '#src/dispatch/DispatchContext';
import type { DispatchOrigin } from '#src/dispatch/DispatchOrigin';
import type { ResolvedPluginLifecycleSpec } from './lifecycle';
import type { PluginLike } from './Plugin';
import type { RESTPostAPIApplicationCommandsJSONBody } from 'discord-api-types/v10';

export interface Attachment {
    readonly key: string;
    readonly instance: PluginLike;
    readonly spec: ResolvedPluginLifecycleSpec;
    // the arguments attach() got after the plugin class. seedcord dev constructs the saved class with them
    readonly args: readonly unknown[];
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

function labelOf({ key, instance }: Attachment): string {
    return `${paint.sky(instance.constructor.name)} at ${paint.sky(key)}`;
}

async function answerFrom(plugin: PluginLike, request: Request): Promise<Response | undefined> {
    try {
        return await plugin.fetch?.(request);
    } catch (caught) {
        pluginLoggerOf(plugin).error(`fetch threw on ${request.method} ${requestPath(request.url)}`, caught);
        return new Response(null, { status: INTERNAL_SERVER_ERROR });
    }
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

    public readsCommandFile(file: string): boolean {
        return this.list.some(({ instance }) => readsCommandFile(instance, file));
    }

    public add(attachment: Attachment): void {
        this.assertClaimable(attachment);
        this.claim(attachment);
        this.list.push(attachment);
    }

    // replaced's own members don't count as a clash
    public assertClaimable(attachment: Attachment, replaced?: Attachment): void {
        const { key, instance } = attachment;
        const plugin = labelOf(attachment);
        for (const member of Object.keys(instance.dispatchMembers ?? {})) {
            this.assertFree(member, key, plugin, instance, replaced?.instance);
        }
    }

    // keeps the attach order. init, dispose and fetch all run in that order.
    // this doesn't check member clashes. PluginHost's rebuild already checked the new plugin's members
    public replace(old: Attachment, next: Attachment): void {
        for (const [member, owner] of this.claimed) {
            if (owner.instance === old.instance) this.claimed.delete(member);
        }
        this.claim(next);
        this.list[this.list.indexOf(old)] = next;
    }

    private claim(attachment: Attachment): void {
        const { key, instance } = attachment;
        const plugin = labelOf(attachment);
        for (const [member, build] of Object.entries(instance.dispatchMembers ?? {})) {
            this.claimed.set(member, { key, plugin, instance, build });
        }
    }

    private assertFree(member: string, key: string, plugin: string, instance: PluginLike, replaced?: PluginLike): void {
        if (isReservedMember(member)) {
            throw new SeedcordTypeError(SeedcordErrorCode.CorePluginMemberReserved, [member, plugin]);
        }
        const owner = this.claimed.get(member);
        if (!owner || owner.instance === replaced) return;
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

    public get answersRequests(): boolean {
        return this.list.some(({ instance }) => instance.fetch);
    }

    public async answer(request: Request): Promise<Response | undefined> {
        for (const attachment of this.list) {
            const response = await answerFrom(attachment.instance, request);
            if (response) return response;
            // getReader() locks the body without setting bodyUsed
            if (request.bodyUsed || request.body?.locked) {
                throw new SeedcordError(SeedcordErrorCode.CorePluginFetchReadBody, [
                    labelOf(attachment),
                    requestPath(request.url)
                ]);
            }
        }
        return undefined;
    }
}
