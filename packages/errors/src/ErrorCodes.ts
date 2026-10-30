/* eslint-disable no-magic-numbers */

/**
 * All Seedcord error codes.
 */
export enum SeedcordErrorCode {
    /** Two or more configured emojis failed to resolve at startup. */
    ConfigEmojiUnresolved = 1001,
    /** A configured emoji is neither a name nor a `[name, guildId]` pair. */
    ConfigEmojiInvalid = 1002,
    /** The application or guild a configured emoji points at has no emoji with that name. */
    ConfigEmojiNotFound = 1003,
    /** Reading the emojis of the application or guild a configured emoji points at failed. */
    ConfigEmojiSourceUnreadable = 1004,
    /** Discord has no webhook at a configured URL, because it was deleted or the id or token is wrong. */
    ConfigWebhookNotFound = 1005,
    /** A required environment variable is unset. */
    ConfigMissingEnv = 1006,
    /** An environment variable is set to a value seedcord cannot use. */
    ConfigInvalidEnv = 1007,
    /** A command that runs in guilds is registered without the `Guilds` intent, so discord.js caches no guild. */
    MissingGuildsIntent = 1008,
    /** The running Node or Bun is older than the range seedcord declares in `engines`. */
    UnsupportedRuntimeVersion = 1009,
    /** An edge config sets a REST sweeper interval. */
    ConfigEdgeRestSweeper = 1010,
    /** Another process already listens on the port seedcord tries to listen on. */
    PortInUse = 1011,

    /** A startup task was added or removed while startup ran, or added after it finished. */
    LifecycleTaskChangeRejected = 1101,
    /** A lifecycle call got a phase that is not a member of `StartupPhase` or `ShutdownPhase`. */
    LifecycleUnknownPhase = 1102,
    /** One or more tasks failed during a startup phase. */
    LifecyclePhaseFailures = 1103,
    /** A lifecycle task ran past its timeout. */
    LifecycleTaskTimeout = 1104,
    /** A host whose startup failed was started again. */
    LifecycleRestartAfterFailure = 1105,
    /** A shutdown deadline or a plugin's lifecycle timeout is zero, negative, or not finite. */
    LifecycleInvalidTimeout = 1106,

    /** A second Seedcord instance was constructed while one already exists. */
    CoreSingletonViolation = 1201,
    /** A plugin was attached after the bot started. */
    CorePluginAfterInit = 1202,
    /** A plugin was attached under a key another plugin already uses. */
    CorePluginKeyExists = 1203,
    /** The bot's own role is missing from the guild's role cache. */
    CoreBotRoleMissing = 1204,
    /** A bot controller was constructed without the folder that holds its handlers. */
    CoreControllerPathMissing = 1205,
    /** seedcord could not import a file in the bot or in the CLI. */
    CoreImportFailed = 1206,
    /** A file or folder that seedcord reads could not be read. */
    CorePathUnreadable = 1207,
    /** A plugin was attached under a key that the framework logs on. */
    CorePluginReservedChannel = 1208,
    /** The application id was read before startup resolved it. */
    CoreApplicationUnavailable = 1209,
    /** A generated accessor like `Emojis` or `Commands` was read for a key that has no value yet. */
    CoreAccessorUnresolved = 1210,
    /** A shutdown task was added on an edge bot. Cloudflare stops an isolate without a shutdown hook. */
    CoreLifecycleUnavailable = 1211,
    /** `emit` was called on the bus. It calls the listeners and skips every subscriber. */
    CoreBusEmitUnavailable = 1212,
    /** A command registers to the `'config'` guilds while `commands.guilds` is empty. */
    CoreCommandGuildsEmpty = 1213,
    /** Discord refused the command deploy for one guild. */
    CoreCommandGuildDeployFailed = 1214,
    /** A plugin was attached under a group name the bot already uses. */
    CorePluginGroupTaken = 1215,
    /** A plugin was attached at a name that holds a group of plugins. */
    CorePluginKeyHoldsGroup = 1216,
    /** A plugin key is empty, has an empty part, or has more than one dot. */
    CorePluginKeyMalformed = 1217,
    /** An attached plugin extends the `Plugin` class of a different copy of `@seedcord/core`. */
    CorePluginFromOtherCore = 1218,
    /** A folder or the `build.start` file is outside `root`. */
    CorePathOutsideRoot = 1219,
    /** A plugin declares a transport or runtime the bot doesn't use. */
    CorePluginScopeMismatch = 1220,
    /** A node http bot got a request through `fetch` before `start()` was called. */
    CoreFetchBeforeStart = 1221,
    /** An edge worker got a POST without the ids that `seedcord build` writes into it. */
    CoreEdgeUnbuilt = 1222,
    /** A relative folder was read in a process that never got the bot's `root`. */
    CoreDirectoryRootUnknown = 1223,
    /** Discord refused the global command deploy. */
    CoreCommandGlobalDeployFailed = 1224,
    /** A built bot read a folder that did not exist under `root` when `seedcord build` ran. */
    CoreDirectoryNotBuilt = 1225,
    /** A webhook sender was constructed with a URL that is not a Discord webhook URL. */
    CoreWebhookUrlInvalid = 1226,
    /** Reading from Discord with `DISCORD_BOT_TOKEN` failed, like the application, its public key, or its commands. */
    CoreDiscordReadFailed = 1227,
    /** Two routes, commands, migrations, or customId fields have the same name, or two code files build to the same file. */
    CoreDuplicateName = 1228,
    /** A Vite plugin from `vitePlugins` threw while Vite started or loaded a file, or failed when seedcord called `vitePlugins`. */
    CoreVitePluginThrew = 1229,
    /** `readFiles` read a folder that `files` in `seedcord.config.ts` leaves out. */
    CoreDirectoryNotListed = 1230,
    /** A folder is inside one that `seedcord build` skips, like a dot-folder, `node_modules`, `outDir` or the logs folder. */
    CoreDirectorySkipped = 1231,
    /** `collection.entries()` ran on a Keyv store in `config.kv` that can't list its keys. */
    CoreKvKeysUnsupported = 1232,
    /** A plugin built with `new` outside `attach()` read `this.kv`. */
    CorePluginKvOutsideAttach = 1233,
    /** The driver in `config.kv` threw, or reported a write as failed. */
    CoreKvDriverFailed = 1234,

