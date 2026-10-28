import { SlashHandler, SlashRoute, timestampFromSnowflake } from '@seedcord/http';

@SlashRoute('ping')
export class Ping extends SlashHandler<'ping'> {
    public async execute(): Promise<void> {
        const roundtrip = Date.now() - timestampFromSnowflake(this.event.id);
        const name = (this.event.member?.user ?? this.event.user)?.username ?? 'there';
        const lines = [`### ${this.core.i18n.t('greet', { name })}`, `Roundtrip **${roundtrip}ms**`];
        const runs = this.core.stats.pings.bump();

        if (this.options.getBoolean('detailed')) {
            lines.push(`Uptime **${this.core.stats.uptime.sinceStart()}s**`);
            lines.push(`Pings **${runs}**`);
        }

        await this.reply(lines.join('\n'));
    }
}
