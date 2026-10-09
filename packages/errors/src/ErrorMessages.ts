import { SeedcordErrorCode } from './ErrorCodes';
import { paint } from './palette';

/** @internal */
const messages = {
    [SeedcordErrorCode.ConfigMissingEnv]: (name: string) => `Missing ${name} environment variable.`,
    [SeedcordErrorCode.ConfigInvalidEnv]: (name: string, expected?: string) =>
        expected ? `Invalid ${name} value. Expected ${expected}.` : `Invalid ${name} value.`,
    [SeedcordErrorCode.ConfigWebhookUrlInvalid]: (envKey: string) =>
        `${envKey} is not a well-formed Discord webhook url.`,
    [SeedcordErrorCode.ConfigWebhookNotFound]: (envKey: string) =>
        `The webhook behind ${envKey} does not exist on Discord.`,
    [SeedcordErrorCode.ConfigEmojiUnresolved]: (count: number, failures: string) =>
        `Could not resolve ${count} configured emoji${count === 1 ? '' : 's'} at startup.\n${failures}`,
    [SeedcordErrorCode.ConfigTokenUnreadable]: () =>
        "DISCORD_BOT_TOKEN carries no readable application id. Discord builds the first part of a bot token from that id, so a token failing here is truncated or mistyped. Copy it again from your application's Bot page.",
    [SeedcordErrorCode.MissingGuildsIntent]: (commands: string) =>
        `Add GatewayIntentBits.Guilds to clientOptions.intents. Without it discord.js doesn't cache any guild, so interaction.guild is null inside these commands: ${commands}.`,
    [SeedcordErrorCode.ConfigEdgeRestSweeper]: (key: string) =>
        `Remove ${paint.sky(`bot.restOptions.${key}`)} from your edge config. A sweeper interval starts a timer at the worker's global scope, where workerd throws.`,
    [SeedcordErrorCode.UnsupportedRuntimeVersion]: (runtime: string, required: string, running: string) =>
        `seedcord requires ${runtime} ${required} but this process runs ${running}. Upgrade ${runtime} before starting the bot.`,

    [SeedcordErrorCode.LifecycleAddAfterCompletion]: () =>
        'Cannot add tasks after startup sequence has already completed.',
    [SeedcordErrorCode.LifecycleAddDuringRun]: () => 'Cannot add tasks while startup sequence is in progress.',
    [SeedcordErrorCode.LifecycleRemoveDuringRun]: () => 'Cannot remove tasks while startup sequence is in progress.',
    [SeedcordErrorCode.LifecycleUnknownPhase]: (phase: unknown) => `Unknown phase: ${String(phase)}.`,
    [SeedcordErrorCode.LifecyclePhaseFailures]: (phase: string, failures: number) =>
        `Phase ${phase} completed with ${failures} failed task${failures === 1 ? '' : 's'}.`,
    [SeedcordErrorCode.LifecycleTaskTimeout]: (taskName: string, timeout: number) =>
        `Task "${taskName}" timed out after ${timeout}ms.`,
    [SeedcordErrorCode.LifecycleRestartAfterFailure]: () =>
        'Startup failed and this host cannot start again. Construct a new instance.',
    [SeedcordErrorCode.LifecycleInvalidShutdownDeadline]: (declared: number) =>
        `lifecycle.shutdownDeadline is ${declared}. Pass a positive number of milliseconds, or omit it for the default.`,

    [SeedcordErrorCode.CoreSingletonViolation]: () =>
        'Seedcord can only be instantiated once. Use the existing instance instead.',
    [SeedcordErrorCode.CorePluginAfterInit]: () =>
        'Cannot attach a plugin once the bot has started. Attach every plugin before start(), or before the first request on an edge bot.',
    [SeedcordErrorCode.CorePluginKeyExists]: (key: string) => `Plugin with key "${key}" already exists.`,
    [SeedcordErrorCode.CoreBotRoleMissing]: (guildId?: string) =>
        guildId ? `Bot role not found in guild ${guildId}.` : 'Bot role not found in guild.',
    [SeedcordErrorCode.CoreControllerPathMissing]: (controllerName: string, pathKind: string) =>
        `${controllerName} was instantiated without a ${pathKind} path.`,
    [SeedcordErrorCode.CoreDirectoryImportFailed]: (file: string) => `${paint.path(file)} threw while importing.`,
    [SeedcordErrorCode.CoreDirectoryUnreadable]: (dir: string) => `${paint.path(dir)} could not be read.`,
    [SeedcordErrorCode.CoreFileUnreadable]: (file: string) => `${paint.path(file)} could not be read as text.`,
    [SeedcordErrorCode.CoreDirectoryOutsideRoot]: (dir: string, root: string) =>
        `${paint.path(dir)} is outside ${paint.bold('root')} (${paint.path(root)}). ${paint.bold('seedcord build')} bundles only the files under ${paint.bold('root')}. Move the folder under it, or set ${paint.bold('root')} in seedcord.config.ts to a folder that holds both.`,
    [SeedcordErrorCode.CorePluginGroupTaken]: (head: string, key: string) =>
        `${paint.sky(head)} is already taken on this bot, so ${paint.sky(key)} cannot nest under it. Pick another group name.`,
    [SeedcordErrorCode.CorePluginKeyMalformed]: (key: string, reason: string) =>
        `${paint.sky(key)} ${reason} Write a group and a plugin name around one dot, like 'services.users'.`,
    [SeedcordErrorCode.CorePluginFromOtherCore]: (plugin: string) =>
        `${paint.sky(plugin)} doesn't extend the ${paint.bold('Plugin')} class your bot uses. That usually means two copies of ${paint.bold('@seedcord/core')} are installed. Update the plugin and your ${paint.bold('@seedcord')} packages to versions that need the same ${paint.bold('@seedcord/core')}. Your package manager can list each installed copy and the package that pulled it in.`,
    [SeedcordErrorCode.CorePluginScopeMismatch]: (plugin: string, axis: string, declared: string, host: string) =>
        `${paint.sky(plugin)} only runs on the ${paint.bold(declared)} ${axis}, but this bot uses the ${paint.bold(host)} ${axis}. Remove the ${paint.bold('attach')} call, or move the bot to the ${paint.bold(declared)} ${axis}.`,
    [SeedcordErrorCode.CorePluginKeyHoldsGroup]: (key: string) =>
        `${paint.sky(key)} already holds a group of plugins. Attach this one under a name of its own.`,
    [SeedcordErrorCode.CorePluginReservedChannel]: (key: string) =>
        `Plugin key "${key}" is a channel the framework logs on. Pick another key.`,
    [SeedcordErrorCode.CoreApplicationUnavailable]: () =>
        "The bot's application id resolves during startup. You read it before that. Read it inside a handler, inside a plugin's ready(), or after start() resolves. An edge bot resolves it on its first request.",
    [SeedcordErrorCode.CoreFetchBeforeStart]: () =>
        `${paint.bold('fetch()')} ran before ${paint.bold('start()')}. Call ${paint.bold('await seedcord.start()')} before your server passes requests to ${paint.bold('fetch()')}.`,
    [SeedcordErrorCode.CoreAccessorUnresolved]: (accessor: string, key: string) =>
        `${accessor}.${key} has no value yet. ${accessor} fills during startup, and a read at the top of a file runs before that.`,
    [SeedcordErrorCode.CoreLifecycleUnavailable]: () =>
        `core.shutdown.addTask() does not work on an edge bot. Cloudflare stops an isolate with no shutdown hook. A shutdown task would never run. To use shutdown tasks, run the bot on node with new Seedcord(config).start().`,
    [SeedcordErrorCode.CoreBusEmitUnavailable]: (event: string) =>
        `core.bus.emit('${event}') would reach your on() listeners and skip every Subscriber class. Call core.bus.publish('${event}', data) to run both.`,

    [SeedcordErrorCode.CoreCommandGuildsEmpty]: (commandName: string) =>
        `${paint.sky(commandName)} registers to the 'config' guilds while commands.guilds is empty.\nList the ids under commands.guilds, or pass them to @RegisterCommand('guild', [...]).`,

    [SeedcordErrorCode.CoreCommandGuildDeployFailed]: (guildId: string) =>
        `Discord refused the command deploy for guild ${paint.sky(guildId)}.\nCheck that the id is right, and that your bot is in that server.`,

    [SeedcordErrorCode.DecoratorCommandAlreadyRegistered]: (
        commandName: string,
        existingCall: string,
        requestedCall: string
    ) =>
        `${paint.sky(commandName)} is registered twice, first with ${existingCall}, then with ${requestedCall}. Keep one.`,
    [SeedcordErrorCode.DecoratorCommandGlobalWithGuilds]: () =>
        'RegisterCommand("global") cannot have guilds specified.',
    [SeedcordErrorCode.DecoratorCommandGuildWithoutGuilds]: () =>
        'RegisterCommand("guild") requires a non-empty guilds array.',
    [SeedcordErrorCode.DecoratorInvalidMiddlewarePriority]: () => 'Middleware priority must be a finite number.',
    [SeedcordErrorCode.DecoratorWebhookUrlMissing]: (className: string) =>
        `${className} extends WebhookLog and needs a @WebhookUrl decorator naming its env var.`,

    [SeedcordErrorCode.DecoratorEmptyMiddlewareFilter]: (key: string) =>
        `\`${key}\` was given an empty array. Drop the key to run the middleware on everything.`,
    [SeedcordErrorCode.InteractionDuplicateRoute]: (route: string, first: string, second: string) =>
        `Two interaction handlers resolve to the same route \`${route}\`. Registered by ${first} and ${second}. Rename one.`,
    [SeedcordErrorCode.DuplicateMiddleware]: (name: string) =>
        `Two different middleware classes share the name \`${name}\`. Rename one so they do not collide.`,

    [SeedcordErrorCode.ReplyIllegalAckState]: (method: string, reason: string, alternative: string, routeId: string) =>
        `${paint.sky(`${method}()`)} was called when ${reason}.\n${alternative} (route ${paint.mute(routeId)})`,
    [SeedcordErrorCode.ReplyComponentSerialization]: (
        componentClass: string,
        index: number,
        detail: string,
        routeId: string
    ) =>
        `${paint.sky(componentClass)} at components[${index}] failed to serialize: ${detail.replace(/\.$/, '')}. (route ${paint.mute(routeId)})`,
    [SeedcordErrorCode.ReplyForeignEditTarget]: (method: string, targetId: string, routeId: string) =>
        `${paint.sky(`${method}()`)} was passed message ${targetId}, which this interaction did not send.\nPass a message this interaction sent, returned by reply(), followUp(), edit(), or update(). (route ${paint.mute(routeId)})`,
    [SeedcordErrorCode.ReplyUpdateWithoutSource]: (method: string, routeId: string) =>
        `${paint.sky(`${method}()`)} was called on a modal opened from a command, which has no source message.\nUse reply() or defer() instead. (route ${paint.mute(routeId)})`,
    [SeedcordErrorCode.ReplyCallbackMissingMessage]: (method: string, routeId: string) =>
        `The interaction callback for ${paint.sky(`${method}()`)} returned no message. (route ${paint.mute(routeId)})`,

    [SeedcordErrorCode.CustomIdInvalidPrefix]: (prefix: string) =>
        `customId prefix ${JSON.stringify(prefix)} must be a non-empty string without a colon or control character.`,
    [SeedcordErrorCode.CustomIdReservedFieldName]: (field: string) =>
        `customId field name ${JSON.stringify(field)} is integer-like, which JS reorders. Use a non-numeric name.`,
    [SeedcordErrorCode.CustomIdEmptyChoices]: (field: string, method: string) =>
        `customId field ${JSON.stringify(field)} uses ${method}() with no choices. Make the field nullable or provide at least one choice.`,
    [SeedcordErrorCode.CustomIdInvalidBounds]: (field: string, min: number, max: number) =>
        `customId field ${JSON.stringify(field)} has min ${min} greater than max ${max}.`,
    [SeedcordErrorCode.CustomIdValueRejected]: (field: string, expected: string, value: string) =>
        `customId field ${JSON.stringify(field)} expects ${expected}, got ${value}.`,
    [SeedcordErrorCode.CustomIdWireTooLong]: (length: number) =>
        `Encoded customId is ${length} characters, Discord allows at most 100.`,
    [SeedcordErrorCode.CustomIdDuplicateFieldName]: (field: string) =>
        `customId field ${JSON.stringify(field)} is already defined in this chain.`,
    [SeedcordErrorCode.CustomIdHandlerRouteMissing]: (className: string) =>
        `${className} is missing its route decorator. Add the one that matches its base, for example @ButtonRoute or @UserMenuRoute.`,
    [SeedcordErrorCode.CustomIdMatchArmMissing]: (prefix: string) =>
        `match() has no arm for the decoded route ${JSON.stringify(prefix)}.`,
    [SeedcordErrorCode.CustomIdWireStale]: (prefix: string) =>
        `customId ${JSON.stringify(prefix)} was minted under an older shape of this definition. Adding, removing, changing, or moving a field changes the layout hash.`,
    [SeedcordErrorCode.CustomIdWireInvalid]: (detail: string) => `customId could not be decoded. ${detail}.`,
    [SeedcordErrorCode.SlashMatchArmMissing]: (route: string) =>
        `match() has no arm for the command route ${JSON.stringify(route)}.`,
    [SeedcordErrorCode.AutocompleteMatchArmMissing]: (field: string) =>
        `match() has no arm for the focused field ${JSON.stringify(field)}.`,
    [SeedcordErrorCode.EventMatchArmMissing]: (event: string) =>
        `match() has no arm for the event ${JSON.stringify(event)}.`,
    [SeedcordErrorCode.ContextMenuMatchArmMissing]: (name: string) =>
        `match() has no arm for the context menu command ${JSON.stringify(name)}.`,
    [SeedcordErrorCode.EventMiddlewareNameUnavailable]: () =>
        `this.eventName is only available on middleware the controller constructed with a fired event name.`,
    [SeedcordErrorCode.AutocompleteNoFocusedOption]: () => `Autocomplete payload has no focused option.`,
    [SeedcordErrorCode.ModalFieldNotFound]: (customId: string) =>
        `The submitted modal carries no field with the custom id ${JSON.stringify(customId)}. Check it against the id you gave the component when you built the modal.`,
    [SeedcordErrorCode.ModalFieldWrongKind]: (customId: string, kind: string, getter?: string) =>
        getter
            ? `Modal field ${JSON.stringify(customId)} holds ${kind}. Read it with ${getter}().`
            : `Modal field ${JSON.stringify(customId)} holds ${kind}. No getter reads that kind.`,
    [SeedcordErrorCode.ModalFieldEmpty]: (customId: string) =>
        `Modal field ${JSON.stringify(customId)} carries no selection. Build the component as required, or read it without the required argument.`,
    [SeedcordErrorCode.ModalFieldChannelType]: (customId: string, picked: string, allowed: string) =>
        `Modal field ${JSON.stringify(customId)} picked a ${picked} channel. This read allows ${allowed}.`,
    [SeedcordErrorCode.DispatchStateMissing]: (key: string) =>
        `Nothing set \`${key}\` on this dispatch. Check that the middleware writing it is registered and that its filter covers this dispatch.`,

    [SeedcordErrorCode.GateInvalidCooldownDuration]: (input: string) =>
        `Cooldown duration ${JSON.stringify(input)} is not valid. Pass a number of seconds or a duration string like '30m', '24h', or '500ms'.`,

    [SeedcordErrorCode.PaginationInvalidPerPage]: (perPage: number) =>
        `perPage must be a positive integer, got ${perPage}.`,
    [SeedcordErrorCode.PaginationTooManyControls]: (count: number) =>
        `A control row holds at most 5 buttons, got ${count}.`,
    [SeedcordErrorCode.PaginationEmptyControls]: () => `A control row must hold at least one control.`,
    [SeedcordErrorCode.PaginationDuplicateControls]: (key: string) =>
        `A control row cannot repeat the '${key}' control.`,

    [SeedcordErrorCode.ColorUnresolvable]: (value: string) => `Cannot convert ${value} into a color.`,
    [SeedcordErrorCode.ColorOutOfRange]: () => 'Color must be within the range 0 to 16777215 (0xffffff).',

    [SeedcordErrorCode.PluginOptionsRejected]: (pluginName: string, reason: string) =>
        `${pluginName} rejected its options, ${reason.replace(/\.$/, '')}.`,
    [SeedcordErrorCode.PluginDisposeFailures]: (count: number) => `${count} plugins failed to dispose.`,
    [SeedcordErrorCode.PluginInvalidLifecycleTimeout]: (pluginName: string, field: string, declared: number) =>
        `${pluginName} declared lifecycle ${field}.timeout as ${declared}. Pass a positive number of milliseconds, or omit it for the default.`,

    [SeedcordErrorCode.PluginMongooseServiceDecoratorMissing]: (className: string) =>
        `Missing @RegisterMongooseService on ${className}.`,
    [SeedcordErrorCode.PluginMongooseConnectionFailed]: (databaseName?: string) =>
        databaseName ? `Could not connect to MongoDB (${databaseName}).` : 'Could not connect to MongoDB.',
    [SeedcordErrorCode.PluginMongooseDisconnectFailed]: () =>
        'Failed to disconnect from MongoDB cleanly during shutdown.',
    [SeedcordErrorCode.PluginMongooseServicesNotReady]: () =>
        'Mongoose services accessed before the plugin finished initializing.',
    [SeedcordErrorCode.PluginMongooseModelCreationFailed]: (modelName: string, className: string) =>
        `Could not build the mongoose model ${modelName} for ${className}.`,
    [SeedcordErrorCode.PluginMongooseModelNameMissing]: (className: string) =>
        `Empty model name on ${className}. Provide a non-empty modelName via @RegisterMongooseService().`,

    [SeedcordErrorCode.PluginKyselyServiceDecoratorMissing]: (className: string) =>
        `Missing @RegisterKyselyService on ${className}.`,
    [SeedcordErrorCode.PluginKyselyServiceTableMissing]: (className: string) =>
        `Missing table metadata for ${className}. Provide a table via @RegisterKyselyService().`,
    [SeedcordErrorCode.PluginKyselyInvalidStepCount]: () => 'Migration step count must be a non-negative integer.',
    [SeedcordErrorCode.PluginKyselyUnknownDirection]: (direction: unknown) =>
        `Unknown migration direction: ${String(direction)}.`,
    [SeedcordErrorCode.PluginKyselyUnresolvedMigrationsPath]: (label: string) =>
        `Unable to resolve migrations at path: ${label}.`,
    [SeedcordErrorCode.PluginKyselyNoMigrationFiles]: () => 'No migration files provided.',
    [SeedcordErrorCode.PluginKyselyInvalidMigrationModule]: (filePath: string) =>
        `Migration file ${paint.path(filePath)} must export async functions up and down.`,
    [SeedcordErrorCode.PluginKyselyNonErrorFailure]: (message: string) => `Migration failure: ${message}.`,
    [SeedcordErrorCode.PluginKyselyDisconnectFailed]: () =>
        'Failed to close the Postgres pool cleanly during shutdown.',
    [SeedcordErrorCode.PluginKyselyServicesNotReady]: () =>
        'Kysely services accessed before the plugin finished initializing.',
    [SeedcordErrorCode.PluginKyselyConnectionFailed]: (databaseName?: string) =>
        databaseName ? `Could not connect to Postgres (${databaseName}).` : 'Could not connect to Postgres.',
    [SeedcordErrorCode.PluginKyselyBootstrapFailed]: (databaseName: string) =>
        `Failed to ensure database ${databaseName} exists.`,
    [SeedcordErrorCode.PluginKyselyDuplicateMigrationName]: (name: string, first: string, second: string) =>
        `${paint.path(first)} and ${paint.path(second)} are both the migration ${paint.sky(name)}. Kysely identifies a migration by its file name without the extension. Rename one file, or list only one of them.`,

    [SeedcordErrorCode.CliConfigInvalidExport]: () => 'Config file must default export an object.',
    [SeedcordErrorCode.CliConfigMissingInstance]: () =>
        'Config must include an `instance` string that points to your Seedcord default export.',
    [SeedcordErrorCode.CliConfigNotFound]: (baseDir: string, candidates: readonly string[]) =>
        `Searched ${paint.path(baseDir)} for ${candidates.join(', ')} and found none.`,
    [SeedcordErrorCode.CliConfigMissingEntry]: () =>
        'Config must include an `entry` string that points to your startup script.',
    [SeedcordErrorCode.CliConfigEntryOutsideRoot]: (entryPath: string, root: string) =>
        `Entry file ${paint.path(entryPath)} is outside ${paint.bold('root')} (${paint.path(root)}). Move it under ${paint.bold('root')}, or set ${paint.bold('root')} to a folder that holds it.`,
    [SeedcordErrorCode.CliEntryNotFound]: (entryPath: string) => `Cannot find entry file at ${paint.path(entryPath)}.`,
    [SeedcordErrorCode.CliImportFailed]: (entryPath: string, reason: string) =>
        `Failed to import ${paint.path(entryPath)}: ${reason}`,
    [SeedcordErrorCode.CliInstanceInvalid]: (instancePath: string) =>
        `${paint.path(instancePath)} must default export the bot, a ${paint.bold('new Seedcord(...)')}, from ${paint.bold('@seedcord/gateway')} or ${paint.bold('@seedcord/http')}.`,
    [SeedcordErrorCode.CliStartFailed]: (instancePath: string, reason: string) =>
        `Failed to start the bot from ${paint.path(instancePath)}: ${reason}`,
    [SeedcordErrorCode.CliBuildTsconfigNotFound]: (tsconfig: string) =>
        `${paint.bold('build.tsconfig')} points at ${paint.path(tsconfig)}, which does not exist.`,
    [SeedcordErrorCode.CliBuildNoTsconfig]: (configDir: string) =>
        `${paint.path(configDir)} does not contain a ${paint.sky('tsconfig.json')}. Add one there, or set ${paint.bold('build.tsconfig')} in the seedcord config.`,
    [SeedcordErrorCode.CliTypescriptMissing]: (projectDir: string) =>
        `Add ${paint.bold('typescript')} to ${paint.path(projectDir)} as a dev dependency. ${paint.bold('seedcord build')} type checks with it.`,
    [SeedcordErrorCode.CliBuildFailed]: (diagnostics: string) => `Type check failed:\n${diagnostics}`,
    [SeedcordErrorCode.CliBundleFailed]: (reason: string) => `Vite could not bundle the bot:\n${reason}`,
    [SeedcordErrorCode.CliConfigOutDirDeletesRoot]: (outDir: string, root: string) =>
        `${paint.bold('build.outDir')} is ${paint.path(outDir)}, which contains ${paint.bold('root')} (${paint.path(root)}). ${paint.bold('seedcord build')} empties ${paint.bold('outDir')} before it writes. Point it at a folder of its own, like ${paint.sky('./dist')}.`,
    [SeedcordErrorCode.CliBuildOutDirNotEmpty]: (outDir: string) =>
        `${paint.bold('build.outDir')} is ${paint.path(outDir)}, which already contains other files. ${paint.bold('seedcord build')} empties ${paint.bold('outDir')} before it writes. Point it at an empty folder, or delete what is in it.`,
    [SeedcordErrorCode.CliBuildFolderProblems]: (count: number) =>
        `${count} folders in the bot config need fixing before ${paint.bold('seedcord build')} can bundle the bot. Each one is listed below.`,
    [SeedcordErrorCode.CliBuildRelativeFolder]: (folder: string) =>
        `${paint.path(folder)} in the bot config is a relative path. A built bot resolves it against the folder it starts in. Build the path from the bot file's folder, like ${paint.sky("resolve(import.meta.dirname, './handlers')")}.`,
    [SeedcordErrorCode.CliCodegenDuplicateRoute]: (route: string, firstFile: string, secondFile: string) =>
        `Two commands resolve to the same slash route \`${route}\`. Defined in ${paint.path(firstFile)} and ${paint.path(secondFile)}. Rename one.`,
    [SeedcordErrorCode.CliCodegenCommandsDirUnreadable]: (dir: string, reason: string) =>
        `Could not read the commands directory ${paint.path(dir)} during codegen. ${reason}`,
    [SeedcordErrorCode.CliCodegenCommandConstructorThrew]: (name: string, file: string, reason: string) =>
        `${name} threw while codegen constructed it. Fix its constructor in ${paint.path(file)}. ${reason}`,
    [SeedcordErrorCode.CliCodegenCommandProblems]: (count: number) =>
        `${count} command files need fixing before codegen can finish. Each one is listed below.`,
    [SeedcordErrorCode.CliCodegenOutOfDate]: (outputPath: string) =>
        `${paint.path(outputPath)} is out of date. Run ${paint.bold('seedcord codegen')} and commit it.`,
    [SeedcordErrorCode.CliEdgeWithoutWorkerdCondition]: (wranglerConfig: string, tsconfig: string) =>
        `${paint.path(wranglerConfig)} makes this an edge bot, but ${paint.path(tsconfig)} leaves out ${paint.bold('"customConditions": ["workerd"]')}. Add it to compilerOptions for an edge bot. For a node bot, move ${paint.path(wranglerConfig)} out of this folder.`,
    [SeedcordErrorCode.CliWorkerdConditionWithoutWrangler]: (tsconfig: string, configDir: string) =>
        `${paint.path(tsconfig)} sets the ${paint.bold('workerd')} condition, which only an edge bot uses, but ${paint.path(configDir)} has no ${paint.bold('wrangler.jsonc')}. Add one for an edge bot. For a node bot, remove ${paint.bold('"workerd"')} from customConditions.`,
    [SeedcordErrorCode.CliTsconfigUnreadable]: (tsconfig: string, output: string) =>
        `TypeScript could not read ${paint.path(tsconfig)}.\n${output}`,
    [SeedcordErrorCode.CliPathHasHash]: (path: string) =>
        `Cannot load ${paint.path(path)} because its path contains a ${paint.bold('#')}. Vite loads your bot's code and cuts a path at its first ${paint.bold('#')}. Move the project to a folder without one.`,
    [SeedcordErrorCode.CliCodegenDuplicateContextMenu]: (
        kind: string,
        name: string,
        firstFile: string,
        secondFile: string
    ) =>
        `Two ${kind} context-menu commands share the name \`${name}\`. Defined in ${paint.path(firstFile)} and ${paint.path(secondFile)}. Rename one.`,
    [SeedcordErrorCode.CliCleanAppFetchFailed]: (reason: string) =>
        `Could not resolve the application from the bot token. ${reason}`,
    [SeedcordErrorCode.CliCleanNoGuilds]: () =>
        'No guilds given. Pass --guild <ids...> or --all-guilds. Global commands are never touched.',
    [SeedcordErrorCode.CliCleanPurgeAllGuilds]: () =>
        '--purge cannot be combined with --all-guilds. Use --guild <ids> to purge specific guilds.',
    [SeedcordErrorCode.CliCancelled]: () => 'Cancelled.',
    [SeedcordErrorCode.CliCleanLargeBotUnconfirmed]: (count: number) =>
        `Refusing to scan ${count} guilds without confirmation. Re-run with --yes, or name specific guilds with --guild <ids>.`,
    [SeedcordErrorCode.CliCleanApplyNeedsYes]: () =>
        'Refusing to delete without confirmation in a non-interactive environment. Re-run with --yes.',
    [SeedcordErrorCode.CliTunnelUrlUnavailable]: (seconds: number) =>
        `cloudflared did not report a tunnel URL within ${seconds}s. Check that the binary runs and that the network allows it.`,
    [SeedcordErrorCode.CliTunnelNotVerified]: (url: string) => `Discord rejected ${url} as an interactions endpoint.`,
    [SeedcordErrorCode.CliTunnelUnreachable]: (url: string, seconds: number) =>
        `${url} did not answer within ${seconds}s, so nothing was PATCHed to Discord.`,
    [SeedcordErrorCode.CliConfigInvalidField]: (field: string, expected: string) =>
        `Config \`${field}\` must be ${expected} when provided.`,
    [SeedcordErrorCode.CliConfigProblems]: (count: number) =>
        `${count} fields in the seedcord config need fixing. Each one is listed below.`,
    [SeedcordErrorCode.CreateCancelled]: () => 'Cancelled.',
    [SeedcordErrorCode.CreateFlagNotApplicable]: (flag: string) =>
        `The --${flag} flag does not apply to the answers you gave.`,
    [SeedcordErrorCode.CreateInvalidAnswer]: (flag: string, reason: string) => `--${flag}: ${reason}`,
    // node's parseArgs message ends on an unclosed quote
    [SeedcordErrorCode.CreateBadUsage]: (reason: string) => `${reason}\nRun with --help for the flag list.`,
    [SeedcordErrorCode.CreateTargetNotEmpty]: (target: string) =>
        `${paint.path(target)} already has files in it. Pick an empty directory or a name that does not exist yet.`,
    [SeedcordErrorCode.CreateStepFailed]: (command: string, reason: string) => `\`${command}\` failed.\n${reason}`
} satisfies Record<SeedcordErrorCode, (...args: never[]) => string>;

/** @internal */
export type SeedcordErrorArguments<Code extends SeedcordErrorCode> = Parameters<(typeof messages)[Code]>;

/** @internal */
export function formatSeedcordErrorMessage<Code extends SeedcordErrorCode>(
    code: Code,
    args?: SeedcordErrorArguments<Code>
): string {
    const formatter = messages[code];
    const resolvedArgs = (args ?? []) as unknown[];
    return (formatter as (...params: unknown[]) => string)(...resolvedArgs);
}
