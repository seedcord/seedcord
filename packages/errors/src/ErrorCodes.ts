/* eslint-disable no-magic-numbers */

/**
 * All Seedcord error codes.
 */
export enum SeedcordErrorCode {
    /** Two or more configured emojis could not be resolved at startup. */
    ConfigEmojiUnresolved = 1001,
    /** A configured emoji's value is neither a name nor a `[name, guildId]` pair. */
    ConfigEmojiInvalid = 1002,
    /** A configured emoji's name is missing from the application or guild it points at. */
    ConfigEmojiNotFound = 1003,
    /** The application or guild a configured emoji points at could not be read. */
    ConfigEmojiSourceUnreadable = 1004,
    /** A webhook reporter's env var is set but fails webhook URL validation. */
    ConfigWebhookUrlInvalid = 1005,
    /** A configured webhook does not exist on Discord (deleted, or a wrong id or token). */
    ConfigWebhookNotFound = 1006,
    /** A required environment variable is not present. */
    ConfigMissingEnv = 1007,
    /** An environment variable is present and fails validation. */
    ConfigInvalidEnv = 1008,
    /** A command usable in a guild is registered without the `Guilds` intent that caches guilds. */
    MissingGuildsIntent = 1009,
    /** The running Node or Bun version is below the range seedcord declares for it in `engines`. */
    UnsupportedRuntimeVersion = 1010,
    /** `DISCORD_BOT_TOKEN` passed its shape check and carries no readable application id. */
    ConfigTokenUnreadable = 1011,
    /** An edge config sets a REST sweeper interval. */
    ConfigEdgeRestSweeper = 1012,
    /** `DISCORD_PUBLIC_KEY` is unset and reading the key from Discord failed. */
    ConfigPublicKeyUnavailable = 1013,
    /** Another process already listens on the port seedcord tries to listen on. */
    PortInUse = 1014,

    /** Attempted to add lifecycle tasks after startup already completed. */
    LifecycleAddAfterCompletion = 1101,
    /** Attempted to add or remove lifecycle tasks while startup is still running. */
    LifecycleChangeDuringRun = 1102,
    /** Provided lifecycle phase identifier is not recognized. */
    LifecycleUnknownPhase = 1103,
    /** Startup phase completed with one or more task failures. */
    LifecyclePhaseFailures = 1104,
    /** A lifecycle task exceeded its configured timeout. */
    LifecycleTaskTimeout = 1105,
    /** A host whose startup failed was started again. */
    LifecycleRestartAfterFailure = 1106,
    /** The configured shutdown deadline is zero, negative, or not finite. */
    LifecycleInvalidShutdownDeadline = 1107,

    /** Multiple Seedcord instances were created simultaneously. */
    CoreSingletonViolation = 1201,
    /** A plugin was attached once the bot had started. */
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
    /** A generated accessor was read for a key that holds no value. */
    CoreAccessorUnresolved = 1210,
    /** A shutdown task was added on an edge bot. */
    CoreLifecycleUnavailable = 1211,
    /** `emit` was called on the bus. It reaches listeners and skips every subscriber. */
    CoreBusEmitUnavailable = 1212,
    /** A command decorator passed `'config'` while `commands.guilds` is empty. */
    CoreCommandGuildsEmpty = 1213,
    /** Discord refused the command deploy for one guild. */
    CoreCommandGuildDeployFailed = 1214,
    /** A plugin was attached under a group name the bot already uses. */
    CorePluginGroupTaken = 1215,
    /** A plugin was attached at a name that holds a group of plugins. */
    CorePluginKeyHoldsGroup = 1216,
    /** A plugin key is empty, has an empty part, or carries more than one dot. */
    CorePluginKeyMalformed = 1217,
    /** An attached plugin doesn't extend the `Plugin` class of the bot's `@seedcord/core`. */
    CorePluginFromOtherCore = 1218,
    /** A built bot scanned a folder outside `root`. */
    CoreDirectoryOutsideRoot = 1219,
    /** A file in a scanned directory could not be read as text. */
    CoreFileUnreadable = 1220,
    /** A plugin's declared transport or runtime differs from the bot it was attached to. */
    CorePluginScopeMismatch = 1221,
    /** A node http bot received a request through `fetch` before `start()` was called. */
    CoreFetchBeforeStart = 1222,
    /** An edge worker received a POST without the ids `seedcord build` writes into it. */
    CoreEdgeUnbuilt = 1223,
    /** A relative folder was read in a process that never received the bot's `root`. */
    CoreDirectoryRootUnknown = 1224,
    /** Discord refused the global command deploy. */
    CoreCommandGlobalDeployFailed = 1225,
    /** A built bot scanned a folder that did not exist under `root` when `seedcord build` ran. */
    CoreDirectoryNotBuilt = 1226,

