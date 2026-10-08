import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError, SeedcordTypeError } from '@seedcord/errors/internal';
import { FRAMEWORK_CHANNELS } from '@seedcord/logger';
import { HostPluginKeys } from '@seedcord/types/internal';

import { declaredScopeOf, extendsThisCorePlugin, pluginLoggerOf, resolvedLifecycleSpecOf } from './Plugin';

import type { CoreBase } from '#interfaces/CoreBase';
import type { Bus } from '#subscribers/Bus';
import type { ResolvedPluginLifecycleSpec } from './lifecycle';
import type { DeclaredScope, Runtime, Transport } from './options';
import type { AttachableCtor, Attached, AttachKeyAssert, PluginArgs, PluginCtor, PluginLike } from './Plugin';
import type { REST } from '@discordjs/rest';
import type { Config, IRateLimiter } from '@seedcord/types';

export interface Attachment {
    readonly key: string;
    readonly instance: PluginLike;
    readonly spec: ResolvedPluginLifecycleSpec;
}

const RESERVED_KEYS: ReadonlySet<string> = new Set(FRAMEWORK_CHANNELS);

const attachmentsSlot = Symbol('seedcord:host:attachments');
const sealSlot = Symbol('seedcord:host:seal');

/** Base class for a plugin host. */
export abstract class PluginHost<BotT extends Transport, BotRt extends Runtime> implements CoreBase {
    public abstract readonly config: Config;
    public abstract readonly rest: REST;
    public abstract readonly applicationId: string;
    public abstract readonly rateLimiter: IRateLimiter;
    public abstract readonly bus: Bus;

    #sealed = false;
    readonly #attachments: Attachment[] = [];
    readonly #groups = new Map<string, Record<string, PluginLike>>();
    readonly #scope: { readonly transport: BotT; readonly runtime: BotRt };

    constructor(transport: BotT, runtime: BotRt) {
        this.#scope = { transport, runtime };
    }

    /** @internal */
    public get [attachmentsSlot](): readonly Attachment[] {
        return this.#attachments;
    }

    /** @internal */
    public [sealSlot](): void {
        this.#sealed = true;
    }

    /** @internal codegen reads this to emit the `Core` augmentation */
    public get [HostPluginKeys](): readonly string[] {
        return this.#attachments.map((attachment) => attachment.key);
    }

    /**
     * Attaches a plugin under `key`. Read the instance back as `core[key]`. `seedcord codegen`
     * writes the `Core` augmentation that types it there.
     *
     * Put one dot in the key to nest the plugin under a group. `'services.users'` reads back as
     * `core.services.users`. Each name holds one plugin or one group.
     *
     * Startup runs each plugin's `init()` in attach order within its phase. A node bot starts in
     * `start()`. An edge bot starts on its first request.
     *
     * Attaching a plugin whose `transport` or `runtime` differs from this host fails to compile, and
     * throws when the types were bypassed.
     * Your constructor takes `CoreBase` as its first parameter (you don't need to pass it though).
     * A narrower one fails to compile here.
     *
     * @param key - Also the channel the plugin logs on, dots included. Reserved channel names throw.
     * @param args - Whatever your constructor takes after the host.
     * @throws A **SeedcordError** if you attach after the bot has started. A taken or reserved key throws too.
     * So does a plugin that extends `Plugin` from another copy of `@seedcord/core`.
     * @example
     * ```ts
     * seedcord.attach('db', Mongoose, { uri: 'mongodb://...', name: 'seedcord', dir: ... });
     * ```
     */
    public attach<Key extends string, Ctor extends PluginCtor>(
        this: this,
        key: AttachKeyAssert<Key, this>,
        Plugin: AttachableCtor<Ctor, BotT, BotRt>,
        ...args: PluginArgs<Ctor>
    ): this & Attached<Key, InstanceType<Ctor>>;
    public attach<Key extends string, Ctor extends PluginCtor>(
        this: this,
        key: Key,
        Plugin: Ctor,
        ...args: PluginArgs<Ctor>
    ): this & Attached<Key, InstanceType<Ctor>> {
        if (this.#sealed) {
            throw new SeedcordError(SeedcordErrorCode.CorePluginAfterInit);
        }

        const dot = key.indexOf('.');
        const head = dot === -1 ? key : key.slice(0, dot);

        // runs before assertFree because some reserved channels are also host members
        if (RESERVED_KEYS.has(head)) {
            throw new SeedcordTypeError(SeedcordErrorCode.CorePluginReservedChannel, [head]);
        }

        const leaf = dot === -1 ? undefined : key.slice(dot + 1);
        if (head === '' || leaf === '') {
            throw new SeedcordTypeError(SeedcordErrorCode.CorePluginKeyMalformed, [key, 'has an empty part.']);
        }
        if (leaf?.includes('.')) {
            throw new SeedcordTypeError(SeedcordErrorCode.CorePluginKeyMalformed, [key, 'has more than one dot.']);
        }
        this.#assertFree(head, leaf, key);

        if (!extendsThisCorePlugin(Plugin)) {
            throw new SeedcordTypeError(SeedcordErrorCode.CorePluginFromOtherCore, [Plugin.name]);
        }

        const instance = new Plugin(this, ...args);
        this.#assertScope(Plugin.name, declaredScopeOf(instance));
        pluginLoggerOf(instance).setChannel(key);
        this.#attachments.push({ key, instance, spec: resolvedLifecycleSpecOf(instance) });

        if (leaf === undefined) {
            return Object.assign(this, { [key]: instance }) as this & Attached<Key, InstanceType<Ctor>>;
        }

        this.#groupFor(head)[leaf] = instance;
        return this as this & Attached<Key, InstanceType<Ctor>>;
    }

    #assertFree(head: string, leaf: string | undefined, key: string): void {
        if (leaf === undefined) {
            if (this.#groups.has(key)) throw new SeedcordError(SeedcordErrorCode.CorePluginKeyHoldsGroup, [key]);
            if (key in this) throw new SeedcordError(SeedcordErrorCode.CorePluginKeyExists, [key]);
            return;
        }

        const group = this.#groups.get(head);
        if (!group) {
            if (head in this) throw new SeedcordError(SeedcordErrorCode.CorePluginGroupTaken, [head, key]);
            return;
        }
        if (Object.hasOwn(group, leaf)) throw new SeedcordError(SeedcordErrorCode.CorePluginKeyExists, [key]);
    }

    // the types already reject a mismatch. plain JS and casts reach this.
    #assertScope(pluginName: string, declared: DeclaredScope): void {
        for (const axis of ['transport', 'runtime'] as const) {
            const host = this.#scope[axis];
            if (declared[axis] === 'any' || declared[axis] === host) continue;
            throw new SeedcordTypeError(SeedcordErrorCode.CorePluginScopeMismatch, [
                pluginName,
                axis,
                declared[axis],
                host
            ]);
        }
    }

    #groupFor(head: string): Record<string, PluginLike> {
        const existing = this.#groups.get(head);
        if (existing) return existing;

        // a null prototype makes a leaf called __proto__ or valueOf an ordinary key
        const group = Object.create(null) as Record<string, PluginLike>;
        this.#groups.set(head, group);
        Object.assign(this, { [head]: group });
        return group;
    }
}

export function attachmentsOf(
    host: Pick<PluginHost<Transport, Runtime>, typeof attachmentsSlot>
): readonly Attachment[] {
    return host[attachmentsSlot];
}

export function sealAttachments(host: Pick<PluginHost<Transport, Runtime>, typeof sealSlot>): void {
    host[sealSlot]();
}