    /** A command class carries `@RegisterCommand` twice. */
    DecoratorCommandAlreadyRegistered = 1301,
    /** `@RegisterCommand('global')` was given guild ids. */
    DecoratorCommandGlobalWithGuilds = 1302,
    /** `@RegisterCommand('guild')` was given no guild ids. */
    DecoratorCommandGuildWithoutGuilds = 1303,
    /** A middleware decorator sets a priority that is not a finite number. */
    DecoratorInvalidMiddlewarePriority = 1304,
    /** A `WebhookLog` subclass is missing its `@WebhookUrl` decorator. */
    DecoratorWebhookUrlMissing = 1305,
    /** A middleware decorator got an empty filter array. */
    DecoratorEmptyMiddlewareFilter = 1306,

    /** A reply method was called in an ack state where Discord rejects it. */
    ReplyIllegalAckState = 1501,
    /** A reply component threw while seedcord serialized it. */
    ReplyComponentSerialization = 1502,
    /** `edit()` got a message that the interaction did not send. */
    ReplyForeignEditTarget = 1503,
    /** `update()` or `deferUpdate()` was called on a modal that has no source message. */
    ReplyUpdateWithoutSource = 1504,
    /** Discord's response to a `withResponse` callback has no message in it. */
    ReplyCallbackMissingMessage = 1505,

    /** A customId prefix is empty, or holds a colon or a control character. */
    CustomIdInvalidPrefix = 1601,
    /** A customId field name looks like an integer. JS reorders integer keys. */
    CustomIdReservedFieldName = 1602,
    /** A `oneOf()` or `someOf()` field was declared with no choices. */
    CustomIdEmptyChoices = 1603,
    /** An `int()` field was declared with a min greater than its max. */
    CustomIdInvalidBounds = 1604,
    /** `encode()` got a value that doesn't fit its field. */
    CustomIdValueRejected = 1605,
    /** An encoded customId is longer than the 100 characters Discord allows. */
    CustomIdWireTooLong = 1606,
    /** A component handler is missing the route decorator that matches its base. */
    CustomIdHandlerRouteMissing = 1607,
    /** A handler's `match()` has no arm for the current route, field, event, or command. */
    MatchArmMissing = 1608,
    /** An event handler or middleware read the event name but was constructed without one. */
    EventNameUnavailable = 1609,
    /** Discord sent an autocomplete payload with no focused option. */
    AutocompleteNoFocusedOption = 1610,
    /** The submitted modal has no field with the requested custom id. */
    ModalFieldNotFound = 1611,
    /** A modal field getter was called on a field of another kind. */
    ModalFieldWrongKind = 1612,
    /** A modal field read as required has nothing picked. */
    ModalFieldEmpty = 1613,
    /** A channel select returned a channel whose type the `getSelectedChannels()` call excludes. */
    ModalFieldChannelType = 1614,
    /** A customId was encoded under an older shape of the same definition. */
    CustomIdWireStale = 1615,
    /** A customId is corrupt, truncated, or was encoded by a different definition. */
    CustomIdWireInvalid = 1616,
    /** `dispatch.require()` was called for a key that nothing set on this dispatch. */
    DispatchStateMissing = 1617,

    /** A `Cooldown` gate got a duration that doesn't parse, or one of zero or less. */
    GateInvalidCooldownDuration = 1701,

