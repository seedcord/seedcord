import { SlashHandler, SlashRoute, timestampFromSnowflake } from '@seedcord/gateway';

@SlashRoute('ping')
export class Ping extends SlashHandler<'ping'> {
    public async execute(): Promise<void> {
        const lines = [
            `### ${this.t('greet', { name: this.user.username })}`,
            this.t('roundtrip', { ms: Date.now() - timestampFromSnowflake(this.event.id) })
        ];

        if (this.options.getBoolean('detailed')) {
            lines.push(this.t('uptime', { seconds: Math.round(process.uptime()) }));
            lines.push(this.t('asked-in', { locale: this.t.locale }));
        }

        await this.reply(lines.join('\n'));
    }
}
