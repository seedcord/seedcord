/* eslint-disable no-magic-numbers */

/**
 * All Seedcord error codes.
 */
export enum SeedcordErrorCode {
    /** DISCORD_BOT_TOKEN is not present in the environment. */
    ConfigMissingDiscordToken = 1001,
    /** DISCORD_BOT_TOKEN is present but fails validation. */
    ConfigIncorrectDiscordToken = 1004,
    /** One or more configured emojis could not be resolved at startup. */
    ConfigEmojiUnresolved = 1005,
    /** A webhook reporter's env var is set but fails webhook URL validation. */
    ConfigWebhookUrlInvalid = 1006,
    /** A configured webhook does not exist on Discord (deleted, or a wrong id or token). */
    ConfigWebhookNotFound = 1007,
    /** DISCORD_PUBLIC_KEY is not present in the environment. */
    ConfigMissingPublicKey = 1008,
    /** DISCORD_PUBLIC_KEY is present but fails validation. */
    ConfigIncorrectPublicKey = 1009,

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
    /** A bot controller was constructed without its required handlers directory. */
    CoreControllerPathMissing = 1205,

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
    /** A WebhookLog subclass is missing its `@WebhookUrl` decorator. */
    DecoratorWebhookUrlMissing = 1307,

    /** Two interaction handlers registered the same route within a scope. */
    InteractionDuplicateRoute = 1401,
    /** Two different interaction middleware classes share a class name. */
    InteractionDuplicateMiddleware = 1402,

    /** A reply method was called in an ack state where it is illegal. */
    ReplyIllegalAckState = 1501,
    /** A reply component failed to serialize to raw API data. */
    ReplyComponentSerialization = 1502,
    /** edit() was passed a message the interaction did not send. */
    ReplyForeignEditTarget = 1503,
    /** update() or deferUpdate() was called on a modal with no source message. */
    ReplyUpdateWithoutSource = 1504,
    /** A withResponse interaction callback returned no created message. */
    ReplyCallbackMissingMessage = 1505,

    /** A customId definition prefix contains a reserved character (a colon or a control char). */
    CustomIdInvalidPrefix = 1601,
    /** A customId field name is integer-like, which JS would silently reorder. */
    CustomIdReservedFieldName = 1602,
    /** A oneOf() field was declared with no choices. */
    CustomIdEmptyChoices = 1603,
    /** An int() field was declared with min greater than max. */
    CustomIdInvalidBounds = 1604,
    /** A value passed to encode() is outside its field's allowed range. */
    CustomIdValueOutOfRange = 1605,
    /** An encoded customId exceeds Discord's 100-character limit. */
    CustomIdWireTooLong = 1606,
    /** A field name is declared more than once in the same customId chain. */
    CustomIdDuplicateFieldName = 1607,
    /** A component handler is missing its route decorator (\@ButtonRoute / \@ModalRoute / \@SelectMenuRoute). */
    CustomIdHandlerRouteMissing = 1608,
    /** match() received a decoded route with no matching arm. */
    CustomIdMatchArmMissing = 1609,
    /** A slash handler's match() has no arm for the command route that fired. */
    SlashMatchArmMissing = 1610,
    /** An autocomplete handler's match() has no arm for the focused field that fired. */
    AutocompleteMatchArmMissing = 1611,
    /** An event handler's match() has no arm for the event name that fired. */
    EventMatchArmMissing = 1612,
    /** Event middleware read `this.eventName` but was constructed without a fired event name. */
    EventMiddlewareNameUnavailable = 1613,
    /** An autocomplete payload carried no focused option. */
    AutocompleteNoFocusedOption = 1614,

    /** A Cooldown gate was given a duration string that is not a well-formed positive duration. */
    GateInvalidCooldownDuration = 1701,

    /** A paginator source was given a perPage that is not a positive integer. */
    PaginationInvalidPerPage = 1801,
    /** A control row was assembled with more than the five buttons Discord allows. */
    PaginationTooManyControls = 1802,
    /** A control row was assembled with no controls. */
    PaginationEmptyControls = 1803,
    /** A control row repeats the same control, which would collide the custom_ids. */
    PaginationDuplicateControls = 1804,

    /** A color value could not be resolved to a Discord color integer. */
    ColorUnresolvable = 1901,
    /** A resolved color fell outside Discord's 0x000000 to 0xffffff range. */
    ColorOutOfRange = 1902,

    /** Mongo service class is missing the `@RegisterMongoService` decorator. */
    PluginMongoServiceDecoratorMissing = 2101,
    /** Mongo model class is missing the `@RegisterMongoModel` decorator. */
    PluginMongoModelDecoratorMissing = 2102,
    /** Mongo client failed to establish a connection. */
    PluginMongoConnectionFailed = 2103,
    /** Mongo client failed to disconnect cleanly during shutdown. */
    PluginMongoDisconnectFailed = 2104,
    /** Mongo `services` was accessed before the plugin finished initializing. */
    PluginMongoServicesNotReady = 2105,

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
    /** Postgres pool failed to close cleanly during shutdown. */
    PluginKpgDisconnectFailed = 2209,
    /** KPG `services` was accessed before the plugin finished initializing. */
    PluginKpgServicesNotReady = 2210,

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
    CliConfigInvalidTsconfig = 3119,
    /** Config hmr options must be an object when provided. */
    CliConfigInvalidHmr = 3120,
    /** Config hmr restart patterns must be an array of strings when provided. */
    CliConfigInvalidHmrRestart = 3121,
    /** Two commands resolve to the same slash route during codegen. */
    CliCodegenDuplicateRoute = 3122,
    /** The commands directory could not be read during codegen. */
    CliCodegenCommandsDirUnreadable = 3123,
    /** Two context-menu commands of the same kind share a name during codegen. */
    CliCodegenDuplicateContextMenu = 3124,
    /** Could not resolve the application from the bot token during `commands --clean`. */
    CliCleanAppFetchFailed = 3126,
    /** `commands --clean` ran with neither --guild nor --all-guilds, so there is nothing to scan. */
    CliCleanNoGuilds = 3127,
    /** `commands --clean` combined --purge with --all-guilds, which would wipe every guild. */
    CliCleanPurgeAllGuilds = 3128,
    /** An interactive prompt was cancelled (Ctrl-C), so the command aborts without changes. */
    CliCancelled = 3129,
    /** `commands --clean --all-guilds` matched more guilds than the safety threshold without `--yes`. */
    CliCleanLargeBotUnconfirmed = 3130,
    /** `commands --clean --apply` ran in a non-interactive environment without `--yes`, where it cannot prompt. */
    CliCleanApplyNeedsYes = 3131,
    /** Config hmr rollback flag must be a boolean when provided. */
    CliConfigInvalidHmrRollback = 3132
}