    /** A command decorator attempted to re-register an existing command scope. */
    DecoratorCommandAlreadyRegistered = 1301,
    /** A global command decorator specified guild IDs, which is not allowed. */
    DecoratorCommandGlobalWithGuilds = 1302,
    /** A guild command decorator omitted the required guild ID list. */
    DecoratorCommandGuildWithoutGuilds = 1303,
    /** Middleware priority provided by the decorator was not a finite number. */
    DecoratorInvalidMiddlewarePriority = 1304,
    /** A WebhookLog subclass is missing its `@WebhookUrl` decorator. */
    DecoratorWebhookUrlMissing = 1305,
    /** A middleware decorator was given an empty filter array. */
    DecoratorEmptyMiddlewareFilter = 1306,

    /** Two interaction handlers registered the same route within a scope. */
    InteractionDuplicateRoute = 1401,
    /** Two different middleware classes share a class name. */
    DuplicateMiddleware = 1402,

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
    /** A oneOf() or someOf() field was declared with no choices. */
    CustomIdEmptyChoices = 1603,
    /** An int() field was declared with min greater than max. */
    CustomIdInvalidBounds = 1604,
    /** A field rejected the value given to encode(). */
    CustomIdValueRejected = 1605,
    /** An encoded customId exceeds Discord's 100-character limit. */
    CustomIdWireTooLong = 1606,
    /** A field name is declared more than once in the same customId chain. */
    CustomIdDuplicateFieldName = 1607,
    /** A component handler is missing the route decorator that matches its base. */
    CustomIdHandlerRouteMissing = 1608,
    /** A handler's match() has no arm for the route, field, event, or command that fired. */
    MatchArmMissing = 1609,
    /** An event handler or middleware read the fired event name but was constructed without one. */
    EventNameUnavailable = 1610,
    /** An autocomplete payload carried no focused option. */
    AutocompleteNoFocusedOption = 1611,
    /** No field in the submitted modal carries the requested custom id. */
    ModalFieldNotFound = 1612,
    /** A modal field getter was called on a field of another kind. */
    ModalFieldWrongKind = 1613,
    /** Nothing was picked in a modal field read as required. */
    ModalFieldEmpty = 1614,
    /** A channel select field picked a channel outside the types getSelectedChannels() allows. */
    ModalFieldChannelType = 1615,
    /** A customId was minted under an older shape of the same definition. */
    CustomIdWireStale = 1616,
    /** A customId wire is corrupt, truncated, or was minted by a different definition. */
    CustomIdWireInvalid = 1617,
    /** `dispatch.require()` was called for a key nothing wrote on this dispatch. */
    DispatchStateMissing = 1618,

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

    /** `renderTable` was given a `maxWidth` or `padding` outside the values it accepts. */
    UtilTableOptionInvalid = 1951,
    /** `assertNever` was reached at run time with a value its types ruled out. */
    UtilUnhandledUnionMember = 1952,

    /** A plugin's constructor rejected its options through `rejectOptions`. */
    PluginOptionsRejected = 2001,
    /** Two or more plugins threw while disposing. */
    PluginDisposeFailures = 2002,
    /** A plugin declared a lifecycle timeout that is not a positive, finite number of milliseconds. */
    PluginInvalidLifecycleTimeout = 2003,
    /** A plugin service class is missing the decorator that registers it. */
    PluginServiceDecoratorMissing = 2004,
    /** A plugin's `services` was read before the plugin finished initializing. */
    PluginServicesNotReady = 2005,
    /** A plugin could not connect to the service it wraps. */
    PluginConnectionFailed = 2006,
    /** A plugin could not disconnect cleanly from the service it wraps during shutdown. */
    PluginDisconnectFailed = 2007,

    /** Mongoose rejected the model, usually a duplicate model name or an absent schema. */
    PluginMongooseModelCreationFailed = 2101,
    /** A mongoose service was registered with an empty model name override. */
    PluginMongooseModelNameMissing = 2102,

    /** Kysely service class is missing its table metadata. */
    PluginKyselyServiceTableMissing = 2201,
    /** Migration manager received an invalid step count. */
    PluginKyselyInvalidStepCount = 2202,
    /** Migration direction was not recognized. */
    PluginKyselyUnknownDirection = 2203,
    /** A file in the migrations folder is missing its `up` function. */
    PluginKyselyInvalidMigrationModule = 2204,
    /** An arbitrary (non-Error) failure was reported by a migration. */
    PluginKyselyNonErrorFailure = 2205,
    /** Bootstrapper failed to ensure the target Postgres database exists. */
    PluginKyselyBootstrapFailed = 2206,
    /** Two files in the migrations folder share a name once their folder and extension are stripped. */
    PluginKyselyDuplicateMigrationName = 2207,

    /** An interactive prompt in `seedcord` or `create-seedcord` was cancelled (Ctrl-C). */
    CliCancelled = 3001,

