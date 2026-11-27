import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

// renaming this breaks user plugins that check for 'seedcord'
export const BOT_ENVIRONMENT = 'seedcord';

export const LOOK_FOR_BUILD_PLUGIN = `Look in ${paint.bold('vitePlugins')} for a plugin that changes how Vite builds the ${paint.bold(BOT_ENVIRONMENT)} environment.`;

export function viteEnvironment<Environment>(environments: Record<string, Environment>, name: string): Environment {
    const environment = environments[name];
    if (environment) return environment;
    throw new SeedcordError(SeedcordErrorCode.CliViteEnvironmentMissing, [name, Object.keys(environments)]);
}

export function botEnvironment<Environment>(environments: Record<string, Environment>): Environment {
    return viteEnvironment(environments, BOT_ENVIRONMENT);
}
