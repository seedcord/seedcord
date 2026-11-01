import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';
import { Logger } from '@seedcord/logger';

import { getDevChannel } from '#hmr/devChannel';

import { RuntimeBrand, TransportBrand } from './brands';
import { resolveLifecycleSpec } from './lifecycle';

import type { CoreBase } from '#interfaces/CoreBase';
import type { Kv } from '#src/kv/Kv';
import type { ScopedSpec } from './brands';
import type { ResolvedPluginLifecycleSpec, PluginLifecycleSpec } from './lifecycle';
import type {
    DeclaredScope,
    TransportOf,
    PluginOptions,
    PluginSpecArgs,
    RuntimeOf,
    ScopeAxis,
    Runtime,
    RuntimeAssert,
    Transport,
    TransportAssert
} from './options';
import type { Tail, FrameworkChannel, HmrAware, HmrUpdateEvent } from '@seedcord/types';
import type { Promisable } from 'type-fest';

interface Attaching {
    readonly key: string;
    readonly kv: Kv;
}

// set only while attach() runs `new Plugin()`
let attaching: Attaching | undefined;

export interface Initializeable {
    init(): Promisable<void>;
}

/** @internal */
const resolvedSpecSlot = Symbol('seedcord:plugin:spec');
/** @internal */
const loggerSlot = Symbol('seedcord:plugin:logger');
/** @internal */
const scopeSlot = Symbol('seedcord:plugin:scope');
/** @internal */
export const FixedScope = Symbol('seedcord:plugin:fixed-scope');

/**
 * Base class for a seedcord plugin. Extend it and implement `init()`. `this.core` is the running
 * bot.
 *
 * Your constructor takes the host first and passes it to `super()`. Add your own parameters after
 * it. `attach()` types them at the call site.
 *
 * A plugin that narrows `transport` or `runtime` in `Opts` passes the same values to `super()`.
 * `attach()` throws when either one differs from the bot's.
 *
 * @typeParam Opts - Where this plugin may attach.
 * @typeParam TCore - The `Core` each transport binds `this.core` to.
 * @typeParam Fixed - The `transport` and `runtime` values a transport's own `Plugin` base sets. Leave it out.
 *
 * @example
 * ```ts
 * class Analytics extends Plugin<{ transport: 'gateway' }> {
 *     constructor(
 *         host: CoreBase,
 *         private readonly apiKey: string
 *     ) {
 *         super(host, { transport: 'gateway', init: { phase: StartupPhase.Login } });
 *     }
 *
 *     public async init(): Promise<void> {
 *         await this.connect(this.apiKey);
 *     }
 * }
 *
 * seedcord.attach('analytics', Analytics, apiKey);
 * ```
 */
export abstract class Plugin<
    Opts extends PluginOptions = {},
    TCore extends CoreBase = CoreBase,
    Fixed extends ScopeAxis = never
