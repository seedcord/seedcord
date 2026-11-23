import type { GatewayConfig } from '#interfaces/Config';
import type { CustomIdMatcher, ServerConfig } from '@seedcord/types';

type UnhandledHandler = Extract<GatewayConfig['bot']['interactions'], { path: string }>['unhandled'];

interface TestConfigOverrides {
    interactions?: string;
    interactionMiddlewares?: string;
    unhandled?: UnhandledHandler;
    events?: string;
    eventMiddlewares?: string;
    commands?: string;
    subscribers?: string;
    ignoreCustomIds?: CustomIdMatcher[];
    ownerIds?: string[];
    server?: ServerConfig;
}

export function testConfig(overrides: TestConfigOverrides = {}): GatewayConfig {
    const {
        interactions,
        interactionMiddlewares,
        unhandled,
        events,
        eventMiddlewares,
        commands,
        subscribers,
        ignoreCustomIds,
        ownerIds,
        // test files run side by side, and a default server would put them all on port 3000
        server = { port: false }
    } = overrides;

    const config: GatewayConfig = {
        bot: {
            interactions:
                interactions === undefined
                    ? { path: null }
                    : {
                          path: interactions,
                          ...(ignoreCustomIds && { ignoreCustomIds }),
                          ...(unhandled && { unhandled }),
                          ...(interactionMiddlewares && { middlewares: interactionMiddlewares })
                      },
            events:
                events === undefined
                    ? { path: null }
                    : { path: events, ...(eventMiddlewares && { middlewares: eventMiddlewares }) },
            commands: commands === undefined ? { path: null } : { path: commands },
            clientOptions: { intents: [] }
        },
        subscribers: subscribers === undefined ? { path: null } : { path: subscribers },
        server
    };

    if (ownerIds) config.ownerIds = ownerIds;

    return config;
}