    /** Config file default export was not an object. */
    CliConfigInvalidExport = 3101,
    /** Unable to locate a Seedcord config file. */
    CliConfigNotFound = 3102,
    /** CLI entry file does not exist. */
    CliEntryNotFound = 3103,
    /** The CLI could not load a config, bot, or command file. */
    CliImportFailed = 3104,
    /** The instance file's default export is not a constructed `Seedcord`. */
    CliInstanceInvalid = 3105,
    /** Seedcord instance threw during startup. */
    CliStartFailed = 3106,
    /** Entry file must be inside the configured root directory. */
    CliConfigEntryOutsideRoot = 3107,
    /** `build.tsconfig` points at a missing file, or it is unset and the config's folder has no `tsconfig.json`. */
    CliTsconfigNotFound = 3108,
    /** `seedcord build` found type errors in the project. */
    CliBuildFailed = 3109,
    /** Two commands resolve to the same slash route during codegen. */
    CliCodegenDuplicateRoute = 3110,
    /** Two context-menu commands of the same kind share a name during codegen. */
    CliCodegenDuplicateContextMenu = 3111,
    /** `commands clean` ran with neither --guilds nor --all-guilds. */
    CliCleanNoGuilds = 3112,
    /** The cloudflared metrics server never reported a quick-tunnel hostname. */
    CliTunnelUrlUnavailable = 3113,
    /** Discord rejected the tunnel URL as an interactions endpoint. */
    CliTunnelNotVerified = 3114,
    /** The tunnel URL never answered its health probe. */
    CliTunnelUnreachable = 3115,
    /** A config field is missing or has the wrong shape. */
    CliConfigInvalidField = 3116,
    /** A class carrying `@RegisterCommand` threw while seedcord constructed it. */
    CliCommandConstructorThrew = 3117,
    /** Vite threw while bundling the bot. */
    CliBundleFailed = 3118,
    /** `build.outDir` is `root` or a folder that contains it. */
    CliConfigOutDirDeletesRoot = 3119,
    /** `typescript` is not installed in the project. */
    CliTypescriptMissing = 3120,
    /** `build.outDir` already contains other files. */
    CliBuildOutDirNotEmpty = 3121,
    /** One CLI step found two or more problems. Each one is in the error's `errors`. */
    CliProblems = 3122,
    /** `seedcord codegen --check` found the committed augmentations stale. */
    CliCodegenOutOfDate = 3123,
    /** A file or folder in the project has a `#` in its path. */
    CliPathHasHash = 3124,
    /** An edge bot's tsconfig lacks the `workerd` condition. */
    CliEdgeWithoutWorkerdCondition = 3125,
    /** A bot with no wrangler config sets the `workerd` condition in its tsconfig. */
    CliWorkerdConditionWithoutWrangler = 3126,
    /** TypeScript could not read the project's tsconfig. */
    CliTsconfigUnreadable = 3127,
    /** The CLI could not start the TypeScript compiler process. */
    CliTypescriptNotStarted = 3128,
    /** An edge bot's seedcord config sets `entry`. */
    CliConfigEntryOnEdge = 3129,
    /** An edge bot's project does not have `@cloudflare/vite-plugin` installed. */
    CliEdgeVitePluginMissing = 3130,
    /** An edge bot's `compatibility_date` predates Cloudflare's Node compat default with no flag to turn it on. */
    CliEdgeCompatDateTooOld = 3131,
    /** An edge bot sets `no_nodejs_compat`. */
    CliEdgeNodeCompatOff = 3132,
    /** The build could not start the edge worker in workerd. */
    CliEdgeBootFailed = 3133,
    /** An edge bot's `root` holds its seedcord config. */
    CliEdgeRootHoldsConfig = 3134,
    /** The CLI could not read the application from Discord with `DISCORD_BOT_TOKEN`. */
    CliApplicationUnreadable = 3135,
    /** The CLI could not read the commands deployed globally or to a guild. */
    CliCommandsUnreadable = 3136,
    /** An edge build found commands in code that have no deployed id on Discord. */
    CliEdgeCommandsNotDeployed = 3137,
    /** An edge bot's project does not have `wrangler` installed. */
    CliEdgeWranglerMissing = 3138,
    /** Wrangler could not read an edge bot's wrangler config. */
    CliEdgeWranglerConfigUnreadable = 3139,
    /** Something called the dev runtime before `start()` finished or after `stop()`. A bug in seedcord. */
    CliDevRuntimeNotRunning = 3140,
    /** `seedcord commands deploy` ran on a bot whose `commands.path` is `null`. */
    CliDeployNoCommandsFolder = 3141,
    /** `seedcord commands deploy` ran where it cannot ask first, without `--yes`. */
    CliDeployNeedsYes = 3142,
    /** `seedcord commands purge` ran with none of --global, --guilds or --all-guilds. */
    CliPurgeNoTargets = 3143,
    /** A class carrying `@RegisterCommand` builds a component that is not a command or a context menu. */
    CliCommandNotACommand = 3144,
    /** `seedcord commands clean` or `purge` could not delete some of the commands it selected. */
    CliCommandsNotDeleted = 3145,

    /** A flag supplied an answer for a question the earlier answers skip. */
    CreateFlagNotApplicable = 3201,
    /** A flag carried a value its question rejects. */
    CreateInvalidAnswer = 3202,
    /** The command line did not parse. */
    CreateBadUsage = 3203,
    /** The target path already holds something. */
    CreateTargetNotEmpty = 3204,
    /** A command the scaffolder shelled out to exited non-zero. */
    CreateStepFailed = 3205
}
