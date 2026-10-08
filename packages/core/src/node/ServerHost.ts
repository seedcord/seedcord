import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { HostShutdown, HostStartup } from '@seedcord/types/internal';

import { assertDeclaredRuntime } from '#node/assertRuntimeVersion';
import { PluginLifecycle } from '#src/lifecycle/PluginLifecycle';
import { attachmentsOf, PluginHost, sealAttachments } from '#src/plugin/PluginHost';

import { registerProcessErrors } from './processErrors';

import type { CoordinatedShutdown } from '#node/Lifecycle/CoordinatedShutdown';
import type { CoordinatedStartup } from '#src/lifecycle/CoordinatedStartup';
import type { Transport } from '#src/plugin/options';

/** Base class for a transport `Seedcord` class that runs as a long-lived node or bun process. */
export abstract class ServerHost<BotT extends Transport> extends PluginHost<BotT, 'server'> {
    /** @internal */
    readonly [HostShutdown]: CoordinatedShutdown;
    /** @internal */
    readonly [HostStartup]: CoordinatedStartup;

    /** Add a task that runs while the bot shuts down. */
    public readonly shutdown: Pick<CoordinatedShutdown, 'addTask'>;

    /** Add a task that runs while the bot starts. */
    public readonly startup: Pick<CoordinatedStartup, 'addTask'>;

    readonly #lifecycle: PluginLifecycle;
    #startFailed = false;
    #initPromise?: Promise<this> | undefined;

    static #isInstantiated = false;
    static #liveHost?: object | undefined;
    static #liveShutdown?: CoordinatedShutdown | undefined;
    static #liveProcessErrors?: (() => void) | undefined;

    constructor(transport: BotT, shutdown: CoordinatedShutdown, startup: CoordinatedStartup) {
        // a `sideEffects: false` build would drop the same call in the node entry
        assertDeclaredRuntime();
        super(transport, 'server');

        if (ServerHost.#isInstantiated) throw new SeedcordError(SeedcordErrorCode.CoreSingletonViolation);

        ServerHost.#isInstantiated = true;
        ServerHost.#liveHost = this;
        ServerHost.#liveShutdown = shutdown;
        this[HostShutdown] = shutdown;
        this[HostStartup] = startup;
        // a getter returning the slot would expose run() and the signal handlers too
        this.shutdown = { addTask: shutdown.addTask.bind(shutdown) };
        this.startup = { addTask: startup.addTask.bind(startup) };
        this.#lifecycle = new PluginLifecycle(this.startup, this.shutdown);
    }

    /** @internal */
    protected init(): Promise<this> {
        // a retry after a rejection runs #runInit again and hits its restart guard
        this.#initPromise ??= this.#runInit().catch((caught: unknown) => {
            this.#initPromise = undefined;
            throw caught;
        });
        return this.#initPromise;
    }

    async #runInit(): Promise<this> {
        // a rerun after a failed startup would re-init the rolled-back plugins
        if (this.#startFailed) throw new SeedcordError(SeedcordErrorCode.LifecycleRestartAfterFailure);

        this.#lifecycle.register(attachmentsOf(this));

        // codegen and the build construct the bot without starting it
        this[HostShutdown].registerSignalHandlers();
        if (this.config.errors?.catchProcessErrors ?? true) {
            ServerHost.#liveProcessErrors = registerProcessErrors(this, this[HostShutdown]);
        }

        const startupSettled: PromiseWithResolvers<void> = Promise.withResolvers();
        this[HostShutdown].gateOnStartup(startupSettled.promise);

        try {
            await this[HostStartup].run();
        } catch (caught) {
            this.#startFailed = true;
            await this.#lifecycle.rollback();
            throw caught;
        } finally {
            startupSettled.resolve();
        }

        sealAttachments(this);
        return this;
    }

    /** @internal */
    protected static reset(host?: object): boolean {
        if (host !== undefined && ServerHost.#liveHost !== host) return false;

        ServerHost.#liveShutdown?.removeSignalHandlers();
        ServerHost.#liveShutdown = undefined;
        ServerHost.#liveProcessErrors?.();
        ServerHost.#liveProcessErrors = undefined;
        ServerHost.#liveHost = undefined;
        ServerHost.#isInstantiated = false;
        return true;
    }
}

// the public `shutdown` field carries addTask alone
export function shutdownOf(host: Pick<ServerHost<Transport>, typeof HostShutdown>): CoordinatedShutdown {
    return host[HostShutdown];
}