>
    implements Initializeable, HmrAware
{
    /** @internal */
    protected static readonly [FixedScope]: Partial<DeclaredScope> = {};

    // phantom, never set at runtime.
    /** @internal */
    declare readonly [TransportBrand]?: TransportOf<Opts>;
    /** @internal */
    declare readonly [RuntimeBrand]?: RuntimeOf<Opts>;

    /** @internal */
    readonly [resolvedSpecSlot]: ResolvedPluginLifecycleSpec;
    /** @internal */
    readonly [loggerSlot]: Logger;
    /** @internal */
    readonly [scopeSlot]: DeclaredScope;

    /** Logs under the plugin's class name, on the channel its attach key sets. */
    protected readonly logger: Logger;

    readonly #kv: Kv | undefined;

    // CoreBase here keeps the augmented Core out of ConstructorParameters, which attach reads
    constructor(
        private readonly host: CoreBase,
        ...[spec]: PluginSpecArgs<Opts, Fixed>
    ) {
        // cleared here. a plugin this constructor builds by hand doesn't get the outer key
        const attachment = attaching;
        attaching = undefined;
        this.#kv = attachment?.kv;

        this.logger = new Logger(this.constructor.name, attachment && { channel: attachment.key });
        this[loggerSlot] = this.logger;
        this[resolvedSpecSlot] = resolveLifecycleSpec(spec, this.constructor.name);

        const passed: (PluginLifecycleSpec & Partial<DeclaredScope>) | undefined = spec;
        const fixed = new.target[FixedScope];
        this[scopeSlot] = {
            transport: fixed.transport ?? passed?.transport ?? 'any',
            runtime: fixed.runtime ?? passed?.runtime ?? 'any'
        };
    }

    /** The host, typed to the transport whose `Plugin` base this class extends. */
    protected get core(): TCore {
        // justified: each transport binds TCore to the Core its own host satisfies
        return this.host as TCore;
    }

    /**
     * This plugin's records in the bot's `config.kv`, stored under its attach key. Two attachments of
     * one plugin class each get their own records. Renaming the attach key leaves the records under
     * the old key behind.
     *
     * @throws A **SeedcordTypeError** when something built the plugin with `new` outside `attach()`.
     * @example
     * ```ts
     * // works in a field initializer, the constructor, and every method
     * private readonly jobs = this.kv.collection<Job>('job');
     * ```
     */
    protected get kv(): Kv {
        if (!this.#kv)
            throw new SeedcordTypeError(SeedcordErrorCode.CorePluginKvOutsideAttach, [this.constructor.name]);
        return this.#kv;
    }

    /**
     * Runs in `StartupPhase.Configuration` by default.
     * Move it to a different phase with the {@link PluginLifecycleSpec}.
     */
    abstract init(): Promisable<void>;

    /**
     * Runs in the Ready phase, after every attached plugin's `init()` has resolved. The other Ready
     * tasks run alongside it, including the http server binding its port.
     *
     * Override it when your work needs a logged-in client or a resolved application id.
     */
    ready?(): Promisable<void>;

    /**
     * Runs during teardown, in `ShutdownPhase.Disconnect` by default. seedcord skips it when `init()`
     * has thrown.
     *
     * When `init()` outlasts its timeout, seedcord calls this once that `init()` resolves, outside any
     * shutdown phase. The process must still be alive for that call to happen.
     */
    dispose?(): Promisable<void>;

    /**
     * Returns data that `seedcord codegen` writes into the bot's `seedcord-gen.ts` as a type.
     * Read it back with `Generated<typeof YourPlugin>`. Return plain data, or classes and objects
     * that a project file or your plugin's package exports. The class needs a `static readonly id`.
     *
     * `seedcord codegen` calls this without running `init()`. Read only what the constructor stored
     * and the bot's files.
     */
    codegen?(): Promise<unknown>;

    /**
     * Rejects the options this plugin got.
     *
     * @param reason - Why the options are invalid.
     * @throws A **SeedcordTypeError** every time, with the plugin class name and `reason` in its message.
     */
    protected rejectOptions(reason: string): never {
        throw new SeedcordTypeError(SeedcordErrorCode.PluginOptionsRejected, [this.constructor.name, reason]);
    }

    /** Override to reload plugin state on an HMR update. */
    public onHmr(_event: HmrUpdateEvent): Promisable<void> {
        return Promise.resolve();
    }

    /**
     * Registers critical file patterns that should trigger a full restart when changed in Dev HMR.
     * @param patterns - Glob patterns. A relative one resolves against `root` from `seedcord.config.ts`.
     */
    protected registerCriticalFiles(patterns: string[]): void {
        getDevChannel()?.send('seedcord:register-critical-files', { patterns });
    }
}

/** @internal */
export function resolvedLifecycleSpecOf(plugin: PluginLike): ResolvedPluginLifecycleSpec {
    return plugin[resolvedSpecSlot];
}

/** @internal */
export function extendsThisCorePlugin(ctor: PluginCtor): boolean {
    return ctor.prototype instanceof Plugin;
}

/** @internal */
export function pluginLoggerOf(plugin: PluginLike): Logger {
    return plugin[loggerSlot];
}

/** @internal */
export function declaredScopeOf(plugin: PluginLike): DeclaredScope {
    return plugin[scopeSlot];
}

/** @internal */
export function constructAttached<TPlugin>(key: string, kv: Kv, construct: () => TPlugin): TPlugin {
    attaching = { key, kv };
    try {
        return construct();
    } finally {
        attaching = undefined;
    }
}

export type { PluginLifecycleSpec } from './lifecycle';
export type { PluginOptions } from './options';

// a bound of Plugin<{}> rejects every plugin that declares an option, since Plugin<A> and Plugin<B>
// are mutually unassignable. every member here must stay Opts-independent.
/** @internal */
export type PluginLike = Pick<
    Plugin,
    'init' | 'ready' | 'dispose' | 'onHmr' | typeof resolvedSpecSlot | typeof loggerSlot | typeof scopeSlot
>;

// a `CoreBase` first parameter rejects a narrowing ctor on its own, and it also collapses
// `InstanceType<Ctor>` to `PluginLike` at every attach call. CoreParamAssert checks it instead.
/** @internal */
export type PluginCtor<TPlugin extends PluginLike = PluginLike> = new (...args: any[]) => TPlugin;

/** @internal */
export type PluginArgs<Ctor extends PluginCtor> =
    InheritsScopedConstructor<Ctor> extends true ? [] : Tail<ConstructorParameters<Ctor>>;

// a narrowed plugin with no constructor of its own inherits the base one, whose spec carries ScopedSpec
type InheritsScopedConstructor<Ctor extends PluginCtor> =
    Tail<ConstructorParameters<Ctor>> extends [infer Spec, ...unknown[]]
        ? typeof ScopedSpec extends keyof Spec
            ? true
            : false
        : false;

/** @internal */
export type Attached<Key extends string, Instance> = Key extends `${infer Group}.${infer Leaf}`
    ? Record<Group, Record<Leaf, Instance>>
    : Record<Key, Instance>;

// attach writes the key onto the host, so a key like toString would shadow the one on Object.prototype
// eslint-disable-next-line @typescript-eslint/no-wrapper-object-types -- lint:fix swaps this for `keyof object`, which is never
type HostMember<Host> = keyof Host | keyof Object;

// a string argument against an object type renders only as `string is not assignable`
/** @internal */
export type AttachKeyAssert<Key extends string, Host> = Key extends ''
    ? 'A plugin key needs a name.'
    : Key extends `${infer Group}.${infer Leaf}`
      ? Leaf extends `${string}.${string}`
          ? `'${Key}' has more than one dot. A plugin key takes one dot at most.`
          : '' extends Group | Leaf
            ? `'${Key}' has an empty part. Write a group and a plugin name around the dot, like 'services.users'.`
            : Group extends FrameworkChannel
              ? `'${Group}' is a channel the framework logs on. Pick another group name.`
              : Group extends keyof Host
                ? Host[Group] extends PluginLike
                    ? `'${Group}' already holds a plugin, so '${Leaf}' cannot nest inside it.`
                    : Host[Group] extends Record<string, PluginLike>
                      ? Leaf extends keyof Host[Group]
                          ? `'${Key}' is already attached.`
                          : Key
                      : `'${Group}' is already a member on the bot. Pick another group name.`
                : Group extends HostMember<Host>
                  ? `'${Group}' is already a member on the bot. Pick another group name.`
                  : Key
      : Key extends FrameworkChannel
        ? `'${Key}' is a channel the framework logs on. Pick another plugin key.`
        : Key extends keyof Host
          ? Host[Key] extends PluginLike
              ? `'${Key}' is already attached.`
              : Host[Key] extends Record<string, PluginLike>
                ? `'${Key}' already holds a group of plugins. Attach this one under a name of its own.`
                : `'${Key}' is already a member on the bot. Pick another plugin key.`
          : Key extends HostMember<Host>
            ? `'${Key}' is already a member on the bot. Pick another plugin key.`
            : Key;

type CoreParamTooNarrow = Record<
    'this plugin constructor must take CoreBase as its first parameter and read the transport Core off this.core',
    never
>;

// a narrowed first parameter fails `CoreBase extends Param`
type CoreParamAssert<Ctor extends PluginCtor> = CoreBase extends ConstructorParameters<Ctor>[0]
    ? unknown
    : CoreParamTooNarrow;

type ConstructorMissing = Record<
    "this plugin narrows its transport or runtime. Give it a constructor that passes them to super(), like super(host, { runtime: 'server' })",
    never
>;

type OwnConstructorAssert<Ctor extends PluginCtor> =
    InheritsScopedConstructor<Ctor> extends true ? ConstructorMissing : unknown;

type AttachAsserts<Ctor extends PluginCtor, BotT extends Transport, BotRt extends Runtime> = TransportAssert<
    InstanceType<Ctor>,
    BotT
> &
    RuntimeAssert<InstanceType<Ctor>, BotRt> &
    CoreParamAssert<Ctor> &
    OwnConstructorAssert<Ctor>;

// typescript can't infer Ctor from a generic class through `Ctor & AttachAsserts`. every assert returns unknown to pass.
/** @internal */
export type AttachableCtor<Ctor extends PluginCtor, BotT extends Transport, BotRt extends Runtime> =
    unknown extends AttachAsserts<Ctor, BotT, BotRt> ? Ctor : AttachAsserts<Ctor, BotT, BotRt>;
