import { SlashHandler, SlashRoute, timestampFromSnowflake } from '@seedcord/http';

@SlashRoute('ping')
export class Ping extends SlashHandler<'ping'> {
    public async execute(): Promise<void> {
        const roundtrip = Date.now() - timestampFromSnowflake(this.event.id);
        const lines = ['### Pong', `Roundtrip **${roundtrip}ms**`];
        const runs = this.core.pings.bump();
        const total = await this.core.kv.collection<number>('pings').update('total', (count) => (count ?? 0) + 1);

        if (this.options.getBoolean('detailed')) {
            lines.push(`Pings on this isolate **${runs}**`, `Pings across every isolate **${total}**`);
        }

        await this.reply(lines.join('\n'));
    }
}
