/* eslint-disable no-magic-numbers */

/**
 * All Seedcord error codes.
 */
export enum SeedcordErrorCode {
    /** One or more configured emojis could not be resolved at startup. */
    ConfigEmojiUnresolved = 1001,
    /** A webhook reporter's env var is set but fails webhook URL validation. */
    ConfigWebhookUrlInvalid = 1002,
    /** A configured webhook does not exist on Discord (deleted, or a wrong id or token). */
    ConfigWebhookNotFound = 1003,
    /** The generated route manifest was imported before `seedcord build` generated it. */
    ConfigManifestNotGenerated = 1004,
    /** A required environment variable is not present. */
    ConfigMissingEnv = 1005,
    /** An environment variable is present and fails validation. */
    ConfigInvalidEnv = 1006,
    /** A command usable in a guild is registered without the `Guilds` intent that caches guilds. */
    MissingGuildsIntent = 1007,
    /** The running Node version is below the range seedcord declares in `engines`. */
    UnsupportedNodeVersion = 1008,
    /** `DISCORD_BOT_TOKEN` passed its shape check and carries no readable application id. */
    ConfigTokenUnreadable = 1009,

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
    /** A host whose startup failed was started again. */
    LifecycleRestartAfterFailure = 1107,

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
    /** A file in a scanned directory threw while being imported. */
    CoreDirectoryImportFailed = 1206,
    /** A scanned directory could not be read. */
    CoreDirectoryUnreadable = 1207,
    /** A plugin was attached under a key the framework logs on. */
    CorePluginReservedChannel = 1208,
    /** The application id was read before startup resolved it. */
    CoreApplicationUnavailable = 1209,
    /** A generated accessor was read before startup resolved its values. */
    CoreAccessorUnresolved = 1210,
    /** A startup or shutdown task was added to a core built by `createSeedcord`. */
    CoreLifecycleUnavailable = 1211,

    /** Interaction middleware decorated with disallowed event filters. */
    DecoratorInteractionEventFilter = 1301,
    /** A command decorator attempted to re-register an existing command scope. */
    DecoratorCommandAlreadyRegistered = 1302,
    /** A global command decorator specified guild IDs, which is not allowed. */
    DecoratorCommandGlobalWithGuilds = 1303,
    /** A guild command decorator omitted the required guild ID list. */
    DecoratorCommandGuildWithoutGuilds = 1304,
    /** Middleware priority provided by the decorator was not a finite number. */
    DecoratorInvalidMiddlewarePriority = 1305,
    /** A WebhookLog subclass is missing its `@WebhookUrl` decorator. */
    DecoratorWebhookUrlMissing = 1306,

    /** Two interaction handlers registered the same route within a scope. */
    InteractionDuplicateRoute = 1401,
    /** Two different interaction middleware classes share a class name. */
    InteractionDuplicateMiddleware = 1402,
    /** A route manifest row gives an export name its module does not have. */
    InteractionRouteExportMissing = 1403,
    /** A subscriber manifest row specifies an export that does not extend `Subscriber`. */
    SubscriberRouteNotASubscriber = 1404,
    /** A manifest row's module threw while importing. */
    RouteModuleLoadFailed = 1405,

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
    /** A context menu handler's match() has no arm for the command name that fired. */
    ContextMenuMatchArmMissing = 1615,
    /** No field in the submitted modal carries the requested custom id. */
    ModalFieldNotFound = 1616,
    /** A modal field getter was called on a field of another kind. */
    ModalFieldWrongKind = 1617,
    /** Nothing was picked in a modal field read as required. */
    ModalFieldEmpty = 1618,
    /** A channel select field picked a channel outside the types getSelectedChannels() allows. */
    ModalFieldChannelType = 1619,

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

    /** A plugin's constructor rejected its options through `rejectOptions`. */
    PluginOptionsRejected = 2001,
    /** Two or more plugins threw while disposing. */
    PluginDisposeFailures = 2002,
    /** A plugin declared a lifecycle timeout that is not a positive, finite number of milliseconds. */
    PluginInvalidLifecycleTimeout = 2003,

    /** Mongoose service class is missing the `@RegisterMongooseService` decorator. */
    PluginMongooseServiceDecoratorMissing = 2101,
    /** Mongoose client failed to establish a connection. */
    PluginMongooseConnectionFailed = 2102,
    /** Mongoose client failed to disconnect cleanly during shutdown. */
    PluginMongooseDisconnectFailed = 2103,
    /** Mongoose `services` was accessed before the plugin finished initializing. */
    PluginMongooseServicesNotReady = 2104,
    /** Mongoose rejected the model, usually a duplicate model name or an absent schema. */
    PluginMongooseModelCreationFailed = 2105,
    /** A mongoose service was registered with an empty model name override. */
    PluginMongooseModelNameMissing = 2106,

