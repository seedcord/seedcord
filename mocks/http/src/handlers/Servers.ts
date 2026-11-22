import { isSeedcordError, SeedcordErrorCode, SlashHandler, SlashRoute } from '@seedcord/http';

@SlashRoute('servers')
export class Servers extends SlashHandler<'servers'> {
    public async execute(): Promise<void> {
        const { oauth } = this.core;
        await this.defer();
        try {
            const guilds = await oauth.as(this.user.id).guilds();
            await this.edit(`You're in ${guilds.length} servers.`);
        } catch (error) {
            if (!this.needsLogin(error)) throw error;
            await this.edit(`Log in first: ${oauth.loginUrl()}`);
        }
    }

    private needsLogin(error: unknown): boolean {
        return isSeedcordError(error, 'SeedcordError', SeedcordErrorCode.PluginOAuthLoginNeeded);
    }
}
