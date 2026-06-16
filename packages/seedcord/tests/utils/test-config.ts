import type { Config, CustomIdMatcher } from '@seedcord/types';

interface TestConfigOverrides {
    interactions?: string;
    events?: string;
    commands?: string;
    subscribers?: string;
    ignoreCustomIds?: CustomIdMatcher[];
    ownerIds?: string[];
}

export function testConfig(overrides: TestConfigOverrides = {}): Config {
    const { interactions, events, commands, subscribers, ignoreCustomIds, ownerIds } = overrides;

    const config: Config = {
        bot: {
            interactions:
                interactions === undefined
                    ? { path: null }
                    : { path: interactions, ...(ignoreCustomIds && { ignoreCustomIds }) },
            events: events === undefined ? { path: null } : { path: events },
            commands: commands === undefined ? { path: null } : { path: commands },
            clientOptions: { intents: [] }
        },
        subscribers: subscribers === undefined ? { path: null } : { path: subscribers }
    };

    if (ownerIds) config.ownerIds = ownerIds;

    return config;
}
