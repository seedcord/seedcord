import { Emojis, SlashHandler, SlashRoute, timestampFromSnowflake } from '@seedcord/http';

@SlashRoute('ping')
export class Ping extends SlashHandler<'ping'> {
    public async execute(): Promise<void> {
        const lines = [
            `### ${Emojis.Confirm} ${this.t('pong')}`,
            this.t('roundtrip', { ms: Date.now() - timestampFromSnowflake(this.event.id) })
        ];
        const runs = this.core.pings.bump();
        const total = await this.core.kv.collection<number>('pings').update('total', (count) => (count ?? 0) + 1);

        if (this.options.getBoolean('detailed')) {
            lines.push(this.t('isolate-pings', { count: runs }), this.t('total-pings', { count: total }));
        }

        await this.reply(lines.join('\n'));
    }
}
