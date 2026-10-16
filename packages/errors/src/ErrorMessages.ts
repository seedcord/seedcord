import { SeedcordErrorCode } from './ErrorCodes';
import { paint } from './palette';

// a reason from a caught error may or may not end in a period
function sentence(text: string): string {
    return /[.!?]$/.test(text) ? text : `${text}.`;
}

// @seedcord/utils depends on this package, so its pluralize is out of reach here
const plurals = new Intl.PluralRules('en');
const allOf = new Intl.ListFormat('en', { type: 'conjunction' });
const oneOf = new Intl.ListFormat('en', { type: 'disjunction' });

function isOne(count: number): boolean {
    return plurals.select(count) === 'one';
}

function counted(count: number, one: string, many: string): string {
    return `${count} ${isOne(count) ? one : many}`;
}

const quoted = (value: string): string => paint.sky(JSON.stringify(value));

/** @internal */
const messages = {
    [SeedcordErrorCode.ConfigEmojiUnresolved]: (count: number) =>
        `${paint.iris(count)} configured emojis could not be resolved. Each one is listed below.`,
    [SeedcordErrorCode.ConfigEmojiInvalid]: (key: string) =>
        `The emoji ${paint.sky(key)} in ${paint.bold('bot.emojis')} has a value seedcord cannot read. Set it to the emoji's name, or to a ${paint.bold('[name, guildId]')} pair for a guild emoji.`,
    [SeedcordErrorCode.ConfigEmojiNotFound]: (key: string, name: string, where: string) =>
        `The emoji ${paint.sky(key)} points at ${paint.bold(name)}, and ${where} has no emoji with that name. Check the spelling, or upload the emoji there.`,
    [SeedcordErrorCode.ConfigEmojiSourceUnreadable]: (key: string, name: string, where: string, reason: string) =>
        `Could not read the emojis in ${where} to resolve ${paint.sky(key)} (${paint.bold(name)}). ${sentence(reason)}`,
    [SeedcordErrorCode.ConfigWebhookUrlInvalid]: (envKey: string) =>
        `${paint.bold(envKey)} is set, but its value is not a Discord webhook URL. Copy the URL again from the channel's Integrations settings.`,
    [SeedcordErrorCode.ConfigWebhookNotFound]: (envKey: string) =>
        `Discord has no webhook at the URL in ${paint.bold(envKey)}. Someone deleted it, or the id or token in the URL is wrong. Create a webhook and copy its URL.`,
    [SeedcordErrorCode.ConfigMissingEnv]: (name: string) =>
        `${paint.bold(name)} is not set. Add it to your environment or your .env file.`,
    [SeedcordErrorCode.ConfigInvalidEnv]: (name: string, expected?: string) =>
        expected
            ? `${paint.bold(name)} has a value seedcord cannot use. Set it to ${expected}.`
            : `${paint.bold(name)} has a value seedcord cannot use. Check what it is set to.`,
    [SeedcordErrorCode.MissingGuildsIntent]: (commands: readonly string[]) =>
        `Add GatewayIntentBits.Guilds to clientOptions.intents. Without it discord.js doesn't cache any guild, so interaction.guild is null inside the ${isOne(commands.length) ? 'command' : 'commands'} ${allOf.format(commands.map((name) => paint.sky(name)))}.`,
    [SeedcordErrorCode.UnsupportedRuntimeVersion]: (runtime: string, required: string, running: string) =>
        `seedcord requires ${runtime} ${required}, but this process runs ${running}. Upgrade ${runtime} before starting the bot.`,
    [SeedcordErrorCode.ConfigTokenUnreadable]: () =>
        `${paint.bold('DISCORD_BOT_TOKEN')} carries no readable application id. Discord builds the first part of a bot token from that id, so a token failing here is truncated or mistyped. Copy it again from your application's Bot page.`,
    [SeedcordErrorCode.ConfigEdgeRestSweeper]: (key: string) =>
        `Remove ${paint.sky(`bot.restOptions.${key}`)} from your edge config. A sweeper interval starts a timer at the worker's global scope, where workerd throws.`,
    [SeedcordErrorCode.ConfigPublicKeyUnavailable]: (reason: string) =>
        `Reading the public key from Discord failed (${reason}). The bot reads it there because ${paint.bold('DISCORD_PUBLIC_KEY')} is unset. Check ${paint.bold('DISCORD_BOT_TOKEN')}, or set ${paint.bold('DISCORD_PUBLIC_KEY')} to the key from your application's General Information page.`,
    [SeedcordErrorCode.PortInUse]: (port: number, setting: string, configFile?: string) =>
        `Another process already listens on port ${port}. Stop it, or set ${paint.bold(setting)} in ${configFile ? paint.path(configFile) : 'your Seedcord config'} to a free port.`,

    [SeedcordErrorCode.LifecycleAddAfterCompletion]: () =>
        `Startup already finished, so this task would never run. Add startup tasks before you call ${paint.bold('start()')}.`,
    [SeedcordErrorCode.LifecycleChangeDuringRun]: (action: 'add' | 'remove') =>
        `Startup is running, so its tasks cannot change. ${action === 'add' ? 'Add' : 'Remove'} startup tasks before you call ${paint.bold('start()')}.`,
    [SeedcordErrorCode.LifecycleUnknownPhase]: (phase: unknown) =>
        `${paint.sky(String(phase))} is not a lifecycle phase. Pass a member of ${paint.bold('StartupPhase')} or ${paint.bold('ShutdownPhase')}.`,
    [SeedcordErrorCode.LifecyclePhaseFailures]: (phase: string, failures: number) =>
        `${counted(failures, 'task', 'tasks')} failed in the ${phase} phase. Each one is listed below.`,
    [SeedcordErrorCode.LifecycleTaskTimeout]: (taskName: string, timeout: number) =>
        `Task "${taskName}" timed out after ${timeout}ms.`,
    [SeedcordErrorCode.LifecycleRestartAfterFailure]: () =>
        'Startup failed and this host cannot start again. Construct a new instance.',
    [SeedcordErrorCode.LifecycleInvalidShutdownDeadline]: (declared: number) =>
        `lifecycle.shutdownDeadline is ${declared}. Pass a positive number of milliseconds, or omit it for the default.`,

    [SeedcordErrorCode.CoreSingletonViolation]: () =>
        'Seedcord can only be instantiated once. Use the existing instance.',
    [SeedcordErrorCode.CorePluginAfterInit]: () =>
        'Cannot attach a plugin once the bot has started. Attach every plugin before start(), or before the first request on an edge bot.',
    [SeedcordErrorCode.CorePluginKeyExists]: (key: string) =>
        `A plugin is already attached at ${paint.sky(key)}. Attach this one under another key.`,
    [SeedcordErrorCode.CoreBotRoleMissing]: (guildId?: string) =>
        guildId
            ? `Could not find the bot's own role in guild ${paint.sky(guildId)}.`
            : "Could not find the bot's own role in this guild.",
    [SeedcordErrorCode.CoreControllerPathMissing]: (controllerName: string, pathKind: string) =>
        `${paint.sky(controllerName)} was constructed without a ${pathKind} path.`,
    [SeedcordErrorCode.CoreDirectoryImportFailed]: (file: string) => `${paint.path(file)} threw while importing.`,
    [SeedcordErrorCode.CoreDirectoryUnreadable]: (dir: string, reason: string) =>
        `Could not read the folder ${paint.path(dir)}. ${sentence(reason)}`,
    [SeedcordErrorCode.CoreFileUnreadable]: (file: string) => `${paint.path(file)} could not be read as text.`,
    [SeedcordErrorCode.CoreDirectoryOutsideRoot]: (dir: string, root: string) =>
        `${paint.path(dir)} is outside ${paint.bold('root')} (${paint.path(root)}). ${paint.bold('seedcord build')} bundles only the files under ${paint.bold('root')}. Move the folder under it, or set ${paint.bold('root')} in seedcord.config.ts to a folder that holds both.`,
    [SeedcordErrorCode.CoreDirectoryRootUnknown]: (dir: string) =>
        `${paint.path(dir)} is relative to ${paint.bold('root')}, and this process has no ${paint.bold('root')} to resolve it against. ${paint.bold('seedcord dev')} and a built bot set ${paint.bold('root')} from seedcord.config.ts. Start the bot one of those ways, or pass an absolute path like ${paint.sky(`resolve(import.meta.dirname, '${dir}')`)}.`,
    [SeedcordErrorCode.CoreDirectoryNotBuilt]: (dir: string, root: string) =>
        `${paint.path(dir)} was not a folder under ${paint.bold('root')} (${paint.path(root)}) when ${paint.bold('seedcord build')} ran, so the build holds none of its files. Create the folder, then build again.`,
    [SeedcordErrorCode.CorePluginGroupTaken]: (head: string, key: string) =>
        `${paint.bold(head)} is already taken on this bot, so ${paint.sky(key)} cannot nest under it. Pick another group name.`,
    [SeedcordErrorCode.CorePluginKeyMalformed]: (key: string, reason: string) =>
        `${paint.sky(key)} ${reason} Write a group and a plugin name around one dot, like 'services.users'.`,
    [SeedcordErrorCode.CorePluginFromOtherCore]: (plugin: string) =>
        `${paint.sky(plugin)} doesn't extend the ${paint.bold('Plugin')} class your bot uses. That usually means two copies of ${paint.bold('@seedcord/core')} are installed. Update the plugin and your ${paint.bold('@seedcord')} packages to versions that need the same ${paint.bold('@seedcord/core')}. Your package manager can list each installed copy and the package that pulled it in.`,
    [SeedcordErrorCode.CorePluginScopeMismatch]: (plugin: string, axis: string, declared: string, host: string) =>
        `${paint.sky(plugin)} only runs on the ${paint.bold(declared)} ${axis}, but this bot uses the ${paint.bold(host)} ${axis}. Remove the ${paint.bold('attach')} call, or move the bot to the ${paint.bold(declared)} ${axis}.`,
    [SeedcordErrorCode.CorePluginKeyHoldsGroup]: (key: string) =>
        `${paint.sky(key)} already holds a group of plugins. Attach this one under a name of its own.`,
    [SeedcordErrorCode.CorePluginReservedChannel]: (key: string) =>
        `${paint.sky(key)} is a channel the framework logs on. Attach the plugin under another key.`,
    [SeedcordErrorCode.CoreApplicationUnavailable]: () =>
        "The bot's application id resolves during startup. You read it before that. Read it inside a handler, inside a plugin's ready(), or after start() resolves. An edge bot resolves it on its first request.",
    [SeedcordErrorCode.CoreEdgeUnbuilt]: () =>
        `This worker has no public key or command ids. ${paint.bold('seedcord build')} reads them from Discord and writes them into the worker it builds. Deploy that build.`,
    [SeedcordErrorCode.CoreFetchBeforeStart]: () =>
        `${paint.bold('fetch()')} ran before ${paint.bold('start()')}. Call ${paint.bold('await seedcord.start()')} before your server passes requests to ${paint.bold('fetch()')}.`,
    [SeedcordErrorCode.CoreAccessorUnresolved]: (accessor: string, key: string) =>
        `${paint.sky(`${accessor}.${key}`)} has no value yet. ${accessor} fills during startup, and a read at the top of a file runs before that. Read it inside a handler, or after start() resolves.`,
    [SeedcordErrorCode.CoreLifecycleUnavailable]: () =>
        `core.shutdown.addTask() does not work on an edge bot. Cloudflare stops an isolate with no shutdown hook, so a shutdown task would never run. To use shutdown tasks, run the bot on node with new Seedcord(config).start().`,
    [SeedcordErrorCode.CoreBusEmitUnavailable]: (event: string) =>
        `core.bus.emit('${event}') would reach your on() listeners and skip every Subscriber class. Call core.bus.publish('${event}', data) to run both.`,
    [SeedcordErrorCode.CoreCommandGuildsEmpty]: (commandName: string) =>
        `${paint.sky(commandName)} registers to the 'config' guilds while commands.guilds is empty.\nList the ids under commands.guilds, or pass them to @RegisterCommand('guild', [...]).`,
    [SeedcordErrorCode.CoreCommandGuildDeployFailed]: (guildId: string) =>
        `Discord refused the command deploy for guild ${paint.sky(guildId)}.\nCheck that the id is right, and that your bot is in that server.`,
    [SeedcordErrorCode.CoreCommandGlobalDeployFailed]: () =>
        `Discord refused the global command deploy. Check that every global command's name, description and options are valid.`,

    [SeedcordErrorCode.DecoratorCommandAlreadyRegistered]: (
        commandName: string,
        existingCall: string,
        requestedCall: string
    ) =>
        `${paint.sky(commandName)} is registered twice, first with ${existingCall}, then with ${requestedCall}. Keep one.`,
    [SeedcordErrorCode.DecoratorCommandGlobalWithGuilds]: (className: string) =>
        `${paint.sky(className)} passes guild ids to ${paint.bold("@RegisterCommand('global')")}. Remove them, or register it with ${paint.bold("@RegisterCommand('guild', [...])")}.`,
    [SeedcordErrorCode.DecoratorCommandGuildWithoutGuilds]: (className: string) =>
        `${paint.sky(className)} uses ${paint.bold("@RegisterCommand('guild')")} with an empty guild list. Pass the guild ids as the second argument.`,
    [SeedcordErrorCode.DecoratorInvalidMiddlewarePriority]: (className: string, priority: string) =>
        `${paint.sky(className)} sets its middleware priority to ${priority}. Pass a finite number.`,
    [SeedcordErrorCode.DecoratorWebhookUrlMissing]: (className: string) =>
        `${paint.sky(className)} extends WebhookLog and needs a ${paint.bold('@WebhookUrl')} decorator with the name of its env var.`,
    [SeedcordErrorCode.DecoratorEmptyMiddlewareFilter]: (key: string) =>
        `${paint.bold(key)} was given an empty array. Remove the key to run the middleware on everything.`,

    [SeedcordErrorCode.InteractionDuplicateRoute]: (route: string, first: string, second: string) =>
        `${paint.bold(first)} and ${paint.bold(second)} both handle the route ${quoted(route)}. Rename one of the routes.`,
    [SeedcordErrorCode.DuplicateMiddleware]: (name: string) =>
        `Two different middleware classes share the name ${paint.sky(name)}. Rename one.`,

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
        `${paint.sky(`${method}()`)} was called on a modal opened from a command, which has no source message.\nUse reply() or defer(). (route ${paint.mute(routeId)})`,
    [SeedcordErrorCode.ReplyCallbackMissingMessage]: (method: string, routeId: string) =>
        `Discord's interaction callback for ${paint.sky(`${method}()`)} returned no message. (route ${paint.mute(routeId)})`,

    [SeedcordErrorCode.CustomIdInvalidPrefix]: (prefix: string) =>
        `The customId prefix ${quoted(prefix)} must be a non-empty string without a colon or control character.`,
    [SeedcordErrorCode.CustomIdReservedFieldName]: (field: string) =>
        `The customId field name ${quoted(field)} looks like an integer, and JS reorders integer keys. Give it a name that is not a number.`,
    [SeedcordErrorCode.CustomIdEmptyChoices]: (field: string, method: string) =>
        `The customId field ${quoted(field)} uses ${method}() with no choices. Give it at least one choice, or make the field nullable.`,
    [SeedcordErrorCode.CustomIdInvalidBounds]: (field: string, min: number, max: number) =>
        `The customId field ${quoted(field)} has min ${min}, which is greater than max ${max}.`,
    [SeedcordErrorCode.CustomIdValueRejected]: (field: string, expected: string, value: string) =>
        `The customId field ${quoted(field)} expects ${expected}, and encode() got ${value}.`,
    [SeedcordErrorCode.CustomIdWireTooLong]: (length: number) =>
        `The encoded customId is ${length} characters. Discord allows at most 100.`,
    [SeedcordErrorCode.CustomIdDuplicateFieldName]: (field: string) =>
        `The customId field ${quoted(field)} is already defined in this chain. Rename one of them.`,
    [SeedcordErrorCode.CustomIdHandlerRouteMissing]: (className: string) =>
        `${paint.sky(className)} is missing its route decorator. Add the one that matches its base, for example ${paint.bold('@ButtonRoute')} or ${paint.bold('@UserMenuRoute')}.`,
    [SeedcordErrorCode.MatchArmMissing]: (handler: string, kind: string, value: string) =>
        `${paint.bold(handler)}'s match() has no arm for the ${kind} ${quoted(value)}. Add one to the object you pass to match().`,
    [SeedcordErrorCode.EventNameUnavailable]: (handler: string, read: string) =>
        `${paint.sky(handler)} read ${paint.bold(read)}, but it was constructed without the name of the event that fired. The event controller passes that name. A handler or middleware you construct yourself takes it as the fourth constructor argument.`,
    [SeedcordErrorCode.AutocompleteNoFocusedOption]: () =>
        'Discord sent an autocomplete payload with no focused option.',
    [SeedcordErrorCode.ModalFieldNotFound]: (customId: string) =>
        `The submitted modal carries no field with the custom id ${quoted(customId)}. Check it against the id you gave the component when you built the modal.`,
    [SeedcordErrorCode.ModalFieldWrongKind]: (customId: string, kind: string, getter?: string) =>
        getter
            ? `The modal field ${quoted(customId)} holds ${kind}. Read it with ${paint.bold(`${getter}()`)}.`
            : `The modal field ${quoted(customId)} holds ${kind}, and none of the getters read that kind.`,
    [SeedcordErrorCode.ModalFieldEmpty]: (customId: string) =>
        `The modal field ${quoted(customId)} has nothing picked. Build the component as required, or read it without the required argument.`,
    [SeedcordErrorCode.ModalFieldChannelType]: (customId: string, picked: string, allowed: readonly string[]) =>
        `The modal field ${quoted(customId)} picked a ${picked} channel. This read allows ${oneOf.format(allowed)}.`,
    [SeedcordErrorCode.CustomIdWireStale]: (prefix: string) =>
        `The customId ${quoted(prefix)} was minted under an older shape of this definition. Adding, removing, changing, or moving a field changes the layout hash.`,
    [SeedcordErrorCode.CustomIdWireInvalid]: (detail: string) =>
        `The customId could not be decoded. ${sentence(detail)}`,
    [SeedcordErrorCode.DispatchStateMissing]: (key: string) =>
        `Nothing set ${paint.sky(key)} on this dispatch. Check that the middleware writing it is registered and that its filter covers this dispatch.`,

    [SeedcordErrorCode.GateInvalidCooldownDuration]: (input: string) =>
        `The cooldown duration ${quoted(input)} is not valid. Pass a positive number of seconds, or a duration string like '30m', '24h', or '500ms'.`,

    [SeedcordErrorCode.PaginationInvalidPerPage]: (perPage: number) =>
        `perPage is ${perPage}. Pass a positive integer.`,
    [SeedcordErrorCode.PaginationTooManyControls]: (count: number) =>
        `This control row has ${paint.iris(count)} buttons. Discord allows at most 5 in one row.`,
    [SeedcordErrorCode.PaginationEmptyControls]: () => 'A control row needs at least one control.',
    [SeedcordErrorCode.PaginationDuplicateControls]: (key: string) =>
        `This control row repeats the ${paint.sky(key)} control. Each control can appear once in a row.`,

    [SeedcordErrorCode.ColorUnresolvable]: (value: string) => `Cannot convert ${value} into a color.`,
    [SeedcordErrorCode.ColorOutOfRange]: (value: number) =>
        `${value} is outside Discord's color range, 0 to 16777215 (0xffffff).`,

    [SeedcordErrorCode.UtilTableOptionInvalid]: (option: string, expected: string, value: number) =>
        `renderTable's ${paint.bold(option)} is ${value}. Pass ${expected}.`,
    [SeedcordErrorCode.UtilUnhandledUnionMember]: (value: string) =>
        `assertNever() ran with ${value}, which its types ruled out. Something passed a value outside the union.`,

    [SeedcordErrorCode.PluginOptionsRejected]: (pluginName: string, reason: string) =>
        `${paint.sky(pluginName)} rejected its options. ${sentence(reason.charAt(0).toUpperCase() + reason.slice(1))}`,
    [SeedcordErrorCode.PluginDisposeFailures]: (count: number) =>
        `${paint.iris(count)} plugins failed to dispose. Each one is listed below.`,
    [SeedcordErrorCode.PluginInvalidLifecycleTimeout]: (pluginName: string, field: string, declared: number) =>
        `${paint.sky(pluginName)} declared lifecycle ${field}.timeout as ${declared}. Pass a positive number of milliseconds, or omit it for the default.`,
    [SeedcordErrorCode.PluginServiceDecoratorMissing]: (decorator: string, className: string) =>
        `${paint.sky(className)} is missing ${paint.bold(decorator)}. Add it to the class to register the service.`,
    [SeedcordErrorCode.PluginServicesNotReady]: (pluginName: string) =>
        `${paint.sky(`${pluginName}.services`)} was read before the plugin finished ${paint.bold('init()')}. Read it inside a handler, or after start() resolves.`,
    [SeedcordErrorCode.PluginConnectionFailed]: (service: string, target?: string) =>
        `Could not connect to ${paint.bold(service)}${target ? ` (${paint.sky(target)})` : ''}. Check that it is running and that the connection string is right.`,
    [SeedcordErrorCode.PluginDisconnectFailed]: (service: string) =>
        `Could not close the ${paint.bold(service)} connection cleanly during shutdown.`,

    [SeedcordErrorCode.PluginMongooseModelCreationFailed]: (modelName: string, className: string) =>
        `Could not build the mongoose model ${paint.sky(modelName)} for ${paint.bold(className)}.`,
    [SeedcordErrorCode.PluginMongooseModelNameMissing]: (className: string) =>
        `${paint.sky(className)} passes an empty model name to ${paint.bold('@RegisterMongooseService()')}. Pass a non-empty modelName.`,

    [SeedcordErrorCode.PluginKyselyServiceTableMissing]: (className: string) =>
        `${paint.sky(className)} has no table. Pass one to ${paint.bold('@RegisterKyselyService()')}.`,
    [SeedcordErrorCode.PluginKyselyInvalidStepCount]: () => 'Migration step count must be a non-negative integer.',
    [SeedcordErrorCode.PluginKyselyUnknownDirection]: (direction: unknown) =>
        `${paint.sky(String(direction))} is not a migration direction. Pass 'up' or 'down'.`,
    [SeedcordErrorCode.PluginKyselyInvalidMigrationModule]: (filePath: string) =>
        `${paint.path(filePath)} needs an up function because it is in the migrations folder. Export up, and down if you need it, by name or on a default export object. Move a helper file out of the folder.`,
    [SeedcordErrorCode.PluginKyselyNonErrorFailure]: (message: string) =>
        `A migration failed with a value that is not an Error: ${message}.`,
    [SeedcordErrorCode.PluginKyselyBootstrapFailed]: (databaseName: string) =>
        `Could not make sure the database ${paint.sky(databaseName)} exists.`,
    [SeedcordErrorCode.PluginKyselyDuplicateMigrationName]: (name: string, first: string, second: string) =>
        `${paint.path(first)} and ${paint.path(second)} are both the migration ${paint.sky(name)}. A migration's name is its file name without the folder or extension. Rename one of the files.`,

    [SeedcordErrorCode.CliCancelled]: () => 'Cancelled.',

    [SeedcordErrorCode.CliConfigInvalidExport]: () => 'The seedcord config file must default export an object.',
    [SeedcordErrorCode.CliConfigNotFound]: (baseDir: string, candidates: readonly string[]) =>
        `Searched ${paint.path(baseDir)} for ${oneOf.format(candidates)} and found none.`,
    [SeedcordErrorCode.CliConfigInvalidField]: (field: string, expected: string) =>
        `${paint.bold(field)} in the seedcord config must be ${expected}.`,
    [SeedcordErrorCode.CliConfigEntryOutsideRoot]: (entryPath: string, root: string) =>
        `Entry file ${paint.path(entryPath)} is outside ${paint.bold('root')} (${paint.path(root)}). Move it under ${paint.bold('root')}, or set ${paint.bold('root')} to a folder that holds it.`,
    [SeedcordErrorCode.CliEntryNotFound]: (entryPath: string) =>
        `Cannot find the entry file at ${paint.path(entryPath)}.`,
    [SeedcordErrorCode.CliImportFailed]: (entryPath: string, reason: string) =>
        `Failed to import ${paint.path(entryPath)}: ${reason}`,
    [SeedcordErrorCode.CliInstanceInvalid]: (instancePath: string) =>
        `${paint.path(instancePath)} must default export the bot, a ${paint.bold('new Seedcord(...)')}, from ${paint.bold('@seedcord/gateway')} or ${paint.bold('@seedcord/http')}.`,
    [SeedcordErrorCode.CliStartFailed]: (instancePath: string, reason: string) =>
        `Failed to start the bot from ${paint.path(instancePath)}: ${reason}`,
    [SeedcordErrorCode.CliTsconfigNotFound]: (configDir: string, configured?: string) =>
        configured
            ? `${paint.bold('build.tsconfig')} points at ${paint.path(configured)}, which does not exist. Fix the path, or remove it to use the ${paint.sky('tsconfig.json')} in ${paint.path(configDir)}.`
            : `${paint.path(configDir)} does not contain a ${paint.sky('tsconfig.json')}. Add one there, or set ${paint.bold('build.tsconfig')} in the seedcord config.`,
    [SeedcordErrorCode.CliTypescriptMissing]: (projectDir: string) =>
        `Add ${paint.bold('typescript')} to ${paint.path(projectDir)} as a dev dependency. seedcord reads your tsconfig with it, and ${paint.bold('seedcord build')} type checks with it.`,
    [SeedcordErrorCode.CliBuildFailed]: (diagnostics: string) => `Type check failed:\n${diagnostics}`,
    [SeedcordErrorCode.CliBundleFailed]: (reason: string) => `Vite could not bundle the bot:\n${reason}`,
    [SeedcordErrorCode.CliConfigOutDirDeletesRoot]: (outDir: string, root: string) =>
        `${paint.bold('build.outDir')} is ${paint.path(outDir)}, which contains ${paint.bold('root')} (${paint.path(root)}). ${paint.bold('seedcord build')} empties ${paint.bold('outDir')} before it writes. Point it at a folder of its own, like ${paint.sky('./dist')}.`,
    [SeedcordErrorCode.CliBuildOutDirNotEmpty]: (outDir: string) =>
        `${paint.bold('build.outDir')} is ${paint.path(outDir)}, which already contains other files. ${paint.bold('seedcord build')} empties ${paint.bold('outDir')} before it writes. Point it at an empty folder, or delete what is in it.`,
    [SeedcordErrorCode.CliProblems]: (count: number) =>
        `${paint.iris(count)} problems need fixing. Each one is listed below.`,
    [SeedcordErrorCode.CliApplicationUnreadable]: (reason: string) =>
        `Reading the application from Discord with ${paint.bold('DISCORD_BOT_TOKEN')} failed (${reason}). Check that the token is still valid.`,
    [SeedcordErrorCode.CliCommandsUnreadable]: (where: string, reason: string) =>
        `Could not read the commands deployed ${where} (${reason}). Check ${paint.bold('DISCORD_BOT_TOKEN')}. For a guild, also check that the bot is in it.`,
    [SeedcordErrorCode.CliEdgeCommandsNotDeployed]: (lines: readonly string[]) =>
        `${paint.iris(lines.length)} ${isOne(lines.length) ? 'command is' : 'commands are'} in your code with no deployed id on Discord, so the build cannot link ${isOne(lines.length) ? 'it' : 'them'}. Deploy with ${paint.bold('seedcord commands deploy')}, then build again.\n${lines.join('\n')}`,
    [SeedcordErrorCode.CliEdgeWranglerMissing]: (projectDir: string) =>
        `${paint.bold('seedcord dev')} reads an edge bot's wrangler config through ${paint.bold('wrangler')}, which ${paint.path(projectDir)} does not have installed. Add it as a dev dependency.`,
    [SeedcordErrorCode.CliEdgeWranglerConfigUnreadable]: (wranglerConfig: string, reason: string) =>
        `Wrangler could not read ${paint.path(wranglerConfig)}: ${reason}`,
    [SeedcordErrorCode.CliDevRuntimeNotRunning]: (method: string) =>
        `${paint.bold('seedcord dev')} called ${paint.bold(method)} while the dev runtime was not running. This is a bug in seedcord.`,
    [SeedcordErrorCode.CliDeployNoCommandsFolder]: (instance: string) =>
        `${paint.path(instance)} sets ${paint.bold('bot.commands.path')} to ${paint.bold('null')}. Point it at the folder that holds your commands to deploy them.`,
    [SeedcordErrorCode.CliDeployNeedsYes]: () =>
        `${paint.bold('seedcord commands deploy')} asks before it deploys, and it can only ask in a terminal with ${paint.bold('CI')} unset. Pass ${paint.bold('--yes')} to deploy without asking.`,
    [SeedcordErrorCode.CliPurgeNoTargets]: () =>
        `No scope given. Pass ${paint.bold('--global')}, ${paint.bold('--guilds <ids...>')} or ${paint.bold('--all-guilds')}.`,
    [SeedcordErrorCode.CliCodegenDuplicateRoute]: (route: string, firstFile: string, secondFile: string) =>
        `${paint.path(firstFile)} and ${paint.path(secondFile)} both define the slash route ${quoted(route)}. Rename one.`,
    [SeedcordErrorCode.CliCommandConstructorThrew]: (name: string, file: string, reason: string) =>
        `${paint.sky(name)} threw while seedcord constructed it. Fix its constructor in ${paint.path(file)}. ${reason}`,
    [SeedcordErrorCode.CliCommandNotACommand]: (name: string, file: string) =>
        `${paint.bold(name)} in ${paint.path(file)} carries ${paint.bold('@RegisterCommand')}, but its component is not a slash command or a context menu. Extend ${paint.bold("BuilderComponent<'command'>")} or ${paint.bold("BuilderComponent<'context_menu'>")}.`,
    [SeedcordErrorCode.CliCommandsNotDeleted]: () =>
        'Some commands could not be deleted. The warnings above give the reason for each one.',
    [SeedcordErrorCode.CliCodegenOutOfDate]: (outputPath: string) =>
        `${paint.path(outputPath)} is out of date. Run ${paint.bold('seedcord codegen')} and commit it.`,
    [SeedcordErrorCode.CliEdgeWithoutWorkerdCondition]: (wranglerConfig: string, tsconfig: string) =>
        `${paint.path(wranglerConfig)} makes this an edge bot, but ${paint.path(tsconfig)} leaves out ${paint.bold('"customConditions": ["workerd"]')}. Add it to compilerOptions for an edge bot, or set ${paint.bold('build.tsconfig')} to the tsconfig that holds it. For a node bot, move ${paint.path(wranglerConfig)} out of this folder.`,
    [SeedcordErrorCode.CliWorkerdConditionWithoutWrangler]: (tsconfig: string, configDir: string) =>
        `${paint.path(tsconfig)} sets the ${paint.bold('workerd')} condition, which only an edge bot uses, but ${paint.path(configDir)} has no wrangler config. Add a ${paint.bold('wrangler.jsonc')} for an edge bot. For a node bot, remove ${paint.bold('"workerd"')} from customConditions.`,
    [SeedcordErrorCode.CliConfigEntryOnEdge]: (configFile: string, wranglerConfig: string) =>
        `${paint.path(wranglerConfig)} makes this an edge bot. An edge bot has no ${paint.bold('entry')} because Cloudflare calls the default export of ${paint.bold('instance')}. Remove ${paint.bold('entry')} from ${paint.path(configFile)}.`,
    [SeedcordErrorCode.CliEdgeVitePluginMissing]: (projectDir: string) =>
        `${paint.bold('seedcord dev')} and ${paint.bold('seedcord build')} run an edge bot through ${paint.bold('@cloudflare/vite-plugin')}, which ${paint.path(projectDir)} does not have installed. Add it and ${paint.bold('wrangler')} as dev dependencies.`,
    [SeedcordErrorCode.CliEdgeCompatDateTooOld]: (wranglerConfig: string, date: string, firstDate: string) =>
        `A seedcord edge bot needs Cloudflare's Node compat. ${paint.path(wranglerConfig)} sets ${paint.bold('compatibility_date')} to ${date}, but Cloudflare turns Node compat on by default only from ${firstDate}. Set the date to ${firstDate} or later, or add ${paint.bold('"nodejs_compat"')} to ${paint.bold('compatibility_flags')}.`,
    [SeedcordErrorCode.CliEdgeNodeCompatOff]: (wranglerConfig: string) =>
        `A seedcord edge bot needs Cloudflare's Node compat, but ${paint.path(wranglerConfig)} turns it off with ${paint.bold('"no_nodejs_compat"')}. Remove that flag from ${paint.bold('compatibility_flags')}.`,
    [SeedcordErrorCode.CliEdgeBootFailed]: (reason: string) =>
        `The build could not start the worker in workerd, the runtime Cloudflare runs it on.\n${reason}`,
    [SeedcordErrorCode.CliEdgeRootHoldsConfig]: (configFile: string, root: string) =>
        `An edge build bundles every file under ${paint.bold('root')}. ${paint.path(configFile)} sets ${paint.bold('root')} to ${paint.path(root)}, so the bundle would pull in that config file and tool configs like ${paint.sky('eslint.config.ts')}. Those break the bundle. Set ${paint.bold('root')} to the folder that holds the bot's code, like ${paint.sky("'./src'")}.`,
    [SeedcordErrorCode.CliTypescriptNotStarted]: (tsc: string, reason: string) =>
        `Could not start TypeScript at ${paint.path(tsc)}: ${reason}`,
    [SeedcordErrorCode.CliTsconfigUnreadable]: (tsconfig: string, output: string) =>
        `TypeScript could not read ${paint.path(tsconfig)}.\n${output}`,
    [SeedcordErrorCode.CliPathHasHash]: (path: string) =>
        `${paint.path(path)} has a ${paint.bold('#')} in its path, and Vite cuts a path at its first ${paint.bold('#')}. Rename it, or move the project to a folder without one.`,
    [SeedcordErrorCode.CliCodegenDuplicateContextMenu]: (
        kind: string,
        name: string,
        firstFile: string,
        secondFile: string
    ) =>
        `${paint.path(firstFile)} and ${paint.path(secondFile)} both define a ${kind} context-menu command named ${quoted(name)}. Rename one.`,
    [SeedcordErrorCode.CliCleanNoGuilds]: () =>
        `No guilds given. Pass ${paint.bold('--guilds <ids...>')} or ${paint.bold('--all-guilds')}. Clean never touches global commands.`,
    [SeedcordErrorCode.CliTunnelUrlUnavailable]: (seconds: number) =>
        `cloudflared did not report a tunnel URL within ${seconds}s. Check that the binary runs and that the network allows it.`,
    [SeedcordErrorCode.CliTunnelNotVerified]: (url: string) =>
        `Discord rejected ${paint.sky(url)} as an interactions endpoint.`,
    [SeedcordErrorCode.CliTunnelUnreachable]: (url: string, seconds: number) =>
        `${paint.sky(url)} did not answer within ${seconds}s, so nothing was PATCHed to Discord.`,

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