    /** A paginator got a `perPage` that is not a positive integer. */
    PaginationInvalidPerPage = 1801,
    /** A control row has no controls, or more than the five buttons Discord allows. */
    PaginationControlCount = 1802,
    /** A control row lists the same control twice. Its two buttons would share a custom_id. */
    PaginationDuplicateControls = 1803,

    /** A color value doesn't resolve to a Discord color integer. */
    ColorUnresolvable = 1901,
    /** A resolved color is outside Discord's range of 0x000000 to 0xffffff. */
    ColorOutOfRange = 1902,

    /** `renderTable` got a `maxWidth` or `padding` outside the values it accepts. */
    UtilTableOptionInvalid = 1951,
    /** `assertNever` ran with a value that its types ruled out. */
    UtilUnhandledUnionMember = 1952,

    /** `WinstonFileSink` got a `filename` with a folder in it. File logs always go in the logs folder. */
    LoggerFileNameHasFolder = 1971,

    /** A plugin's constructor called `rejectOptions` on the options it got. */
    PluginOptionsRejected = 2001,
    /** Two or more plugins threw while disposing. */
    PluginDisposeFailures = 2002,
    /** A plugin service class is missing the decorator that registers it. */
    PluginServiceDecoratorMissing = 2003,
    /** A plugin's `services` was read before the plugin finished `init()`. */
    PluginServicesNotReady = 2004,
    /** A plugin could not connect to the service it wraps. */
    PluginConnectionFailed = 2005,
    /** A plugin could not close its connection cleanly during shutdown. */
    PluginDisconnectFailed = 2006,

    /** Mongoose threw while building a model, usually for a duplicate model name or a missing schema. */
    PluginMongooseModelCreationFailed = 2101,
    /** A mongoose service was registered with an empty model name. */
    PluginMongooseModelNameMissing = 2102,

    /** A kysely service class has no table. */
    PluginKyselyServiceTableMissing = 2201,
    /** A migration run got a step count that is not a non-negative integer. */
    PluginKyselyInvalidStepCount = 2202,
    /** A migration run got a direction other than `up` or `down`. */
    PluginKyselyUnknownDirection = 2203,
    /** A file in the migrations folder has no `up` function. */
    PluginKyselyInvalidMigrationModule = 2204,
    /** A migration failed with a thrown value that is not an `Error`. */
    PluginKyselyNonErrorFailure = 2205,
    /** Creating the target Postgres database failed. */
    PluginKyselyBootstrapFailed = 2206,

    /** Someone pressed Ctrl-C at a prompt in `seedcord` or `create-seedcord`. */
    CliCancelled = 3001,

