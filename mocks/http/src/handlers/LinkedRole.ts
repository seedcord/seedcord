import { isSeedcordError, SeedcordErrorCode, SlashHandler, SlashRoute } from '@seedcord/http';

@SlashRoute('linked-role')
export class LinkedRole extends SlashHandler<'linked-role'> {
    public async execute(): Promise<void> {
        const action = this.options.getString('action');
        if (action === 'connect') {
            await this.reply(`Connect here: ${this.core.linkedRoles.verifyUrl()}`);
            return;
        }

        await this.defer();
        try {
            await this.edit(action === 'clear' ? await this.clear() : await this.update());
        } catch (error) {
            if (!isSeedcordError(error, 'SeedcordError', SeedcordErrorCode.PluginOAuthLoginNeeded)) throw error;
            await this.edit(`Connect first: ${this.core.linkedRoles.verifyUrl()}`);
        }
    }

    private async update(): Promise<string> {
        const result = await this.core.linkedRoles.push(this.user.id);
        return result.kind === 'connected' ? 'Sent your roll count to Discord.' : result.message;
    }

    private async clear(): Promise<string> {
        await this.core.linkedRoles.clear(this.user.id);
        return 'Cleared what Discord had for you.';
    }
}
