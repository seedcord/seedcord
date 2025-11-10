import { SeedcordErrorCode } from './ErrorCodes';

const messages = {
    [SeedcordErrorCode.ConfigMissingDiscordToken]: () => 'Missing DISCORD_BOT_TOKEN environment variable.',
    [SeedcordErrorCode.ConfigUnknownExceptionWebhookMissing]: () =>
        'Missing UNKNOWN_EXCEPTION_WEBHOOK_URL environment variable.',
    [SeedcordErrorCode.ConfigUnknownExceptionWebhookInvalid]: () => 'Invalid UNKNOWN_EXCEPTION_WEBHOOK_URL value.',

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
    [SeedcordErrorCode.CoreClientUserUnavailable]: () => 'Client user is not available.',
    [SeedcordErrorCode.CoreBotRoleMissing]: (guildId?: string) =>
        guildId ? `Bot role not found in guild ${guildId}.` : 'Bot role not found in guild.',

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

    [SeedcordErrorCode.UtilHexInputType]: () => 'hexToNumber expects a string input.',
    [SeedcordErrorCode.UtilHexInvalid]: () => 'Invalid hex string.',
    [SeedcordErrorCode.UtilInvalidSlashRouteArgument]: () => 'Invalid argument passed to buildSlashRoute.',

    [SeedcordErrorCode.PluginMongoServiceDecoratorMissing]: (className: string) =>
        `Missing @RegisterMongoService on ${className}.`,
    [SeedcordErrorCode.PluginMongoModelDecoratorMissing]: (className: string) =>
        `Missing @RegisterMongoModel on ${className}.`,
    [SeedcordErrorCode.PluginMongoConnectionFailed]: (databaseName?: string) =>
        databaseName ? `Could not connect to MongoDB (${databaseName}).` : 'Could not connect to MongoDB.',

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
    [SeedcordErrorCode.PluginKpgNonErrorFailure]: (message: string) => `Migration failure: ${message}.`
} as const;

export type SeedcordErrorArguments<TCode extends SeedcordErrorCode> = Parameters<(typeof messages)[TCode]>;

export function formatSeedcordErrorMessage<TCode extends SeedcordErrorCode>(
    code: TCode,
    args?: SeedcordErrorArguments<TCode>
): string {
    const formatter = messages[code];
    const resolvedArgs = (args ?? []) as unknown[];
    return (formatter as (...params: unknown[]) => string)(...resolvedArgs);
}

export { messages as seedcordErrorMessages };
