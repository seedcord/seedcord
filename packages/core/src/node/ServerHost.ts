import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { LoggerChannelRegistry } from '@seedcord/logger';
import { installNodeConsole, installNodeDefaults } from '@seedcord/logger/node';
import { HostShutdown, HostStartup } from '@seedcord/types/internal';
import { runsUnderSeedcordDev } from '@seedcord/utils/internal';

import { assertDeclaredRuntime } from '#node/assertRuntimeVersion';
import { ShutdownPhase } from '#src/lifecycle/phases';
import { PluginLifecycle } from '#src/lifecycle/PluginLifecycle';
import { attachmentsOf, PluginHost, sealAttachments } from '#src/plugin/PluginHost';

import { registerProcessErrors } from './processErrors';

import type { CoordinatedShutdown, ShutdownTasks } from '#node/Lifecycle/CoordinatedShutdown';
import type { CoordinatedStartup, StartupTasks } from '#src/lifecycle/CoordinatedStartup';
import type { Transport } from '#src/plugin/options';
import type { Config } from '@seedcord/types';
import type { Promisable } from 'type-fest';

/** Base class for a transport `Seedcord` class that runs as a long-lived node or bun process. */
export abstract class ServerHost<BotT extends Transport> extends PluginHost<BotT, 'server'> {
    /** @internal */
    readonly [HostShutdown]: CoordinatedShutdown;
    /** @internal */
    readonly [HostStartup]: CoordinatedStartup;

    /** Add a task that runs while the bot shuts down. */
    public readonly shutdown: ShutdownTasks;

    /** Add a task that runs while the bot starts. */
    public readonly startup: StartupTasks;

    readonly #lifecycle: PluginLifecycle;
    #startFailed = false;
    #initPromise?: Promise<this> | undefined;

    static #isInstantiated = false;
    static #liveHost?: object | undefined;
    static #liveShutdown?: CoordinatedShutdown | undefined;
    static #liveProcessErrors?: (() => void) | undefined;

    constructor(transport: BotT, shutdown: CoordinatedShutdown, startup: CoordinatedStartup, driver: Config['kv']) {
        // a `sideEffects: false` build would drop the same call in the node entry
        assertDeclaredRuntime();
        super(transport, 'server', driver);

        if (ServerHost.#isInstantiated) throw new SeedcordError(SeedcordErrorCode.CoreSingletonViolation);

        // init() opens the log file
        installNodeConsole();

        ServerHost.#isInstantiated = true;
        ServerHost.#liveHost = this;
        ServerHost.#liveShutdown = shutdown;
        this[HostShutdown] = shutdown;
        this[HostStartup] = startup;
        // a getter returning the slot would expose run() and the signal handlers too
        this.shutdown = { addTask: shutdown.addTask.bind(shutdown) };
        this.startup = { addTask: startup.addTask.bind(startup) };
        this.#lifecycle = new PluginLifecycle(this.startup, this.shutdown);
        shutdown.addTask(ShutdownPhase.Release, 'close-kv', async () => {
            await using _driver = this.kv.driver;
        });
    }

    /** @internal */
    protected init(): Promise<this> {
        // a retry after a rejection runs #runInit again and hits its restart guard
        this.#initPromise ??= this.#runInit().catch(async (caught: unknown) => {
            this.#initPromise = undefined;
            await this.#release(1);
            throw caught;
        });
        return this.#initPromise;
    }

    async #runInit(): Promise<this> {
        // a rerun after a failed startup would re-init the rolled-back plugins
        if (this.#startFailed) throw new SeedcordError(SeedcordErrorCode.LifecycleRestartAfterFailure);

        installNodeDefaults(this.config.logger);
        sealAttachments(this);
        this.#lifecycle.register(attachmentsOf(this));

        // codegen and the build construct the bot without starting it.
        // under seedcord dev the CLI handles SIGINT and SIGTERM
        if (!runsUnderSeedcordDev()) this[HostShutdown].registerSignalHandlers();
        if (this.config.errors?.catchProcessErrors ?? true) {
            ServerHost.#liveProcessErrors = registerProcessErrors(this, this[HostShutdown]);
        }

        const startupSettled: PromiseWithResolvers<void> = Promise.withResolvers();
        this[HostShutdown].gateOnStartup(startupSettled.promise);

        try {
            // nothing a plugin adds through startup.addTask runs after this
            await this[HostStartup].run(() => this.openHealth());
        } catch (caught) {
            this.#startFailed = true;
            await this.#lifecycle.rollback();
            throw caught;
        } finally {
            startupSettled.resolve();
        }

        return this;
    }

    /** @internal */
    protected openHealth(): Promisable<void> {}

    /**
     * Runs the coordinated shutdown without calling `process.exit`. A new `Seedcord` can be
     * constructed afterwards. `await using` calls this when its scope ends.
     *
     * @example
     * ```ts
     * // the bot shuts down when this block ends
     * await using bot = await new Seedcord(config).start();
     * console.log(await bot.rest.get(Routes.user('@me')));
     * ```
     */
    public async [Symbol.asyncDispose](): Promise<void> {
        await this.#release(0);
    }

    async #release(exitCode: number): Promise<void> {
        try {
            await this[HostShutdown].run(exitCode, false);
        } finally {
            ServerHost.reset(this);
        }
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
        // configure() keeps the dev TUI's capture sink
        LoggerChannelRegistry.instance.configure({});
        return true;
    }
}

// the public `shutdown` field carries addTask alone
export function shutdownOf(host: Pick<ServerHost<Transport>, typeof HostShutdown>): CoordinatedShutdown {
    return host[HostShutdown];
}
