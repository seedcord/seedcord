import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

// renaming this breaks user plugins that check for 'seedcord'
export const BOT_ENVIRONMENT = 'seedcord';

export const LOOK_FOR_BUILD_PLUGIN = `Look in ${paint.bold('vitePlugins')} for a plugin that changes how Vite builds the ${paint.bold(BOT_ENVIRONMENT)} environment.`;

export function botEnvironment<Environment>(environments: Record<string, Environment>): Environment {
    const environment = environments[BOT_ENVIRONMENT];
    if (environment) return environment;
    throw new SeedcordError(SeedcordErrorCode.CliViteEnvironmentMissing, [BOT_ENVIRONMENT, Object.keys(environments)]);
}