    /** The seedcord config file's default export is not an object. */
    CliConfigInvalidExport = 3101,
    /** No seedcord config file exists in the folder the CLI searched. */
    CliConfigNotFound = 3102,
    /** The file that `instance` or `build.start` in the seedcord config points at does not exist. */
    CliFileNotFound = 3103,
    /** The instance file's default export is not a constructed `Seedcord`. */
    CliInstanceInvalid = 3104,
    /** The bot threw during startup. */
    CliStartFailed = 3105,
    /** `build.tsconfig` points at a missing file, or it is unset and the config's folder has no `tsconfig.json`. */
    CliTsconfigNotFound = 3106,
    /** `seedcord build` found type errors. */
    CliBuildFailed = 3107,
    /** `commands clean` or `commands purge` ran without a flag that picks where it deletes. */
    CliNoScopeGiven = 3108,
    /** cloudflared never reported a quick tunnel hostname. */
    CliTunnelUrlUnavailable = 3109,
    /** Discord rejected the tunnel URL as an interactions endpoint. */
    CliTunnelNotVerified = 3110,
    /** The tunnel URL never answered its health probe. */
    CliTunnelUnreachable = 3111,
    /** A field in the seedcord config is missing or has the wrong shape. */
    CliConfigInvalidField = 3112,
    /** A class carrying `@RegisterCommand` threw while seedcord constructed it. */
    CliCommandConstructorThrew = 3113,
    /** Vite threw while bundling the bot. */
    CliBundleFailed = 3114,
    /** `build.outDir` is `root` or a folder that contains it. */
    CliConfigOutDirDeletesRoot = 3115,
    /** The project is missing a dev dependency the CLI runs, like `typescript` or `@cloudflare/vite-plugin`. */
    CliDependencyMissing = 3116,
    /** `build.outDir` already has other files in it. */
    CliBuildOutDirNotEmpty = 3117,
    /** One CLI step found two or more problems. Each one is in the error's `errors`. */
    CliProblems = 3118,
    /** `seedcord codegen --check` found the committed augmentations out of date. */
    CliCodegenOutOfDate = 3119,
    /** A file or folder in the project has a `#` in its path. */
    CliPathHasHash = 3120,
    /** An edge bot's tsconfig is missing the `workerd` condition. */
    CliEdgeWithoutWorkerdCondition = 3121,
    /** A bot with no `cloudflare.config.ts` sets the `workerd` condition in its tsconfig. */
    CliWorkerdConditionWithoutCloudflareConfig = 3122,
    /** TypeScript could not read the project's tsconfig, or Cloudflare's config loader could not read `cloudflare.config.ts`. */
    CliConfigFileUnreadable = 3123,
    /** The CLI could not start the TypeScript compiler. */
    CliTypescriptNotStarted = 3124,
    /** A config file sets a field this bot can't set, like `entrypoint` in an edge bot's `cloudflare.config.ts`. */
    CliConfigFieldUnused = 3125,
    /** An edge bot's `compatibilityDate` is older than Cloudflare's Node compat default, and no flag turns it on. */
    CliEdgeCompatDateTooOld = 3126,
    /** An edge bot sets `no_nodejs_compat`. */
    CliEdgeNodeCompatOff = 3127,
    /** The build could not start the edge worker in workerd. */
    CliEdgeBootFailed = 3128,
    /** An edge bot's `root` holds its seedcord config. */
    CliEdgeRootHoldsConfig = 3129,
    /** An edge build found commands in code that have no deployed id on Discord. */
    CliEdgeCommandsNotDeployed = 3130,
    /** Something called the dev runtime before `start()` finished or after `stop()`. This is a bug in seedcord. */
    CliDevRuntimeNotRunning = 3131,
    /** `seedcord commands deploy` ran on a bot whose `commands.path` is `null`. */
    CliDeployNoCommandsFolder = 3132,
    /** `seedcord commands deploy` ran without `--yes` where it cannot ask first. */
    CliDeployNeedsYes = 3133,
    /** A class carrying `@RegisterCommand` builds a component that is not a command or a context menu. */
    CliCommandNotACommand = 3134,
    /** `seedcord commands clean` or `purge` could not delete some of the commands it picked. */
    CliCommandsNotDeleted = 3135,
    /** The CLI ran on Bun for an edge bot. */
    CliEdgeOnBun = 3136,
    /** An edge bot's `cloudflare.config.ts` sets no `worker`. */
    CliEdgeNoWorker = 3137,
    /** The running `seedcord` is a different install from the project's own. */
    CliNotProjectInstall = 3138,
    /** Vite's environments leave out the one seedcord runs the bot in. */
    CliViteEnvironmentMissing = 3139,
    /** A folder that `files` in `seedcord.config.ts` lists is missing or is a file. */
    CliListedFolderUnusable = 3140,
    /** Another `seedcord dev` already runs a bot on the same Discord application. */
    CliDevAlreadyRunning = 3141,
    /** The folder that holds the dev session locks belongs to another user. */
    CliDevLockFolderNotOwned = 3142,
    /** A plugin's `codegen()` threw. */
    CliPluginCodegenThrew = 3143,
    /** A plugin class with a `codegen()` is missing its `static readonly id`. */
    CliPluginCodegenNoId = 3144,
    /** A plugin's `codegen()` returned a value that codegen can't write as a type. */
    CliPluginCodegenValue = 3145,
    /** Two attachments of one plugin class returned different values at one key from `codegen()`. */
    CliPluginCodegenConflict = 3146,

    /** A flag answers a question that the earlier answers skip. */
    CreateFlagNotApplicable = 3201,
    /** A flag has a value its question rejects. */
    CreateInvalidAnswer = 3202,
    /** The command line did not parse. */
    CreateBadUsage = 3203,
    /** The target path already has files in it. */
    CreateTargetNotEmpty = 3204,
    /** A command that create-seedcord ran exited non-zero. */
    CreateStepFailed = 3205,

    /** The name given to `seedcord make` can't become a file name. */
    MakeInvalidName = 3301,
    /** A template calls `importOf` on a folder that doesn't hold exactly one template file. */
    MakeImportOfUnmatched = 3302,
    /** A template uses one value as two of text, a list, and an entry with fields. */
    MakeValueUsedTwoWays = 3303,
    /** Handlebars could not parse or render a template file. */
    MakeTemplateFailed = 3304,
    /** A template calls `lookup` with a key that isn't quoted text. */
    MakeLookupDynamicKey = 3305,
    /** `seedcord make` ran without a terminal to ask its questions in. */
    MakeNeedsTerminal = 3306,
    /** `seedcord make` found no templates in the bot or its plugins. */
    MakeNoTemplates = 3307,
    /** A path `seedcord make` would write to is taken, by a file on disk or by another file of the same template. */
    MakePathTaken = 3308,
    /** A template's partial calls itself, so `seedcord make` can't tell how many levels to ask for. */
    MakePartialCallsItself = 3309
}
