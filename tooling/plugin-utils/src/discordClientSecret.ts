import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Converters, Envapter } from 'envapt';

const CLIENT_SECRET_KEY = 'DISCORD_CLIENT_SECRET';

// call it from a method. envapt throws on workers if you read before the bot binds its env, and plugins
// get built before that
export function discordClientSecret(): string {
    if (!Envapter.has(CLIENT_SECRET_KEY)) {
        throw new SeedcordError(SeedcordErrorCode.ConfigMissingEnv, [
            CLIENT_SECRET_KEY,
            "It's the client secret on your application's OAuth2 page in the Developer Portal."
        ]);
    }
    return Envapter.getRequired(CLIENT_SECRET_KEY, Converters.String);
}
