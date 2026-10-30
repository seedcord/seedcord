/* eslint-disable max-lines -- the satisfies check below covers every code only while all messages are in one map */
import { SeedcordErrorCode } from './ErrorCodes';
import { deployFix, listedFolderProblems, placeText, token, vitePluginFix } from './messageParts';
import { allOf, counted, isOne, oneOf, quoted, reasonThen, sentence } from './messageText';
import { paint } from './palette';

import type { VitePluginPlace } from './messageParts';

/** @internal */
const messages = {
    [SeedcordErrorCode.ConfigEmojiUnresolved]: (count: number) =>
        `${paint.iris(count)} configured emojis could not be resolved. Each one is listed below.`,
    [SeedcordErrorCode.ConfigEmojiInvalid]: (key: string) =>
        `The emoji ${paint.sky(key)} in ${paint.bold('bot.emojis')} has a value seedcord cannot read. Set it to the emoji's name, or to a ${paint.bold('[name, guildId]')} pair for a guild emoji.`,
    [SeedcordErrorCode.ConfigEmojiNotFound]: (key: string, name: string, where: string) =>
        `The emoji ${paint.sky(key)} points at ${paint.bold(name)}, but ${where} has no emoji with that name. Check the spelling, or upload the emoji there.`,
    [SeedcordErrorCode.ConfigEmojiSourceUnreadable]: (
        key: string,
        name: string,
        where: string,
        reason: string,
        fix: string
    ) =>
        `Could not read the emojis in ${where} to resolve ${paint.sky(key)} (${paint.bold(name)}). ${reasonThen(reason, fix)}`,
    [SeedcordErrorCode.ConfigWebhookNotFound]: (envKey: string) =>
        `Discord has no webhook at the URL in ${paint.bold(envKey)}. Someone deleted it, or the id or token in the URL is wrong. Create a webhook and copy its URL.`,
    [SeedcordErrorCode.ConfigMissingEnv]: (name: string) =>
        `${paint.bold(name)} is not set. Add it to your environment or your .env file.`,
    [SeedcordErrorCode.ConfigInvalidEnv]: (name: string, expected: string, why?: string) =>
        `${paint.bold(name)} has a value seedcord cannot use.${why ? ` ${why}` : ''} Set it to ${expected}.`,
    [SeedcordErrorCode.MissingGuildsIntent]: (commands: readonly string[]) =>
        `Add GatewayIntentBits.Guilds to clientOptions.intents. Without it discord.js doesn't cache any guild, so interaction.guild is null inside the ${isOne(commands.length) ? 'command' : 'commands'} ${allOf.format(commands.map((name) => paint.sky(name)))}.`,
    [SeedcordErrorCode.UnsupportedRuntimeVersion]: (runtime: string, required: string, running: string) =>
        `seedcord requires ${runtime} ${required}, but this process runs ${running}. Upgrade ${runtime} before starting the bot.`,
    [SeedcordErrorCode.ConfigEdgeRestSweeper]: (key: string) =>
        `Remove ${paint.sky(`bot.restOptions.${key}`)} from your edge config. A sweeper interval starts a timer at the worker's global scope, where workerd throws.`,
    [SeedcordErrorCode.PortInUse]: (port: number, setting: string, configFile?: string) =>
        `Another process already listens on port ${port}. Stop it, or set ${paint.bold(setting)} in ${configFile ? paint.path(configFile) : 'your Seedcord config'} to a free port.`,

    [SeedcordErrorCode.LifecycleTaskChangeRejected]: (action: 'add' | 'remove', startup: 'running' | 'finished') =>
        `${startup === 'running' ? 'Startup is running, so its tasks cannot change.' : 'Startup already finished, so this task would never run.'} ${action === 'add' ? 'Add' : 'Remove'} startup tasks before you call ${paint.bold('start()')}.`,
    [SeedcordErrorCode.LifecycleUnknownPhase]: (phase: unknown) =>
        `${paint.sky(String(phase))} is not a lifecycle phase. Pass a member of ${paint.bold('StartupPhase')} or ${paint.bold('ShutdownPhase')}.`,
    [SeedcordErrorCode.LifecyclePhaseFailures]: (phase: string, failures: number) =>
        `${counted(failures, 'task', 'tasks')} failed in the ${phase} phase. Each one is listed below.`,
    [SeedcordErrorCode.LifecycleTaskTimeout]: (taskName: string, timeout: number) =>
        `Task "${taskName}" timed out after ${timeout}ms. Check what it waits on, or give it a longer timeout.`,
    [SeedcordErrorCode.LifecycleRestartAfterFailure]: () =>
        'Startup failed, so this host cannot start again. Construct a new instance.',
    [SeedcordErrorCode.LifecycleInvalidTimeout]: (setting: string, value: number) =>
        `${paint.bold(setting)} is ${value}. Pass a positive number of milliseconds, or leave it out for the default.`,

    [SeedcordErrorCode.CoreSingletonViolation]: () =>
        'Seedcord can only be constructed once per process. Use the instance you already have.',
    [SeedcordErrorCode.CorePluginAfterInit]: () =>
        'Cannot attach a plugin once the bot has started. Attach every plugin before start(), or before the first request on an edge bot.',
    [SeedcordErrorCode.CorePluginKeyExists]: (key: string) =>
        `A plugin is already attached at ${paint.sky(key)}. Attach this one under another key.`,
    [SeedcordErrorCode.CoreBotRoleMissing]: (guildId?: string) =>
        `The role cache of ${guildId ? `guild ${paint.sky(guildId)}` : 'this guild'} has no role for the bot. discord.js fills that cache through the Guilds intent, so check that clientOptions.intents includes GatewayIntentBits.Guilds.`,
    [SeedcordErrorCode.CoreControllerPathMissing]: (controllerName: string, pathKind: string) =>
        `${paint.sky(controllerName)} was constructed without a ${pathKind} path. This is a bug in seedcord.`,
    [SeedcordErrorCode.CoreImportFailed]: (file: string, reason: string) =>
        `Could not import ${paint.path(file)}. ${sentence(reason)}`,
    [SeedcordErrorCode.CoreVitePluginThrew]: (
        plugin: string,
        place: VitePluginPlace,
        configFile: string,
        reason: string
    ) =>
        place.hook === undefined
            ? `${paint.sky(plugin)} in ${paint.path(configFile)} failed when seedcord called ${paint.bold('vitePlugins')}. ${reasonThen(reason, 'Check that the package is installed and that its import resolves.')}`
            : `The Vite plugin ${paint.sky(plugin)} from ${paint.bold('vitePlugins')} in ${paint.path(configFile)} threw ${placeText(place.hook, place.loading)}. ${reasonThen(reason, vitePluginFix(place))}`,
    [SeedcordErrorCode.CorePathUnreadable]: (path: string, reason: string) =>
        `Could not read ${paint.path(path)}. ${reasonThen(reason, 'Check that it exists and that this process can read it.')}`,
    [SeedcordErrorCode.CorePathOutsideRoot]: (path: string, root: string) =>
        `${paint.path(path)} is outside ${paint.bold('root')} (${paint.path(root)}). ${paint.bold('seedcord build')} bundles only the files under ${paint.bold('root')}. Move it under ${paint.bold('root')}, or set ${paint.bold('root')} in seedcord.config.ts to a folder that holds it.`,
    [SeedcordErrorCode.CoreDirectoryRootUnknown]: (dir: string) =>
        `${paint.path(dir)} is relative to ${paint.bold('root')}, but nothing set ${paint.bold('root')} in this process. The ${paint.bold('seedcord')} CLI sets it, but a plain script or a test doesn't. Pass an absolute path there, like ${paint.sky(`resolve(import.meta.dirname, '${dir}')`)}.`,
    [SeedcordErrorCode.CoreDirectoryNotBuilt]: (dir: string, root: string) =>
        `${paint.path(dir)} was not a folder under ${paint.bold('root')} (${paint.path(root)}) or in ${paint.bold('files')} when ${paint.bold('seedcord build')} ran, so the build holds none of its files. Create the folder, then build again.`,
    [SeedcordErrorCode.CoreDirectoryNotListed]: (dir: string) =>
        `${paint.bold('readFiles')} was called on ${paint.path(dir)}, which is outside every folder in ${paint.bold('files')} in seedcord.config.ts. ${paint.bold('seedcord build')} bundles non-code files from only those folders. Add it to ${paint.bold('files')}, like ${paint.sky("files: ['./locales']")}.`,
    [SeedcordErrorCode.CoreDirectorySkipped]: (dir: string) =>
        `${paint.path(dir)} is in a folder ${paint.bold('seedcord build')} skips, so a built bot holds none of its files. The build skips dot-folders, node_modules, outDir, the logs folder beside seedcord.config.ts and project files like package.json. Move the files to a folder outside those.`,
    [SeedcordErrorCode.CoreKvKeysUnsupported]: () =>
        `${paint.bold('collection.entries()')} reads the key list of the Keyv store in ${paint.bold('config.kv')}, but that store can't list its keys. Cache adapters like ${paint.bold('@keyv/memcache')} never can. Pass an adapter that can, like ${paint.bold('@keyv/redis')} or ${paint.bold('@keyv/sqlite')}.`,
    [SeedcordErrorCode.CoreKvDriverFailed]: (operation: 'read' | 'write' | 'delete' | 'list', key: string) =>
        `The driver in ${paint.bold('config.kv')} failed to ${operation} ${paint.sky(key)}. Check that the storage it connects to is reachable.`,
    [SeedcordErrorCode.CorePluginKvOutsideAttach]: (plugin: string) =>
        `${paint.bold(plugin)} read ${paint.bold('this.kv')} on an instance that ${paint.bold('attach()')} didn't build. ${paint.bold('this.kv')} stores a plugin's records under its attach key, which only ${paint.bold('attach()')} gives it. Attach the class with ${paint.bold(`seedcord.attach('key', ${plugin})`)}.`,
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
        `${paint.sky(`${accessor}.${key}`)} has no value yet. ${accessor} fills during startup, but a read at the top of a file runs before that. Read it inside a handler, or after start() resolves.`,
    [SeedcordErrorCode.CoreLifecycleUnavailable]: () =>
        `core.shutdown.addTask() does not work on an edge bot. Cloudflare stops an isolate with no shutdown hook, so a shutdown task would never run. To use shutdown tasks, run the bot on node with new Seedcord(config).start().`,
    [SeedcordErrorCode.CoreBusEmitUnavailable]: (event: string) =>
        `core.bus.emit('${event}') would reach your on() listeners but skip every Subscriber class. Call core.bus.publish('${event}', data) to run both.`,
    [SeedcordErrorCode.CoreCommandGuildsEmpty]: (commandName: string) =>
        `${paint.sky(commandName)} registers to the 'config' guilds while commands.guilds is empty.\nList the ids under commands.guilds, or pass them to @RegisterCommand('guild', [...]).`,
    [SeedcordErrorCode.CoreCommandGuildDeployFailed]: (guildId: string, reason: string, status?: number) =>
        `Discord refused the command deploy for guild ${paint.sky(guildId)}. ${reasonThen(reason, deployFix(status, 'Check that the id is right, and that your bot is in that server.'))}`,
    [SeedcordErrorCode.CoreCommandGlobalDeployFailed]: (reason: string, status?: number) =>
        `Discord refused the global command deploy. ${reasonThen(reason, deployFix(status, 'Try again, and check discordstatus.com if it keeps failing.'))}`,
    [SeedcordErrorCode.CoreWebhookUrlInvalid]: (className: string) =>
        `${paint.sky(className)} was given a URL that is not a Discord webhook URL. Pass the URL from the channel's Integrations settings, which looks like ${paint.bold('https://discord.com/api/webhooks/<id>/<token>')}.`,
    [SeedcordErrorCode.CoreDiscordReadFailed]: (what: string, reason: string, fix?: string) =>
        `Could not read ${what} from Discord (${reason}). ${fix ?? `Check that ${token()} is still valid.`}`,
    [SeedcordErrorCode.CoreDuplicateName]: (
        kind: string,
        name: string,
        sources: readonly string[] = [],
        note?: string
    ) =>
        `${sources.length > 0 ? `${allOf.format(sources)} define the ${kind} ${quoted(name)}.` : `The ${kind} ${quoted(name)} is defined twice.`}${note ? ` ${note}` : ''} Rename one.`,

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
        `${paint.sky(className)} extends WebhookLog without a ${paint.bold('@WebhookUrl')} decorator. Add one with the name of the env var that holds the webhook URL.`,
    [SeedcordErrorCode.DecoratorEmptyMiddlewareFilter]: (className: string, key: string) =>
        `${paint.sky(className)} passes an empty array as ${paint.bold(key)}. Remove the key to run the middleware on everything.`,

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
        `The customId prefix ${quoted(prefix)} is empty or holds a colon or a control character. Pick a prefix without them.`,
    [SeedcordErrorCode.CustomIdReservedFieldName]: (field: string) =>
        `The customId field name ${quoted(field)} looks like an integer. JS reorders integer keys, which would scramble the field order. Give it a name that is not a number.`,
    [SeedcordErrorCode.CustomIdEmptyChoices]: (field: string, method: string) =>
        `The customId field ${quoted(field)} uses ${method}() with no choices. Give it at least one choice, or make the field nullable.`,
    [SeedcordErrorCode.CustomIdInvalidBounds]: (field: string, min: number, max: number) =>
        `The customId field ${quoted(field)} has min ${min}, which is greater than max ${max}. Swap them, or fix the one that is wrong.`,
    [SeedcordErrorCode.CustomIdValueRejected]: (field: string, expected: string, value: string) =>
        `The customId field ${quoted(field)} expects ${expected}, but encode() got ${value}.`,
    [SeedcordErrorCode.CustomIdWireTooLong]: (prefix: string, length: number) =>
        `A customId encoded by ${quoted(prefix)} is ${length} characters, but Discord allows at most 100. Shorten the prefix, or move a field out of the customId.`,
    [SeedcordErrorCode.CustomIdHandlerRouteMissing]: (className: string) =>
        `${paint.sky(className)} is missing its route decorator. Add the one that matches its base, for example ${paint.bold('@ButtonRoute')} or ${paint.bold('@UserMenuRoute')}.`,
    [SeedcordErrorCode.MatchArmMissing]: (handler: string, kind: string, value: string) =>
        `${paint.bold(handler)}'s match() has no arm for the ${kind} ${quoted(value)}. Add one to the object you pass to match().`,
    [SeedcordErrorCode.EventNameUnavailable]: (handler: string, read: string) =>
        `${paint.sky(handler)} read ${paint.bold(read)}, but it was constructed without an event name. The event controller passes that name. A handler or middleware you construct yourself takes it as the fourth constructor argument.`,
    [SeedcordErrorCode.AutocompleteNoFocusedOption]: () =>
        'Discord sent an autocomplete payload with no focused option.',
    [SeedcordErrorCode.ModalFieldNotFound]: (customId: string) =>
        `The submitted modal carries no field with the custom id ${quoted(customId)}. Check it against the id you gave the component when you built the modal.`,
    [SeedcordErrorCode.ModalFieldWrongKind]: (customId: string, kind: string, getter?: string) =>
        getter
            ? `The modal field ${quoted(customId)} holds ${kind}. Read it with ${paint.bold(`${getter}()`)}.`
            : `The modal field ${quoted(customId)} holds ${kind}, but none of the getters read that kind.`,
    [SeedcordErrorCode.ModalFieldEmpty]: (customId: string) =>
        `The modal field ${quoted(customId)} has nothing picked. Build the component as required, or read it without the required argument.`,
    [SeedcordErrorCode.ModalFieldChannelType]: (customId: string, picked: string, allowed: readonly string[]) =>
        `The modal field ${quoted(customId)} picked a ${picked} channel, but this read allows ${oneOf.format(allowed)}. Give the channel select the same channel types.`,
    [SeedcordErrorCode.CustomIdWireStale]: (prefix: string) =>
        `The customId ${quoted(prefix)} was encoded under an older shape of this definition. Adding, removing, changing, or moving a field changes the layout hash.`,
    [SeedcordErrorCode.CustomIdWireInvalid]: (detail: string) =>
        `The customId could not be decoded. ${sentence(detail)}`,
    [SeedcordErrorCode.DispatchStateMissing]: (key: string) =>
        `Nothing set ${paint.sky(key)} on this dispatch. Check that the middleware writing it is registered and that its filter covers this dispatch.`,

    [SeedcordErrorCode.GateInvalidCooldownDuration]: (input: string) =>
        `The cooldown duration ${quoted(input)} is not valid. Pass a positive number of seconds, or a duration string like '30m', '24h', or '500ms'.`,

    [SeedcordErrorCode.PaginationInvalidPerPage]: (perPage: number) =>
        `perPage is ${perPage}. Pass a positive integer.`,
    [SeedcordErrorCode.PaginationControlCount]: (count: number, max: number) =>
        `This control row has ${counted(count, 'button', 'buttons')}. Pass 1 to ${max}, the most Discord allows in one row.`,
    [SeedcordErrorCode.PaginationDuplicateControls]: (key: string) =>
        `This control row repeats the ${paint.sky(key)} control. Each control can appear once in a row.`,

    [SeedcordErrorCode.ColorUnresolvable]: (value: string) =>
        `Cannot convert ${value} into a color. Pass a hex string like '#5865f2', a number, an [r, g, b] tuple, or a color name from the palette.`,
    [SeedcordErrorCode.ColorOutOfRange]: (value: number) =>
        `${value} is outside Discord's color range, 0 to 16777215 (0xffffff).`,

    [SeedcordErrorCode.UtilTableOptionInvalid]: (option: string, expected: string, value: number) =>
        `renderTable's ${paint.bold(option)} is ${value}. Pass ${expected}.`,
    [SeedcordErrorCode.UtilUnhandledUnionMember]: (value: string) =>
        `assertNever() ran with ${value}, which its types ruled out. Something passed a value outside the union.`,
    [SeedcordErrorCode.LoggerFileNameHasFolder]: (filename: string, logsFolder: string) =>
        `${paint.bold('WinstonFileSink')} got ${paint.path(filename)} as its ${paint.bold('filename')}, which has a folder in it. File logs always go in ${paint.path(logsFolder)}. Pass only the file name, like ${paint.sky("'bot-{date}.log'")}.`,

    [SeedcordErrorCode.PluginOptionsRejected]: (pluginName: string, reason: string) =>
        `${paint.sky(pluginName)} rejected its options. ${sentence(reason.charAt(0).toUpperCase() + reason.slice(1))}`,
    [SeedcordErrorCode.PluginDisposeFailures]: (count: number) =>
        `${paint.iris(count)} plugins failed to dispose. Each one is listed below.`,
    [SeedcordErrorCode.PluginServiceDecoratorMissing]: (decorator: string, className: string) =>
        `${paint.sky(className)} is missing ${paint.bold(decorator)}. Add it to the class to register the service.`,
    [SeedcordErrorCode.PluginServicesNotReady]: (pluginName: string) =>
        `${paint.sky(`${pluginName}.services`)} was read before the plugin finished ${paint.bold('init()')}. Read it inside a handler, or after start() resolves.`,
    [SeedcordErrorCode.PluginConnectionFailed]: (service: string, target?: string) =>
        `Could not connect to ${paint.bold(service)}${target ? ` (${paint.sky(target)})` : ''}. Check that it is running and that the connection string is right.`,
    [SeedcordErrorCode.PluginDisconnectFailed]: (service: string) =>
        `Could not close the ${paint.bold(service)} connection cleanly during shutdown.`,

    [SeedcordErrorCode.PluginMongooseModelCreationFailed]: (modelName: string, className: string) =>
        `Could not build the mongoose model ${paint.sky(modelName)} for ${paint.bold(className)}. Check for another model with that name, and that the class has a schema.`,
    [SeedcordErrorCode.PluginMongooseModelNameMissing]: (className: string) =>
        `${paint.sky(className)} passes an empty model name to ${paint.bold('@RegisterMongooseService()')}. Pass a non-empty modelName.`,

    [SeedcordErrorCode.PluginKyselyServiceTableMissing]: (className: string) =>
        `${paint.sky(className)} has no table. Pass one to ${paint.bold('@RegisterKyselyService()')}.`,
    [SeedcordErrorCode.PluginKyselyInvalidStepCount]: (steps: number) =>
        `The migration step count is ${steps}. Pass zero or a positive integer.`,
    [SeedcordErrorCode.PluginKyselyUnknownDirection]: (direction: unknown) =>
        `${paint.sky(String(direction))} is not a migration direction. Pass 'up' or 'down'.`,
    [SeedcordErrorCode.PluginKyselyInvalidMigrationModule]: (filePath: string) =>
        `${paint.path(filePath)} needs an up function because it is in the migrations folder. Export up, and down if you need it, by name or on a default export object. Move a helper file out of the folder.`,
    [SeedcordErrorCode.PluginKyselyNonErrorFailure]: (message: string) =>
        `A migration failed with a value that is not an Error: ${message}.`,
    [SeedcordErrorCode.PluginKyselyBootstrapFailed]: (databaseName: string) =>
        `Could not create the database ${paint.sky(databaseName)}. Check that the database user may create databases, or create it yourself.`,

    [SeedcordErrorCode.CliCancelled]: () => 'Cancelled.',

    [SeedcordErrorCode.CliConfigInvalidExport]: () =>
        `The seedcord config file must default export an object, like ${paint.bold('export default defineConfig({ ... })')}.`,
    [SeedcordErrorCode.CliConfigNotFound]: (baseDir: string, candidates: readonly string[]) =>
        `Searched ${paint.path(baseDir)} for ${oneOf.format(candidates)} and found none. Run the command from your bot's folder, or create a ${paint.sky('seedcord.config.ts')} there.`,
    [SeedcordErrorCode.CliConfigInvalidField]: (field: string, expected: string) =>
        `${paint.bold(field)} in the seedcord config must be ${expected}.`,
    [SeedcordErrorCode.CliFileNotFound]: (path: string, field: string) =>
        `Cannot find ${paint.path(path)}. Point ${paint.bold(field)} in the seedcord config at a file that exists.`,
    [SeedcordErrorCode.CliInstanceInvalid]: (instancePath: string) =>
        `${paint.path(instancePath)} must default export the bot, a ${paint.bold('new Seedcord(...)')}, from ${paint.bold('@seedcord/gateway')} or ${paint.bold('@seedcord/http')}.`,
    [SeedcordErrorCode.CliStartFailed]: (instancePath: string, reason: string) =>
        `Failed to start the bot from ${paint.path(instancePath)}: ${reason}`,
    [SeedcordErrorCode.CliTsconfigNotFound]: (configDir: string, configured?: string) =>
        configured
            ? `${paint.bold('build.tsconfig')} points at ${paint.path(configured)}, which does not exist. Fix the path, or remove it to use the ${paint.sky('tsconfig.json')} in ${paint.path(configDir)}.`
            : `${paint.path(configDir)} does not contain a ${paint.sky('tsconfig.json')}. Add one there, or set ${paint.bold('build.tsconfig')} in the seedcord config.`,
    [SeedcordErrorCode.CliDependencyMissing]: (packages: readonly string[], projectDir: string, why: string) =>
        `Add ${allOf.format(packages.map((name) => paint.bold(name)))} to ${paint.path(projectDir)} as ${isOne(packages.length) ? 'a dev dependency' : 'dev dependencies'}. ${why}`,
    [SeedcordErrorCode.CliBuildFailed]: (diagnostics: string) => `Type check failed:\n${diagnostics}`,
    [SeedcordErrorCode.CliBundleFailed]: (reason: string) => `Vite could not bundle the bot:\n${reason}`,
    [SeedcordErrorCode.CliConfigOutDirDeletesRoot]: (outDir: string, root: string) =>
        `${paint.bold('build.outDir')} is ${paint.path(outDir)}, which contains ${paint.bold('root')} (${paint.path(root)}). ${paint.bold('seedcord build')} empties ${paint.bold('outDir')} before it writes. Point it at a folder of its own, like ${paint.sky('./dist')}.`,
    [SeedcordErrorCode.CliBuildOutDirNotEmpty]: (outDir: string) =>
        `${paint.bold('build.outDir')} is ${paint.path(outDir)}, which already contains other files. ${paint.bold('seedcord build')} empties ${paint.bold('outDir')} before it writes. Point it at an empty folder, or delete what is in it.`,
    [SeedcordErrorCode.CliProblems]: (count: number) =>
        `${paint.iris(count)} problems need fixing. Each one is listed below.`,
    [SeedcordErrorCode.CliEdgeCommandsNotDeployed]: (lines: readonly string[]) =>
        `${paint.iris(lines.length)} ${isOne(lines.length) ? 'command is' : 'commands are'} in your code with no deployed id on Discord, so the build cannot link ${isOne(lines.length) ? 'it' : 'them'}. Deploy with ${paint.bold('seedcord commands deploy')}, then build again.\n${lines.join('\n')}`,
    [SeedcordErrorCode.CliDevRuntimeNotRunning]: (method: string) =>
        `${paint.bold('seedcord dev')} called ${paint.bold(method)} while the dev runtime was not running. This is a bug in seedcord.`,
    [SeedcordErrorCode.CliDeployNoCommandsFolder]: (instance: string) =>
        `${paint.path(instance)} sets ${paint.bold('bot.commands.path')} to ${paint.bold('null')}. Point it at the folder that holds your commands to deploy them.`,
    [SeedcordErrorCode.CliDeployNeedsYes]: () =>
        `${paint.bold('seedcord commands deploy')} asks before it deploys, but it can only ask in a terminal with ${paint.bold('CI')} unset. Pass ${paint.bold('--yes')} to deploy without asking.`,
    [SeedcordErrorCode.CliNoScopeGiven]: (flags: readonly string[], note?: string) =>
        `No scope given. Pass ${oneOf.format(flags.map((flag) => paint.bold(flag)))}.${note ? ` ${note}` : ''}`,
    [SeedcordErrorCode.CliCommandConstructorThrew]: (name: string, file: string, reason: string) =>
        `${paint.sky(name)} threw while seedcord constructed it. Fix its constructor in ${paint.path(file)}. ${reason}`,
    [SeedcordErrorCode.CliCommandNotACommand]: (name: string, file: string) =>
        `${paint.bold(name)} in ${paint.path(file)} carries ${paint.bold('@RegisterCommand')}, but its component is not a slash command or a context menu. Extend ${paint.bold("BuilderComponent<'command'>")} or ${paint.bold("BuilderComponent<'context_menu'>")}.`,
    [SeedcordErrorCode.CliCommandsNotDeleted]: () =>
        'Some commands could not be deleted. The warnings above give the reason for each one.',
    [SeedcordErrorCode.CliEdgeOnBun]: () =>
        `seedcord loads ${paint.path('cloudflare.config.ts')} through Cloudflare's config loader, which throws on Bun. Run the CLI on Node by leaving out ${paint.bold('--bun')}, as in ${paint.bold('bun run dev')}.`,
    [SeedcordErrorCode.CliEdgeNoWorker]: (cloudflareConfig: string) =>
        `${paint.path(cloudflareConfig)} sets no ${paint.bold('worker')}. Add a ${paint.bold('worker')} with your worker's ${paint.bold('name')} and ${paint.bold('compatibilityDate')}.`,
    [SeedcordErrorCode.CliNotProjectInstall]: (cliDir: string, projectInstall: string) =>
        `This ${paint.bold('seedcord')} runs from ${paint.path(cliDir)}, but the project installs its own at ${paint.path(projectInstall)}. The CLI and the bot must load the same seedcord packages. Run the command through a script in the project's ${paint.path('package.json')}.`,
    [SeedcordErrorCode.CliViteEnvironmentMissing]: (name: string, created: readonly string[]) =>
        `seedcord runs the bot in Vite's ${paint.bold(name)} environment. Vite created only ${allOf.format(created.map((environment) => paint.bold(environment)))}. Look in ${paint.bold('vitePlugins')} for a plugin whose ${paint.bold('config')} hook rewrites ${paint.bold('environments')}.`,
    [SeedcordErrorCode.CliListedFolderUnusable]: (folder: string, problem: keyof typeof listedFolderProblems) =>
        `${paint.bold('files')} in seedcord.config.ts lists ${paint.path(folder)}, ${listedFolderProblems[problem]}`,
    [SeedcordErrorCode.CliDevAlreadyRunning]: (configDir: string, pid: number, startedAt: string, lockFile: string) =>
        `Another ${paint.bold('seedcord dev')} is running this bot's application from ${paint.path(configDir)} (pid ${pid}, started ${startedAt}). Two dev sessions on one application overwrite each other's commands and interactions endpoint. Press ${paint.bold('q')} in that session, or delete ${paint.path(lockFile)} if it is no longer running.`,
    [SeedcordErrorCode.CliDevLockFolderNotOwned]: (folder: string) =>
        `Another user owns ${paint.path(folder)}, the folder ${paint.bold('seedcord dev')} writes its session locks to. That account could write a lock there that blocks your dev sessions. Ask that user or an admin to delete the folder, then start ${paint.bold('seedcord dev')} again.`,
    [SeedcordErrorCode.CliPluginCodegenThrew]: (plugin: string, key: string, reason: string) =>
        `The ${paint.bold('codegen()')} of the plugin attached at ${paint.sky(key)} (${paint.sky(plugin)}) threw. ${sentence(reason)} ${paint.bold('seedcord codegen')} calls ${paint.bold('codegen()')} without running ${paint.bold('init()')} first, so read only constructor state and files in it.`,
    [SeedcordErrorCode.CliPluginCodegenNoId]: (plugin: string, key: string) =>
        `The plugin attached at ${paint.sky(key)} (${paint.sky(plugin)}) needs an id because it has a ${paint.bold('codegen()')}. Add ${paint.bold("static readonly id = '<your package name>'")} to the class.`,
    [SeedcordErrorCode.CliPluginCodegenValue]: (id: string, key: string, path: string, value: string) =>
        `The ${paint.bold('codegen()')} of the plugin attached at ${paint.sky(key)} (${paint.sky(id)}) returned ${value} at ${paint.bold(path)}. Codegen can't write that value as a type. It writes plain data, and classes or objects that a project file or the plugin's package exports. Export the value from a file, or return plain data.`,
    [SeedcordErrorCode.CliPluginCodegenConflict]: (id: string, first: string, second: string, path: string) =>
        `The plugins attached at ${paint.sky(first)} and ${paint.sky(second)} are both ${paint.bold(id)}, and their ${paint.bold('codegen()')} results differ at ${paint.bold(path)}. Every attachment of one plugin shares one type, so both have to return the same value there. Change that value in the files one of them reads, or attach the plugin once.`,
    [SeedcordErrorCode.CliCodegenOutOfDate]: (outputPath: string) =>
        `${paint.path(outputPath)} is out of date. Run ${paint.bold('seedcord codegen')} and commit it.`,
    [SeedcordErrorCode.CliEdgeWithoutWorkerdCondition]: (cloudflareConfig: string, tsconfig: string) =>
        `${paint.path(cloudflareConfig)} makes this an edge bot, but ${paint.path(tsconfig)} leaves out ${paint.bold('"customConditions": ["workerd"]')}. Add it to compilerOptions for an edge bot, or set ${paint.bold('build.tsconfig')} to the tsconfig that holds it. For a node bot, move ${paint.path(cloudflareConfig)} out of this folder.`,
    [SeedcordErrorCode.CliWorkerdConditionWithoutCloudflareConfig]: (tsconfig: string, configDir: string) =>
        `${paint.path(tsconfig)} sets the ${paint.bold('workerd')} condition, which only an edge bot uses, but ${paint.path(configDir)} has no ${paint.path('cloudflare.config.ts')}. Add one for an edge bot. For a node bot, remove ${paint.bold('"workerd"')} from customConditions.`,
    [SeedcordErrorCode.CliConfigFileUnreadable]: (tool: string, file: string, output: string) =>
        `${tool} could not read ${paint.path(file)}. Fix the problem it reports:\n${output}`,
    [SeedcordErrorCode.CliConfigFieldUnused]: (field: string, file: string, why: string) =>
        `${paint.path(file)} sets ${paint.bold(field)}. ${why} Remove ${paint.bold(field)} from ${paint.path(file)}.`,
    [SeedcordErrorCode.CliEdgeCompatDateTooOld]: (cloudflareConfig: string, date: string, firstDate: string) =>
        `A seedcord edge bot needs Cloudflare's Node compat. ${paint.path(cloudflareConfig)} sets ${paint.bold('compatibilityDate')} to ${date}, but Cloudflare turns Node compat on by default only from ${firstDate}. Set the date to ${firstDate} or later, or add ${paint.bold("'nodejs_compat'")} to ${paint.bold('compatibilityFlags')}.`,
    [SeedcordErrorCode.CliEdgeNodeCompatOff]: (cloudflareConfig: string) =>
        `A seedcord edge bot needs Cloudflare's Node compat, but ${paint.path(cloudflareConfig)} turns it off with ${paint.bold("'no_nodejs_compat'")}. Remove that flag from ${paint.bold('compatibilityFlags')}.`,
    [SeedcordErrorCode.CliEdgeBootFailed]: (reason: string) =>
        `The build could not start the worker in workerd, the runtime Cloudflare runs it on.\n${reason}`,
    [SeedcordErrorCode.CliEdgeRootHoldsConfig]: (configFile: string, root: string) =>
        `An edge build bundles every file under ${paint.bold('root')}. ${paint.path(configFile)} sets ${paint.bold('root')} to ${paint.path(root)}, so the bundle would pull in that config file and tool configs like ${paint.sky('eslint.config.ts')}. Those break the bundle. Set ${paint.bold('root')} to the folder that holds the bot's code, like ${paint.sky("'./src'")}.`,
    [SeedcordErrorCode.CliTypescriptNotStarted]: (tsc: string, reason: string) =>
        `Could not start TypeScript at ${paint.path(tsc)}: ${reason}`,
    [SeedcordErrorCode.CliPathHasHash]: (path: string) =>
        `${paint.path(path)} has a ${paint.bold('#')} in its path. Vite cuts a path at its first ${paint.bold('#')}, so rename it, or move the project to a folder without one.`,
    [SeedcordErrorCode.CliTunnelUrlUnavailable]: (seconds: number) =>
        `cloudflared did not report a tunnel URL within ${seconds}s. Check that the binary runs and that the network allows it.`,
    [SeedcordErrorCode.CliTunnelNotVerified]: (url: string) =>
        `Discord rejected ${paint.sky(url)} as an interactions endpoint. Discord checks the endpoint by sending it a signed request, so check that ${paint.bold('DISCORD_PUBLIC_KEY')} matches your application.`,
    [SeedcordErrorCode.CliTunnelUnreachable]: (url: string, seconds: number) =>
        `${paint.sky(url)} did not answer within ${seconds}s, so nothing was PATCHed to Discord.`,

    [SeedcordErrorCode.CreateFlagNotApplicable]: (flag: string) =>
        `The --${flag} flag does not apply to the answers you gave.`,
    [SeedcordErrorCode.CreateInvalidAnswer]: (flag: string, reason: string) => `--${flag}: ${reason}`,
    // node's parseArgs message ends on an unclosed quote
    [SeedcordErrorCode.CreateBadUsage]: (reason: string) => `${reason}\nRun with --help for the flag list.`,
    [SeedcordErrorCode.CreateTargetNotEmpty]: (target: string) =>
        `${paint.path(target)} already has files in it. Pick an empty directory or a name that does not exist yet.`,
    [SeedcordErrorCode.CreateStepFailed]: (command: string, reason: string) =>
        `${paint.bold(command)} failed.\n${reason}`,

    [SeedcordErrorCode.MakeInvalidName]: (name: string) =>
        `${paint.bold(JSON.stringify(name))} can't be a file name. Start it with a letter and use only letters, digits, spaces, - and _, like ${paint.bold('RollDice')}. Put folders in front with /, like ${paint.bold('fun/RollDice')}.`,
    [SeedcordErrorCode.MakeImportOfUnmatched]: (template: string, folder: string, count: number) =>
        `${paint.bold(`importOf "${folder}"`)} in the ${paint.bold(template)} template needs exactly one ${paint.path('.hbs')} file in the template's ${paint.path(folder)} folder. That folder holds ${count}. Point importOf at a folder with one template file.`,
    [SeedcordErrorCode.MakeValueUsedTwoWays]: (
        template: string,
        value: string,
        first: 'text' | 'list' | 'object',
        second: 'text' | 'list' | 'object'
    ) => {
        const uses = {
            text: 'prints it',
            list: `loops over it with ${paint.bold('#each')}`,
            object: `reads a field from it, like ${paint.bold(`${value}.name`)}`
        };
        return `The ${paint.bold(template)} template uses ${paint.bold(value)} two ways. It ${uses[first]}, and it also ${uses[second]}. Give one of the two uses its own name.`;
    },
    [SeedcordErrorCode.MakeTemplateFailed]: (file: string, from: string, reason: string) =>
        `Handlebars could not render ${paint.path(file)} from ${paint.bold(from)}.\n${reason}\nFix that template file.`,
    [SeedcordErrorCode.MakeLookupDynamicKey]: (template: string, value: string) =>
        `The ${paint.bold(template)} template calls ${paint.bold('lookup')} on ${paint.bold(value)} without a quoted key. seedcord make can't tell which field of ${paint.bold(value)} to ask for. Give lookup a quoted key like ${paint.bold(`{{lookup ${value} "title"}}`)}, or map the value in a helper under ${paint.bold('make.helpers')} in seedcord.config.ts.`,
    [SeedcordErrorCode.MakeNeedsTerminal]: () =>
        `${paint.bold('seedcord make')} asks for a template, a name and each value in a terminal. Run it from a terminal with ${paint.bold('CI')} unset.`,
    [SeedcordErrorCode.MakeNoTemplates]: (folder: string) =>
        `Found no templates in ${paint.path(folder)} or in the installed plugins. Each folder inside ${paint.path(folder)} is one template. ${paint.sky('https://seedcord.org/guide/tooling/make')} shows how to write one and where to copy the starters from.`,
    [SeedcordErrorCode.MakePathTaken]: (path: string, takenByTemplate?: string) =>
        takenByTemplate === undefined
            ? `${paint.path(path)} already exists. Pick another name, or delete that file first.`
            : `Two files of the ${paint.bold(takenByTemplate)} template would both be written to ${paint.path(path)}. Pick a name that keeps them apart, or give the files different names in the template.`,
    [SeedcordErrorCode.MakePartialCallsItself]: (template: string, partial: string) =>
        `The ${paint.bold(partial)} partial in the ${paint.bold(template)} template calls itself. seedcord make asks for every value before it writes a file, and it can't tell how many levels a partial that calls itself goes down. Write out each level the template needs.`
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
