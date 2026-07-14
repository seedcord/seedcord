import chalk from 'chalk';

import { SeedcordErrorCode } from './ErrorCodes';

/** @internal */
const messages = {
    [SeedcordErrorCode.ConfigMissingDiscordToken]: () => 'Missing DISCORD_BOT_TOKEN environment variable.',
    [SeedcordErrorCode.ConfigIncorrectDiscordToken]: () => 'Invalid DISCORD_BOT_TOKEN value.',
    [SeedcordErrorCode.ConfigMissingPublicKey]: () => 'Missing DISCORD_PUBLIC_KEY environment variable.',
    [SeedcordErrorCode.ConfigIncorrectPublicKey]: () => 'Invalid DISCORD_PUBLIC_KEY value. Expected 64 hex characters.',
    [SeedcordErrorCode.ConfigWebhookUrlInvalid]: (envKey: string) =>
        `${envKey} is not a well-formed Discord webhook url.`,
    [SeedcordErrorCode.ConfigWebhookNotFound]: (envKey: string) =>
        `The webhook behind ${envKey} does not exist on Discord.`,
    [SeedcordErrorCode.ConfigEmojiUnresolved]: (count: number, failures: string) =>
        `Could not resolve ${count} configured emoji${count === 1 ? '' : 's'} at startup.\n${failures}`,

    [SeedcordErrorCode.LifecycleAddAfterCompletion]: () =>
        'Cannot add tasks after startup sequence has already completed.',
    [SeedcordErrorCode.LifecycleAddDuringRun]: () => 'Cannot add tasks while startup sequence is in progress.',
    [SeedcordErrorCode.LifecycleRemoveDuringRun]: () => 'Cannot remove tasks while startup sequence is in progress.',
    [SeedcordErrorCode.LifecycleUnknownPhase]: (phase: unknown) => `Unknown phase: ${String(phase)}.`,
    [SeedcordErrorCode.LifecyclePhaseFailures]: (phase: string, failures: number) =>
        `Phase ${phase} completed with ${failures} failed task${failures === 1 ? '' : 's'}.`,
    [SeedcordErrorCode.LifecycleTaskTimeout]: (taskName: string, timeout: number) =>
        `Task "${taskName}" timed out after ${timeout}ms.`,

    [SeedcordErrorCode.CoreSingletonViolation]: () =>
        'Seedcord can only be instantiated once. Use the existing instance instead.',
    [SeedcordErrorCode.CorePluginAfterInit]: () => 'Cannot attach a plugin after initialization.',
    [SeedcordErrorCode.CorePluginKeyExists]: (key: string) => `Plugin with key "${key}" already exists.`,
    [SeedcordErrorCode.CoreBotRoleMissing]: (guildId?: string) =>
        guildId ? `Bot role not found in guild ${guildId}.` : 'Bot role not found in guild.',
    [SeedcordErrorCode.CoreControllerPathMissing]: (controllerName: string, pathKind: string) =>
        `${controllerName} was instantiated without a ${pathKind} path.`,

    [SeedcordErrorCode.DecoratorInteractionEventFilter]: () => 'Interaction middleware cannot specify event filters.',
    [SeedcordErrorCode.DecoratorMethodNotFound]: () =>
        'Decorator could not locate the original method. Ensure the method exists before applying the decorator.',
    [SeedcordErrorCode.DecoratorCommandAlreadyRegistered]: (
        commandName: string,
        existingScope: string,
        requestedScope: string
    ) =>
        `Command "${commandName}" is already registered as a "${existingScope}" command and cannot be re-registered as a "${requestedScope}" command.`,
    [SeedcordErrorCode.DecoratorCommandGlobalWithGuilds]: () =>
        'RegisterCommand("global") cannot have guilds specified.',
    [SeedcordErrorCode.DecoratorCommandGuildWithoutGuilds]: () =>
        'RegisterCommand("guild") requires a non-empty guilds array.',
    [SeedcordErrorCode.DecoratorInvalidMiddlewarePriority]: () => 'Middleware priority must be a finite number.',
    [SeedcordErrorCode.DecoratorWebhookUrlMissing]: (className: string) =>
        `${className} extends WebhookLog and needs a @WebhookUrl decorator naming its env var.`,

    [SeedcordErrorCode.InteractionDuplicateRoute]: (route: string, firstClass: string, secondClass: string) =>
        `Two interaction handlers resolve to the same route \`${route}\`. Registered by ${firstClass} and ${secondClass}. Rename one.`,
    [SeedcordErrorCode.InteractionDuplicateMiddleware]: (name: string) =>
        `Two different interaction middleware classes share the name \`${name}\`. Rename one so they do not collide.`,

    [SeedcordErrorCode.ReplyIllegalAckState]: (method: string, reason: string, alternative: string, routeId: string) =>
        `${chalk.cyan(`${method}()`)} was called when ${reason}.\n${alternative} (route ${chalk.cyan(routeId)})`,
    [SeedcordErrorCode.ReplyComponentSerialization]: (
        componentClass: string,
        index: number,
        detail: string,
        routeId: string
    ) =>
        `${chalk.cyan(componentClass)} at components[${index}] failed to serialize: ${detail.replace(/\.$/, '')}. (route ${chalk.cyan(routeId)})`,
    [SeedcordErrorCode.ReplyForeignEditTarget]: (method: string, targetId: string, routeId: string) =>
        `${chalk.cyan(`${method}()`)} was passed message ${targetId}, which this interaction did not send.\nTarget a message returned by reply(), followUp(), edit(), or update(). (route ${chalk.cyan(routeId)})`,
    [SeedcordErrorCode.ReplyUpdateWithoutSource]: (method: string, routeId: string) =>
        `${chalk.cyan(`${method}()`)} was called on a modal opened from a command, which has no source message.\nUse reply() or defer() instead. (route ${chalk.cyan(routeId)})`,
    [SeedcordErrorCode.ReplyCallbackMissingMessage]: (method: string, routeId: string) =>
        `The interaction callback for ${chalk.cyan(`${method}()`)} returned no message. (route ${chalk.cyan(routeId)})`,

    [SeedcordErrorCode.CustomIdInvalidPrefix]: (prefix: string) =>
        `customId prefix ${JSON.stringify(prefix)} must be a non-empty string without a colon or control character.`,
    [SeedcordErrorCode.CustomIdReservedFieldName]: (field: string) =>
        `customId field name ${JSON.stringify(field)} is integer-like, which JS reorders. Use a non-numeric name.`,
    [SeedcordErrorCode.CustomIdEmptyChoices]: (field: string) =>
        `customId field ${JSON.stringify(field)} uses oneOf() with no choices.`,
    [SeedcordErrorCode.CustomIdInvalidBounds]: (field: string, min: number, max: number) =>
        `customId field ${JSON.stringify(field)} has min ${min} greater than max ${max}.`,
    [SeedcordErrorCode.CustomIdValueOutOfRange]: (field: string, value: string) =>
        `customId field ${JSON.stringify(field)} got value ${value} outside its allowed range.`,
    [SeedcordErrorCode.CustomIdWireTooLong]: (length: number) =>
        `Encoded customId is ${length} characters, Discord allows at most 100.`,
    [SeedcordErrorCode.CustomIdDuplicateFieldName]: (field: string) =>
        `customId field ${JSON.stringify(field)} is already defined in this chain.`,
    [SeedcordErrorCode.CustomIdHandlerRouteMissing]: (className: string) =>
        `${className} is missing its route decorator (@ButtonRoute, @ModalRoute, or @SelectMenuRoute).`,
    [SeedcordErrorCode.CustomIdMatchArmMissing]: (prefix: string) =>
        `match() has no arm for the decoded route ${JSON.stringify(prefix)}.`,
    [SeedcordErrorCode.SlashMatchArmMissing]: (route: string) =>
        `match() has no arm for the command route ${JSON.stringify(route)}.`,
    [SeedcordErrorCode.AutocompleteMatchArmMissing]: (field: string) =>
        `match() has no arm for the focused field ${JSON.stringify(field)}.`,
    [SeedcordErrorCode.EventMatchArmMissing]: (event: string) =>
        `match() has no arm for the event ${JSON.stringify(event)}.`,
    [SeedcordErrorCode.EventMiddlewareNameUnavailable]: () =>
        `this.eventName is only available on middleware the controller constructed with a fired event name.`,

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

    [SeedcordErrorCode.PluginMongoServiceDecoratorMissing]: (className: string) =>
        `Missing @RegisterMongoService on ${className}.`,
    [SeedcordErrorCode.PluginMongoModelDecoratorMissing]: (className: string) =>
        `Missing @RegisterMongoModel on ${className}.`,
    [SeedcordErrorCode.PluginMongoConnectionFailed]: (databaseName?: string) =>
        databaseName ? `Could not connect to MongoDB (${databaseName}).` : 'Could not connect to MongoDB.',
    [SeedcordErrorCode.PluginMongoDisconnectFailed]: () => 'Failed to disconnect from MongoDB cleanly during shutdown.',
    [SeedcordErrorCode.PluginMongoServicesNotReady]: () =>
        'Mongo services accessed before the plugin finished initializing.',

    [SeedcordErrorCode.PluginKpgServiceDecoratorMissing]: (className: string) =>
        `Missing @RegisterKpgService on ${className}.`,
    [SeedcordErrorCode.PluginKpgServiceTableMissing]: (className: string) =>
        `Missing table metadata for ${className}. Provide a table via @RegisterKpgService().`,
    [SeedcordErrorCode.PluginKpgInvalidStepCount]: () => 'Migration step count must be a non-negative integer.',
    [SeedcordErrorCode.PluginKpgUnknownDirection]: (direction: unknown) =>
        `Unknown migration direction: ${String(direction)}.`,
    [SeedcordErrorCode.PluginKpgUnresolvedMigrationsPath]: (label: string) =>
        `Unable to resolve migrations at path: ${label}.`,
    [SeedcordErrorCode.PluginKpgNoMigrationFiles]: () => 'No migration files provided.',
    [SeedcordErrorCode.PluginKpgInvalidMigrationModule]: (filePath: string) =>
        `Migration file ${filePath} must export async functions up and down.`,
    [SeedcordErrorCode.PluginKpgNonErrorFailure]: (message: string) => `Migration failure: ${message}.`,
    [SeedcordErrorCode.PluginKpgDisconnectFailed]: () => 'Failed to close the Postgres pool cleanly during shutdown.',
    [SeedcordErrorCode.PluginKpgServicesNotReady]: () =>
        'KPG services accessed before the plugin finished initializing.',

    [SeedcordErrorCode.CliConfigInvalidExport]: () => 'Config file must default export an object.',
    [SeedcordErrorCode.CliConfigMissingInstance]: () =>
        'Config must include an `instance` string that points to your Seedcord default export.',
    [SeedcordErrorCode.CliConfigInvalidRoot]: () => 'Config `root` must be a string when provided.',
    [SeedcordErrorCode.CliConfigNotFound]: (baseDir: string, candidates: readonly string[]) =>
        `Unable to locate a Seedcord config in ${baseDir}. Searched for ${candidates.join(', ')}.`,
    [SeedcordErrorCode.CliConfigMissingEntry]: () =>
        'Config must include an `entry` string that points to your startup script.',
    [SeedcordErrorCode.CliConfigInvalidBuild]: () => 'Config `build` must be an object when provided.',
    [SeedcordErrorCode.CliConfigInvalidBuildOutDir]: () => 'Config `build.outDir` must be a string when provided.',
    [SeedcordErrorCode.CliConfigInvalidBuildTsconfig]: () => 'Config `build.tsconfig` must be a string when provided.',
    [SeedcordErrorCode.CliConfigInvalidBuildBootstrap]: () =>
        'Config `build.bootstrap` must be a string when provided.',
    [SeedcordErrorCode.CliConfigEntryOutsideRoot]: (entryPath: string, root: string) =>
        `Entry file ${entryPath} must reside inside configured root ${root}.`,
    [SeedcordErrorCode.CliEntryNotFound]: (entryPath: string) => `Cannot find entry file at ${entryPath}.`,
    [SeedcordErrorCode.CliTsxImportFailed]: (entryPath: string, reason: string) =>
        `Failed to import ${entryPath} via tsx: ${reason}.`,
    [SeedcordErrorCode.CliImportFailed]: (entryPath: string, nativeReason: string, fallbackReason: string) =>
        `Failed to import ${entryPath}: ${nativeReason}. Fallback via jiti also failed: ${fallbackReason}.`,
    [SeedcordErrorCode.CliInstanceInvalid]: () =>
        'Seedcord instance must default export an object with a start() method.',
    [SeedcordErrorCode.CliStartFailed]: (instancePath: string, reason: string) =>
        `Failed to start Seedcord from ${instancePath}: ${reason}.`,
    [SeedcordErrorCode.CliBuildTsconfigNotFound]: (hint: string) =>
        `Unable to resolve a tsconfig for builds (${hint}). Provide build.tsconfig or add tsconfig.build.json / tsconfig.json.`,
    [SeedcordErrorCode.CliBuildFailed]: (diagnostics: string) => `TypeScript build failed:\n${diagnostics}`,
    [SeedcordErrorCode.CliBootstrapWriteFailed]: (targetPath: string, reason: string) =>
        `Failed to write bootstrap file at ${targetPath}: ${reason}.`,
    [SeedcordErrorCode.CliConfigInvalidTsconfig]: () => 'Config `tsconfig` must be a string when provided.',
    [SeedcordErrorCode.CliConfigInvalidHmr]: () => 'Config `hmr` must be an object when provided.',
    [SeedcordErrorCode.CliConfigInvalidHmrRestart]: () =>
        'Config `hmr.restart` must be an array of strings when provided.',
    [SeedcordErrorCode.CliConfigInvalidHmrRollback]: () => 'Config `hmr.rollback` must be a boolean when provided.',
    [SeedcordErrorCode.CliCodegenDuplicateRoute]: (route: string, firstFile: string, secondFile: string) =>
        `Two commands resolve to the same slash route \`${route}\`. Defined in ${firstFile} and ${secondFile}. Rename one.`,
    [SeedcordErrorCode.CliCodegenCommandsDirUnreadable]: (dir: string, reason: string) =>
        `Could not read the commands directory ${dir} during codegen. ${reason}.`,
    [SeedcordErrorCode.CliCodegenDuplicateContextMenu]: (
        kind: string,
        name: string,
        firstFile: string,
        secondFile: string
    ) =>
        `Two ${kind} context-menu commands share the name \`${name}\`. Defined in ${firstFile} and ${secondFile}. Rename one.`,
    [SeedcordErrorCode.CliCleanAppFetchFailed]: (reason: string) =>
        `Could not resolve the application from the bot token. ${reason}.`,
    [SeedcordErrorCode.CliCleanNoGuilds]: () =>
        'No guilds given. Pass --guild <ids...> or --all-guilds. Global commands are never touched.',
    [SeedcordErrorCode.CliCleanPurgeAllGuilds]: () =>
        '--purge cannot be combined with --all-guilds. Use --guild <ids> to purge specific guilds.',
    [SeedcordErrorCode.CliCancelled]: () => 'Cancelled.',
    [SeedcordErrorCode.CliCleanLargeBotUnconfirmed]: (count: number) =>
        `Refusing to scan ${count} guilds without confirmation. Re-run with --yes, or name specific guilds with --guild <ids>.`,
    [SeedcordErrorCode.CliCleanApplyNeedsYes]: () =>
        'Refusing to delete without confirmation in a non-interactive environment. Re-run with --yes.'
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
