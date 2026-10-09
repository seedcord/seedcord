import { SlashHandler, SlashRoute, timestampFromSnowflake } from '@seedcord/http';

@SlashRoute('ping')
export class Ping extends SlashHandler<'ping'> {
    public async execute(): Promise<void> {
        const roundtrip = Date.now() - timestampFromSnowflake(this.event.id);
        const lines = ['### Pong', `Roundtrip **${roundtrip}ms**`];
        const runs = this.core.pings.bump();

        if (this.options.getBoolean('detailed')) lines.push(`Pings on this isolate **${runs}**`);

        await this.reply(lines.join('\n'));
    }
}
