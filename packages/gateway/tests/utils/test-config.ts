import type { GatewayConfig } from '#interfaces/Config';
import type { CustomIdMatcher, HealthCheckOption } from '@seedcord/types';

interface TestConfigOverrides {
    interactions?: string;
    interactionMiddlewares?: string;
    events?: string;
    eventMiddlewares?: string;
    commands?: string;
    subscribers?: string;
    ignoreCustomIds?: CustomIdMatcher[];
    ownerIds?: string[];
    healthCheck?: HealthCheckOption;
}

export function testConfig(overrides: TestConfigOverrides = {}): GatewayConfig {
    const {
        interactions,
        interactionMiddlewares,
        events,
        eventMiddlewares,
        commands,
        subscribers,
        ignoreCustomIds,
        ownerIds,
        healthCheck
    } = overrides;

    const config: GatewayConfig = {
        bot: {
            interactions:
                interactions === undefined
                    ? { path: null }
                    : {
                          path: interactions,
                          ...(ignoreCustomIds && { ignoreCustomIds }),
                          ...(interactionMiddlewares && { middlewares: interactionMiddlewares })
                      },
            events:
                events === undefined
                    ? { path: null }
                    : { path: events, ...(eventMiddlewares && { middlewares: eventMiddlewares }) },
            commands: commands === undefined ? { path: null } : { path: commands },
            clientOptions: { intents: [] }
        },
        subscribers: subscribers === undefined ? { path: null } : { path: subscribers }
    };

    if (ownerIds) config.ownerIds = ownerIds;
    if (healthCheck !== undefined) config.healthCheck = healthCheck;

    return config;
}
