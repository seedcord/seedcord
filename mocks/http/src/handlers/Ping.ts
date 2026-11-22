import { Emojis, SlashHandler, SlashRoute, timestampFromSnowflake } from '@seedcord/http';

@SlashRoute('ping')
export class Ping extends SlashHandler<'ping'> {
    public async execute(): Promise<void> {
        const lines = [
            `### ${Emojis.Confirm} ${this.t('greet', { name: this.user.username })}`,
            this.t('roundtrip', { ms: Date.now() - timestampFromSnowflake(this.event.id) })
        ];
        const runs = this.core.stats.pings.bump();

        if (this.options.getBoolean('detailed')) {
            lines.push(this.t('uptime', { seconds: this.core.stats.uptime.sinceStart() }));
            lines.push(this.t('pings', { count: runs }));
            lines.push(this.t('asked-in', { locale: this.askedIn }));
        }

        await this.reply(lines.join('\n'));
    }
}
