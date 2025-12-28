/* eslint-disable no-magic-numbers */

/**
 * All Seedcord error codes.
 */
export enum SeedcordErrorCode {
    /** DISCORD_BOT_TOKEN is not present in the environment. */
    ConfigMissingDiscordToken = 1001,
    /** UNKNOWN_EXCEPTION_WEBHOOK_URL is missing when configuring the reporter. */
    ConfigUnknownExceptionWebhookMissing = 1002,
    /** UNKNOWN_EXCEPTION_WEBHOOK_URL is present but fails URL validation. */
    ConfigUnknownExceptionWebhookInvalid = 1003,

    /** Attempted to add lifecycle tasks after startup already completed. */
    LifecycleAddAfterCompletion = 1101,
    /** Attempted to add lifecycle tasks while startup is still running. */
    LifecycleAddDuringRun = 1102,
    /** Attempted to remove lifecycle tasks while startup is still running. */
    LifecycleRemoveDuringRun = 1103,
    /** Provided lifecycle phase identifier is not recognized. */
    LifecycleUnknownPhase = 1104,
    /** Startup phase completed with one or more task failures. */
    LifecyclePhaseFailures = 1105,
    /** A lifecycle task exceeded its configured timeout. */
    LifecycleTaskTimeout = 1106,

    /** Multiple Seedcord instances were created simultaneously. */
    CoreSingletonViolation = 1201,
    /** Plugins cannot be mutated after the core has finished initializing. */
    CorePluginAfterInit = 1202,
    /** A plugin tried to register with a key that already exists. */
    CorePluginKeyExists = 1203,
    /** Bot role lookup failed within the provided guild. */
    CoreBotRoleMissing = 1204,

    /** Interaction middleware decorated with disallowed event filters. */
    DecoratorInteractionEventFilter = 1301,
    /** A decorator could not find the original method being decorated. */
    DecoratorMethodNotFound = 1302,
    /** A command decorator attempted to re-register an existing command scope. */
    DecoratorCommandAlreadyRegistered = 1303,
    /** A global command decorator specified guild IDs, which is not allowed. */
    DecoratorCommandGlobalWithGuilds = 1304,
    /** A guild command decorator omitted the required guild ID list. */
    DecoratorCommandGuildWithoutGuilds = 1305,
    /** Middleware priority provided by the decorator was not a finite number. */
    DecoratorInvalidMiddlewarePriority = 1306,

    /** hexToNumber received a non-string input. */
    UtilHexInputType = 1401,
    /** hexToNumber received an invalid hex string. */
    UtilHexInvalid = 1402,
    /** buildSlashRoute received an invalid argument. */
    UtilInvalidSlashRouteArgument = 1403,

    /** Mongo service class is missing the `@RegisterMongoService` decorator. */
    PluginMongoServiceDecoratorMissing = 2101,
    /** Mongo model class is missing the `@RegisterMongoModel` decorator. */
    PluginMongoModelDecoratorMissing = 2102,
    /** Mongo client failed to establish a connection. */
    PluginMongoConnectionFailed = 2103,

    /** KPG service class is missing the `@RegisterKpgService` decorator. */
    PluginKpgServiceDecoratorMissing = 2201,
    /** KPG service class is missing its table metadata. */
    PluginKpgServiceTableMissing = 2202,
    /** Migration manager received an invalid step count. */
    PluginKpgInvalidStepCount = 2203,
    /** Migration direction was not recognized. */
    PluginKpgUnknownDirection = 2204,
    /** Provided migrations path could not be resolved. */
    PluginKpgUnresolvedMigrationsPath = 2205,
    /** No migration files were found for execution. */
    PluginKpgNoMigrationFiles = 2206,
    /** A migration module failed to export the expected functions. */
    PluginKpgInvalidMigrationModule = 2207,
    /** An arbitrary (non-Error) failure was reported by a migration. */
    PluginKpgNonErrorFailure = 2208,

    /** Config file default export was not an object. */
    CliConfigInvalidExport = 3101,
    /** Config is missing the required instance string. */
    CliConfigMissingInstance = 3102,
    /** Config root was provided but not a string. */
    CliConfigInvalidRoot = 3103,
    /** Unable to locate a Seedcord config file. */
    CliConfigNotFound = 3104,
    /** CLI entry file does not exist. */
    CliEntryNotFound = 3105,
    /** tsx failed to import the provided entry file. */
    CliTsxImportFailed = 3106,
    /** Native import and jiti fallback both failed. */
    CliImportFailed = 3107,
    /** Seedcord instance export is missing a start() method. */
    CliInstanceInvalid = 3108,
    /** Seedcord instance threw during startup. */
    CliStartFailed = 3109,
    /** Config is missing the required entry string. */
    CliConfigMissingEntry = 3110,
    /** Config build options must be an object when provided. */
    CliConfigInvalidBuild = 3111,
    /** Config build outDir must be a string when provided. */
    CliConfigInvalidBuildOutDir = 3112,
    /** Config build tsconfig must be a string when provided. */
    CliConfigInvalidBuildTsconfig = 3113,
    /** Config build bootstrap must be a string when provided. */
    CliConfigInvalidBuildBootstrap = 3114,
    /** Entry file must be inside the configured root directory. */
    CliConfigEntryOutsideRoot = 3115,
    /** Unable to locate a TypeScript config file for builds. */
    CliBuildTsconfigNotFound = 3116,
    /** TypeScript reported diagnostics during emit. */
    CliBuildFailed = 3117,
    /** Unable to write the generated bootstrap file. */
    CliBootstrapWriteFailed = 3118,
    /** Config tsconfig must be a string when provided. */
    CliConfigInvalidTsconfig = 3119
}
