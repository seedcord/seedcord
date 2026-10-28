import { SlashHandler, SlashRoute, timestampFromSnowflake } from '@seedcord/gateway';

@SlashRoute('ping')
export class Ping extends SlashHandler<'ping'> {
    public async execute(): Promise<void> {
        const roundtrip = Date.now() - timestampFromSnowflake(this.event.id);
        const lines = [
            `### ${this.core.i18n.t('greet', { name: this.event.user.username })}`,
            `Roundtrip **${roundtrip}ms**`
        ];

        if (this.options.getBoolean('detailed')) {
            lines.push(`Uptime **${Math.round(process.uptime())}s**`);
        }

        await this.reply(lines.join('\n'));
    }
}
