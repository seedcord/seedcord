import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Logger, LoggerChannelRegistry } from '@seedcord/logger';
import { installNodeConsole, installNodeDefaults } from '@seedcord/logger/node';
import { HostDevUrl, HostListenHost, HostPlugins, HostShutdown, HostStartup } from '@seedcord/types/internal';
import { runsUnderSeedcordDev } from '@seedcord/utils/internal';

import { assertDeclaredRuntime } from '#node/assertDeclaredRuntime';
import { getDevChannel } from '#src/hmr/devChannel';
import { ShutdownPhase, StartupPhase } from '#src/lifecycle/phases';
import { PluginLifecycle } from '#src/lifecycle/PluginLifecycle';
import { PluginHost, sealAttachments } from '#src/plugin/PluginHost';
import { publicUrl } from '#src/publicUrl';

import { registerProcessErrors } from './processErrors';
import { WebServer } from './WebServer';

import type { CoordinatedShutdown, ShutdownTasks } from '#node/Lifecycle/CoordinatedShutdown';
import type { CoordinatedStartup, StartupTasks } from '#src/lifecycle/CoordinatedStartup';
import type { Transport } from '#src/plugin/options';
import type { Config, ServerHostConfig } from '@seedcord/types';

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

    /** @internal */
    public [HostListenHost]?: string | undefined;
    /** @internal */
    public [HostDevUrl]?: string | undefined;

    public abstract override readonly config: ServerHostConfig;

    readonly #lifecycle: PluginLifecycle;
    readonly #web: WebServer;
    #startFailed = false;
    #initPromise?: Promise<this> | undefined;

    static #isInstantiated = false;
    static #liveHost?: object | undefined;
    static #liveShutdown?: CoordinatedShutdown | undefined;
    static #liveProcessErrors?: (() => void) | undefined;

    constructor(transport: BotT, shutdown: CoordinatedShutdown, startup: CoordinatedStartup, driver: Config['kv']) {
        // a `sideEffects: false` build would remove the same call from the node entry
        const runtime = assertDeclaredRuntime();
        super(transport, 'server', driver);

        if (ServerHost.#isInstantiated) throw new SeedcordError(SeedcordErrorCode.CoreSingletonViolation);

        // init() opens the log file
        installNodeConsole();

        if (runtime.status === 'untested') {
            new Logger('Runtime').warn(
                `seedcord isn't tested on ${runtime.name} and some things may not work. It supports Node and Bun.`
            );
        }

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

        this.#web = new WebServer({
            // the subclass assigns config after this constructor returns
            config: () => this.config.server,
            shutdown: this.shutdown,
            startup,
            plugins: this[HostPlugins],
            interactions: this.answerInteractions?.bind(this)
        });
        startup.addTask(StartupPhase.Ready, 'web-server', async () => {
            const tunnel = this.#devTunnel;
            await this.#web.serve(tunnel?.listenHost);
            if (tunnel) getDevChannel()?.send('seedcord:server-port', { port: this.port ?? false });
        });
    }

    /** @internal */
    protected answerInteractions?(request: Request): Promise<Response>;

    // seedcord dev opens its tunnel only to a server that takes interactions
    get #devTunnel(): { listenHost: string | undefined; url: string | undefined } | undefined {
        if (!this.answerInteractions) return undefined;
        return { listenHost: this[HostListenHost], url: this[HostDevUrl] };
    }

    /** The port the bot's web server listens on. `undefined` until `start()` opens it, and when the bot doesn't open one. */
    public get port(): number | undefined {
        return this.#web.port;
    }

    /**
     * The address people reach your bot at, from `server.url` in your config. You only need to set
     * `server.url` if a plugin or your own code reads this.
     *
     * @throws A **SeedcordError** when you read it and you haven't set `server.url` unless `seedcord dev` gave the bot an address.
     * @throws A **SeedcordTypeError** when you read it and `server.url` isn't an http or https address.
     */
    public get url(): URL {
        const devUrl = this.#devTunnel?.url ?? (runsUnderSeedcordDev() ? this.#web.localUrl : undefined);
        return publicUrl(this.config.server?.url, devUrl);
    }

    /**
     * Answers one web request: the health path, then each plugin's `fetch` in attach order. When
     * every plugin passes, an http bot's interactions engine gets a POST, and anything else gets a
     * 404. Mount it in your own server when you set `server: { port: false }`, and send it
     * every path so plugin routes reach the bot.
     *
     * Rejects with `CoreFetchBeforeStart` until `start()` is called. Until every plugin's `ready()`
     * finishes, the health path answers 503. Any other request waits until the Ready phase begins.
     * Answers 503 once shutdown begins or `start()` fails.
     *
     * @example
     * ```ts
     * // Hono passes the untouched request through c.req.raw
     * const seedcord = new Seedcord({ ...config, server: { port: false } });
     * await seedcord.start();
     *
     * const app = new Hono();
     * app.all('*', (c) => seedcord.fetch(c.req.raw));
     * ```
     */
    public fetch(request: Request): Promise<Response> {
        return this.#web.fetch(request);
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
        this.#lifecycle.register(this[HostPlugins].attachments);

        // codegen and the build construct the bot without starting it.
        // under seedcord dev the CLI handles SIGINT and SIGTERM
        if (!runsUnderSeedcordDev()) this[HostShutdown].registerSignalHandlers();
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

        return this;
    }

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

// the public `shutdown` field has only addTask
export function shutdownOf(host: Pick<ServerHost<Transport>, typeof HostShutdown>): CoordinatedShutdown {
    return host[HostShutdown];
}
