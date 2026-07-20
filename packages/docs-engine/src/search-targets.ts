export interface SearchTarget {
    query: string;
    packageName?: string;
}

export const DEFAULT_SEARCH_TARGETS: SearchTarget[] = [
    // Classes
    { query: 'MongoService' },
    { query: 'Seedcord' },
    { query: 'AutocompleteHandler' },
    { query: 'HealthCheck' },
    { query: 'BaseHandler' },
    { query: 'Fault' },
    { query: 'BuilderComponent' },
    { query: 'CoordinatedShutdown' },
    { query: 'UnknownException' },
    { query: 'Mongo' },
    { query: 'Bot' },
    { query: 'BaseComponent' },
    { query: 'MemoryRateLimiter' },
    { query: 'WebhookLog' },

    // Properties
    { query: 'db' },
    { query: 'PLUGIN_INIT_TIMEOUT_MS' },
    { query: 'botColor' },
    { query: 'tasksMap' },
    { query: 'host' },
    { query: 'server' },

    // Methods
    { query: 'checkPermissions' },
    { query: 'canAddTask' },
    { query: 'logout' },
    { query: 'addTask' },

    // Accessors
    { query: 'isRunning' },
    { query: 'Notice report' },
    { query: 'client' },

    // Interfaces
    { query: 'Gate' },
    { query: 'Handler' },
    { query: 'BaseCore' },
    { query: 'RateLimitWindow' },

    // Types
    { query: 'RequireAtLeastOne' },
    { query: 'TupleOf' },
    { query: 'NumberRange' },
    { query: 'TypedConstructor' },
    { query: 'BotPermissionScopeGroups' },

    // Enums
    { query: 'SelectMenuKind' },

    // Functions
    { query: 'prettify' },
    { query: 'fyShuffle' },
    { query: 'RegisterCommand' },
    { query: 'SelectMenuRoute' },
    { query: 'AutocompleteRoute' },
    { query: 'checkPermissions' },
    { query: 'hasPermsToAssign' },

    // Variables
    { query: 'BuilderTypes' },
    { query: 'SubscribeMetadataKey' },
    { query: 'RowTypes' },
    { query: 'PermissionNames' },
    { query: 'PERM_GROUPS' },
    { query: 'PRETTIER_CONFIG' }
];
