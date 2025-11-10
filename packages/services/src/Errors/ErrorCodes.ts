/* eslint-disable no-magic-numbers */

export enum SeedcordErrorCode {
    ConfigMissingDiscordToken = 1001,
    ConfigUnknownExceptionWebhookMissing = 1002,
    ConfigUnknownExceptionWebhookInvalid = 1003,

    LifecycleAddAfterCompletion = 1101,
    LifecycleAddDuringRun = 1102,
    LifecycleRemoveDuringRun = 1103,
    LifecycleUnknownPhase = 1104,
    LifecyclePhaseFailures = 1105,
    LifecycleTaskTimeout = 1106,

    CoreSingletonViolation = 1201,
    CorePluginAfterInit = 1202,
    CorePluginKeyExists = 1203,
    CoreClientUserUnavailable = 1204,
    CoreBotRoleMissing = 1205,

    DecoratorInteractionEventFilter = 1301,
    DecoratorMethodNotFound = 1302,
    DecoratorCommandAlreadyRegistered = 1303,
    DecoratorCommandGlobalWithGuilds = 1304,
    DecoratorCommandGuildWithoutGuilds = 1305,
    DecoratorInvalidMiddlewarePriority = 1306,

    UtilHexInputType = 1401,
    UtilHexInvalid = 1402,
    UtilInvalidSlashRouteArgument = 1403,

    PluginMongoServiceDecoratorMissing = 2101,
    PluginMongoModelDecoratorMissing = 2102,
    PluginMongoConnectionFailed = 2103,

    PluginKpgServiceDecoratorMissing = 2201,
    PluginKpgServiceTableMissing = 2202,
    PluginKpgInvalidStepCount = 2203,
    PluginKpgUnknownDirection = 2204,
    PluginKpgUnresolvedMigrationsPath = 2205,
    PluginKpgNoMigrationFiles = 2206,
    PluginKpgInvalidMigrationModule = 2207,
    PluginKpgNonErrorFailure = 2208
}
