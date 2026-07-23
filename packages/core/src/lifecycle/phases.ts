/**
 * Startup phases for coordinated initialization
 *
 * Defines the order in which different components are initialized during bot startup.
 */
export enum StartupPhase {
    /** Validate environment variables and config files */
    Validation = 1,
    /** Discover plugin constructors via decorators or registry */
    Discovery,
    /** Register plugin metadata and declared dependencies */
    Registration,
    /** Inject and validate plugin-specific configuration */
    Configuration,
    /** Instantiate plugin classes with Core and arguments */
    Instantiation,
    /** Activate plugins by calling their init/setup methods */
    Activation,
    /** Mark seedcord as ready and start handling interactions */
    Ready
}

/**
 * Shutdown phases for coordinated application shutdown.
 */
export enum ShutdownPhase {
    /** Stop accepting new requests/interactions */
    StopAcceptingRequests = 1,
    /** Stop background services (health checks, etc.) */
    StopServices,
    /** Disconnect from external resources (database, APIs) */
    ExternalResources,
    /** Disconnect from Discord */
    DiscordCleanup,
    /** Final cleanup tasks */
    FinalCleanup
}
