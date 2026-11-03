/**
 * Startup phases, in run order.
 */
export enum StartupPhase {
    /** Nothing connected. Plugin init runs here by default. */
    Configuration = 1,
    /** The gateway session opens, and http runs its REST-only startup work. */
    Login,
    /** Handlers are live and interactions dispatch. */
    Ready
}

/**
 * Shutdown phases, in run order.
 */
export enum ShutdownPhase {
    /** Stop taking new interactions and requests. */
    Unbind = 1,
    /** Waits for in-flight work to settle and stops internal services. */
    Drain,
    /** External resources close. Plugin dispose runs here by default. */
    Disconnect,
    /** The client disconnects last so in-flight handlers can still reference it during drain. */
    Logout,
    /**
     * Resources seedcord holds for the bot, like the `config.kv` driver, close after every plugin
     * has stopped. Only seedcord runs work here.
     */
    Release
}

// the phases a bot's shutdown task or a plugin's dispose() can run in
export type TaskShutdownPhase = Exclude<ShutdownPhase, ShutdownPhase.Release>;