    /** Kysely service class is missing the `@RegisterKyselyService` decorator. */
    PluginKyselyServiceDecoratorMissing = 2201,
    /** Kysely service class is missing its table metadata. */
    PluginKyselyServiceTableMissing = 2202,
    /** Migration manager received an invalid step count. */
    PluginKyselyInvalidStepCount = 2203,
    /** Migration direction was not recognized. */
    PluginKyselyUnknownDirection = 2204,
    /** Provided migrations path could not be resolved. */
    PluginKyselyUnresolvedMigrationsPath = 2205,
    /** No migration files were found for execution. */
    PluginKyselyNoMigrationFiles = 2206,
    /** A migration module failed to export the expected functions. */
    PluginKyselyInvalidMigrationModule = 2207,
    /** An arbitrary (non-Error) failure was reported by a migration. */
    PluginKyselyNonErrorFailure = 2208,
    /** Postgres pool failed to close cleanly during shutdown. */
    PluginKyselyDisconnectFailed = 2209,
    /** Kysely `services` was accessed before the plugin finished initializing. */
    PluginKyselyServicesNotReady = 2210,
    /** Postgres pool failed to establish a connection. */
    PluginKyselyConnectionFailed = 2211,
    /** Bootstrapper failed to ensure the target Postgres database exists. */
    PluginKyselyBootstrapFailed = 2212,

    /** Config file default export was not an object. */
    CliConfigInvalidExport = 3101,
    /** Config is missing the required instance string. */
    CliConfigMissingInstance = 3102,
    /** Unable to locate a Seedcord config file. */
    CliConfigNotFound = 3103,
    /** CLI entry file does not exist. */
    CliEntryNotFound = 3104,
    /** tsx failed to import the provided entry file. */
    CliTsxImportFailed = 3105,
    /** Native import and jiti fallback both failed. */
    CliImportFailed = 3106,
    /** Seedcord instance export is missing a start() method. */
    CliInstanceInvalid = 3107,
    /** Seedcord instance threw during startup. */
    CliStartFailed = 3108,
    /** Config is missing the required entry string. */
    CliConfigMissingEntry = 3109,
    /** Entry file must be inside the configured root directory. */
    CliConfigEntryOutsideRoot = 3110,
    /** Unable to locate a TypeScript config file for builds. */
    CliBuildTsconfigNotFound = 3111,
    /** TypeScript reported diagnostics during emit. */
    CliBuildFailed = 3112,
    /** Unable to write the generated bootstrap file. */
    CliBootstrapWriteFailed = 3113,
    /** Two commands resolve to the same slash route during codegen. */
    CliCodegenDuplicateRoute = 3114,
    /** The commands directory could not be read during codegen. */
    CliCodegenCommandsDirUnreadable = 3115,
    /** Two context-menu commands of the same kind share a name during codegen. */
    CliCodegenDuplicateContextMenu = 3116,
    /** Could not resolve the application from the bot token during `commands --clean`. */
    CliCleanAppFetchFailed = 3117,
    /** `commands --clean` ran with neither --guild nor --all-guilds. */
    CliCleanNoGuilds = 3118,
    /** `commands --clean` combined --purge with --all-guilds, which would wipe every guild. */
    CliCleanPurgeAllGuilds = 3119,
    /** An interactive prompt was cancelled (Ctrl-C), so the command aborts without changes. */
    CliCancelled = 3120,
    /** `commands --clean --all-guilds` matched more guilds than the safety threshold without `--yes`. */
    CliCleanLargeBotUnconfirmed = 3121,
    /** `commands --clean --apply` ran in a non-interactive environment without `--yes`, where it cannot prompt. */
    CliCleanApplyNeedsYes = 3122,
    /** The cloudflared metrics server never reported a quick-tunnel hostname. */
    CliTunnelUrlUnavailable = 3123,
    /** Discord rejected the tunnel URL as an interactions endpoint. */
    CliTunnelNotVerified = 3124,
    /** The tunnel URL never answered its health probe. */
    CliTunnelUnreachable = 3125,
    /** A config field is present with the wrong shape. */
    CliConfigInvalidField = 3126,
    /** A class carrying `@RegisterCommand` threw while codegen constructed it. */
    CliCodegenCommandConstructorThrew = 3127,

    /** A create prompt was cancelled (Ctrl-C), and nothing has been written yet. */
    CreateCancelled = 3201,
    /** A flag supplied an answer for a question the earlier answers skip. */
    CreateFlagNotApplicable = 3202,
    /** A flag carried a value its question rejects. */
    CreateInvalidAnswer = 3203,
    /** The command line did not parse. */
    CreateBadUsage = 3204,
    /** The target path already holds something. */
    CreateTargetNotEmpty = 3205,
    /** A command the scaffolder shelled out to exited non-zero. */
    CreateStepFailed = 3206
}
